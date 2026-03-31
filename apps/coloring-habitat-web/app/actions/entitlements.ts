"use server";

import { db, SubscriptionStatus } from "@one-colored-pixel/db";
import { ACTIONS } from "@/constants";
import { PLAN_CREDITS_MONTHLY, type HabitatPlanName } from "@/utils/stripe";
import { getUserId } from "./user";

// Feature flags per plan (Habitat-specific, no profile/sticker features)
const PLAN_FEATURES: Record<
  HabitatPlanName | "FREE",
  {
    canGenerate: boolean;
    canDownload: boolean;
    canUseCamera: boolean;
    hasMagicBrush: boolean;
    hasPrioritySupport: boolean;
    hasCommercialUse: boolean;
    maxSavedArtworks: number;
  }
> = {
  FREE: {
    canGenerate: false,
    canDownload: true,
    canUseCamera: false,
    hasMagicBrush: false,
    hasPrioritySupport: false,
    hasCommercialUse: false,
    maxSavedArtworks: 5,
  },
  BLOOM: {
    canGenerate: false,
    canDownload: true,
    canUseCamera: false,
    hasMagicBrush: false,
    hasPrioritySupport: false,
    hasCommercialUse: false,
    maxSavedArtworks: 5,
  },
  GROVE: {
    canGenerate: true,
    canDownload: true,
    canUseCamera: true,
    hasMagicBrush: true,
    hasPrioritySupport: false,
    hasCommercialUse: false,
    maxSavedArtworks: 100,
  },
  SANCTUARY: {
    canGenerate: true,
    canDownload: true,
    canUseCamera: true,
    hasMagicBrush: true,
    hasPrioritySupport: true,
    hasCommercialUse: false,
    maxSavedArtworks: 500,
  },
  OASIS: {
    canGenerate: true,
    canDownload: true,
    canUseCamera: true,
    hasMagicBrush: true,
    hasPrioritySupport: true,
    hasCommercialUse: true,
    maxSavedArtworks: -1, // unlimited
  },
};

export type EntitlementsResponse = {
  hasAccess: boolean;
  plan: HabitatPlanName | "FREE";
  status: SubscriptionStatus | "NONE";
  platform: "STRIPE" | null;
  expiresAt: string | null;
  isTrialing: boolean;
  isCancelled: boolean;
  credits: number;
  creditsPerMonth: number;
  features: (typeof PLAN_FEATURES)[HabitatPlanName | "FREE"];
};

/**
 * Get the current user's subscription entitlements.
 *
 * Returns:
 * - hasAccess: whether user has an active subscription
 * - plan: current plan name or 'FREE'
 * - credits: available credits
 * - features: feature flags based on plan
 */
export async function getEntitlements(): Promise<EntitlementsResponse | null> {
  const userId = await getUserId(ACTIONS.GET_ENTITLEMENTS);

  if (!userId) {
    return null;
  }

  // Get user with subscriptions
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Find the active subscription (most recent that's active/trialing)
  const activeSubscription = user.subscriptions.find(
    (sub) =>
      sub.status === SubscriptionStatus.ACTIVE ||
      sub.status === SubscriptionStatus.TRIALING ||
      // PAST_DUE still has access during grace period
      (sub.status === SubscriptionStatus.PAST_DUE &&
        sub.gracePeriodEnd &&
        sub.gracePeriodEnd > new Date()) ||
      // CANCELLED still has access until period end
      (sub.status === SubscriptionStatus.CANCELLED &&
        sub.currentPeriodEnd > new Date()),
  );

  if (!activeSubscription) {
    // No active subscription - return free tier
    return {
      hasAccess: false,
      plan: "FREE",
      status: "NONE",
      platform: null,
      expiresAt: null,
      isTrialing: false,
      isCancelled: false,
      credits: user.credits,
      creditsPerMonth: 0,
      features: PLAN_FEATURES.FREE,
    };
  }

  // User has an active subscription
  const plan = (activeSubscription.planName as HabitatPlanName) || "FREE";
  const isTrialing = activeSubscription.status === SubscriptionStatus.TRIALING;
  const isCancelled = activeSubscription.cancelledAt !== null;

  return {
    hasAccess: true,
    plan,
    status: activeSubscription.status,
    platform: "STRIPE",
    expiresAt: activeSubscription.currentPeriodEnd.toISOString(),
    isTrialing,
    isCancelled,
    credits: user.credits,
    creditsPerMonth: PLAN_CREDITS_MONTHLY[plan] || 0,
    features: PLAN_FEATURES[plan] || PLAN_FEATURES.FREE,
  };
}
