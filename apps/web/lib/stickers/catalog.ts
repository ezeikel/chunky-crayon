import type { Sticker } from './types';

// TODO: Replace placeholder URLs with actual Colo sticker SVG illustrations
// Each sticker should feature Colo in a themed pose/costume
// Example: "First Steps" = Colo holding a crayon proudly
// Example: "Animal Friend" = Colo wearing animal ears
const PLACEHOLDER_STICKER_URL = '/images/stickers/placeholder.svg';

/**
 * Complete sticker catalog
 *
 * Stickers are organized by category and rarity:
 * - Milestone stickers: Unlock by reaching artwork counts
 * - Category stickers: Unlock by coloring specific themes
 * - Special stickers: Seasonal/event stickers
 *
 * TODO: Create SVG illustrations for each sticker featuring Colo mascot
 */
export const STICKER_CATALOG: Sticker[] = [
  // ============================================
  // MILESTONE STICKERS (artwork count based)
  // ============================================
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Save your very first colored artwork!',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo holding a crayon proudly
    category: 'milestone',
    rarity: 'common',
    unlockCondition: { type: 'artwork_count', value: 1 },
    unlockMessage: 'You did it! Your first masterpiece is saved!',
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Save 3 colored artworks',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with 3 crayons
    category: 'milestone',
    rarity: 'common',
    unlockCondition: { type: 'artwork_count', value: 3 },
    unlockMessage: "You're on a roll! 3 artworks saved!",
  },
  {
    id: 'high-five',
    name: 'High Five',
    description: 'Save 5 colored artworks',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo giving high five
    category: 'milestone',
    rarity: 'common',
    unlockCondition: { type: 'artwork_count', value: 5 },
    unlockMessage: 'High five! 5 amazing artworks!',
  },
  {
    id: 'perfect-ten',
    name: 'Perfect Ten',
    description: 'Save 10 colored artworks',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo wearing medal
    category: 'milestone',
    rarity: 'uncommon',
    unlockCondition: { type: 'artwork_count', value: 10 },
    unlockMessage: "10 artworks! You're becoming a pro!",
  },
  {
    id: 'super-artist',
    name: 'Super Artist',
    description: 'Save 25 colored artworks',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with cape
    category: 'milestone',
    rarity: 'rare',
    unlockCondition: { type: 'artwork_count', value: 25 },
    unlockMessage: '25 artworks! You have superpowers!',
  },
  {
    id: 'master-creator',
    name: 'Master Creator',
    description: 'Save 50 colored artworks',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with crown
    category: 'milestone',
    rarity: 'legendary',
    unlockCondition: { type: 'artwork_count', value: 50 },
    unlockMessage: '50 masterpieces! You are legendary!',
  },
  {
    id: 'century-club',
    name: 'Century Club',
    description: 'Save 100 colored artworks',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with golden brush
    category: 'milestone',
    rarity: 'legendary',
    unlockCondition: { type: 'artwork_count', value: 100 },
    unlockMessage: '100 artworks! You are a true master!',
  },

  // ============================================
  // CATEGORY STICKERS (first in category)
  // ============================================
  {
    id: 'animal-friend',
    name: 'Animal Friend',
    description: 'Color your first animal page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with animal ears
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'animals' },
    unlockMessage: 'You love animals! First animal artwork saved!',
  },
  {
    id: 'fantasy-dreamer',
    name: 'Fantasy Dreamer',
    description: 'Color your first fantasy page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo as wizard
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'fantasy' },
    unlockMessage: 'Welcome to the magical world!',
  },
  {
    id: 'space-explorer',
    name: 'Space Explorer',
    description: 'Color your first space page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo as astronaut
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'space' },
    unlockMessage: 'To infinity and beyond!',
  },
  {
    id: 'nature-lover',
    name: 'Nature Lover',
    description: 'Color your first nature page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with flower crown
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'nature' },
    unlockMessage: 'Nature is beautiful!',
  },
  {
    id: 'vehicle-driver',
    name: 'Vehicle Driver',
    description: 'Color your first vehicles page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo driving car
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'vehicles' },
    unlockMessage: 'Vroom vroom! Hit the road!',
  },
  {
    id: 'dino-hunter',
    name: 'Dino Hunter',
    description: 'Color your first dinosaur page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with dinosaur
    category: 'category',
    rarity: 'common',
    unlockCondition: {
      type: 'first_category',
      value: 1,
      category: 'dinosaurs',
    },
    unlockMessage: 'ROAR! You found the dinosaurs!',
  },
  {
    id: 'ocean-diver',
    name: 'Ocean Diver',
    description: 'Color your first ocean page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with snorkel
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'ocean' },
    unlockMessage: 'Splash! Under the sea!',
  },
  {
    id: 'food-lover',
    name: 'Food Lover',
    description: 'Color your first food page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo as chef
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'food' },
    unlockMessage: 'Yummy! Time to color some treats!',
  },
  {
    id: 'sports-star',
    name: 'Sports Star',
    description: 'Color your first sports page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with trophy
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'sports' },
    unlockMessage: 'Score! You are a champion!',
  },
  {
    id: 'holiday-spirit',
    name: 'Holiday Spirit',
    description: 'Color your first holiday page',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with party hat
    category: 'category',
    rarity: 'common',
    unlockCondition: { type: 'first_category', value: 1, category: 'holidays' },
    unlockMessage: 'Party time! Celebrate with colors!',
  },

  // ============================================
  // CATEGORY MASTER STICKERS (5+ in category)
  // ============================================
  {
    id: 'animal-master',
    name: 'Animal Master',
    description: 'Color 5 animal pages',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo surrounded by animals
    category: 'category',
    rarity: 'uncommon',
    unlockCondition: { type: 'category_count', value: 5, category: 'animals' },
    unlockMessage: "You're best friends with all animals!",
  },
  {
    id: 'fantasy-master',
    name: 'Fantasy Master',
    description: 'Color 5 fantasy pages',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo as powerful wizard
    category: 'category',
    rarity: 'uncommon',
    unlockCondition: { type: 'category_count', value: 5, category: 'fantasy' },
    unlockMessage: 'Your magic powers are growing!',
  },
  {
    id: 'space-master',
    name: 'Space Master',
    description: 'Color 5 space pages',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo on the moon
    category: 'category',
    rarity: 'uncommon',
    unlockCondition: { type: 'category_count', value: 5, category: 'space' },
    unlockMessage: "You've explored the whole galaxy!",
  },

  // ============================================
  // EXPLORATION STICKERS (try different things)
  // ============================================
  {
    id: 'category-explorer',
    name: 'Category Explorer',
    description: 'Color pages from 3 different categories',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with map
    category: 'exploration',
    rarity: 'uncommon',
    unlockCondition: { type: 'special', value: 3 }, // Will need custom logic
    unlockMessage: "You're exploring all the worlds!",
  },
  {
    id: 'world-traveler',
    name: 'World Traveler',
    description: 'Color pages from 5 different categories',
    imageUrl: PLACEHOLDER_STICKER_URL, // TODO: Colo with suitcase
    category: 'exploration',
    rarity: 'rare',
    unlockCondition: { type: 'special', value: 5 }, // Will need custom logic
    unlockMessage: "You've been everywhere!",
  },

  // ============================================
  // SPECIAL STICKERS (seasonal/events)
  // ============================================
  // TODO: Add seasonal stickers (Christmas, Halloween, Easter, etc.)
  // These would be time-limited and extra special
];

// Helper to get sticker by ID
export const getStickerById = (id: string): Sticker | undefined => {
  return STICKER_CATALOG.find((sticker) => sticker.id === id);
};

// Helper to get stickers by category
export const getStickersByCategory = (
  category: Sticker['category'],
): Sticker[] => {
  return STICKER_CATALOG.filter((sticker) => sticker.category === category);
};

// Helper to get stickers by rarity
export const getStickersByRarity = (rarity: Sticker['rarity']): Sticker[] => {
  return STICKER_CATALOG.filter((sticker) => sticker.rarity === rarity);
};

// Get total sticker count
export const TOTAL_STICKERS = STICKER_CATALOG.length;
