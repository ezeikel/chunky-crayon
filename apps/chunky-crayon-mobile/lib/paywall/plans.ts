import {
  faDroplet,
  faRainbow,
  faSparkles,
} from "@fortawesome/pro-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { PurchasesPackage } from "react-native-purchases";
import { getPackagePlanName } from "@/hooks/usePaywall";

/**
 * Single source of truth for subscription plan presentation (Splash /
 * Rainbow / Sparkle). Both the subscription paywall modal and any other
 * surface that lists plans read from here, so plan copy can't drift
 * between two hardcoded copies (it used to — `Paywall` and
 * `SubscriptionPaywallModal` each had their own taglines/features).
 *
 * Copy is kept aligned with CC web's pricing page (web is the reference).
 * Prices are NOT here — those come per-locale from the store via
 * RevenueCat (`product.priceString`). Only the marketing copy, icons,
 * recommended flag, and the credits-fallback live here.
 */

export type PlanKey = "SPLASH" | "RAINBOW" | "SPARKLE";

/** Plan order top-to-bottom in the paywall. */
export const PLAN_DISPLAY_ORDER: readonly PlanKey[] = [
  "SPLASH",
  "RAINBOW",
  "SPARKLE",
];

/** The plan that gets the "Most Popular" badge (matches CC web). */
export const RECOMMENDED_PLAN: PlanKey = "RAINBOW";

export const PLAN_DISPLAY_NAMES: Record<PlanKey, string> = {
  SPLASH: "Splash",
  RAINBOW: "Rainbow",
  SPARKLE: "Sparkle",
};

/**
 * Display names including the FREE tier, for surfaces that render the
 * user's *current* plan (e.g. SubscriptionManager) and so must name FREE
 * too — the paid-only `PLAN_DISPLAY_NAMES` omits it.
 */
export const PLAN_DISPLAY_NAMES_WITH_FREE: Record<"FREE" | PlanKey, string> = {
  FREE: "Free",
  ...PLAN_DISPLAY_NAMES,
};

export const PLAN_TAGLINES: Record<PlanKey, string> = {
  SPLASH: "Great for occasional creators",
  RAINBOW: "Perfect for creative families",
  SPARKLE: "For serious creators",
};

/**
 * Per-plan feature bullets, aligned with CC web's pricing page. The
 * credits line is intentionally first so it reads as the headline
 * benefit; the rest qualify what the plan unlocks.
 */
export const PLAN_FEATURES: Record<PlanKey, readonly string[]> = {
  SPLASH: [
    "250 credits/month (~50 pages)",
    "All platform features",
    "Credits reset monthly",
  ],
  RAINBOW: [
    "500 credits/month (~100 pages)",
    "All platform features",
    "Unused credits roll over (1 month)",
    "Priority support",
  ],
  SPARKLE: [
    "1,000 credits/month (~200 pages)",
    "All platform features",
    "Extended rollover (2 months)",
    "Commercial use license",
  ],
};

/**
 * Detailed "what your plan includes" bullets for the subscription
 * manager (the in-app current-plan breakdown). Deliberately more granular
 * than the paywall's marketing-focused `PLAN_FEATURES` — it spells out
 * the concrete entitlements (profiles, tools) a subscriber already has,
 * where the paywall sells the headline benefits. Both live here so the
 * two surfaces can't silently drift.
 */
export const PLAN_FEATURES_DETAILED: Record<PlanKey, readonly string[]> = {
  SPLASH: [
    "250 credits/month",
    "3 profiles",
    "Magic Brush",
    "Voice input",
    "Camera input",
  ],
  RAINBOW: [
    "500 credits/month",
    "5 profiles",
    "Everything in Splash",
    "Priority support",
    "Credit rollover",
  ],
  SPARKLE: [
    "1,000 credits/month",
    "10 profiles",
    "Everything in Rainbow",
    "Commercial use",
    "2x credit rollover",
  ],
};

export const PLAN_ICONS: Record<PlanKey, IconDefinition> = {
  SPLASH: faDroplet,
  RAINBOW: faRainbow,
  SPARKLE: faSparkles,
};

export const PLAN_COLORS: Record<PlanKey, string> = {
  SPLASH: "#7DD3FC", // sky-300
  RAINBOW: "#F9A8D4", // pink-300
  SPARKLE: "#FCD34D", // amber-300
};

/**
 * Monthly credit grant per plan, used as a fallback when the store
 * product doesn't carry `metadata.credits`. The store metadata is the
 * canonical source; this just keeps the UI sensible if it's missing.
 */
export const CREDITS_PER_PLAN_FALLBACK: Record<PlanKey, number> = {
  SPLASH: 250,
  RAINBOW: 500,
  SPARKLE: 1000,
};

/**
 * Resolve the monthly credit grant for a package: prefer the store's
 * `product.metadata.credits`, fall back to the per-plan default. Shared
 * so every plan surface derives credits the same way.
 */
export function getCreditsForPlan(pkg: PurchasesPackage): number {
  const meta = (
    pkg.product as PurchasesPackage["product"] & {
      metadata?: Record<string, unknown>;
    }
  ).metadata;
  const fromMetadata = meta?.credits;
  if (fromMetadata != null) {
    const parsed = Number(fromMetadata);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return CREDITS_PER_PLAN_FALLBACK[getPackagePlanName(pkg)] ?? 0;
}
