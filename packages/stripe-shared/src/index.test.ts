import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  calculateDaysRemaining,
  calculateProratedCredits,
  createStripeHelpers,
  getDaysInPeriod,
  mapStripeStatus,
} from "./index";

/**
 * These are the money + plan-resolution primitives every brand's checkout
 * and webhook handler runs through. A silent bug here either grants the
 * wrong number of credits, mislabels a subscription's state, or fails to
 * resolve a Stripe price to a plan — all of which are direct revenue/trust
 * incidents. Hence the exhaustive table coverage.
 */

describe("mapStripeStatus", () => {
  it.each([
    ["trialing", "TRIALING"],
    ["active", "ACTIVE"],
    ["past_due", "PAST_DUE"],
    ["canceled", "CANCELLED"],
    ["unpaid", "UNPAID"],
    ["incomplete", "INCOMPLETE"],
    ["paused", "PAUSED"],
  ])("maps Stripe status %s -> %s", (stripeStatus, expected) => {
    expect(mapStripeStatus(stripeStatus)).toBe(expected);
  });

  it("falls back to EXPIRED for any unknown status", () => {
    expect(mapStripeStatus("something_new_from_stripe")).toBe("EXPIRED");
    expect(mapStripeStatus("")).toBe("EXPIRED");
  });

  it('does NOT treat the American spelling "cancelled" as known (Stripe sends "canceled")', () => {
    // Guards against a future refactor flipping the key — Stripe's wire
    // value is the single-l "canceled"; anything else must be EXPIRED.
    expect(mapStripeStatus("cancelled")).toBe("EXPIRED");
  });
});

describe("calculateProratedCredits", () => {
  it("returns 0 when it is not an upgrade (downgrades never refund credits)", () => {
    expect(calculateProratedCredits(100, 500, 15, 30, false)).toBe(0);
  });

  it("prorates the credit difference by the fraction of the period remaining", () => {
    // (500 - 100) * 15 / 30 = 200
    expect(calculateProratedCredits(100, 500, 15, 30, true)).toBe(200);
  });

  it("floors fractional credits (never over-grant)", () => {
    // (500 - 100) * 10 / 30 = 133.33 -> 133
    expect(calculateProratedCredits(100, 500, 10, 30, true)).toBe(133);
  });

  it("grants the full difference when the whole period remains", () => {
    expect(calculateProratedCredits(100, 500, 30, 30, true)).toBe(400);
  });

  it("grants nothing when no days remain", () => {
    expect(calculateProratedCredits(100, 500, 0, 30, true)).toBe(0);
  });

  it('can return a negative number if "upgrade" is mislabelled (caller must guard)', () => {
    // Documents current behaviour: the function trusts the isUpgrade flag.
    // newPlanCredits < currentPlanCredits with isUpgrade=true yields a
    // negative — a regression here (e.g. Math.abs) would silently change
    // the contract callers depend on.
    expect(calculateProratedCredits(500, 100, 30, 30, true)).toBe(-400);
  });
});

describe("getDaysInPeriod", () => {
  it("treats a monthly period as 30 days", () => {
    expect(getDaysInPeriod("monthly")).toBe(30);
  });

  it("treats an annual period as 365 days", () => {
    expect(getDaysInPeriod("annual")).toBe(365);
  });
});

describe("calculateDaysRemaining", () => {
  it("rounds up partial days remaining", () => {
    const in10AndAHalfDays = new Date(Date.now() + 10.5 * 24 * 60 * 60 * 1000);
    expect(calculateDaysRemaining(in10AndAHalfDays)).toBe(11);
  });

  it("returns a non-positive number for a period that already ended", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(calculateDaysRemaining(yesterday)).toBeLessThanOrEqual(0);
  });
});

