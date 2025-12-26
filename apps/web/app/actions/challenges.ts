'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@chunky-crayon/db';
import { ACTIONS } from '@/constants';
import { getUserId } from './user';
import type {
  ChallengeWithProgress,
  ChallengeCompletionEvent,
} from '@/lib/challenges';
import {
  getCurrentChallenge,
  getChallengeHistory,
  claimChallengeReward,
  updateChallengeProgress,
} from '@/lib/challenges';

/**
 * Get the current weekly challenge with progress for the active profile
 */
export const getMyCurrentChallenge =
  async (): Promise<ChallengeWithProgress | null> => {
    const userId = await getUserId(ACTIONS.GET_CURRENT_CHALLENGE);

    if (!userId) {
      return null;
    }

    // Get the active profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeProfileId: true },
    });

    if (!user?.activeProfileId) {
      return null;
    }

    return getCurrentChallenge(user.activeProfileId);
  };

/**
 * Get challenge history for the active profile
 */
export const getMyChallengeHistory = async (
  limit = 10,
): Promise<ChallengeWithProgress[]> => {
  const userId = await getUserId(ACTIONS.GET_CHALLENGE_HISTORY);

  if (!userId) {
    return [];
  }

  // Get the active profile
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });

  if (!user?.activeProfileId) {
    return [];
  }

  return getChallengeHistory(user.activeProfileId, limit);
};

/**
 * Claim the reward for a completed challenge
 */
export const claimMyChallengeReward = async (
  weeklyChallengeId: string,
): Promise<{
  success: boolean;
  rewardType?: 'sticker' | 'accessory';
  rewardId?: string;
}> => {
  const userId = await getUserId(ACTIONS.CLAIM_CHALLENGE_REWARD);

  if (!userId) {
    return { success: false };
  }

  // Get the active profile
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });

  if (!user?.activeProfileId) {
    return { success: false };
  }

  // Get the weekly challenge to find the reward info
  const weeklyChallenge = await db.weeklyChallenge.findUnique({
    where: { id: weeklyChallengeId },
    include: {
      progress: {
        where: { profileId: user.activeProfileId },
      },
    },
  });

  if (!weeklyChallenge || !weeklyChallenge.progress[0]?.completed) {
    return { success: false };
  }

  // Claim the reward
  const success = await claimChallengeReward(
    user.activeProfileId,
    weeklyChallengeId,
  );

  if (success) {
    // Get challenge definition to know the reward type
    const { getChallengeById } = await import('@/lib/challenges');
    const challengeDef = getChallengeById(weeklyChallenge.challengeId);

    if (challengeDef) {
      // If it's a sticker reward, award the sticker
      if (challengeDef.rewardType === 'sticker') {
        const { awardSticker } = await import('@/lib/stickers/service');
        await awardSticker(userId, challengeDef.rewardId, user.activeProfileId);
      }

      // If it's an accessory, add it to the profile
      if (challengeDef.rewardType === 'accessory') {
        const profile = await db.profile.findUnique({
          where: { id: user.activeProfileId },
          select: { coloAccessories: true },
        });

        if (
          profile &&
          !profile.coloAccessories.includes(challengeDef.rewardId)
        ) {
          await db.profile.update({
            where: { id: user.activeProfileId },
            data: {
              coloAccessories: [
                ...profile.coloAccessories,
                challengeDef.rewardId,
              ],
            },
          });
        }
      }

      revalidatePath('/');
      revalidatePath('/account/stickers');
      revalidatePath('/account/profiles');

      return {
        success: true,
        rewardType: challengeDef.rewardType,
        rewardId: challengeDef.rewardId,
      };
    }
  }

  return { success: false };
};

/**
 * Update challenge progress when artwork is saved
 * This is called internally when saving artwork
 *
 * @param profileId - The profile saving the artwork
 * @param criteria - Match criteria from the artwork
 * @returns Completion event if challenge was just completed
 */
export const updateMyChallengeProgress = async (
  profileId: string,
  criteria: { category?: string; tags?: string[]; colors?: string[] },
): Promise<ChallengeCompletionEvent | null> => {
  const userId = await getUserId(ACTIONS.UPDATE_CHALLENGE_PROGRESS);

  if (!userId) {
    return null;
  }

  // Verify the profile belongs to this user
  const profile = await db.profile.findFirst({
    where: {
      id: profileId,
      userId,
    },
  });

  if (!profile) {
    return null;
  }

  const completionEvent = await updateChallengeProgress(profileId, criteria);

  if (completionEvent) {
    revalidatePath('/');
  }

  return completionEvent;
};
