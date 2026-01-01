import { SignJWT, jwtVerify } from 'jose';
import { db, AgeGroup, Difficulty } from '@chunky-crayon/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.MOBILE_AUTH_SECRET ||
    process.env.NEXT_AUTH_SECRET ||
    'dev-secret-change-me',
);

// Token expiration: 1 year for device tokens (they're device-bound anyway)
const TOKEN_EXPIRATION = '365d';

export type MobileTokenPayload = {
  deviceId: string;
  userId?: string; // Set when linked to an OAuth account
  profileId?: string; // Current active profile
  type: 'device' | 'user';
};

/**
 * Create a JWT token for a device
 */
export async function createDeviceToken(
  deviceId: string,
  userId?: string,
  profileId?: string,
): Promise<string> {
  const token = await new SignJWT({
    deviceId,
    userId,
    profileId,
    type: userId ? 'user' : 'device',
  } as MobileTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a mobile token
 */
export async function verifyMobileToken(
  token: string,
): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as MobileTokenPayload;
  } catch (error) {
    console.error('Failed to verify mobile token:', error);
    return null;
  }
}

/**
 * Get or create a user for a device
 * Creates an anonymous device-based user if one doesn't exist
 */
export async function getOrCreateDeviceUser(deviceId: string): Promise<{
  userId: string;
  profileId: string;
  isNew: boolean;
}> {
  // Check if we have an existing device session
  const existingSession = await db.mobileDeviceSession.findUnique({
    where: { deviceId },
    include: {
      user: {
        include: {
          profiles: {
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
        },
      },
    },
  });

  if (existingSession?.user) {
    const profile = existingSession.user.profiles[0];
    return {
      userId: existingSession.userId,
      profileId: profile?.id || '',
      isNew: false,
    };
  }

  // Create new anonymous user and default profile
  const user = await db.user.create({
    data: {
      // Anonymous user - no email
      name: 'Mobile User',
      profiles: {
        create: {
          name: 'Artist',
          avatarId: 'default',
          ageGroup: AgeGroup.CHILD,
          difficulty: Difficulty.BEGINNER,
          isDefault: true,
        },
      },
    },
    include: {
      profiles: true,
    },
  });

  // Create device session
  await db.mobileDeviceSession.create({
    data: {
      deviceId,
      userId: user.id,
    },
  });

  return {
    userId: user.id,
    profileId: user.profiles[0]?.id || '',
    isNew: true,
  };
}

/**
 * Merge an anonymous user's data into a target user
 * Transfers: profiles, saved artworks, stickers, Colo progress
 */
async function mergeAnonymousUserIntoTarget(
  anonymousUserId: string,
  targetUserId: string,
): Promise<void> {
  // Get anonymous user's data
  const anonymousUser = await db.user.findUnique({
    where: { id: anonymousUserId },
    include: {
      profiles: true,
      savedArtworks: true,
      userStickers: true,
    },
  });

  if (!anonymousUser) return;

  // Transfer saved artworks to target user
  if (anonymousUser.savedArtworks.length > 0) {
    await db.savedArtwork.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: targetUserId },
    });
  }

  // Transfer stickers (only ones target doesn't have)
  if (anonymousUser.userStickers.length > 0) {
    const targetStickers = await db.userSticker.findMany({
      where: { userId: targetUserId },
      select: { stickerId: true },
    });
    const targetStickerIds = new Set(targetStickers.map((s) => s.stickerId));

    const newStickers = anonymousUser.userStickers.filter(
      (s) => !targetStickerIds.has(s.stickerId),
    );

    if (newStickers.length > 0) {
      await db.userSticker.createMany({
        data: newStickers.map((s) => ({
          userId: targetUserId,
          stickerId: s.stickerId,
          profileId: s.profileId,
          isNew: s.isNew,
          unlockedAt: s.unlockedAt,
        })),
        skipDuplicates: true,
      });
    }
  }

  // Transfer profiles (rename to avoid conflicts)
  if (anonymousUser.profiles.length > 0) {
    for (const profile of anonymousUser.profiles) {
      await db.profile.update({
        where: { id: profile.id },
        data: {
          userId: targetUserId,
          name: `${profile.name} (imported)`,
          isDefault: false, // Don't override target's default
        },
      });
    }
  }

  // Delete anonymous user's stickers (already transferred)
  await db.userSticker.deleteMany({
    where: { userId: anonymousUserId },
  });

  // Delete the anonymous user
  await db.user.delete({
    where: { id: anonymousUserId },
  });
}

/**
 * Handle OAuth sign-in for a mobile device
 * - If user has no email (anonymous): Update with OAuth email
 * - If email already exists: Merge anonymous data into existing user
 * - Returns the final user ID and new token
 */
