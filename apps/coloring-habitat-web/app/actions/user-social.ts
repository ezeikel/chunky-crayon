"use server";

import { db } from "@one-colored-pixel/db";
import { getUserId } from "@/app/actions/user";
import {
  fetchCreatorInfo,
  getUserAccessToken,
  type CreatorInfo,
} from "@/lib/tiktok";

/**
 * Get the current user"s connected TikTok account info.
 */
export async function getUserTikTokAccount() {
  const userId = await getUserId("get TikTok account");
  if (!userId) return null;

  const account = await db.userSocialAccount.findUnique({
    where: { userId_provider: { userId, provider: "tiktok" } },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      expiresAt: true,
      scopes: true,
    },
  });

  return account;
}

/**
 * Disconnect the current user"s TikTok account.
 */
export async function disconnectUserTikTok(): Promise<boolean> {
  const userId = await getUserId("disconnect TikTok");
  if (!userId) return false;

  try {
    await db.userSocialAccount.delete({
      where: { userId_provider: { userId, provider: "tiktok" } },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get TikTok creator info for the current user.
 * Must be called before posting — TikTok review requires showing
 * the user"s nickname, available privacy options, and interaction settings.
 */
export async function getCreatorInfo(): Promise<CreatorInfo | null> {
  const userId = await getUserId("get creator info");
  if (!userId) return null;

  try {
    const accessToken = await getUserAccessToken(userId);
    return await fetchCreatorInfo(accessToken);
  } catch (error) {
    console.error("[getCreatorInfo] Error:", error);
    return null;
  }
}
