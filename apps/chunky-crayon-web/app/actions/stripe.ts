'use server';

import crypto from 'crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import { stripe } from '@/lib/stripe';
import {
  PlanName,
  SubscriptionStatus,
  CreditTransactionType,
} from '@one-colored-pixel/db';
import {
  calculateDaysRemaining,
  calculateProratedCredits,
  getDaysInPeriod,
  getCreditAmountFromPriceId,
  mapStripePriceToPlanName,
  mapStripeStatusToSubscriptionStatus,
} from '@/utils/stripe';
import {
  PLAN_CREDITS,
  ACTIONS,
  CREDIT_PACKS_MEMBER,
  CREDIT_PACKS_PUBLIC,
} from '@/constants';
import Stripe from 'stripe';
import {
  readClientMatchData,
  sendInitiateCheckoutConversionEvents,
} from '@/lib/conversion-api';
import { getUserId } from './user';

// Cacheable Stripe functions that don't require headers/cookies
// These can be used in cached pages without causing prerendering issues
export const getStripeSession = async (sessionId: string) => {
  'use cache';

  if (!sessionId) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price'],
    });

    // Derive productType and planName from the session
    const productType: 'subscription' | 'credits' =
      session.mode === 'subscription' ? 'subscription' : 'credits';

    let planName: PlanName | undefined;
    let creditAmount: number | undefined;
    const priceId = session.line_items?.data[0]?.price?.id;

    if (priceId) {
      if (productType === 'subscription') {
        const mapping = mapStripePriceToPlanName(priceId);
        planName = mapping.planName;
      } else {
        creditAmount = getCreditAmountFromPriceId(priceId) ?? undefined;
      }
    }

    return {
      amount_total: session.amount_total,
      currency: session.currency,
      productType,
      planName,
      creditAmount,
    };
  } catch (error) {
    console.error('Error fetching Stripe session:', error);
    return null;
  }
};

