/**
 * Colo Evolution Types
 *
 * Colo is the app mascot - a friendly crayon character that evolves
 * as kids progress through the app. This creates emotional attachment
 * and visible progress (inspired by Tamagotchi research).
 */

// Evolution stages (1-6)
export type ColoStage = 1 | 2 | 3 | 4 | 5 | 6;

// Stage metadata
export type ColoStageInfo = {
  stage: ColoStage;
  name: string;
  description: string;
  requiredArtworks: number; // Minimum saved artworks to reach this stage
  imagePath: string; // Path to SVG (placeholder for now)
};

// Accessory that can be unlocked
export type ColoAccessory = {
  id: string;
  name: string;
  description: string;
  unlockCondition: string; // Human-readable condition
  imagePath: string; // Path to SVG overlay
};

// Accessory unlock conditions (used by service)
export type AccessoryUnlockType =
  | 'category_count' // Complete X artworks in a category
  | 'sticker_count' // Earn X stickers
  | 'total_colors' // Use X unique colors
  | 'special'; // Special condition (birthday, etc.)

export type AccessoryUnlockCondition = {
  type: AccessoryUnlockType;
  category?: string; // For category_count
  count: number;
};

// Profile's Colo state
export type ColoState = {
  stage: ColoStage;
  stageName: string;
  stageDescription: string;
  imagePath: string;
  accessories: string[]; // Array of accessory IDs
  nextStage: ColoStageInfo | null; // null if at max stage
  progressToNext: {
    current: number;
    required: number;
    percentage: number;
  } | null;
};

// Evolution result when checking for updates
export type EvolutionResult = {
  evolved: boolean;
  previousStage: ColoStage;
  newStage: ColoStage;
  newAccessories: string[]; // Newly unlocked accessory IDs
};
