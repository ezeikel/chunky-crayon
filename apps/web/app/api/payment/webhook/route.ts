import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@chunky-crayon/db';
import {
  SubscriptionStatus,
  CreditTransactionType,
  BillingPeriod,
  Subscription,
  User,
} from '@chunky-crayon/db';
import { stripe } from '@/lib/stripe';
import {
  mapStripeStatusToSubscriptionStatus,
  mapStripePriceToPlanName,
  getCreditAmountFromPriceId,
  getCreditAmountFromPlanName,
} from '@/utils/stripe';
import { FREE_CREDITS, PLAN_ROLLOVER_CAPS } from '@/constants';
import { sendPaymentFailedEmail } from '@/app/actions/email';

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
  const body = await req.text(); // needs to be text for stripe webhook signature verification
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent: Stripe.Event;

  if (endpointSecret && signature) {
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        body,
        signature,
        endpointSecret,
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err);
      return Response.json({ error: 'Bad request' }, { status: 400 });
    }
  } else {
    try {
      stripeEvent = JSON.parse(body) as Stripe.Event;
    } catch (error) {
      console.error(`Error parsing event body: ${error}`);
      return Response.json({ error: 'Bad request' }, { status: 400 });
    }
  }

  // Idempotency check - skip if already processed
  if (await isEventProcessed(stripeEvent.id)) {
    console.log(`Webhook event ${stripeEvent.id} already processed, skipping`);
    return Response.json({ received: true, skipped: true }, { status: 200 });
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    let user: (User & { subscriptions: Subscription[] }) | null = null;

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
        return Response.json({ error: 'User not found' }, { status: 400 });
      }

      // update user's stripeCustomerId if not already set
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
        return Response.json({ error: 'No customer found' }, { status: 400 });
      }

      // Retrieve customer to get email
      const customer = await stripe.customers.retrieve(
        session.customer as string,
      );

      if (customer.deleted) {
        console.error(`Customer ${session.customer} has been deleted`);
        return Response.json({ error: 'Customer deleted' }, { status: 400 });
      }

      const customerEmail = customer.email;

      if (!customerEmail) {
        console.error(`No email found for customer ${session.customer}`);
        return Response.json({ error: 'No customer email' }, { status: 400 });
      }

      // Find existing user by email or create new one
      user = await db.user.findUnique({
        where: { email: customerEmail },
        include: { subscriptions: true },
      });

      if (!user) {
        // Create new user from Stripe customer with free credits
        user = await db.user.create({
          data: {
            email: customerEmail,
            name: customer.name || customerEmail.split('@')[0],
            stripeCustomerId: session.customer as string,
            credits: FREE_CREDITS,
          },
          include: { subscriptions: true },
        });

        console.log(
          `Created new user ${user.id} from guest checkout with email ${customerEmail} and ${FREE_CREDITS} free credits`,
        );
      } else {
        // Update existing user's stripeCustomerId if not set
        if (!user.stripeCustomerId) {
          await db.user.update({
            where: { id: user.id },
            data: { stripeCustomerId: session.customer as string },
          });
        }
      }
    }

    // check if this is a subscription or one-time payment
    if (session.mode === 'subscription') {
      // handle subscription creation
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      // access the first subscription item's current_period_end
      // TODO: do we need to handle multiple subscription items?
      const firstItem = subscription.items.data[0];
      const currentPeriodEnd = new Date(firstItem.current_period_end * 1000);
      const { planName, billingPeriod } = mapStripePriceToPlanName(
        subscription.items.data[0].price.id,
      );

      // get the credit amount for this plan
      const creditAmount = getCreditAmountFromPlanName(planName);

      // create subscription and add credits in a transaction
      await db.$transaction([
        db.subscription.create({
          data: {
            userId: user.id,
            stripeSubscriptionId: subscription.id,
            planName,
            billingPeriod,
            status: mapStripeStatusToSubscriptionStatus(subscription.status),
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
    } else {
      // handle one-time credit purchase
      // verify user has an active subscription
      const hasActiveSubscription = user.subscriptions.some(
        (sub: Subscription) => sub.status === SubscriptionStatus.ACTIVE,
      );

      if (!hasActiveSubscription) {
        console.error(
          `User ${user.id} attempted to purchase credits without an active subscription`,
        );

        // Refund the payment since credits can't be added without subscription
        if (session.payment_intent) {
          try {
            const paymentIntentId =
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent.id;

            await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: 'requested_by_customer',
            });

            console.log(
              `Refunded payment ${paymentIntentId} - no active subscription`,
            );

            // TODO: Send email to user explaining the refund
          } catch (refundError) {
            console.error('Failed to refund payment:', refundError);
          }
        }

        return Response.json(
          {
            error:
              'Active subscription required for credit purchases. Payment refunded.',
          },
          { status: 400 },
        );
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
      );

      // process all credit purchases in parallel
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
          }
        }),
      );
    }
  } else if (stripeEvent.type === 'customer.subscription.updated') {
    const subscription = stripeEvent.data.object;

    // access the first subscription item's current_period_end
    const firstItem = subscription.items.data[0];
    const currentPeriodEnd = new Date(firstItem.current_period_end * 1000);
    const { planName, billingPeriod } = mapStripePriceToPlanName(
      subscription.items.data[0].price.id,
    );

    await db.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: mapStripeStatusToSubscriptionStatus(subscription.status),
        currentPeriodEnd,
        planName,
        billingPeriod,
      },
    });
  } else if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;

    await db.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
      },
    });
  } else if (stripeEvent.type === 'invoice.payment_succeeded') {
    // Handle subscription renewals - add credits for the new billing period
    // Use type assertion to access invoice properties
    const invoiceData = stripeEvent.data.object as unknown as {
      subscription: string | null;
      billing_reason: string | null;
      id: string;
    };

    // Only process subscription invoices (not one-time payments)
    if (
      invoiceData.subscription &&
      invoiceData.billing_reason === 'subscription_cycle'
    ) {
      const subscriptionId = invoiceData.subscription;

      // Find the subscription in our database
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
          const rolloverCap = PLAN_ROLLOVER_CAPS[subscription.planName];

          // Calculate new balance with rollover cap
          let effectiveCurrentCredits = subscription.user.credits;

          if (rolloverCap > 0) {
            // Cap carryover credits at the rollover limit
            effectiveCurrentCredits = Math.min(
              subscription.user.credits,
              rolloverCap,
            );
          } else {
            // Crayon plan: no rollover - reset to 0 before adding new credits
            effectiveCurrentCredits = 0;
          }

          const newBalance = effectiveCurrentCredits + creditAmount;

          // Add renewal credits with rollover cap applied
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
              `New: ${newBalance}${subscription.user.credits > rolloverCap ? ` (capped from ${subscription.user.credits})` : ''}`,
          );
        }
      }
    }
  } else if (stripeEvent.type === 'invoice.payment_failed') {
    // Handle failed payment - log and optionally notify user
    const invoiceData = stripeEvent.data.object as unknown as {
      subscription: string | null;
      attempt_count: number;
      id: string;
    };

    if (invoiceData.subscription) {
      const subscriptionId = invoiceData.subscription;

      // Find the subscription and user
      const subscription = await db.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { user: true },
      });

      if (subscription && subscription.user.stripeCustomerId) {
        console.error(
          `Payment failed for user ${subscription.user.email} (subscription ${subscriptionId}). ` +
            `Attempt ${invoiceData.attempt_count}. Invoice: ${invoiceData.id}`,
        );

        // Send email notification to user about failed payment
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
    // Log unhandled events but don't treat as error
    console.log(`Unhandled webhook event type: ${stripeEvent.type}`);
  }

  // Mark event as processed for idempotency
  await markEventProcessed(stripeEvent.id, stripeEvent.type);

  // update relevant paths
  revalidatePath('/account/billing');
  revalidatePath('/pricing');

  return Response.json(
    {
      received: true,
    },
    {
      status: 200,
    },
  );
};