describe("createStripeHelpers", () => {
  const config = {
    plans: [
      { name: "SPLASH", monthlyCredits: 250, rolloverCap: 0 },
      { name: "RAINBOW", monthlyCredits: 600, rolloverCap: 200 },
    ],
    priceEnvMappings: [
      {
        planName: "SPLASH",
        monthlyEnv: "PRICE_SPLASH_MONTHLY",
        annualEnv: "PRICE_SPLASH_ANNUAL",
      },
      {
        planName: "RAINBOW",
        currencies: [
          {
            monthlyEnv: "PRICE_RAINBOW_M_GBP",
            annualEnv: "PRICE_RAINBOW_A_GBP",
          },
          {
            monthlyEnv: "PRICE_RAINBOW_M_USD",
            annualEnv: "PRICE_RAINBOW_A_USD",
          },
        ],
      },
    ],
    creditPacks: [
      { credits: 100, env: "PRICE_PACK_100" },
      { credits: 500, envs: ["PRICE_PACK_500_GBP", "PRICE_PACK_500_USD"] },
    ],
  };

  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env.PRICE_SPLASH_MONTHLY = "price_splash_m";
    process.env.PRICE_SPLASH_ANNUAL = "price_splash_a";
    process.env.PRICE_RAINBOW_M_GBP = "price_rainbow_m_gbp";
    process.env.PRICE_RAINBOW_A_USD = "price_rainbow_a_usd";
    process.env.PRICE_PACK_100 = "price_pack_100";
    process.env.PRICE_PACK_500_USD = "price_pack_500_usd";
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("resolves a legacy single-currency monthly price to its plan", () => {
    const h = createStripeHelpers(config);
    expect(h.mapStripePriceToPlanName("price_splash_m")).toEqual({
      planName: "SPLASH",
      billingPeriod: "MONTHLY",
    });
  });

  it("resolves a legacy single-currency annual price to its plan", () => {
    const h = createStripeHelpers(config);
    expect(h.mapStripePriceToPlanName("price_splash_a")).toEqual({
      planName: "SPLASH",
      billingPeriod: "ANNUAL",
    });
  });

  it("resolves a multi-currency price across any registered currency variant", () => {
    const h = createStripeHelpers(config);
    expect(h.mapStripePriceToPlanName("price_rainbow_m_gbp")).toEqual({
      planName: "RAINBOW",
      billingPeriod: "MONTHLY",
    });
    expect(h.mapStripePriceToPlanName("price_rainbow_a_usd")).toEqual({
      planName: "RAINBOW",
      billingPeriod: "ANNUAL",
    });
  });

  it("throws on an unknown price ID rather than silently defaulting a plan", () => {
    const h = createStripeHelpers(config);
    expect(() => h.mapStripePriceToPlanName("price_unknown")).toThrowError(
      /Unknown price ID/,
    );
  });

  it("does not match a price whose env var is unset", () => {
    // PRICE_RAINBOW_M_USD is intentionally not set in beforeEach.
    const h = createStripeHelpers(config);
    expect(() =>
      h.mapStripePriceToPlanName("price_rainbow_m_usd"),
    ).toThrowError(/Unknown price ID/);
  });

  it("returns the monthly credit allotment for a known plan", () => {
    const h = createStripeHelpers(config);
    expect(h.getCreditAmountFromPlanName("SPLASH")).toBe(250);
    expect(h.getCreditAmountFromPlanName("RAINBOW")).toBe(600);
  });

  it("throws for an unknown plan name", () => {
    const h = createStripeHelpers(config);
    expect(() => h.getCreditAmountFromPlanName("NOPE")).toThrowError(
      /Unknown plan name/,
    );
  });

  it("resolves credit-pack price IDs (single and multi-currency) to credit amounts", () => {
    const h = createStripeHelpers(config);
    expect(h.getCreditAmountFromPriceId("price_pack_100")).toBe(100);
    expect(h.getCreditAmountFromPriceId("price_pack_500_usd")).toBe(500);
  });

  it("returns null for a missing/unknown credit-pack price ID", () => {
    const h = createStripeHelpers(config);
    expect(h.getCreditAmountFromPriceId(undefined)).toBeNull();
    expect(h.getCreditAmountFromPriceId("price_not_a_pack")).toBeNull();
  });

  it("returns the configured rollover cap, defaulting to 0 for unknown plans", () => {
    const h = createStripeHelpers(config);
    expect(h.getRolloverCap("RAINBOW")).toBe(200);
    expect(h.getRolloverCap("SPLASH")).toBe(0);
    expect(h.getRolloverCap("UNKNOWN_PLAN")).toBe(0);
  });
});
