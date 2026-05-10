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

/**
 * Single currency variant of a plan's monthly/annual env var pair.
 * Used inside PriceEnvMapping.currencies for multi-currency setups.
 */
export type PriceEnvCurrencyVariant = {
  /** Env var name for monthly price ID in this currency */
  monthlyEnv: string;
  /** Env var name for annual price ID in this currency */
  annualEnv: string;
};

export type PriceEnvMapping = {
  /** Plan name this price maps to */
  planName: string;
  /**
   * Single-currency env vars (legacy / single-currency apps).
   * If `currencies` is provided, these are ignored.
   */
  monthlyEnv?: string;
  annualEnv?: string;
  /**
   * Multi-currency env vars. Each entry registers one currency's
   * price IDs. `mapStripePriceToPlanName` walks all entries when
   * resolving a Stripe priceId to a plan.
   */
  currencies?: PriceEnvCurrencyVariant[];
};

export type CreditPackMapping = {
  /** Number of credits in the pack */
  credits: number;
  /**
   * Single-currency env var (legacy / single-currency apps).
   * If `envs` is provided, this is ignored.
   */
  env?: string;
  /**
   * Multi-currency env vars. Each string is the env var name for one
   * currency's Stripe price ID for this pack.
   */
  envs?: string[];
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
 * @example Single-currency (legacy)
 * ```ts
 * createStripeHelpers({
 *   plans: [{ name: "GROVE", monthlyCredits: 250, rolloverCap: 0 }],
 *   priceEnvMappings: [
 *     { planName: "GROVE", monthlyEnv: "STRIPE_PRICE_GROVE_MONTHLY", annualEnv: "STRIPE_PRICE_GROVE_ANNUAL" },
 *   ],
 *   creditPacks: [{ env: "STRIPE_PRICE_CREDITS_100", credits: 100 }],
 * });
 * ```
 *
 * @example Multi-currency
 * ```ts
 * createStripeHelpers({
 *   plans: [{ name: "SPLASH", monthlyCredits: 250, rolloverCap: 0 }],
 *   priceEnvMappings: [
 *     {
 *       planName: "SPLASH",
 *       currencies: [
 *         { monthlyEnv: "STRIPE_PRICE_SPLASH_MONTHLY_GBP", annualEnv: "STRIPE_PRICE_SPLASH_ANNUAL_GBP" },
 *         { monthlyEnv: "STRIPE_PRICE_SPLASH_MONTHLY_USD", annualEnv: "STRIPE_PRICE_SPLASH_ANNUAL_USD" },
 *       ],
 *     },
 *   ],
 *   creditPacks: [
 *     { credits: 100, envs: ["STRIPE_PRICE_CREDITS_100_GBP", "STRIPE_PRICE_CREDITS_100_USD"] },
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
      // Multi-currency mappings have a `currencies` array of variants;
      // legacy single-currency mappings use `monthlyEnv`/`annualEnv`
      // directly. Normalize both into a single iterable so the match
      // logic stays in one place.
      const variants: PriceEnvCurrencyVariant[] = mapping.currencies?.length
        ? mapping.currencies
        : mapping.monthlyEnv && mapping.annualEnv
          ? [{ monthlyEnv: mapping.monthlyEnv, annualEnv: mapping.annualEnv }]
          : [];

      for (const variant of variants) {
        const monthlyPriceId = process.env[variant.monthlyEnv];
        const annualPriceId = process.env[variant.annualEnv];

        if (monthlyPriceId && priceId === monthlyPriceId) {
          return {
            planName: mapping.planName,
            billingPeriod: "MONTHLY" as BillingPeriod,
          };
        }
        if (annualPriceId && priceId === annualPriceId) {
          return {
            planName: mapping.planName,
            billingPeriod: "ANNUAL" as BillingPeriod,
          };
        }
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
      // Multi-currency packs use `envs` (array); legacy single-currency
      // packs use `env`. Walk whichever is provided.
      const envs = pack.envs?.length ? pack.envs : pack.env ? [pack.env] : [];
      for (const env of envs) {
        if (priceId === process.env[env]) {
          return pack.credits;
        }
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
