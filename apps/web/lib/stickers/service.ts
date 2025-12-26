import { db } from '@chunky-crayon/db';
import { STICKER_CATALOG, getStickerById } from './catalog';
import type { Sticker, UserStickerData } from './types';

/**
 * Check and award any stickers the user has newly unlocked
 * Called after saving artwork
 */
export async function checkAndAwardStickers(
  userId: string,
  profileId?: string,
): Promise<{ newStickers: Sticker[]; totalStickers: number }> {
  // Get user's current stickers
  const existingStickers = await db.userSticker.findMany({
    where: { userId },
    select: { stickerId: true },
  });
  const existingStickerIds = new Set(existingStickers.map((s) => s.stickerId));

  // Get user's artwork stats
  const stats = await getUserArtworkStats(userId, profileId);

  // Check each sticker in catalog
  const newStickers: Sticker[] = [];

  for (const sticker of STICKER_CATALOG) {
    // Skip if already unlocked
    if (existingStickerIds.has(sticker.id)) continue;

    // Check if condition is met
    const isUnlocked = checkUnlockCondition(sticker, stats);

    if (isUnlocked) {
      // Award the sticker
      await db.userSticker.create({
        data: {
          userId,
          profileId,
          stickerId: sticker.id,
          isNew: true,
        },
      });
      newStickers.push(sticker);
    }
  }

  return {
    newStickers,
    totalStickers: existingStickers.length + newStickers.length,
  };
}

/**
 * Get artwork statistics for unlock condition checking
 */
async function getUserArtworkStats(userId: string, profileId?: string) {
  // Total artworks
  const totalArtworks = await db.savedArtwork.count({
    where: { userId },
  });

  // Artworks by category (based on tags)
  const artworksWithTags = await db.savedArtwork.findMany({
    where: { userId },
    include: {
      coloringImage: {
        select: { tags: true },
      },
    },
  });

  // Count by category
  const categoryCounts: Record<string, number> = {};
  const categoriesUsed = new Set<string>();

  for (const artwork of artworksWithTags) {
    const tags = artwork.coloringImage.tags || [];
    for (const tag of tags) {
      const category = normalizeCategory(tag);
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        categoriesUsed.add(category);
      }
    }
  }

  return {
    totalArtworks,
    categoryCounts,
    uniqueCategories: categoriesUsed.size,
  };
}

/**
 * Normalize tag to category for sticker matching
 */
function normalizeCategory(tag: string): string | null {
  const tagLower = tag.toLowerCase();

  // Map common tags to sticker categories
  const categoryMappings: Record<string, string[]> = {
    animals: ['animal', 'animals', 'pet', 'pets', 'cat', 'dog', 'bird', 'fish'],
    fantasy: [
      'fantasy',
      'magic',
      'magical',
      'unicorn',
      'dragon',
      'fairy',
      'wizard',
      'castle',
    ],
    space: [
      'space',
      'astronaut',
      'rocket',
      'planet',
      'star',
      'moon',
      'alien',
      'galaxy',
    ],
    nature: [
      'nature',
      'flower',
      'flowers',
      'tree',
      'trees',
      'forest',
      'garden',
      'plant',
    ],
    vehicles: [
      'vehicle',
      'vehicles',
      'car',
      'truck',
      'train',
      'plane',
      'boat',
      'ship',
    ],
    dinosaurs: [
      'dinosaur',
      'dinosaurs',
      'dino',
      'prehistoric',
      't-rex',
      'jurassic',
    ],
    ocean: [
      'ocean',
      'sea',
      'underwater',
      'beach',
      'marine',
      'whale',
      'dolphin',
      'shark',
    ],
    food: [
      'food',
      'fruit',
      'fruits',
      'vegetable',
      'vegetables',
      'cake',
      'dessert',
      'cooking',
    ],
    sports: [
      'sport',
      'sports',
      'soccer',
      'football',
      'basketball',
      'baseball',
      'tennis',
    ],
    holidays: [
      'holiday',
      'holidays',
      'christmas',
      'halloween',
      'easter',
      'birthday',
      'celebration',
    ],
  };

  for (const [category, keywords] of Object.entries(categoryMappings)) {
    if (keywords.some((keyword) => tagLower.includes(keyword))) {
      return category;
    }
  }

  return null;
}

