/**
 * Challenge Service
 *
 * Handles all challenge-related logic:
 * - Getting the current active challenge
 * - Checking if artwork matches a challenge
 * - Updating progress when artwork is saved
 * - Completing challenges and awarding rewards
 */

import { db } from '@chunky-crayon/db';
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  differenceInDays,
} from 'date-fns';
import type {
  ChallengeDefinition,
  ChallengeWithProgress,
  ChallengeMatchCriteria,
  ChallengeCompletionEvent,
} from './types';
import { getChallengeById, getRegularChallenges } from './catalog';

/**
 * Get the current week's active challenge for a profile
 */
export const getCurrentChallenge = async (
  profileId: string,
): Promise<ChallengeWithProgress | null> => {
  const now = new Date();

  // Find active challenge for this week
  const activeChallenge = await db.weeklyChallenge.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      progress: {
        where: { profileId },
      },
    },
  });

  if (!activeChallenge) {
    return null;
  }

  // Get the challenge definition from catalog
  const challengeDefinition = getChallengeById(activeChallenge.challengeId);
  if (!challengeDefinition) {
    return null;
  }

  // Get or create progress for this profile
  const progressRecord = activeChallenge.progress[0];
  const progress = progressRecord?.progress ?? 0;
  const isCompleted = progressRecord?.completed ?? false;
  const completedAt = progressRecord?.completedAt ?? null;
  const rewardClaimed = progressRecord?.rewardClaimed ?? false;

  return {
    challenge: challengeDefinition,
    weeklyChallengeId: activeChallenge.id,
    progress,
    isCompleted,
    completedAt,
    percentComplete: Math.min(
      Math.round((progress / challengeDefinition.requirement) * 100),
      100,
    ),
    daysRemaining: Math.max(0, differenceInDays(activeChallenge.endDate, now)),
    isActive: true,
    startDate: activeChallenge.startDate,
    endDate: activeChallenge.endDate,
    rewardClaimed,
  };
};

/**
 * Check if artwork matches the current challenge criteria
 */
export const artworkMatchesChallenge = (
  challenge: ChallengeDefinition,
  criteria: ChallengeMatchCriteria,
): boolean => {
  switch (challenge.type) {
    case 'THEME':
    case 'SEASONAL':
      // Check if artwork is in the challenge's category or has matching tags
      if (challenge.category && criteria.category === challenge.category) {
        return true;
      }
      if (challenge.tags && criteria.tags) {
        const hasMatchingTag = challenge.tags.some((tag) =>
          criteria.tags!.some(
            (artworkTag) => artworkTag.toLowerCase() === tag.toLowerCase(),
          ),
        );
        if (hasMatchingTag) {
          return true;
        }
      }
      return false;

    case 'EXPLORATION':
      // Exploration challenges track unique categories, handled separately
      return true;

    case 'VARIETY':
      // Variety challenges track unique colors used
      return true;

    default:
      return false;
  }
};

/**
 * Update challenge progress when artwork is saved
 * Returns completion event if challenge was just completed
 */
export const updateChallengeProgress = async (
  profileId: string,
  criteria: ChallengeMatchCriteria,
): Promise<ChallengeCompletionEvent | null> => {
  const now = new Date();

  // Find active challenge for this week
  const activeChallenge = await db.weeklyChallenge.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  if (!activeChallenge) {
    return null;
  }

  // Get challenge definition
  const challengeDefinition = getChallengeById(activeChallenge.challengeId);
  if (!challengeDefinition) {
    return null;
  }

  // Check if artwork matches the challenge
  if (!artworkMatchesChallenge(challengeDefinition, criteria)) {
    return null;
  }

  // Get or create progress record
  const existingProgress = await db.profileChallengeProgress.findUnique({
    where: {
      profileId_weeklyChallengeId: {
        profileId,
        weeklyChallengeId: activeChallenge.id,
      },
    },
  });

  // Already completed? No update needed
  if (existingProgress?.completed) {
    return null;
  }

  const currentProgress = existingProgress?.progress ?? 0;
  const newProgress = currentProgress + 1;
  const isNowComplete = newProgress >= challengeDefinition.requirement;

  // Update or create progress
  await db.profileChallengeProgress.upsert({
    where: {
      profileId_weeklyChallengeId: {
        profileId,
        weeklyChallengeId: activeChallenge.id,
      },
    },
    update: {
      progress: newProgress,
      completed: isNowComplete,
      completedAt: isNowComplete ? now : null,
    },
    create: {
      profileId,
      weeklyChallengeId: activeChallenge.id,
      progress: newProgress,
      completed: isNowComplete,
      completedAt: isNowComplete ? now : null,
    },
  });

  // If just completed, return completion event for celebration
  if (isNowComplete && !existingProgress?.completed) {
    return {
      challengeId: challengeDefinition.id,
      profileId,
      completedAt: now,
      rewardType: challengeDefinition.rewardType,
      rewardId: challengeDefinition.rewardId,
    };
  }

  return null;
};

