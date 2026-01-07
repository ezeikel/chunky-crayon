'use server';

import { db } from '@chunky-crayon/db';
import { SubscriptionStatus, PlanName } from '@chunky-crayon/db';
import { ACTIONS, PLAN_CREDITS_MONTHLY } from '@/constants';
import { getUserId } from './user';

// Feature flags per plan
const PLAN_FEATURES: Record<
  PlanName | 'FREE',
  {
    canGenerate: boolean;
    canDownload: boolean;
    canUseVoice: boolean;
    canUseCamera: boolean;
    maxProfiles: number;
    hasMagicBrush: boolean;
    hasAmbientSound: boolean;
    hasPrioritySupport: boolean;
    hasCommercialUse: boolean;
  }
> = {
  FREE: {
    canGenerate: false,
    canDownload: true,
    canUseVoice: false,
    canUseCamera: false,
    maxProfiles: 1,
    hasMagicBrush: false,
    hasAmbientSound: false,
    hasPrioritySupport: false,
    hasCommercialUse: false,
  },
  [PlanName.SPLASH]: {
    canGenerate: true,
    canDownload: true,
    canUseVoice: true,
    canUseCamera: true,
    maxProfiles: 3,
    hasMagicBrush: true,
    hasAmbientSound: true,
    hasPrioritySupport: false,
    hasCommercialUse: false,
  },
  [PlanName.RAINBOW]: {
    canGenerate: true,
    canDownload: true,
    canUseVoice: true,
    canUseCamera: true,
    maxProfiles: 5,
    hasMagicBrush: true,
    hasAmbientSound: true,
    hasPrioritySupport: true,
    hasCommercialUse: false,
  },
  [PlanName.SPARKLE]: {
    canGenerate: true,
    canDownload: true,
    canUseVoice: true,
    canUseCamera: true,
    maxProfiles: 10,
    hasMagicBrush: true,
    hasAmbientSound: true,
    hasPrioritySupport: true,
    hasCommercialUse: true,
  },
};

export type EntitlementsResponse = {
  hasAccess: boolean;
  plan: PlanName | 'FREE';
  status: SubscriptionStatus | 'NONE';
  platform: 'STRIPE' | 'REVENUECAT' | null;
  expiresAt: string | null;
  isTrialing: boolean;
  isCancelled: boolean;
  credits: number;
  creditsPerMonth: number;
  features: (typeof PLAN_FEATURES)[PlanName | 'FREE'];
};

/**
 * Get the current user's subscription entitlements.
 * Works for both web (session auth) and mobile (JWT auth via headers).
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
        orderBy: { createdAt: 'desc' },
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
      plan: 'FREE',
      status: 'NONE',
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
  const plan = activeSubscription.planName;
  const isTrialing = activeSubscription.status === SubscriptionStatus.TRIALING;
  const isCancelled = activeSubscription.cancelledAt !== null;

  return {
    hasAccess: true,
    plan,
    status: activeSubscription.status,
    platform: activeSubscription.platform,
    expiresAt: activeSubscription.currentPeriodEnd.toISOString(),
    isTrialing,
    isCancelled,
    credits: user.credits,
    creditsPerMonth: PLAN_CREDITS_MONTHLY[plan],
    features: PLAN_FEATURES[plan],
  };
}
