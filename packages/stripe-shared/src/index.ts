/**
 * @one-colored-pixel/stripe-shared
 *
 * Shared Stripe utilities for all One Colored Pixel apps.
 * Provides configurable plan mapping, credit calculations,
 * and status mapping.
 */

import { SubscriptionStatus, BillingPeriod } from "@one-colored-pixel/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlanConfig = {
  /** Plan name (e.g. "SPLASH", "GROVE") */
  name: string;
  /** Monthly credit allotment */
  monthlyCredits: number;
  /** Max credits that roll over (0 = no rollover) */
  rolloverCap: number;
};

export type PriceEnvMapping = {
  /** Env var name for monthly price ID */
  monthlyEnv: string;
  /** Env var name for annual price ID */
  annualEnv: string;
  /** Plan name this price maps to */
  planName: string;
};

export type CreditPackMapping = {
  /** Env var name for this credit pack's price ID */
  env: string;
  /** Number of credits in the pack */
  credits: number;
};

export type StripeAppConfig = {
  plans: PlanConfig[];
  priceEnvMappings: PriceEnvMapping[];
  creditPacks: CreditPackMapping[];
};

export type PriceMapping = {
  planName: string;
  billingPeriod: BillingPeriod;
};

// ─── Pure utility functions (no config needed) ──────────────────────────────

/**
 * Map Stripe subscription status string to our SubscriptionStatus enum.
 */
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

/**
 * Calculate prorated credits when upgrading plans mid-cycle.
 */
export const calculateProratedCredits = (
  currentPlanCredits: number,
  newPlanCredits: number,
  daysRemainingInPeriod: number,
  totalDaysInPeriod: number,
  isUpgrade: boolean,
): number => {
  if (!isUpgrade) return 0;
  const creditDifference = newPlanCredits - currentPlanCredits;
  return Math.floor(
    (creditDifference * daysRemainingInPeriod) / totalDaysInPeriod,
  );
};

/**
 * Get the number of days in a billing period.
 */
export const getDaysInPeriod = (billingPeriod: "monthly" | "annual"): number =>
  billingPeriod === "monthly" ? 30 : 365;

/**
 * Calculate days remaining until a period end date.
 */
export const calculateDaysRemaining = (currentPeriodEnd: Date): number => {
  const now = new Date();
  const diffTime = currentPeriodEnd.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ─── Configurable helpers (created per-app) ─────────────────────────────────

/**
 * Create app-specific Stripe helpers from a plan configuration.
 *
 * @example
 * ```ts
 * const stripeHelpers = createStripeHelpers({
 *   plans: [
 *     { name: "SPLASH", monthlyCredits: 250, rolloverCap: 0 },
 *     { name: "RAINBOW", monthlyCredits: 500, rolloverCap: 500 },
 *   ],
 *   priceEnvMappings: [
 *     { monthlyEnv: "NEXT_PUBLIC_STRIPE_PRICE_SPLASH_MONTHLY", annualEnv: "NEXT_PUBLIC_STRIPE_PRICE_SPLASH_ANNUAL", planName: "SPLASH" },
 *   ],
 *   creditPacks: [
 *     { env: "NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100", credits: 100 },
 *   ],
 * });
 * ```
 */
export function createStripeHelpers(config: StripeAppConfig) {
  const planCreditsMap = Object.fromEntries(
    config.plans.map((p) => [p.name, p.monthlyCredits]),
  );

  const rolloverCapsMap = Object.fromEntries(
    config.plans.map((p) => [p.name, p.rolloverCap]),
  );

  function mapStripePriceToPlanName(priceId: string): PriceMapping {
    for (const mapping of config.priceEnvMappings) {
      const monthlyPriceId = process.env[mapping.monthlyEnv];
      const annualPriceId = process.env[mapping.annualEnv];

      if (priceId === monthlyPriceId) {
        return {
          planName: mapping.planName,
          billingPeriod: "MONTHLY" as BillingPeriod,
        };
      }
      if (priceId === annualPriceId) {
        return {
          planName: mapping.planName,
          billingPeriod: "ANNUAL" as BillingPeriod,
        };
      }
    }
    throw new Error(`Unknown price ID: ${priceId}`);
  }

  function getCreditAmountFromPlanName(planName: string): number {
    const credits = planCreditsMap[planName];
    if (credits === undefined) {
      throw new Error(`Unknown plan name: ${planName}`);
    }
    return credits;
  }

  function getCreditAmountFromPriceId(priceId?: string): number | null {
    if (!priceId) return null;
    for (const pack of config.creditPacks) {
      if (priceId === process.env[pack.env]) {
        return pack.credits;
      }
    }
    return null;
  }

  function getRolloverCap(planName: string): number {
    return rolloverCapsMap[planName] ?? 0;
  }

  return {
    mapStripePriceToPlanName,
    getCreditAmountFromPlanName,
    getCreditAmountFromPriceId,
    getRolloverCap,
    planCredits: planCreditsMap,
    rolloverCaps: rolloverCapsMap,
  };
}