export async function handleMobileOAuthSignIn(
  deviceId: string,
  email: string,
  name?: string,
): Promise<{
  userId: string;
  profileId: string;
  token: string;
  isNewUser: boolean;
  wasMerged: boolean;
}> {
  // Get current device session
  const deviceSession = await db.mobileDeviceSession.findUnique({
    where: { deviceId },
    include: {
      user: {
        include: {
          profiles: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  // Check if user with this email already exists
  const existingUserWithEmail = await db.user.findUnique({
    where: { email },
    include: {
      profiles: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  let finalUserId: string;
  let finalProfileId: string;
  let isNewUser = false;
  let wasMerged = false;

  if (!deviceSession) {
    // Device not registered yet
    if (existingUserWithEmail) {
      // User already exists - link device to them
      finalUserId = existingUserWithEmail.id;
      finalProfileId = existingUserWithEmail.profiles[0]?.id || '';

      await db.mobileDeviceSession.create({
        data: { deviceId, userId: finalUserId },
      });
    } else {
      // Create new user with email
      const newUser = await db.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          profiles: {
            create: {
              name: 'Artist',
              avatarId: 'default',
              ageGroup: AgeGroup.CHILD,
              difficulty: Difficulty.BEGINNER,
              isDefault: true,
            },
          },
        },
        include: { profiles: true },
      });

      finalUserId = newUser.id;
      finalProfileId = newUser.profiles[0]?.id || '';
      isNewUser = true;

      await db.mobileDeviceSession.create({
        data: { deviceId, userId: finalUserId },
      });
    }
  } else {
    // Device already registered
    const currentUser = deviceSession.user;
    const isAnonymous = !currentUser.email;

    if (existingUserWithEmail) {
      // Email belongs to an existing user
      if (existingUserWithEmail.id === currentUser.id) {
        // Same user - nothing to do
        finalUserId = currentUser.id;
        finalProfileId = currentUser.profiles[0]?.id || '';
      } else if (isAnonymous) {
        // Anonymous user signing in - merge into existing
        await mergeAnonymousUserIntoTarget(
          currentUser.id,
          existingUserWithEmail.id,
        );
        wasMerged = true;

        // Update device session
        await db.mobileDeviceSession.update({
          where: { deviceId },
          data: { userId: existingUserWithEmail.id },
        });

        finalUserId = existingUserWithEmail.id;
        finalProfileId = existingUserWithEmail.profiles[0]?.id || '';
      } else {
        // Different authenticated user - switch device to new user
        await db.mobileDeviceSession.update({
          where: { deviceId },
          data: { userId: existingUserWithEmail.id },
        });

        finalUserId = existingUserWithEmail.id;
        finalProfileId = existingUserWithEmail.profiles[0]?.id || '';
      }
    } else {
      // Email doesn't exist - update current user with email
      if (isAnonymous) {
        // Convert anonymous user to authenticated user
        await db.user.update({
          where: { id: currentUser.id },
          data: {
            email,
            name: name || currentUser.name || email.split('@')[0],
          },
        });

        finalUserId = currentUser.id;
        finalProfileId = currentUser.profiles[0]?.id || '';
      } else {
        // User already has a different email - create new user
        const newUser = await db.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            profiles: {
              create: {
                name: 'Artist',
                avatarId: 'default',
                ageGroup: AgeGroup.CHILD,
                difficulty: Difficulty.BEGINNER,
                isDefault: true,
              },
            },
          },
          include: { profiles: true },
        });

        await db.mobileDeviceSession.update({
          where: { deviceId },
          data: { userId: newUser.id },
        });

        finalUserId = newUser.id;
        finalProfileId = newUser.profiles[0]?.id || '';
        isNewUser = true;
      }
    }
  }

  // Create new token
  const token = await createDeviceToken(deviceId, finalUserId, finalProfileId);

  return {
    userId: finalUserId,
    profileId: finalProfileId,
    token,
    isNewUser,
    wasMerged,
  };
}

/**
 * Link a device to an existing user (after OAuth sign-in)
 * @deprecated Use handleMobileOAuthSignIn instead
 */
export async function linkDeviceToUser(
  deviceId: string,
  userId: string,
): Promise<void> {
  // Get existing device session
  const existingSession = await db.mobileDeviceSession.findUnique({
    where: { deviceId },
    include: { user: true },
  });

  if (!existingSession) {
    // Create new session linking device to user
    await db.mobileDeviceSession.create({
      data: {
        deviceId,
        userId,
      },
    });
    return;
  }

  if (existingSession.userId === userId) {
    // Already linked to this user
    return;
  }

  // Update device to point to the new user
  await db.mobileDeviceSession.update({
    where: { deviceId },
    data: { userId },
  });
}

/**
 * Get the user ID for a device (if registered)
 */
export async function getDeviceUserId(
  deviceId: string,
): Promise<string | null> {
  const session = await db.mobileDeviceSession.findUnique({
    where: { deviceId },
    select: { userId: true },
  });

  return session?.userId || null;
}

/**
 * Extract auth info from request headers
 * Supports both Bearer (JWT) and Device (deviceId) auth
 */
export async function getMobileAuthFromHeaders(headers: Headers): Promise<{
  userId: string | null;
  deviceId: string | null;
  profileId: string | null;
}> {
  const authHeader = headers.get('authorization');

  if (!authHeader) {
    return { userId: null, deviceId: null, profileId: null };
  }

  // Handle Bearer token (JWT)
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyMobileToken(token);

    if (payload) {
      return {
        userId: payload.userId || null,
        deviceId: payload.deviceId,
        profileId: payload.profileId || null,
      };
    }
  }

  // Handle Device ID (anonymous auth)
  if (authHeader.startsWith('Device ')) {
    const deviceId = authHeader.slice(7);
    const userId = await getDeviceUserId(deviceId);

    return {
      userId,
      deviceId,
      profileId: null,
    };
  }

  return { userId: null, deviceId: null, profileId: null };
}
