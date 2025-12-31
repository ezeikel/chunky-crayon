import { SignJWT, jwtVerify } from "jose";
import { db } from "@chunky-crayon/db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.MOBILE_AUTH_SECRET || process.env.NEXT_AUTH_SECRET || "dev-secret-change-me"
);

// Token expiration: 1 year for device tokens (they're device-bound anyway)
const TOKEN_EXPIRATION = "365d";

export type MobileTokenPayload = {
  deviceId: string;
  userId?: string;       // Set when linked to an OAuth account
  profileId?: string;    // Current active profile
  type: "device" | "user";
};

/**
 * Create a JWT token for a device
 */
export async function createDeviceToken(
  deviceId: string,
  userId?: string,
  profileId?: string
): Promise<string> {
  const token = await new SignJWT({
    deviceId,
    userId,
    profileId,
    type: userId ? "user" : "device",
  } as MobileTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a mobile token
 */
export async function verifyMobileToken(
  token: string
): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as MobileTokenPayload;
  } catch (error) {
    console.error("Failed to verify mobile token:", error);
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
            orderBy: { createdAt: "asc" },
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
      profileId: profile?.id || "",
      isNew: false,
    };
  }

  // Create new anonymous user and default profile
  const user = await db.user.create({
    data: {
      // Anonymous user - no email
      name: "Mobile User",
      profiles: {
        create: {
          name: "Artist",
          avatarId: "default",
          ageGroup: "5_7",
          difficulty: "easy",
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
    profileId: user.profiles[0]?.id || "",
    isNew: true,
  };
}

/**
 * Link a device to an existing user (after OAuth sign-in)
 */
export async function linkDeviceToUser(
  deviceId: string,
  userId: string
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

  // Different user - we need to merge or switch
  // For now, just update the device to point to the new user
  // TODO: Add option to merge artwork from anonymous user
  await db.mobileDeviceSession.update({
    where: { deviceId },
    data: { userId },
  });
}

/**
 * Get the user ID for a device (if registered)
 */
export async function getDeviceUserId(deviceId: string): Promise<string | null> {
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
export async function getMobileAuthFromHeaders(
  headers: Headers
): Promise<{
  userId: string | null;
  deviceId: string | null;
  profileId: string | null;
}> {
  const authHeader = headers.get("authorization");

  if (!authHeader) {
    return { userId: null, deviceId: null, profileId: null };
  }

  // Handle Bearer token (JWT)
  if (authHeader.startsWith("Bearer ")) {
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
  if (authHeader.startsWith("Device ")) {
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
