// @ts-nocheck — TODO: adapt for Habitat auth & db
"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { ACTIONS } from "@/constants";
import { db, Prisma } from "@one-colored-pixel/db";

/**
 * Get the current user ID from either:
 * 1. Web session (NextAuth) - checked first
 * 2. Mobile JWT header (x-user-id) - set by middleware for mobile requests
 */
export const getUserId = async (action?: string) => {
  // Check web session first
  const session = await auth();
  let userId = session?.user?.id;

  // Fall back to mobile JWT (x-user-id header set by middleware)
  if (!userId) {
    const headersList = await headers();
    userId = headersList.get("x-user-id") ?? undefined;
  }

  // These actions can return null without logging an error (guest-friendly)
  if (
    action === ACTIONS.GET_CURRENT_USER ||
    action === ACTIONS.GET_ENTITLEMENTS ||
    action === ACTIONS.GET_ALL_COLORING_IMAGES ||
    action === ACTIONS.CREATE_COLORING_IMAGE ||
    action === ACTIONS.CREATE_CHECKOUT_SESSION ||
    action === ACTIONS.GET_ACTIVE_PROFILE ||
    action === "track analytics event"
  ) {
    return userId;
  }

  if (!userId) {
    console.error(
      `You need to be logged in to ${action || "perform this action"}.`,
    );
    return null;
  }

  return userId;
};

/**
 * Get the current profile ID from either:
 * 1. Mobile JWT header (x-profile-id) - set by middleware for mobile requests
 * 2. User's active profile lookup - fallback for web sessions
 */
export const getProfileId = async (): Promise<string | null> => {
  const headersList = await headers();
  const profileIdFromHeader = headersList.get("x-profile-id");

  if (profileIdFromHeader) {
    return profileIdFromHeader;
  }

  const userId = await getUserId(ACTIONS.GET_ACTIVE_PROFILE);

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });

  return user?.activeProfileId ?? null;
};

export const getCurrentUser = async (): Promise<Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    image: true;
    stripeCustomerId: true;
    credits: true;
    subscriptions: {
      select: {
        id: true;
        stripeSubscriptionId: true;
        planName: true;
        billingPeriod: true;
        status: true;
        currentPeriodEnd: true;
      };
    };
  };
}> | null> => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      stripeCustomerId: true,
      credits: true,
      subscriptions: {
        select: {
          id: true,
          stripeSubscriptionId: true,
          planName: true,
          billingPeriod: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  return user;
};
