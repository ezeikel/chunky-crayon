'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@chunky-crayon/db';
import { stripe } from '@/lib/stripe';
import {
  PlanName,
  SubscriptionStatus,
  CreditTransactionType,
} from '@chunky-crayon/db';
import {
  calculateDaysRemaining,
  calculateProratedCredits,
  getDaysInPeriod,
  mapStripeStatusToSubscriptionStatus,
} from '@/utils/stripe';
import { PLAN_CREDITS } from '@/constants';
import Stripe from 'stripe';
import { getUserId } from './user';

export const createCheckoutSession = async (
  priceId: string,
  mode: 'payment' | 'subscription',
): Promise<{
  id: string;
} | null> => {
  const headersList = await headers();
  const origin = headersList.get('origin');

  const userId = await getUserId('create a checkout session');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      name: true,
      email: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    console.error('User not found.');
    return null;
  }

  // TODO: findUnique instead of findFirst
  const subscription = await db.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
    },
  });

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode,
    success_url: `${origin}/account/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    // cancel_url: `${origin}/account/billing`,
    cancel_url: `${origin}/pricing`,
    client_reference_id: userId,

    // send stripe customer id if user already exists in stripe
    customer: user.stripeCustomerId ?? undefined,
    customer_email: subscription ? undefined : user.email,
  });

  // update relevant paths
  revalidatePath('/account/billing');
  revalidatePath('/pricing');

  return {
    id: stripeSession.id,
  };
};

export const createCustomerPortalSession = async () => {
  const headersList = await headers();
  const origin = headersList.get('origin');

  const userId = await getUserId('create a customer portal session');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      stripeCustomerId: true,
    },
  });

  if (!user?.stripeCustomerId) {
    console.error('No subscription found for this user.');
    return null;
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/account/billing`,
  });

  // update relevant paths
  revalidatePath('/account/billing');

  return {
    url: portalSession.url,
  };
};

export const getSubscriptionDetails = async (stripeSubscriptionId: string) => {
  const userId = await getUserId('get subscription details');

  if (!userId) {
    console.error('You need to be logged in to get subscription details.');
    return null;
  }

  const subscription = await db.subscription.findFirst({
    where: {
      stripeSubscriptionId,
    },
  });

  if (!subscription) {
    console.error('No subscription found for this user.');
    return null;
  }

  try {
    // get subscription details from Stripe
    const stripeSubscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId);

    return {
      subscription,
      stripeSubscription,
    };
  } catch (error) {
    console.error('Error fetching subscription details from Stripe:', error);
    return null;
  }
};

export const changeSubscription = async ({
  currentPlanName,
  newPlanName,
  newPriceId,
}: {
  currentPlanName: PlanName;
  newPlanName: PlanName;
  newPriceId: string;
}) => {
  const userId = await getUserId('change subscription');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      stripeCustomerId: true,
      credits: true,
    },
  });

  if (!user?.stripeCustomerId) {
    console.error('No subscription found for this user.');
    return null;
  }

  const subscription = await db.subscription.findFirst({
    where: {
      user: {
        id: userId,
      },
      status: SubscriptionStatus.ACTIVE,
      planName: currentPlanName,
    },
    select: {
      stripeSubscriptionId: true,
      currentPeriodEnd: true,
      billingPeriod: true,
    },
  });

  if (!subscription) {
    console.error('No subscription found for this user.');
    return null;
  }

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    const updatedSubscription = (await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      },
    )) as Stripe.Subscription;

    // get the current period end from the first subscription item
    const firstItem = updatedSubscription.items.data[0];
    const currentPeriodEnd = new Date(firstItem.current_period_end * 1000);

    // calculate prorated credits
    const daysRemaining = calculateDaysRemaining(subscription.currentPeriodEnd);
    const totalDays = getDaysInPeriod(
      subscription.billingPeriod.toLowerCase() as 'monthly' | 'annual',
    );
    const currentPlanCredits =
      PLAN_CREDITS[currentPlanName][subscription.billingPeriod];
    const newPlanCredits =
      PLAN_CREDITS[newPlanName][subscription.billingPeriod];

    const isUpgrade = newPlanCredits > currentPlanCredits;

    const proratedCredits = calculateProratedCredits(
      currentPlanCredits,
      newPlanCredits,
      daysRemaining,
      totalDays,
      isUpgrade,
    );

    if (isUpgrade && proratedCredits > 0) {
      // create a transaction for the prorated credits
      await db.creditTransaction.create({
        data: {
          userId,
          amount: proratedCredits,
          type: CreditTransactionType.ADJUSTMENT,
          reference: `subscription_change_${subscription.stripeSubscriptionId}`,
        },
      });

      await db.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: proratedCredits,
          },
        },
      });
    }

    await db.subscription.update({
      where: {
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      },
      data: {
        planName: newPlanName,
        currentPeriodEnd,
        status: mapStripeStatusToSubscriptionStatus(updatedSubscription.status),
      },
    });

    // update relevant paths
    revalidatePath('/account/billing');
    revalidatePath('/pricing');

    return {
      success: true,
      message: `Successfully switched to ${newPlanName}!`,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodEnd,
      },
      credits: isUpgrade
        ? {
            added: proratedCredits,
            newTotal: user.credits + proratedCredits,
          }
        : {
            added: 0,
            newTotal: user.credits,
            message:
              'Your current credits will remain until the end of your billing period',
          },
    };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return null;
  }
};

export const getStripeSession = async (sessionId: string) => {
  if (!sessionId) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      amount_total: session.amount_total,
      currency: session.currency,
    };
  } catch (error) {
    console.error('Error fetching Stripe session:', error);
    return null;
  }
};
