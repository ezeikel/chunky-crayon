import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@chunky-crayon/db';
import {
  SubscriptionStatus,
  CreditTransactionType,
  Subscription,
} from '@chunky-crayon/db';
import { stripe } from '@/lib/stripe';
import {
  mapStripeStatusToSubscriptionStatus,
  mapStripePriceToPlanName,
  getCreditAmountFromPriceId,
  getCreditAmountFromPlanName,
} from '@/utils/stripe';

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

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    if (!session.client_reference_id) {
      console.error(`No client reference ID found for session ${session.id}`);
      return Response.json({ error: 'Invalid session' }, { status: 400 });
    }

    // get the user from the client reference ID
    const user = await db.user.findUnique({
      where: { id: session.client_reference_id },
      include: { subscriptions: true },
    });

    if (!user) {
      console.error(`No user found for session ${session.id}`);
      return Response.json({ error: 'User not found' }, { status: 400 });
    }

    // update user's stripeCustomerId if not already set
    if (!user.stripeCustomerId && session.customer) {
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: session.customer as string },
      });
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

        // TODO: send email to user and refund the purchase?

        return Response.json(
          { error: 'Active subscription required for credit purchases' },
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
  } else {
    console.error(`Unhandled event type ${stripeEvent.type}`);
  }

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
