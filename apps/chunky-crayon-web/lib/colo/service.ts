/**
 * Colo Evolution Service
 *
 * Server-side logic for calculating Colo evolution stages
 * and checking accessory unlocks based on profile achievements.
 */

import type {
  ColoStage,
  ColoState,
  EvolutionResult,
  AccessoryUnlockCondition,
} from './types';
import {
  COLO_STAGES,
  COLO_ACCESSORIES,
  ACCESSORY_CONDITIONS,
  getStageForArtworkCount,
  getStageInfo,
  getNextStage,
} from './catalog';

/**
 * Get the current Colo state for a profile
 */
export const getColoState = (
  currentStage: ColoStage,
  currentAccessories: string[],
  artworkCount: number,
): ColoState => {
  const stageInfo = getStageInfo(currentStage);
  const nextStageInfo = getNextStage(currentStage);

  let progressToNext: ColoState['progressToNext'] = null;
  if (nextStageInfo) {
    const currentProgress = artworkCount;
    const requiredForNext = nextStageInfo.requiredArtworks;
    const percentage = Math.min(
      100,
      Math.round((currentProgress / requiredForNext) * 100),
    );
    progressToNext = {
      current: currentProgress,
      required: requiredForNext,
      percentage,
    };
  }

  return {
    stage: currentStage,
    stageName: stageInfo.name,
    stageDescription: stageInfo.description,
    imagePath: stageInfo.imagePath,
    accessories: currentAccessories,
    nextStage: nextStageInfo,
    progressToNext,
  };
};

/**
 * Check if a profile should evolve and what accessories they've unlocked
 *
 * @param currentStage - Profile's current Colo stage
 * @param currentAccessories - Profile's currently unlocked accessories
 * @param artworkCount - Total saved artworks for this profile
 * @param stats - Additional stats for accessory unlock checks
 */
export const checkEvolution = (
  currentStage: ColoStage,
  currentAccessories: string[],
  artworkCount: number,
  stats?: {
    stickerCount?: number;
    categoryArtworkCounts?: Record<string, number>;
    totalColorsUsed?: number;
    isSpecialOccasion?: boolean;
  },
): EvolutionResult => {
  // Check for stage evolution
  const newStage = getStageForArtworkCount(artworkCount);
  const evolved = newStage > currentStage;

  // Check for newly unlocked accessories
  const newAccessories: string[] = [];

  for (const accessory of COLO_ACCESSORIES) {
    // Skip if already unlocked
    if (currentAccessories.includes(accessory.id)) {
      continue;
    }

    const condition = ACCESSORY_CONDITIONS[accessory.id];
    if (!condition) continue;

    const isUnlocked = checkAccessoryCondition(condition, {
      artworkCount,
      currentStage: newStage,
      ...stats,
    });

    if (isUnlocked) {
      newAccessories.push(accessory.id);
    }
  }

  return {
    evolved,
    previousStage: currentStage,
    newStage: evolved ? newStage : currentStage,
    newAccessories,
  };
};

/**
 * Check if a specific accessory condition is met
 */
const checkAccessoryCondition = (
  condition: AccessoryUnlockCondition,
  stats: {
    artworkCount: number;
    currentStage: ColoStage;
    stickerCount?: number;
    categoryArtworkCounts?: Record<string, number>;
    totalColorsUsed?: number;
    isSpecialOccasion?: boolean;
  },
): boolean => {
  switch (condition.type) {
    case 'category_count': {
      // Special case: "total" means total artworks
      if (condition.category === 'total') {
        return stats.artworkCount >= condition.count;
      }
      // Special case: stage-based unlocks
      if (condition.category?.startsWith('stage-')) {
        const requiredStage = parseInt(condition.category.split('-')[1], 10);
        return stats.currentStage >= requiredStage;
      }
      // Regular category count
      const categoryCount =
        stats.categoryArtworkCounts?.[condition.category || ''] || 0;
      return categoryCount >= condition.count;
    }

    case 'sticker_count':
      return (stats.stickerCount || 0) >= condition.count;

    case 'total_colors':
      return (stats.totalColorsUsed || 0) >= condition.count;

    case 'special':
      return stats.isSpecialOccasion || false;

    default:
      return false;
  }
};

/**
 * Get all accessories with their unlock status for a profile
 */
export const getAccessoriesWithStatus = (
  unlockedAccessories: string[],
): Array<{
  id: string;
  name: string;
  description: string;
  unlockCondition: string;
  imagePath: string;
  unlocked: boolean;
}> => {
  return COLO_ACCESSORIES.map((accessory) => ({
    ...accessory,
    unlocked: unlockedAccessories.includes(accessory.id),
  }));
};

/**
 * Calculate progress percentage to next stage
 */
export const getProgressToNextStage = (
  currentStage: ColoStage,
  artworkCount: number,
): number | null => {
  const nextStage = getNextStage(currentStage);
  if (!nextStage) return null; // Already at max stage

  const currentStageInfo = getStageInfo(currentStage);
  const currentThreshold = currentStageInfo.requiredArtworks;
  const nextThreshold = nextStage.requiredArtworks;

  const progress = artworkCount - currentThreshold;
  const needed = nextThreshold - currentThreshold;

  return Math.min(100, Math.round((progress / needed) * 100));
};
