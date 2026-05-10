import { PlanName, BillingPeriod } from '@one-colored-pixel/db/types';
import {
  createStripeHelpers,
  mapStripeStatus,
  calculateProratedCredits,
  getDaysInPeriod,
  calculateDaysRemaining,
} from '@one-colored-pixel/stripe-shared';

// Re-export pure utilities
export {
  mapStripeStatus as mapStripeStatusToSubscriptionStatus,
  calculateProratedCredits,
  getDaysInPeriod,
  calculateDaysRemaining,
};

// App-specific Stripe config. Multi-currency: each plan registers a
// (monthlyEnv, annualEnv) pair per supported currency. The webhook
// resolves an incoming priceId to the right plan regardless of whether
// the subscription was bought in GBP or USD.
const stripeHelpers = createStripeHelpers({
  plans: [
    { name: PlanName.SPLASH, monthlyCredits: 250, rolloverCap: 0 },
    { name: PlanName.RAINBOW, monthlyCredits: 500, rolloverCap: 500 },
    { name: PlanName.SPARKLE, monthlyCredits: 1000, rolloverCap: 2000 },
  ],
  priceEnvMappings: [
    {
      planName: PlanName.SPLASH,
      currencies: [
        {
          monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPLASH_MONTHLY_GBP',
          annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPLASH_ANNUAL_GBP',
        },
        {
          monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPLASH_MONTHLY_USD',
          annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPLASH_ANNUAL_USD',
        },
      ],
    },
    {
      planName: PlanName.RAINBOW,
      currencies: [
        {
          monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_MONTHLY_GBP',
          annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_ANNUAL_GBP',
        },
        {
          monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_MONTHLY_USD',
          annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_ANNUAL_USD',
        },
      ],
    },
    {
      planName: PlanName.SPARKLE,
      currencies: [
        {
          monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_MONTHLY_GBP',
          annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_ANNUAL_GBP',
        },
        {
          monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_MONTHLY_USD',
          annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_ANNUAL_USD',
        },
      ],
    },
  ],
  creditPacks: [
    // Member packs (subscriber-only, surfaced in /account/billing)
    {
      credits: 100,
      envs: [
        'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100_GBP',
        'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100_USD',
      ],
    },
    {
      credits: 500,
      envs: [
        'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500_GBP',
        'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500_USD',
      ],
    },
    {
      credits: 1000,
      envs: [
        'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000_GBP',
        'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000_USD',
      ],
    },
    // Color As You Go public packs (no subscription required)
    {
      credits: 50,
      envs: [
        'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_50_GBP',
        'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_50_USD',
      ],
    },
    {
      credits: 200,
      envs: [
        'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_200_GBP',
        'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_200_USD',
      ],
    },
    {
      credits: 500,
      envs: [
        'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_500_GBP',
        'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_500_USD',
      ],
    },
  ],
});

// Typed wrapper — narrows string planName to PlanName enum
export const mapStripePriceToPlanName = (
  priceId: string,
): { planName: PlanName; billingPeriod: BillingPeriod } => {
  const result = stripeHelpers.mapStripePriceToPlanName(priceId);
  return {
    planName: result.planName as PlanName,
    billingPeriod: result.billingPeriod,
  };
};

export const getCreditAmountFromPlanName = (planName: PlanName): number =>
  stripeHelpers.getCreditAmountFromPlanName(planName);

export const { getCreditAmountFromPriceId, getRolloverCap } = stripeHelpers;

// Re-export for backwards compatibility
export const PLAN_ROLLOVER_CAPS = stripeHelpers.rolloverCaps;
