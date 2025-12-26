'use server';

import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import {
  getUserStickers,
  markStickersAsViewed,
  getStickerStats,
} from '@/lib/stickers/service';
import type { Sticker, UserStickerData } from '@/lib/stickers/types';

/**
 * Get all stickers for the current user's sticker book
 */
export async function getMyStickers(): Promise<{
  unlockedStickers: (Sticker & { unlockedAt: Date; isNew: boolean })[];
  totalPossible: number;
} | null> {
  const userId = await getUserId();
  if (!userId) return null;

  return getUserStickers(userId);
}

/**
 * Mark stickers as viewed (remove NEW badge)
 */
export async function markStickersViewed(
  stickerIds: string[],
): Promise<{ success: boolean }> {
  const userId = await getUserId();
  if (!userId) return { success: false };

  await markStickersAsViewed(userId, stickerIds);
  return { success: true };
}

/**
 * Get sticker stats for display
 */
export async function getMyStickerStats(): Promise<{
  totalUnlocked: number;
  totalPossible: number;
  newCount: number;
  recentUnlocks: UserStickerData[];
} | null> {
  const userId = await getUserId();
  if (!userId) return null;

  return getStickerStats(userId);
}
