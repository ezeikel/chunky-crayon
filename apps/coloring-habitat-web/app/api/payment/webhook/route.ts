import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@one-colored-pixel/db";
import {
  SubscriptionStatus,
  CreditTransactionType,
  BillingPeriod,
  Subscription,
  User,
} from "@one-colored-pixel/db";
import { getStripe } from "@/lib/stripe";
import {
  mapStripeStatus,
  mapStripePriceToPlanName,
  getCreditAmountFromPriceId,
  getCreditAmountFromPlanName,
  PLAN_ROLLOVER_CAPS,
} from "@/utils/stripe";
import { FREE_CREDITS } from "@/constants";
import { sendPaymentFailedEmail } from "@/app/actions/email";
import {
  sendPurchaseConversionEvents,
  sendSignupConversionEvents,
  sendSubscribeConversionEvents,
} from "@/lib/conversion-api";

// Check if webhook event has already been processed (idempotency)
const isEventProcessed = async (eventId: string): Promise<boolean> => {
  const existing = await db.stripeWebhookEvent.findUnique({
    where: { id: eventId },
  });
  return !!existing;
};

// Mark webhook event as processed
const markEventProcessed = async (
  eventId: string,
  eventType: string,
): Promise<void> => {
  await db.stripeWebhookEvent.create({
    data: { id: eventId, type: eventType },
  });
};