/**
 * Check if a sticker's unlock condition is met
 */
function checkUnlockCondition(
  sticker: Sticker,
  stats: {
    totalArtworks: number;
    categoryCounts: Record<string, number>;
    uniqueCategories: number;
  },
): boolean {
  const { unlockCondition } = sticker;

  switch (unlockCondition.type) {
    case 'artwork_count':
      return stats.totalArtworks >= unlockCondition.value;

    case 'first_category':
      if (!unlockCondition.category) return false;
      return (stats.categoryCounts[unlockCondition.category] || 0) >= 1;

    case 'category_count':
      if (!unlockCondition.category) return false;
      return (
        (stats.categoryCounts[unlockCondition.category] || 0) >=
        unlockCondition.value
      );

    case 'special':
      // Special stickers for unique categories explored
      if (sticker.id === 'category-explorer') {
        return stats.uniqueCategories >= 3;
      }
      if (sticker.id === 'world-traveler') {
        return stats.uniqueCategories >= 5;
      }
      return false;

    default:
      return false;
  }
}

/**
 * Get all stickers for a user (for sticker book display)
 */
export async function getUserStickers(userId: string): Promise<{
  unlockedStickers: (Sticker & { unlockedAt: Date; isNew: boolean })[];
  totalPossible: number;
}> {
  const userStickers = await db.userSticker.findMany({
    where: { userId },
    orderBy: { unlockedAt: 'desc' },
  });

  const unlockedStickers = userStickers
    .map((us) => {
      const sticker = getStickerById(us.stickerId);
      if (!sticker) return null;
      return {
        ...sticker,
        unlockedAt: us.unlockedAt,
        isNew: us.isNew,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return {
    unlockedStickers,
    totalPossible: STICKER_CATALOG.length,
  };
}

/**
 * Mark stickers as viewed (remove "NEW" badge)
 */
export async function markStickersAsViewed(
  userId: string,
  stickerIds: string[],
): Promise<void> {
  await db.userSticker.updateMany({
    where: {
      userId,
      stickerId: { in: stickerIds },
      isNew: true,
    },
    data: { isNew: false },
  });
}

/**
 * Award a specific sticker to a user (used for challenge rewards)
 */
export async function awardSticker(
  userId: string,
  stickerId: string,
  profileId?: string,
): Promise<boolean> {
  // Check if sticker exists in catalog
  const sticker = getStickerById(stickerId);
  if (!sticker) {
    console.error(`Sticker ${stickerId} not found in catalog`);
    return false;
  }

  // Check if user already has this sticker
  const existing = await db.userSticker.findFirst({
    where: { userId, stickerId },
  });

  if (existing) {
    // Already has the sticker
    return true;
  }

  // Award the sticker
  await db.userSticker.create({
    data: {
      userId,
      profileId,
      stickerId,
      isNew: true,
    },
  });

  return true;
}

/**
 * Get sticker stats for a user
 */
export async function getStickerStats(userId: string): Promise<{
  totalUnlocked: number;
  totalPossible: number;
  newCount: number;
  recentUnlocks: UserStickerData[];
}> {
  const [totalUnlocked, newCount, recentUserStickers] = await Promise.all([
    db.userSticker.count({ where: { userId } }),
    db.userSticker.count({ where: { userId, isNew: true } }),
    db.userSticker.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
      take: 3,
    }),
  ]);

  const recentUnlocks: UserStickerData[] = recentUserStickers.map((us) => ({
    id: us.id,
    stickerId: us.stickerId,
    unlockedAt: us.unlockedAt,
    isNew: us.isNew,
  }));

  return {
    totalUnlocked,
    totalPossible: STICKER_CATALOG.length,
    newCount,
    recentUnlocks,
  };
}
