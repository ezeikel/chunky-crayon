'use client';

/**
 * Shared Stripe-checkout flow used by both /pricing AND the in-form
 * PaywallModal.
 *
 * Extracted from PricingPageClient so the paywall modal can launch the
 * exact same checkout flow (same tracking, same CAPI dedup, same error
 * handling) without duplicating code. Per-call `source` is forwarded
 * into `PRICING_PLAN_CLICKED` so we can attribute conversions to the
 * surface they originated from ('pricing_page' vs 'paywall_modal').
 *
 * Why a hook (not a server action): `stripePromise`, `trackInitiateCheckout`
 * (Meta Pixel + CAPI dedup), and `stripe.redirectToCheckout` are all
 * browser APIs. Hook is the right boundary.
 *
 * The hook exposes two purchase functions:
 *   - `purchasePlan(plan, interval)`    — subscription
 *   - `purchasePack(pack)`              — one-off credit pack
 *
 * Both manage their own loading state (returned as `loadingPlan` /
 * `loadingPack`) so callers can disable the right button. Toast errors
 * are raised internally per `feedback_sonner_toasts_for_errors`.
 */

import { useCallback, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { PlanName, BillingPeriod } from '@one-colored-pixel/db/types';
import {
  PlanInterval,
  SUBSCRIPTION_PLANS,
  CREDIT_PACKS_PUBLIC,
  TRACKING_EVENTS,
} from '@/constants';
import { type Currency, DEFAULT_CURRENCY } from '@/lib/currency';
import { trackEvent } from '@/utils/analytics-client';
import { trackInitiateCheckout } from '@/utils/pixels';
import { createCheckoutSession } from '@/app/actions/stripe';

// Created outside the hook per Stripe's docs — recreating the Stripe
// object on every render is a perf hit and breaks Elements identity.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

export type CheckoutSource = 'pricing_page' | 'paywall_modal';

export type StripeLayoutVariant = 'subscriptions_primary' | 'packs_primary';
export type StripeSectionPosition = 'primary' | 'secondary';

export type PurchasePlanArgs = {
  plan: (typeof SUBSCRIPTION_PLANS)['monthly'][number];
  interval: PlanInterval;
  /** /pricing-only context. The paywall modal passes neither. */
  variant?: StripeLayoutVariant;
  section?: StripeSectionPosition;
};

export type PurchasePackArgs = {
  pack: (typeof CREDIT_PACKS_PUBLIC)[number];
  variant?: StripeLayoutVariant;
  section?: StripeSectionPosition;
};

type UseStripeCheckoutOptions = {
  /** Currency the prices are quoted in. Defaults to GBP. */
  currency?: Currency;
  /**
   * Where this hook instance lives — fired with PRICING_PLAN_CLICKED so
   * funnel reporting can split conversion by surface. Defaults to
   * 'pricing_page' since that's the original consumer.
   */
  source?: CheckoutSource;
};

type UseStripeCheckoutResult = {
  /** Plan key (e.g. PlanName.SPLASH) currently mid-checkout, or null. */
  loadingPlan: string | null;
  /** Pack key currently mid-checkout, or null. */
  loadingPack: string | null;
  purchasePlan: (args: PurchasePlanArgs) => Promise<void>;
  purchasePack: (args: PurchasePackArgs) => Promise<void>;
};

export const useStripeCheckout = ({
  currency = DEFAULT_CURRENCY,
  source = 'pricing_page',
}: UseStripeCheckoutOptions = {}): UseStripeCheckoutResult => {
  const tErrors = useTranslations('errors');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const purchasePlan = useCallback<UseStripeCheckoutResult['purchasePlan']>(
    async ({ plan, interval, variant, section }) => {
      const priceEntry = plan.prices[currency];
      setLoadingPlan(plan.key);

      trackEvent(TRACKING_EVENTS.PRICING_PLAN_CLICKED, {
        productType: 'subscription',
        planName: plan.key,
        planInterval:
          interval === 'monthly' ? BillingPeriod.MONTHLY : BillingPeriod.ANNUAL,
        price: priceEntry.display,
        variant,
        section,
        source,
      });

      // Meta Pixel InitiateCheckout — dedupe with server CAPI via shared
      // eventId. Pinterest piggybacks on Purchase, no InitiateCheckout
      // there.
      const priceInMinorUnits =
        parseInt(priceEntry.display.replace(/[^0-9]/g, ''), 10) * 100;
      const initiateCheckoutEventId = crypto.randomUUID();
      trackInitiateCheckout({
        value: priceInMinorUnits,
        currency,
        productType: 'subscription',
        planName: plan.key,
        eventId: initiateCheckoutEventId,
      });

      try {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe failed to load');

        const session = await createCheckoutSession(
          priceEntry.stripePriceEnv,
          'subscription',
          undefined,
          initiateCheckoutEventId,
        );

        if (!session || !session.id) {
          const errorMessage =
            session?.error || 'Failed to create checkout session';
          console.error('Checkout session error:', errorMessage);
          trackEvent(TRACKING_EVENTS.CHECKOUT_FAILED, {
            productType: 'subscription',
            planName: plan.key,
            stage: 'session_create',
            reason: errorMessage,
          });
          toast.error(errorMessage);
          return;
        }

        // Last event we control before the Stripe-hosted page — closes
        // the previously-dark gap between pricing_plan_clicked and
        // checkout_completed.
        trackEvent(TRACKING_EVENTS.CHECKOUT_STARTED, {
          productType: 'subscription',
          planName: plan.key,
          planInterval:
            interval === 'monthly'
              ? BillingPeriod.MONTHLY
              : BillingPeriod.ANNUAL,
        });

        const { error } = await stripe.redirectToCheckout({
          sessionId: session.id,
        });
        if (error) {
          console.error('Stripe redirect error:', error);
          trackEvent(TRACKING_EVENTS.CHECKOUT_FAILED, {
            productType: 'subscription',
            planName: plan.key,
            stage: 'redirect',
            reason: error.message,
          });
          toast.error(error.message || 'Failed to redirect to checkout');
        }
      } catch (error) {
        console.error('Error purchasing plan:', error);
        trackEvent(TRACKING_EVENTS.CHECKOUT_FAILED, {
          productType: 'subscription',
          planName: plan.key,
          stage: 'exception',
          reason: error instanceof Error ? error.message : 'unknown',
        });
        toast.error(tErrors('unexpectedError'));
      } finally {
        setLoadingPlan(null);
      }
    },
    [currency, source, tErrors],
  );

  const purchasePack = useCallback<UseStripeCheckoutResult['purchasePack']>(
    async ({ pack, variant, section }) => {
      const priceEntry = pack.prices[currency];
      setLoadingPack(pack.key);

      trackEvent(TRACKING_EVENTS.PRICING_PLAN_CLICKED, {
        productType: 'pack',
        packKey: pack.key as
          | 'PUBLIC_CREDITS_50'
          | 'PUBLIC_CREDITS_200'
          | 'PUBLIC_CREDITS_500',
        credits: pack.credits,
        price: priceEntry.display,
        variant,
        section,
        source,
      });

      const priceInMinorUnits = Math.round(
        parseFloat(priceEntry.display.replace(/[^0-9.]/g, '')) * 100,
      );
      const initiateCheckoutEventId = crypto.randomUUID();
      trackInitiateCheckout({
        value: priceInMinorUnits,
        currency,
        productType: 'credits',
        creditAmount: pack.credits,
        eventId: initiateCheckoutEventId,
      });

      try {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe failed to load');

        const session = await createCheckoutSession(
          priceEntry.stripePriceEnv,
          'payment',
          '/pricing',
          initiateCheckoutEventId,
        );

        if (!session || !session.id) {
          const errorMessage = session?.error || 'Failed to start checkout';
          console.error('Pack checkout session error:', errorMessage);
          trackEvent(TRACKING_EVENTS.CHECKOUT_FAILED, {
            productType: 'pack',
            packKey: pack.key,
            stage: 'session_create',
            reason: errorMessage,
          });
          toast.error(errorMessage);
          return;
        }

        trackEvent(TRACKING_EVENTS.CHECKOUT_STARTED, {
          productType: 'pack',
          packKey: pack.key,
          credits: pack.credits,
        });

        const { error } = await stripe.redirectToCheckout({
          sessionId: session.id,
        });
        if (error) {
          console.error('Stripe redirect error:', error);
          trackEvent(TRACKING_EVENTS.CHECKOUT_FAILED, {
            productType: 'pack',
            packKey: pack.key,
            stage: 'redirect',
            reason: error.message,
          });
          toast.error(error.message || 'Checkout failed');
        }
      } catch (err) {
        console.error('[pack-checkout]', err);
        trackEvent(TRACKING_EVENTS.CHECKOUT_FAILED, {
          productType: 'pack',
          packKey: pack.key,
          stage: 'exception',
          reason: err instanceof Error ? err.message : 'unknown',
        });
        toast.error(tErrors('unexpectedError'));
      } finally {
        setLoadingPack(null);
      }
    },
    [currency, source, tErrors],
  );

  return { loadingPlan, loadingPack, purchasePlan, purchasePack };
};

export default useStripeCheckout;
