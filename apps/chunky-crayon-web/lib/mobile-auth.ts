import { SignJWT, jwtVerify } from 'jose';
import { db, AgeGroup, Difficulty } from '@one-colored-pixel/db';
import { computeMergedCredits } from './mobile-auth-credits';
import { createPostHogClient } from './posthog-server';

/**
 * Stitch an anonymous person's PostHog history onto the target (surviving)
 * person when an anon device signs in with an email that ALREADY has an account
 * (2nd device, or web-first-then-mobile). Both distinct_ids are
 * already-identified PostHog persons (anon was identified on mobile, target on
 * web/another device), so plain `alias` is refused — `$merge_dangerously` is the
 * sanctioned one-off for exactly this case (the anon row is being deleted, so
 * the irreversibility caveat is moot). Without this, the anon device's
 * pre-signin events strand on the dead cuid. Best-effort: never block sign-in.
 */
async function mergePostHogPersons(
  anonDistinctId: string,
  targetDistinctId: string,
): Promise<void> {
  const posthog = createPostHogClient();
  if (!posthog) return;
  try {
    posthog.capture({
      distinctId: targetDistinctId,
      event: '$merge_dangerously',
      properties: { alias: anonDistinctId },
    });
    await posthog.shutdown();
  } catch {
    // Analytics must never break the sign-in flow.
  }
}

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

  // No session yet → create the anonymous user + default "Artist" profile
  // ONLY inside the upsert's `create` branch, gated by `deviceId @unique`.
  //
  // Why upsert (not user.create + separate session.create): the old flow ran
  // those as two non-transactional writes, so two concurrent /register calls
  // (cold-start race / token-loss re-register) both passed the findUnique
  // guard above and both created a user+profile — only the 2nd session insert
  // hit the unique constraint, leaving the 1st user+profile orphaned. That
  // produced the duplicate "Artist" profiles. Nesting the user/profile create
  // inside `mobileDeviceSession.upsert({ create })` makes `deviceId @unique`
  // gate the whole creation atomically: first writer wins, the loser resolves
  // to the no-op `update` branch and re-reads the winner's row. No orphan is
  // ever committed; no schema migration needed.
  const session = await db.mobileDeviceSession.upsert({
    where: { deviceId },
    update: {},
    create: {
      deviceId,
      user: {
        create: {
          // Anonymous device user — no email AND no name (both null is the
          // honest "anonymous, not yet known" state, mirroring each other).
          // Previously defaulted name to 'Mobile User', which leaked a
          // placeholder into every consumer (PostHog person list showed a wall
          // of identical 'Mobile User' labels, Sentry, any UI greeting). `name`
          // is String? in the schema; readers already null-guard it (mobile
          // type is `name: string | null`). A real name is set when the user
          // signs in (handleMobileOAuthSignIn) or stays null while anonymous.
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
      },
    },
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

  const profile = session.user.profiles[0];
  return {
    userId: session.userId,
    profileId: profile?.id || '',
    // We only reach here when the initial findUnique found no session, so this
    // path is "first registration for this device". In the rare concurrent
    // race the losing caller also reports isNew:true, but both return the SAME
    // userId (the upsert is idempotent), so no duplicate is created — isNew is
    // informational only (the client doesn't gate on it).
    isNew: true,
  };
}

/**
 * Merge an anonymous user's data into a target user.
 * Transfers: profiles, saved artworks, stickers, characters, canvas progress,
 * coloring images, AND subscription + credits + credit ledger (see the
 * transaction at the end for the revenue-critical reasoning).
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

  // Carry the anon user's SUBSCRIPTION, CREDITS, ledger, and remaining
  // anon-owned content into the target, then delete the anon user — all in ONE
  // transaction so a partial merge can never leave credits and the
  // subscription/ledger inconsistent.
  //
  // Why each move (verified against schema.prisma):
  // - Subscription.user is `onDelete: Cascade` — WITHOUT re-pointing it, the
  //   `user.delete` below would DESTROY the anon's paid subscription. Re-point.
  // - CreditTransaction.user has NO onDelete (Postgres default RESTRICT) — it
  //   BLOCKS `user.delete` with a FK error unless every row is re-pointed first.
  //   (So the merge is actually BROKEN today for any anon who ever subscribed.)
  // - `credits` is the live balance scalar; fold anon → target.
  // - Character / CanvasProgress / ColoringImage are anon-owned and would be
  //   cascade-deleted / null-orphaned on delete; re-point them.
  //
  // Double-grant safety: on login the client's `Purchases.logIn(emailId)` also
  // fires a RevenueCat TRANSFER webhook. That webhook's `case 'TRANSFER'` ONLY
  // re-points the subscription row — it grants ZERO credits (see
  // app/api/revenuecat/webhook/route.ts). So THIS merge is the only actor that
  // moves credits; adding anon.credits here cannot double-count. The
  // subscription re-point is idempotent across the race: whichever of {merge,
  // webhook} runs second matches zero rows (updateMany where userId:anon →
  // empty once moved; the webhook's fromUser lookup → null once anon is
  // deleted).
  await db.$transaction(async (tx) => {
    const [anon, target] = await Promise.all([
      tx.user.findUniqueOrThrow({
        where: { id: anonymousUserId },
        select: { credits: true },
      }),
      tx.user.findUniqueOrThrow({
        where: { id: targetUserId },
        select: { credits: true },
      }),
    ]);

    // Re-point the subscription (NOT cascade-delete it).
    await tx.subscription.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: targetUserId },
    });

    // Move the credit ledger (also clears the RESTRICT FK that blocks delete).
    await tx.creditTransaction.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: targetUserId },
    });

    // CanvasProgress has @@unique([userId, coloringImageId]); if the target
    // already has progress for an image the anon also coloured, re-pointing
    // would violate the unique. Target's progress wins — drop anon's colliding
    // rows first, then re-point the rest.
    const targetProgress = await tx.canvasProgress.findMany({
      where: { userId: targetUserId },
      select: { coloringImageId: true },
    });
    const targetImageIds = targetProgress.map((p) => p.coloringImageId);
    if (targetImageIds.length > 0) {
      await tx.canvasProgress.deleteMany({
        where: {
          userId: anonymousUserId,
          coloringImageId: { in: targetImageIds },
        },
      });
    }
    await tx.canvasProgress.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: targetUserId },
    });

    // Re-point other anon-owned content that would otherwise be lost on delete.
    await tx.character.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: targetUserId },
    });
    await tx.coloringImage.updateMany({
      where: { userId: anonymousUserId },
      data: { userId: targetUserId },
    });

    // Carry the live credit balance.
    await tx.user.update({
      where: { id: targetUserId },
      data: { credits: computeMergedCredits(anon.credits, target.credits) },
    });

    // Clean up anon's stickers (already copied into target above) then delete
    // the now FK-clean anon user (no Subscription, no CreditTransaction left).
    await tx.userSticker.deleteMany({ where: { userId: anonymousUserId } });
    await tx.user.delete({ where: { id: anonymousUserId } });
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
        // Stitch the anon device's PostHog history onto the surviving person
        // (the anon cuid is about to be gone). DB merge already moved the
        // subscription/credits/ledger/content above.
        await mergePostHogPersons(currentUser.id, existingUserWithEmail.id);
        wasMerged = true;

        // Recreate device session (merge deletes the old one)
        await db.mobileDeviceSession.create({
          data: { deviceId, userId: existingUserWithEmail.id },
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
