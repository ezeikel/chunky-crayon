/**
 * Colo Evolution Catalog
 *
 * Defines all evolution stages and accessories for Colo mascot.
 * Visual assets are placeholders - replace with actual images later.
 */

import type {
  ColoStage,
  ColoStageInfo,
  ColoAccessory,
  AccessoryUnlockCondition,
} from "./types";

// Evolution stages - Colo grows as kids save more artwork
export const COLO_STAGES: Record<ColoStage, ColoStageInfo> = {
  1: {
    stage: 1,
    name: "Baby Colo",
    description: "Just starting the coloring adventure!",
    requiredArtworks: 0,
    imagePath: "colo-stage-1",
  },
  2: {
    stage: 2,
    name: "Little Colo",
    description: "Growing bigger with every artwork!",
    requiredArtworks: 5,
    imagePath: "colo-stage-2",
  },
  3: {
    stage: 3,
    name: "Growing Colo",
    description: "Look how much Colo has grown!",
    requiredArtworks: 15,
    imagePath: "colo-stage-3",
  },
  4: {
    stage: 4,
    name: "Happy Colo",
    description: "So happy with all the beautiful art!",
    requiredArtworks: 30,
    imagePath: "colo-stage-4",
  },
  5: {
    stage: 5,
    name: "Artist Colo",
    description: "A true artist in the making!",
    requiredArtworks: 50,
    imagePath: "colo-stage-5",
  },
  6: {
    stage: 6,
    name: "Master Colo",
    description: "The ultimate coloring master!",
    requiredArtworks: 100,
    imagePath: "colo-stage-6",
  },
};

// Accessories that can be unlocked through achievements
export const COLO_ACCESSORIES: ColoAccessory[] = [
  {
    id: "astronaut-helmet",
    name: "Astronaut Helmet",
    description: "For space explorers!",
    unlockCondition: "Color 5 space-themed artworks",
    imagePath: "colo-accessory-astronaut-helmet",
  },
  {
    id: "crown",
    name: "Royal Crown",
    description: "Fit for coloring royalty!",
    unlockCondition: "Earn 10 stickers",
    imagePath: "colo-accessory-crown",
  },
  {
    id: "rainbow-scarf",
    name: "Rainbow Scarf",
    description: "For colorful creators!",
    unlockCondition: "Use all crayon colors in one artwork",
    imagePath: "colo-accessory-rainbow-scarf",
  },
  {
    id: "party-hat",
    name: "Party Hat",
    description: "Time to celebrate!",
    unlockCondition: "Save artwork during a special occasion",
    imagePath: "colo-accessory-party-hat",
  },
  {
    id: "artist-beret",
    name: "Artist Beret",
    description: "A true artist!",
    unlockCondition: "Reach Artist Colo stage",
    imagePath: "colo-accessory-artist-beret",
  },
  {
    id: "wizard-hat",
    name: "Wizard Hat",
    description: "Magical coloring powers!",
    unlockCondition: "Color 5 fantasy-themed artworks",
    imagePath: "colo-accessory-wizard-hat",
  },
  {
    id: "dino-spikes",
    name: "Dino Spikes",
    description: "Roar like a dinosaur!",
    unlockCondition: "Color 5 dinosaur artworks",
    imagePath: "colo-accessory-dino-spikes",
  },
  {
    id: "flower-crown",
    name: "Flower Crown",
    description: "Nature lover!",
    unlockCondition: "Color 5 nature-themed artworks",
    imagePath: "colo-accessory-flower-crown",
  },
  {
    id: "superhero-cape",
    name: "Superhero Cape",
    description: "Coloring superhero!",
    unlockCondition: "Save 25 artworks",
    imagePath: "colo-accessory-superhero-cape",
  },
  {
    id: "sparkle-glasses",
    name: "Sparkle Glasses",
    description: "Everything looks magical!",
    unlockCondition: "Earn a legendary sticker",
    imagePath: "colo-accessory-sparkle-glasses",
  },
];

// Accessory unlock conditions (machine-readable)
export const ACCESSORY_CONDITIONS: Record<string, AccessoryUnlockCondition> = {
  "astronaut-helmet": { type: "category_count", category: "space", count: 5 },
  crown: { type: "sticker_count", count: 10 },
  "rainbow-scarf": { type: "total_colors", count: 12 }, // All crayon colors
  "party-hat": { type: "special", count: 1 }, // Special event
  "artist-beret": { type: "category_count", category: "stage-5", count: 1 }, // Reach stage 5
  "wizard-hat": { type: "category_count", category: "fantasy", count: 5 },
  "dino-spikes": { type: "category_count", category: "dinosaurs", count: 5 },
  "flower-crown": { type: "category_count", category: "nature", count: 5 },
  "superhero-cape": { type: "category_count", category: "total", count: 25 }, // 25 total artworks
  "sparkle-glasses": { type: "special", count: 1 }, // Legendary sticker
};

// Helper functions
export const getStageInfo = (stage: ColoStage): ColoStageInfo => {
  return COLO_STAGES[stage];
};

export const getNextStage = (currentStage: ColoStage): ColoStageInfo | null => {
  if (currentStage >= 6) return null;
  return COLO_STAGES[(currentStage + 1) as ColoStage];
};

export const getStageForArtworkCount = (artworkCount: number): ColoStage => {
  // Find the highest stage the user qualifies for
  const stages: ColoStage[] = [6, 5, 4, 3, 2, 1];
  for (const stage of stages) {
    if (artworkCount >= COLO_STAGES[stage].requiredArtworks) {
      return stage;
    }
  }
  return 1;
};

export const getAccessory = (id: string): ColoAccessory | undefined => {
  return COLO_ACCESSORIES.find((a) => a.id === id);
};

export const TOTAL_STAGES = 6;
export const TOTAL_ACCESSORIES = COLO_ACCESSORIES.length;
