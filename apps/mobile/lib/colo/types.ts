/**
 * Colo Evolution System Types
 *
 * Type definitions for the Colo mascot evolution system.
 * Colo evolves through 6 stages based on the user's coloring activity.
 */

/**
 * Colo evolution stages (1-6)
 */
export type ColoStage = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Information about a specific Colo stage
 */
export type ColoStageInfo = {
  stage: ColoStage;
  name: string;
  description: string;
  requiredArtworks: number;
  imagePath: string;
};

/**
 * A Colo accessory that can be unlocked
 */
export type ColoAccessory = {
  id: string;
  name: string;
  description: string;
  unlockCondition: string;
  imagePath: string;
};

/**
 * Types of conditions for unlocking accessories
 */
export type AccessoryUnlockType =
  | "category_count"
  | "sticker_count"
  | "total_colors"
  | "special";

/**
 * Condition for unlocking an accessory
 */
export type AccessoryUnlockCondition = {
  type: AccessoryUnlockType;
  category?: string;
  count: number;
};

/**
 * Current state of a user's Colo
 */
export type ColoState = {
  stage: ColoStage;
  stageName: string;
  stageDescription: string;
  imagePath: string;
  accessories: string[];
  nextStage: ColoStageInfo | null;
  progressToNext: {
    current: number;
    required: number;
    percentage: number;
  } | null;
};

/**
 * Result of checking for evolution
 */
export type EvolutionResult = {
  evolved: boolean;
  previousStage: ColoStage;
  newStage: ColoStage;
  newAccessories: string[];
};