/**
 * Mark reward as claimed for a challenge
 */
export const claimChallengeReward = async (
  profileId: string,
  weeklyChallengeId: string,
): Promise<boolean> => {
  const progress = await db.profileChallengeProgress.findUnique({
    where: {
      profileId_weeklyChallengeId: {
        profileId,
        weeklyChallengeId,
      },
    },
  });

  if (!progress || !progress.completed || progress.rewardClaimed) {
    return false;
  }

  await db.profileChallengeProgress.update({
    where: { id: progress.id },
    data: { rewardClaimed: true },
  });

  return true;
};

/**
 * Create a new weekly challenge (admin/cron job use)
 */
export const createWeeklyChallenge = async (
  challengeId: string,
  startDate?: Date,
): Promise<string | null> => {
  const start = startDate ?? startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday

  // Verify challenge exists in catalog
  const challengeDefinition = getChallengeById(challengeId);
  if (!challengeDefinition) {
    console.error(`Challenge ${challengeId} not found in catalog`);
    return null;
  }

  // Check if there's already an active challenge for this period
  const existingChallenge = await db.weeklyChallenge.findFirst({
    where: {
      startDate: { lte: end },
      endDate: { gte: start },
      isActive: true,
    },
  });

  if (existingChallenge) {
    console.log(
      `Challenge already exists for this week: ${existingChallenge.challengeId}`,
    );
    return existingChallenge.id;
  }

  const newChallenge = await db.weeklyChallenge.create({
    data: {
      challengeId,
      startDate: start,
      endDate: end,
      isActive: true,
    },
  });

  return newChallenge.id;
};

/**
 * Get a random challenge for the week (for auto-scheduling)
 * Avoids repeating recently used challenges
 */
export const getNextChallenge =
  async (): Promise<ChallengeDefinition | null> => {
    // Get all non-seasonal challenges
    const regularChallenges = getRegularChallenges();
    if (regularChallenges.length === 0) {
      return null;
    }

    // Get recently used challenges (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentChallenges = await db.weeklyChallenge.findMany({
      where: {
        startDate: { gte: fourWeeksAgo },
      },
      select: { challengeId: true },
    });

    const recentIds = new Set(recentChallenges.map((c) => c.challengeId));

    // Filter out recently used challenges
    const availableChallenges = regularChallenges.filter(
      (c) => !recentIds.has(c.id),
    );

    // If all challenges were used recently, use any challenge
    const pool =
      availableChallenges.length > 0 ? availableChallenges : regularChallenges;

    // Pick a random challenge
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  };

/**
 * Get challenge history for a profile
 */
export const getChallengeHistory = async (
  profileId: string,
  limit = 10,
): Promise<ChallengeWithProgress[]> => {
  const progressRecords = await db.profileChallengeProgress.findMany({
    where: { profileId },
    include: { weeklyChallenge: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const now = new Date();
  const result: ChallengeWithProgress[] = [];

  for (const record of progressRecords) {
    const challengeDefinition = getChallengeById(
      record.weeklyChallenge.challengeId,
    );
    if (!challengeDefinition) continue;

    result.push({
      challenge: challengeDefinition,
      weeklyChallengeId: record.weeklyChallenge.id,
      progress: record.progress,
      isCompleted: record.completed,
      completedAt: record.completedAt,
      percentComplete: Math.min(
        Math.round((record.progress / challengeDefinition.requirement) * 100),
        100,
      ),
      daysRemaining: Math.max(
        0,
        differenceInDays(record.weeklyChallenge.endDate, now),
      ),
      isActive: isWithinInterval(now, {
        start: record.weeklyChallenge.startDate,
        end: record.weeklyChallenge.endDate,
      }),
      startDate: record.weeklyChallenge.startDate,
      endDate: record.weeklyChallenge.endDate,
      rewardClaimed: record.rewardClaimed,
    });
  }

  return result;
};

/**
 * Ensure there's an active challenge for the current week
 * Creates one if missing (for cron job or app startup)
 */
export const ensureActiveChallenge = async (): Promise<string | null> => {
  const now = new Date();

  // Check for existing active challenge
  const existingChallenge = await db.weeklyChallenge.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  if (existingChallenge) {
    return existingChallenge.id;
  }

  // Get next challenge
  const nextChallenge = await getNextChallenge();
  if (!nextChallenge) {
    console.error('No challenges available in catalog');
    return null;
  }

  // Create the challenge
  return createWeeklyChallenge(nextChallenge.id);
};