export const POST = async (req: Request) => {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const stripe = getStripe();
  let stripeEvent: Stripe.Event;

  if (endpointSecret && signature) {
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        body,
        signature,
        endpointSecret,
      );
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err);
      return Response.json({ error: "Bad request" }, { status: 400 });
    }
  } else {
    try {
      stripeEvent = JSON.parse(body) as Stripe.Event;
    } catch (error) {
      console.error(`Error parsing event body: ${error}`);
      return Response.json({ error: "Bad request" }, { status: 400 });
    }
  }

  // Idempotency check - skip if already processed
  if (await isEventProcessed(stripeEvent.id)) {
    console.log(`Webhook event ${stripeEvent.id} already processed, skipping`);
    return Response.json({ received: true, skipped: true }, { status: 200 });
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    // Meta match data round-tripped from createCheckoutSession via
    // Stripe metadata. Stripe metadata values are strings.
    const matchData = {
      fbp: session.metadata?.fbp || undefined,
      fbc: session.metadata?.fbc || undefined,
      ipAddress: session.metadata?.client_ip_address || undefined,
      userAgent: session.metadata?.client_user_agent || undefined,
    };

    let user: (User & { subscriptions: Subscription[] }) | null = null;
    // Track whether the webhook just created the user, so we can fire
    // CompleteRegistration to Meta/Pinterest CAPI after-the-fact for
    // guest-checkout signups (where there's no NextAuth signIn callback
    // to do it for us).
    let isNewUser = false;

    if (session.client_reference_id) {
      // Logged-in user flow: get user from client reference ID
      user = await db.user.findUnique({
        where: { id: session.client_reference_id },
        include: { subscriptions: true },
      });

      if (!user) {
        console.error(
          `No user found for client_reference_id ${session.client_reference_id}`,
        );
        return Response.json({ error: "User not found" }, { status: 400 });
      }

      // Update user's stripeCustomerId if not already set
      if (!user.stripeCustomerId && session.customer) {
        await db.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: session.customer as string },
        });
      }
    } else {
      // Guest checkout flow: find or create user from Stripe customer email
      if (!session.customer) {
        console.error(
          `No customer found for guest checkout session ${session.id}`,
        );
        return Response.json({ error: "No customer found" }, { status: 400 });
      }

      const customer = await stripe.customers.retrieve(
        session.customer as string,
      );

      if (customer.deleted) {
        console.error(`Customer ${session.customer} has been deleted`);
        return Response.json({ error: "Customer deleted" }, { status: 400 });
      }

      const customerEmail = customer.email;

      if (!customerEmail) {
        console.error(`No email found for customer ${session.customer}`);
        return Response.json({ error: "No customer email" }, { status: 400 });
      }

      // Find existing user by email or create new one
      user = await db.user.findUnique({
        where: { email: customerEmail },
        include: { subscriptions: true },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            email: customerEmail,
            name: customer.name || customerEmail.split("@")[0],
            stripeCustomerId: session.customer as string,
            credits: FREE_CREDITS,
            brand: "COLORING_HABITAT",
          },
          include: { subscriptions: true },
        });

        isNewUser = true;

        console.log(
          `Created new user ${user.id} from guest checkout with email ${customerEmail} and ${FREE_CREDITS} free credits`,
        );
      } else {
        if (!user.stripeCustomerId) {
          await db.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: session.customer as string },
          });
        }
      }
    }

    // Check if this is a subscription or one-time payment
    if (session.mode === "subscription") {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      const firstItem = subscription.items.data[0];
      const currentPeriodEnd = new Date(firstItem.current_period_end * 1000);
      const { planName, billingPeriod } = mapStripePriceToPlanName(
        subscription.items.data[0].price.id,
      );

      const creditAmount = getCreditAmountFromPlanName(planName);

      // Create subscription and add credits in a transaction
      await db.$transaction([
        db.subscription.create({
          data: {
            userId: user.id,
            platform: "STRIPE",
            externalId: subscription.id,
            stripeSubscriptionId: subscription.id,
            planName: planName as any,
            billingPeriod,
            status: mapStripeStatus(subscription.status),
            currentPeriodStart: new Date(firstItem.current_period_start * 1000),
            currentPeriodEnd,
          },
        }),
        db.creditTransaction.create({
          data: {
            userId: user.id,
            amount: creditAmount,
            type: CreditTransactionType.PURCHASE,
            reference: subscription.id,
          },
        }),
        db.user.update({
          where: { id: user.id },
          data: { credits: { increment: creditAmount } },
        }),
      ]);

      // Send to Conversion APIs (Facebook + Pinterest). Subscribe is
      // distinct from Purchase in Meta — fire it alongside so the
      // Subscribe column in Events Manager populates and Meta can
      // optimize for subscription starts. Distinct event_id (sub_
      // prefix) so Meta doesn't merge it with the Purchase event.
      const priceAmount = subscription.items.data[0].price.unit_amount || 0;
      if (user.email) {
        await Promise.allSettled([
          sendPurchaseConversionEvents({
            email: user.email,
            userId: user.id,
            value: priceAmount,
            currency: "GBP",
            eventId: session.id,
            contentName: `${planName} Subscription`,
            ...matchData,
          }),
          sendSubscribeConversionEvents({
            email: user.email,
            userId: user.id,
            value: priceAmount,
            currency: "GBP",
            eventId: `sub_${session.id}`,
            planName,
            predictedLtvMultiplier:
              billingPeriod === BillingPeriod.ANNUAL ? 1 : 12,
            ...matchData,
          }),
        ]);
      }
    } else {
      // Handle one-time credit purchase
      const hasActiveSubscription = user.subscriptions.some(
        (sub: Subscription) => sub.status === SubscriptionStatus.ACTIVE,
      );

      if (!hasActiveSubscription) {
        console.error(
          `User ${user.id} attempted to purchase credits without an active subscription`,
        );

        // Refund the payment
        if (session.payment_intent) {
          try {
            const paymentIntentId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent.id;

            await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: "requested_by_customer",
            });

            console.log(
              `Refunded payment ${paymentIntentId} - no active subscription`,
            );
          } catch (refundError) {
            console.error("Failed to refund payment:", refundError);
          }
        }

        return Response.json(
          {
            error:
              "Active subscription required for credit purchases. Payment refunded.",
          },
          { status: 400 },
        );
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
      );

      await Promise.all(
        lineItems.data.map(async (item) => {
          const creditAmount = getCreditAmountFromPriceId(item.price?.id);

          if (creditAmount) {
            await db.$transaction([
              db.creditTransaction.create({
                data: {
                  userId: user.id,
                  amount: creditAmount,
                  type: CreditTransactionType.PURCHASE,
                  reference: session.payment_intent as string,
                },
              }),
              db.user.update({
                where: { id: user.id },
                data: { credits: { increment: creditAmount } },
              }),
            ]);

            // Send to Conversion APIs (Facebook + Pinterest)
            const priceAmount = item.price?.unit_amount || 0;
            if (user.email) {
              await sendPurchaseConversionEvents({
                email: user.email,
                userId: user.id,
                value: priceAmount,
                currency: "GBP",
                eventId:
                  lineItems.data.length === 1
                    ? session.id
                    : `${session.id}_${item.price?.id}`,
                contentName: `${creditAmount} Credits Pack`,
                ...matchData,
              });
            }
          }
        }),
      );
    }

    // Fire CompleteRegistration when the webhook just created the user
    // (guest checkout flow — no NextAuth signIn callback runs in that
    // path). Server-side dedup against any future browser
    // CompleteRegistration uses the user.id as event_id.
    if (isNewUser && user.email) {
      sendSignupConversionEvents({
        email: user.email,
        userId: user.id,
        signupMethod: "email",
        ...matchData,
      }).catch((err) => {
        console.error("[CAPI] guest-checkout signup conversion failed", err);
      });
    }
  } else if (stripeEvent.type === "customer.subscription.updated") {
    const subscription = stripeEvent.data.object;

    const firstItem = subscription.items.data[0];
    const currentPeriodEnd = new Date(firstItem.current_period_end * 1000);
    const { planName, billingPeriod } = mapStripePriceToPlanName(
      subscription.items.data[0].price.id,
    );

    await db.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: mapStripeStatus(subscription.status),
        currentPeriodEnd,
        planName: planName as any,
        billingPeriod,
      },
    });
  } else if (stripeEvent.type === "customer.subscription.deleted") {
    const subscription = stripeEvent.data.object;

    await db.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
      },
    });
  } else if (stripeEvent.type === "invoice.payment_succeeded") {
    const invoiceData = stripeEvent.data.object as unknown as {
      subscription: string | null;
      billing_reason: string | null;
      id: string;
    };

    // Only process subscription invoices (not one-time payments)
    if (
      invoiceData.subscription &&
      invoiceData.billing_reason === "subscription_cycle"
    ) {
      const subscriptionId = invoiceData.subscription;

      const subscription = await db.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { user: true },
      });

      if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
        // Skip annual subscriptions - they get monthly credits via the cron job
        if (subscription.billingPeriod === BillingPeriod.ANNUAL) {
          console.log(
            `Skipping annual subscription ${subscriptionId} - credits handled by monthly drip cron`,
          );
        } else {
          // Monthly subscription renewal - add credits with rollover cap
          const creditAmount = getCreditAmountFromPlanName(
            subscription.planName,
          );
          const rolloverCap = PLAN_ROLLOVER_CAPS[subscription.planName] ?? 0;

          let effectiveCurrentCredits = subscription.user.credits;

          if (rolloverCap > 0) {
            effectiveCurrentCredits = Math.min(
              subscription.user.credits,
              rolloverCap,
            );
          } else {
            effectiveCurrentCredits = 0;
          }

          const newBalance = effectiveCurrentCredits + creditAmount;

          await db.$transaction([
            db.creditTransaction.create({
              data: {
                userId: subscription.userId,
                amount: creditAmount,
                type: CreditTransactionType.PURCHASE,
                reference: `renewal:${invoiceData.id}`,
              },
            }),
            db.user.update({
              where: { id: subscription.userId },
              data: { credits: newBalance },
            }),
          ]);

          console.log(
            `Added ${creditAmount} renewal credits for user ${subscription.userId} ` +
              `(subscription ${subscriptionId}). Previous: ${subscription.user.credits}, ` +
              `New: ${newBalance}${subscription.user.credits > rolloverCap ? ` (capped from ${subscription.user.credits})` : ""}`,
          );
        }
      }
    }
  } else if (stripeEvent.type === "invoice.payment_failed") {
    const invoiceData = stripeEvent.data.object as unknown as {
      subscription: string | null;
      attempt_count: number;
      id: string;
    };

    if (invoiceData.subscription) {
      const subscriptionId = invoiceData.subscription;

      const subscription = await db.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { user: true },
      });

      if (
        subscription &&
        subscription.user.stripeCustomerId &&
        subscription.user.email
      ) {
        console.error(
          `Payment failed for user ${subscription.user.email} (subscription ${subscriptionId}). ` +
            `Attempt ${invoiceData.attempt_count}. Invoice: ${invoiceData.id}`,
        );

        await sendPaymentFailedEmail({
          email: subscription.user.email,
          userName: subscription.user.name,
          planName: subscription.planName,
          attemptCount: invoiceData.attempt_count,
          stripeCustomerId: subscription.user.stripeCustomerId,
        });
      }
    }
  } else {
    console.log(`Unhandled webhook event type: ${stripeEvent.type}`);
  }

  // Mark event as processed for idempotency
  await markEventProcessed(stripeEvent.id, stripeEvent.type);

  // Revalidate relevant paths
  revalidatePath("/account/billing");
  revalidatePath("/pricing");

  return Response.json(
    {
      received: true,
    },
    {
      status: 200,
    },
  );
};
