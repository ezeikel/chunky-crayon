/**
 * Weekly Challenges Catalog
 *
 * Challenges are designed to:
 * - Encourage variety (try different categories)
 * - Be achievable within a week (3-5 artworks max)
 * - Reward with stickers or accessories
 * - Feel optional, not mandatory
 *
 * Research shows weekly goals work better than daily for kids apps
 * because parents control screen time.
 */

import type { ChallengeDefinition, ChallengeType } from './types';

/**
 * All available challenges
 *
 * TODO: Add more seasonal challenges as needed
 * TODO: Create special event challenges (birthdays, holidays)
 */
export const CHALLENGE_CATALOG: ChallengeDefinition[] = [
  // ============================================
  // THEME CHALLENGES - Color pages from a category
  // ============================================
  {
    id: 'ocean-week',
    title: 'Ocean Adventure',
    description: 'Dive into the ocean! Color 3 sea creature pages.',
    type: 'THEME',
    requirement: 3,
    category: 'ocean',
    tags: ['ocean', 'sea', 'underwater', 'fish', 'marine'],
    rewardType: 'sticker',
    rewardId: 'ocean-diver', // Existing sticker
    icon: '🐠',
    backgroundColor: 'bg-cyan-50',
    accentColor: 'border-cyan-400',
  },
  {
    id: 'animal-week',
    title: 'Animal Friends',
    description: 'Make some animal friends! Color 3 animal pages.',
    type: 'THEME',
    requirement: 3,
    category: 'animals',
    tags: ['animals', 'pets', 'wildlife', 'zoo', 'farm'],
    rewardType: 'sticker',
    rewardId: 'animal-friend', // Existing sticker
    icon: '🦁',
    backgroundColor: 'bg-amber-50',
    accentColor: 'border-amber-400',
  },
  {
    id: 'space-week',
    title: 'Space Explorer',
    description: 'Blast off! Color 3 space-themed pages.',
    type: 'THEME',
    requirement: 3,
    category: 'space',
    tags: ['space', 'rocket', 'planets', 'astronaut', 'stars', 'galaxy'],
    rewardType: 'accessory',
    rewardId: 'astronaut-helmet', // Colo accessory
    icon: '🚀',
    backgroundColor: 'bg-indigo-50',
    accentColor: 'border-indigo-400',
  },
  {
    id: 'dino-week',
    title: 'Dino Discovery',
    description: 'ROAR! Color 3 dinosaur pages.',
    type: 'THEME',
    requirement: 3,
    category: 'dinosaurs',
    tags: ['dinosaurs', 'prehistoric', 'dino', 't-rex', 'fossil'],
    rewardType: 'accessory',
    rewardId: 'dino-spikes', // Colo accessory
    icon: '🦕',
    backgroundColor: 'bg-green-50',
    accentColor: 'border-green-400',
  },
  {
    id: 'fantasy-week',
    title: 'Fantasy Magic',
    description: 'Enter the magical world! Color 3 fantasy pages.',
    type: 'THEME',
    requirement: 3,
    category: 'fantasy',
    tags: [
      'fantasy',
      'magic',
      'fairy',
      'unicorn',
      'dragon',
      'wizard',
      'princess',
    ],
    rewardType: 'accessory',
    rewardId: 'wizard-hat', // Colo accessory
    icon: '🧙',
    backgroundColor: 'bg-purple-50',
    accentColor: 'border-purple-400',
  },
  {
    id: 'nature-week',
    title: 'Nature Walk',
    description: 'Explore nature! Color 3 nature-themed pages.',
    type: 'THEME',
    requirement: 3,
    category: 'nature',
    tags: ['nature', 'flowers', 'trees', 'plants', 'garden', 'forest'],
    rewardType: 'accessory',
    rewardId: 'flower-crown', // Colo accessory
    icon: '🌸',
    backgroundColor: 'bg-pink-50',
    accentColor: 'border-pink-400',
  },
  {
    id: 'vehicle-week',
    title: 'Vroom Vroom',
    description: 'Hit the road! Color 3 vehicle pages.',
    type: 'THEME',
    requirement: 3,
    category: 'vehicles',
    tags: ['vehicles', 'cars', 'trucks', 'trains', 'planes', 'boats'],
    rewardType: 'sticker',
    rewardId: 'vehicle-driver', // Existing sticker
    icon: '🚗',
    backgroundColor: 'bg-red-50',
    accentColor: 'border-red-400',
  },
  {
    id: 'food-week',
    title: 'Yummy Colors',
    description: 'Color some treats! Color 3 food pages.',
    type: 'THEME',
    requirement: 3,
    category: 'food',
    tags: ['food', 'fruit', 'dessert', 'sweets', 'vegetables', 'cooking'],
    rewardType: 'sticker',
    rewardId: 'food-lover', // Existing sticker
    icon: '🍕',
    backgroundColor: 'bg-orange-50',
    accentColor: 'border-orange-400',
  },

  // ============================================
  // EXPLORATION CHALLENGES - Try different things
  // ============================================
  {
    id: 'adventure-week',
    title: 'Big Adventure',
    description: 'Explore! Color pages from 2 different categories.',
    type: 'EXPLORATION',
    requirement: 2,
    rewardType: 'sticker',
    rewardId: 'category-explorer', // Existing sticker
    icon: '🗺️',
    backgroundColor: 'bg-teal-50',
    accentColor: 'border-teal-400',
  },
  {
    id: 'world-explorer-week',
    title: 'World Explorer',
    description: 'Be curious! Color pages from 3 different categories.',
    type: 'EXPLORATION',
    requirement: 3,
    rewardType: 'sticker',
    rewardId: 'world-traveler', // Existing sticker
    icon: '🌎',
    backgroundColor: 'bg-blue-50',
    accentColor: 'border-blue-400',
  },

  // ============================================
  // VARIETY CHALLENGES - Use different colors
  // ============================================
  {
    id: 'rainbow-week',
    title: 'Rainbow Week',
    description: 'Be colorful! Use at least 6 different colors this week.',
    type: 'VARIETY',
    requirement: 6,
    rewardType: 'accessory',
    rewardId: 'rainbow-scarf', // Colo accessory
    icon: '🌈',
    backgroundColor: 'bg-gradient-to-r from-red-50 via-yellow-50 to-blue-50',
    accentColor: 'border-violet-400',
  },
  {
    id: 'colorful-artist',
    title: 'Colorful Artist',
    description: 'Use ALL the crayon colors in your artworks this week!',
    type: 'VARIETY',
    requirement: 12, // All crayon palette colors
    rewardType: 'accessory',
    rewardId: 'sparkle-glasses', // Colo accessory
    icon: '✨',
    backgroundColor: 'bg-fuchsia-50',
    accentColor: 'border-fuchsia-400',
  },

  // ============================================
  // SEASONAL CHALLENGES - Time-limited specials
  // ============================================
  {
    id: 'holiday-cheer',
    title: 'Holiday Cheer',
    description: 'Spread joy! Color 3 holiday-themed pages.',
    type: 'SEASONAL',
    requirement: 3,
    category: 'holidays',
    tags: ['holiday', 'christmas', 'winter', 'festive', 'celebration'],
    rewardType: 'accessory',
    rewardId: 'party-hat', // Colo accessory
    icon: '🎄',
    backgroundColor: 'bg-red-50',
    accentColor: 'border-red-500',
  },
  {
    id: 'spooky-fun',
    title: 'Spooky Fun',
    description: 'Get spooky! Color 3 Halloween pages.',
    type: 'SEASONAL',
    requirement: 3,
    category: 'halloween',
    tags: ['halloween', 'spooky', 'pumpkin', 'ghost', 'witch'],
    rewardType: 'sticker',
    rewardId: 'holiday-spirit', // Existing sticker
    icon: '🎃',
    backgroundColor: 'bg-orange-100',
    accentColor: 'border-orange-500',
  },
  {
    id: 'spring-bloom',
    title: 'Spring Bloom',
    description: 'Welcome spring! Color 3 flower or nature pages.',
    type: 'SEASONAL',
    requirement: 3,
    category: 'nature',
    tags: ['spring', 'flowers', 'bloom', 'easter', 'garden'],
    rewardType: 'sticker',
    rewardId: 'nature-lover', // Existing sticker
    icon: '🌷',
    backgroundColor: 'bg-lime-50',
    accentColor: 'border-lime-400',
  },
  {
    id: 'summer-splash',
    title: 'Summer Splash',
    description: 'Summer fun! Color 3 beach or ocean pages.',
    type: 'SEASONAL',
    requirement: 3,
    tags: ['summer', 'beach', 'ocean', 'sun', 'vacation'],
    rewardType: 'sticker',
    rewardId: 'ocean-diver', // Existing sticker
    icon: '☀️',
    backgroundColor: 'bg-yellow-50',
    accentColor: 'border-yellow-400',
  },
];

// Helper to get challenge by ID
export const getChallengeById = (
  id: string,
): ChallengeDefinition | undefined => {
  return CHALLENGE_CATALOG.find((challenge) => challenge.id === id);
};

// Helper to get challenges by type
export const getChallengesByType = (
  type: ChallengeType,
): ChallengeDefinition[] => {
  return CHALLENGE_CATALOG.filter((challenge) => challenge.type === type);
};

// Helper to get non-seasonal challenges (for weekly rotation)
export const getRegularChallenges = (): ChallengeDefinition[] => {
  return CHALLENGE_CATALOG.filter((challenge) => challenge.type !== 'SEASONAL');
};

// Helper to get seasonal challenges
export const getSeasonalChallenges = (): ChallengeDefinition[] => {
  return CHALLENGE_CATALOG.filter((challenge) => challenge.type === 'SEASONAL');
};

// Total challenges count
export const TOTAL_CHALLENGES = CHALLENGE_CATALOG.length;
