import {
  createStripeHelpers,
  mapStripeStatus,
  calculateProratedCredits,
  getDaysInPeriod,
  calculateDaysRemaining,
} from "@one-colored-pixel/stripe-shared";

// Habitat plan names — wellness/mindfulness themed
export const HABITAT_PLANS = {
  BLOOM: "BLOOM", // Free tier
  GROVE: "GROVE", // Entry tier
  SANCTUARY: "SANCTUARY", // Mid tier (most popular)
  OASIS: "OASIS", // Premium tier
} as const;

export type HabitatPlanName =
  (typeof HABITAT_PLANS)[keyof typeof HABITAT_PLANS];

// Re-export pure utilities
export {
  mapStripeStatus,
  calculateProratedCredits,
  getDaysInPeriod,
  calculateDaysRemaining,
};

// App-specific Stripe config
const stripeHelpers = createStripeHelpers({
  plans: [
    { name: "GROVE", monthlyCredits: 300, rolloverCap: 0 },
    { name: "SANCTUARY", monthlyCredits: 800, rolloverCap: 800 },
    { name: "OASIS", monthlyCredits: 2000, rolloverCap: 4000 },
  ],
  priceEnvMappings: [
    {
      monthlyEnv: "NEXT_PUBLIC_STRIPE_PRICE_GROVE_MONTHLY",
      annualEnv: "NEXT_PUBLIC_STRIPE_PRICE_GROVE_ANNUAL",
      planName: "GROVE",
    },
    {
      monthlyEnv: "NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_MONTHLY",
      annualEnv: "NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_ANNUAL",
      planName: "SANCTUARY",
    },
    {
      monthlyEnv: "NEXT_PUBLIC_STRIPE_PRICE_OASIS_MONTHLY",
      annualEnv: "NEXT_PUBLIC_STRIPE_PRICE_OASIS_ANNUAL",
      planName: "OASIS",
    },
  ],
  creditPacks: [
    { env: "NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100", credits: 100 },
    { env: "NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500", credits: 500 },
    { env: "NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000", credits: 1000 },
  ],
});

export const {
  mapStripePriceToPlanName,
  getCreditAmountFromPlanName,
  getCreditAmountFromPriceId,
  getRolloverCap,
} = stripeHelpers;

// Re-export for backwards compatibility
export const PLAN_CREDITS_MONTHLY = stripeHelpers.planCredits;
export const PLAN_ROLLOVER_CAPS = stripeHelpers.rolloverCaps;
