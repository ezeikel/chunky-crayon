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

// App-specific Stripe config
const stripeHelpers = createStripeHelpers({
  plans: [
    { name: PlanName.SPLASH, monthlyCredits: 250, rolloverCap: 0 },
    { name: PlanName.RAINBOW, monthlyCredits: 500, rolloverCap: 500 },
    { name: PlanName.SPARKLE, monthlyCredits: 1000, rolloverCap: 2000 },
  ],
  priceEnvMappings: [
    {
      monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPLASH_MONTHLY',
      annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPLASH_ANNUAL',
      planName: PlanName.SPLASH,
    },
    {
      monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_MONTHLY',
      annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_RAINBOW_ANNUAL',
      planName: PlanName.RAINBOW,
    },
    {
      monthlyEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_MONTHLY',
      annualEnv: 'NEXT_PUBLIC_STRIPE_PRICE_SPARKLE_ANNUAL',
      planName: PlanName.SPARKLE,
    },
  ],
  creditPacks: [
    // Member packs (subscriber-only, surfaced in /account/billing)
    { env: 'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100', credits: 100 },
    { env: 'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500', credits: 500 },
    { env: 'NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000', credits: 1000 },
    // Color As You Go public packs (no subscription required)
    { env: 'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_50', credits: 50 },
    { env: 'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_200', credits: 200 },
    { env: 'NEXT_PUBLIC_STRIPE_PRICE_PUBLIC_CREDITS_500', credits: 500 },
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
