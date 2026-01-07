'use server';

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { ACTIONS } from '@/constants';
import { db, Prisma } from '@chunky-crayon/db';
import { getStickerStats } from '@/lib/stickers/service';

/**
 * Get the current user ID from either:
 * 1. Web session (NextAuth) - checked first
 * 2. Mobile JWT header (x-user-id) - set by middleware for mobile requests
 *
 * This unified approach allows server actions to work for both web and mobile.
 */
export const getUserId = async (action?: string) => {
  // Check web session first
  const session = await auth();
  let userId = session?.user?.id;

  // Fall back to mobile JWT (x-user-id header set by middleware)
  if (!userId) {
    const headersList = await headers();
    userId = headersList.get('x-user-id') ?? undefined;
  }

  // These actions can return null without logging an error (guest-friendly)
  if (
    action === ACTIONS.GET_CURRENT_USER ||
    action === ACTIONS.GET_ENTITLEMENTS ||
    action === ACTIONS.GET_ALL_COLORING_IMAGES ||
    action === ACTIONS.CREATE_CHECKOUT_SESSION ||
    action === ACTIONS.GET_ACTIVE_PROFILE
  ) {
    return userId;
  }

  if (!userId) {
    console.error(
      `You need to be logged in to ${action || 'perform this action'}.`,
    );
    return null;
  }

  return userId;
};

/**
 * Get the current profile ID from either:
 * 1. Mobile JWT header (x-profile-id) - set by middleware for mobile requests
 * 2. User's active profile lookup - fallback for web sessions
 *
 * Returns null if no profile context is available.
 */
export const getProfileId = async (): Promise<string | null> => {
  // Check mobile JWT header first (set by middleware)
  const headersList = await headers();
  const profileIdFromHeader = headersList.get('x-profile-id');

  if (profileIdFromHeader) {
    return profileIdFromHeader;
  }

  // Fall back to looking up user's active profile
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

/**
 * Get the device ID from mobile JWT header (x-device-id)
 * Only available for mobile requests.
 */
export const getDeviceId = async (): Promise<string | null> => {
  const headersList = await headers();
  return headersList.get('x-device-id');
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

/**
 * Mobile user data response type
 */
export type MobileUserResponse = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    credits: number;
    subscription: {
      planName: string;
      billingPeriod: string;
      status: string;
      currentPeriodEnd: Date;
    } | null;
  } | null;
  activeProfile: {
    id: string;
    name: string;
    avatarId: string | null;
    ageGroup: string | null;
    difficulty: string | null;
    artworkCount: number;
  } | null;
  stickerStats: {
    totalUnlocked: number;
    totalPossible: number;
    newCount: number;
  };
};

/**
 * Server action to get the current mobile user data.
 * Uses unified auth that works for both web sessions and mobile JWT.
 *
 * Returns:
 * - user: Current user info with subscription
 * - activeProfile: The user's active profile with artwork count
 * - stickerStats: Sticker unlock progress
 */
export async function getMobileUserAction(): Promise<MobileUserResponse> {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);

  const emptyResponse: MobileUserResponse = {
    user: null,
    activeProfile: null,
    stickerStats: {
      totalUnlocked: 0,
      totalPossible: 0,
      newCount: 0,
    },
  };

  if (!userId) {
    return emptyResponse;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      credits: true,
      activeProfileId: true,
      subscriptions: {
        where: {
          OR: [{ status: 'ACTIVE' }, { status: 'TRIALING' }],
        },
        select: {
          planName: true,
          billingPeriod: true,
          status: true,
          currentPeriodEnd: true,
        },
        take: 1,
      },
      profiles: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          avatarId: true,
          ageGroup: true,
          difficulty: true,
          isDefault: true,
          _count: {
            select: {
              savedArtworks: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return emptyResponse;
  }

  // Determine active profile (priority: activeProfileId > isDefault > first)
  const activeProfile =
    user.profiles.find((p) => p.id === user.activeProfileId) ||
    user.profiles.find((p) => p.isDefault) ||
    user.profiles[0];

  const stickerStats = await getStickerStats(userId);
  const activeSubscription = user.subscriptions[0];

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      credits: user.credits,
      subscription: activeSubscription
        ? {
            planName: activeSubscription.planName,
            billingPeriod: activeSubscription.billingPeriod,
            status: activeSubscription.status,
            currentPeriodEnd: activeSubscription.currentPeriodEnd,
          }
        : null,
    },
    activeProfile: activeProfile
      ? {
          id: activeProfile.id,
          name: activeProfile.name,
          avatarId: activeProfile.avatarId,
          ageGroup: activeProfile.ageGroup,
          difficulty: activeProfile.difficulty,
          artworkCount: activeProfile._count.savedArtworks,
        }
      : null,
    stickerStats: {
      totalUnlocked: stickerStats.totalUnlocked,
      totalPossible: stickerStats.totalPossible,
      newCount: stickerStats.newCount,
    },
  };
}
