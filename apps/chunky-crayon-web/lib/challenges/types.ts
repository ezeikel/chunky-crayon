/**
 * Weekly Challenges Type Definitions
 *
 * Research-backed design decisions:
 * - Weekly, not daily (parents control screen time)
 * - Optional participation (no penalty for skipping)
 * - Gentle goals that encourage variety
 * - Rewards tied directly to coloring activity
 */

// Challenge types match different engagement goals
export type ChallengeType =
  | 'THEME' // Color X pages from a specific theme
  | 'VARIETY' // Use X different colors in artworks
  | 'EXPLORATION' // Try X different categories
  | 'SEASONAL'; // Time-limited special challenges

// Challenge status for user participation
export type ChallengeStatus = 'active' | 'completed' | 'expired' | 'upcoming';

// Reward types that can be earned from challenges
export type ChallengeRewardType = 'sticker' | 'accessory';

// Challenge definition from the catalog
export type ChallengeDefinition = {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  requirement: number; // e.g., "Color 3 animals"
  category?: string; // e.g., "animals", "ocean", "space"
  tags?: string[]; // Alternative to category for more flexible matching
  rewardType: ChallengeRewardType;
  rewardId: string; // Sticker ID or accessory ID
  // Visual/UX properties
  icon: string; // Emoji for quick visual identification
  backgroundColor: string; // Tailwind color class
  accentColor: string; // Tailwind color class
};

// User's progress on a specific challenge
export type UserChallengeProgress = {
  challengeId: string;
  progress: number;
  completed: boolean;
  completedAt: Date | null;
};

// Combined challenge with user progress for UI
export type ChallengeWithProgress = {
  challenge: ChallengeDefinition;
  weeklyChallengeId: string; // Database ID for claiming rewards
  progress: number;
  isCompleted: boolean;
  completedAt: Date | null;
  percentComplete: number;
  daysRemaining: number;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  rewardClaimed?: boolean; // Whether the reward has been claimed
};

// Weekly challenge schedule entry (for admin/catalog)
export type WeeklyChallengeSchedule = {
  weekNumber: number; // Week of the year
  year: number;
  challengeId: string;
  startDate: Date;
  endDate: Date;
};

// Challenge completion event (for celebrations/analytics)
export type ChallengeCompletionEvent = {
  challengeId: string;
  profileId: string;
  completedAt: Date;
  rewardType: ChallengeRewardType;
  rewardId: string;
};

// Helper to check if an artwork matches a challenge
export type ChallengeMatchCriteria = {
  category?: string;
  tags?: string[];
  colors?: string[]; // For variety challenges
};