export const createCheckoutSession = async (
  priceId: string,
  mode: 'payment' | 'subscription',
  cancelPath?: string,
): Promise<{
  id: string;
  error?: string;
} | null> => {
  const headersList = await headers();
  const origin = headersList.get('origin');

  // Validate priceId
  if (!priceId) {
    console.error('No priceId provided to createCheckoutSession');
    return {
      id: '',
      error: 'No price ID provided. Please check environment variables.',
    };
  }

  const userId = await getUserId(ACTIONS.CREATE_CHECKOUT_SESSION);

  // Get user details if logged in
  let user = null;
  let existingSubscription = null;

  if (userId) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    existingSubscription = await db.subscription.findFirst({
      where: { user: { id: userId } },
    });
  }

  // Pack-level gating for one-time payments. Two rules:
  //   1. Member packs require an active subscription (cheaper per-credit
  //      pricing is the subscriber perk — defence-in-depth alongside the
  //      member-only Billing UI).
  //   2. Public packs (Color As You Go) are open to logged-in users AND
  //      guests. Guest flow mirrors subscription guest checkout: Stripe
  //      collects email at checkout, webhook finds-or-creates the User
  //      row from session.customer.
  // Anything else (e.g. an unknown priceId) is rejected.
  const isPublicPack = CREDIT_PACKS_PUBLIC.some(
    (pack) => pack.stripePriceEnv === priceId,
  );
  const isMemberPack = CREDIT_PACKS_MEMBER.some(
    (pack) => pack.stripePriceEnv === priceId,
  );
  if (mode === 'payment') {
    if (isMemberPack) {
      const hasActiveSubscription =
        existingSubscription?.status === SubscriptionStatus.ACTIVE;
      if (!hasActiveSubscription) {
        return {
          id: '',
          error:
            'This pack is for active subscribers. Try Color As You Go instead.',
        };
      }
    } else if (!isPublicPack) {
      return { id: '', error: 'Unknown credit pack.' };
    }
  }

  // Trial eligibility — only attach the 7-day free trial when the user
  // has never had ANY prior Stripe subscription (regardless of trial
  // status). Stripe doesn't enforce one-trial-per-customer; we do it
  // here. Guest checkouts always get the trial — the webhook later
  // links the resulting Stripe customer to a User row, and any future
  // checkout by that user will hit the eligibility gate via this same
  // query against the linked Subscription history.
  const isTrialEligible = mode === 'subscription' && !existingSubscription;

  // Capture Meta match data (fbp/fbc cookies + IP/UA) and round-trip
  // them via Stripe metadata. The webhook fires Purchase server-side
  // from Stripe's IP — without this round-trip, Meta has no browser
  // identity for the buyer and match quality drops sharply.
  const matchData = await readClientMatchData();
  const initiateCheckoutEventId = crypto.randomUUID();

  // Build checkout session options
  const sessionOptions: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode,
    success_url: `${origin}/account/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${cancelPath || '/pricing'}`,
    metadata: {
      // Replayed in webhook for Purchase / Subscribe CAPI sends.
      ...(matchData.fbp && { fbp: matchData.fbp }),
      ...(matchData.fbc && { fbc: matchData.fbc }),
      ...(matchData.ipAddress && { client_ip_address: matchData.ipAddress }),
      ...(matchData.userAgent && { client_user_agent: matchData.userAgent }),
    },
  };

  // Subscription mode auto-creates a Stripe Customer (it has to — to
  // hold the recurring charge). One-time payments don't, so guest
  // credit-pack checkouts wouldn't leave us anything to find-or-create
  // a User from. Force customer creation for guest payment flows so
  // the webhook can resolve session.customer → email → User row.
  if (mode === 'payment' && !userId) {
    sessionOptions.customer_creation = 'always';
  }

  // Attach the 7-day trial for eligible subscription checkouts. Card
  // collection stays 'always' (the default for subscription mode) so
  // we charge automatically when the trial ends; missing-card behaviour
  // is irrelevant when card is required upfront, but we set it anyway
  // for defence-in-depth.
  if (isTrialEligible) {
    sessionOptions.subscription_data = {
      trial_period_days: 7,
      trial_settings: {
        end_behavior: {
          missing_payment_method: 'cancel',
        },
      },
    };
    sessionOptions.payment_method_collection = 'always';
  }

  if (userId && user) {
    // Logged-in user flow
    sessionOptions.client_reference_id = userId;
    sessionOptions.customer = user.stripeCustomerId ?? undefined;
    sessionOptions.customer_email = existingSubscription
      ? undefined
      : (user.email ?? undefined);
  }
  // Guest checkout flow: no client_reference_id or customer set
  // For subscriptions, Stripe automatically creates a customer and collects email
  // Webhook will find/create user from the Stripe customer email

  const stripeSession = await stripe.checkout.sessions.create(sessionOptions);

  // Fire InitiateCheckout server-side. Survives ad-blockers / iOS 14+
  // tracking restrictions that suppress the browser pixel fire. Don't
  // await — the user is about to be redirected to Stripe and we
  // shouldn't block on Meta's response.
  const planMapping =
    mode === 'subscription' ? mapStripePriceToPlanName(priceId) : null;
  const creditAmount =
    mode === 'payment' ? getCreditAmountFromPriceId(priceId) : null;
  const contentName = planMapping
    ? `${planMapping.planName} Subscription`
    : creditAmount
      ? `${creditAmount} Credits Pack`
      : 'Checkout';

  // Pull amount from the freshly-created session so we don't have to
  // re-derive it from price metadata.
  const value = stripeSession.amount_total ?? 0;
  const currency = (stripeSession.currency ?? 'gbp').toUpperCase();

  sendInitiateCheckoutConversionEvents({
    ...(user?.email && { email: user.email }),
    ...(userId && { userId }),
    value,
    currency,
    eventId: initiateCheckoutEventId,
    contentName,
    ...matchData,
  }).catch((err) => {
    console.error('[CAPI] InitiateCheckout failed', err);
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

  // Only Stripe subscriptions can be changed via this action
  if (!subscription.stripeSubscriptionId) {
    console.error(
      'Cannot change plan: subscription is not a Stripe subscription.',
    );
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
