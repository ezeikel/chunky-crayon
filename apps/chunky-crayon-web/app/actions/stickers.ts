'use server';

import { getUserId } from '@/app/actions/user';
import {
  getUserStickers,
  markStickersAsViewed,
  getStickerStats,
} from '@/lib/stickers/service';
import { STICKER_CATALOG } from '@/lib/stickers/catalog';
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

/**
 * Mobile sticker response type
 */
export type MobileStickerData = {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  rarity: string;
  isUnlocked: boolean;
  isNew: boolean;
  unlockedAt: Date | null;
};

export type MobileStickersResponse = {
  stickers: MobileStickerData[];
  stats: {
    totalUnlocked: number;
    totalPossible: number;
    newCount: number;
  };
};

/**
 * Get stickers data for mobile API
 * Returns all stickers from catalog with unlock status + stats
 */
export async function getMobileStickersAction(): Promise<MobileStickersResponse> {
  const userId = await getUserId();

  // Return catalog with all stickers locked for unauthenticated users
  if (!userId) {
    return {
      stickers: STICKER_CATALOG.map((sticker) => ({
        id: sticker.id,
        name: sticker.name,
        imageUrl: sticker.imageUrl,
        category: sticker.category,
        rarity: sticker.rarity,
        isUnlocked: false,
        isNew: false,
        unlockedAt: null,
      })),
      stats: {
        totalUnlocked: 0,
        totalPossible: STICKER_CATALOG.length,
        newCount: 0,
      },
    };
  }

  const [userStickers, stats] = await Promise.all([
    getUserStickers(userId),
    getStickerStats(userId),
  ]);

  // Create a map of unlocked stickers
  const unlockedMap = new Map(
    userStickers.unlockedStickers.map((s) => [
      s.id,
      { unlockedAt: s.unlockedAt, isNew: s.isNew },
    ]),
  );

  // Combine catalog with user's unlock status
  const stickers = STICKER_CATALOG.map((sticker) => {
    const unlocked = unlockedMap.get(sticker.id);
    return {
      id: sticker.id,
      name: sticker.name,
      imageUrl: sticker.imageUrl,
      category: sticker.category,
      rarity: sticker.rarity,
      isUnlocked: !!unlocked,
      isNew: unlocked?.isNew ?? false,
      unlockedAt: unlocked?.unlockedAt ?? null,
    };
  });

  return {
    stickers,
    stats: {
      totalUnlocked: stats.totalUnlocked,
      totalPossible: stats.totalPossible,
      newCount: stats.newCount,
    },
  };
}
