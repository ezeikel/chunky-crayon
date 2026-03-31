import {
  PlanName,
  BillingPeriod,
  SubscriptionStatus,
} from "@one-colored-pixel/db";

type PriceMapping = {
  planName: string;
  billingPeriod: BillingPeriod;
};

// Habitat plan names — wellness/mindfulness themed
export const HABITAT_PLANS = {
  BLOOM: "BLOOM", // Free tier
  GROVE: "GROVE", // Entry tier
  SANCTUARY: "SANCTUARY", // Mid tier (most popular)
  OASIS: "OASIS", // Premium tier
} as const;

export type HabitatPlanName =
  (typeof HABITAT_PLANS)[keyof typeof HABITAT_PLANS];

export const PLAN_PRICE_MAP: Record<
  string,
  { plan: string; period: BillingPeriod }
> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_GROVE_MONTHLY || ""]: {
    plan: "GROVE",
    period: "MONTHLY",
  },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_GROVE_ANNUAL || ""]: {
    plan: "GROVE",
    period: "ANNUAL",
  },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_MONTHLY || ""]: {
    plan: "SANCTUARY",
    period: "MONTHLY",
  },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_ANNUAL || ""]: {
    plan: "SANCTUARY",
    period: "ANNUAL",
  },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_OASIS_MONTHLY || ""]: {
    plan: "OASIS",
    period: "MONTHLY",
  },
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_OASIS_ANNUAL || ""]: {
    plan: "OASIS",
    period: "ANNUAL",
  },
};

export const mapStripeStatus = (status: string): SubscriptionStatus => {
  const map: Record<string, SubscriptionStatus> = {
    trialing: "TRIALING",
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELLED",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    paused: "PAUSED",
  };
  return map[status] || "EXPIRED";
};

export const mapStripePriceToPlanName = (priceId: string): PriceMapping => {
  const mapping = PLAN_PRICE_MAP[priceId];
  if (mapping) {
    return { planName: mapping.plan, billingPeriod: mapping.period };
  }

  // Fallback: check env vars directly
  switch (priceId) {
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_GROVE_MONTHLY:
      return { planName: "GROVE", billingPeriod: BillingPeriod.MONTHLY };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_GROVE_ANNUAL:
      return { planName: "GROVE", billingPeriod: BillingPeriod.ANNUAL };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_MONTHLY:
      return { planName: "SANCTUARY", billingPeriod: BillingPeriod.MONTHLY };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_SANCTUARY_ANNUAL:
      return { planName: "SANCTUARY", billingPeriod: BillingPeriod.ANNUAL };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_OASIS_MONTHLY:
      return { planName: "OASIS", billingPeriod: BillingPeriod.MONTHLY };
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_OASIS_ANNUAL:
      return { planName: "OASIS", billingPeriod: BillingPeriod.ANNUAL };
    default:
      throw new Error(`Unknown price ID: ${priceId}`);
  }
};

// Monthly credit allotment per Habitat plan
export const PLAN_CREDITS_MONTHLY: Record<string, number> = {
  GROVE: 300,
  SANCTUARY: 800,
  OASIS: 2000,
};

// Rollover caps: max credits that can carry over to next month
// Grove: no rollover
// Sanctuary: 1 month rollover (800 max carryover)
// Oasis: 2 months rollover (4000 max carryover)
export const PLAN_ROLLOVER_CAPS: Record<string, number> = {
  GROVE: 0,
  SANCTUARY: 800,
  OASIS: 4000,
};

export const getCreditAmountFromPlanName = (planName: string): number => {
  const credits = PLAN_CREDITS_MONTHLY[planName];
  if (credits === undefined) {
    throw new Error(`Unknown plan name: ${planName}`);
  }
  return credits;
};

export const getCreditAmountFromPriceId = (priceId?: string): number | null => {
  if (!priceId) return null;

  switch (priceId) {
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_1000:
      return 1000;
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_500:
      return 500;
    case process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100:
      return 100;
    default:
      return null;
  }
};

export const calculateProratedCredits = (
  currentPlanCredits: number,
  newPlanCredits: number,
  daysRemainingInPeriod: number,
  totalDaysInPeriod: number,
  isUpgrade: boolean,
): number => {
  if (!isUpgrade) {
    return 0;
  }

  const creditDifference = newPlanCredits - currentPlanCredits;
  return Math.floor(
    (creditDifference * daysRemainingInPeriod) / totalDaysInPeriod,
  );
};

export const getDaysInPeriod = (billingPeriod: "monthly" | "annual"): number =>
  billingPeriod === "monthly" ? 30 : 365;

export const calculateDaysRemaining = (currentPeriodEnd: Date): number => {
  const now = new Date();
  const diffTime = currentPeriodEnd.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
