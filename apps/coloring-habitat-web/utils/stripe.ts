import {
  PlanName,
  BillingPeriod,
  SubscriptionStatus,
} from "@one-colored-pixel/db";

// Habitat plan names — wellness/mindfulness themed
export const HABITAT_PLANS = {
  BLOOM: "BLOOM", // Free tier
  GROVE: "GROVE", // Mid tier
  SANCTUARY: "SANCTUARY", // Premium tier
} as const;

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
