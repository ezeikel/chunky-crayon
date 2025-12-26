'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@chunky-crayon/db';
import { ACTIONS } from '@/constants';
import { getUserId } from './user';
import type { ColoStage, ColoState, EvolutionResult } from '@/lib/colo';
import { getColoState, checkEvolution } from '@/lib/colo/service';

/**
 * Get the current Colo state for the active profile
 */
export const getMyColoState = async (): Promise<ColoState | null> => {
  const userId = await getUserId(ACTIONS.GET_COLO_STATE);

  if (!userId) {
    return null;
  }

  // Get the active profile with Colo fields and artwork count
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });

  if (!user?.activeProfileId) {
    return null;
  }

  const profile = await db.profile.findFirst({
    where: {
      id: user.activeProfileId,
      userId,
    },
    select: {
      coloStage: true,
      coloAccessories: true,
      _count: {
        select: {
          coloringImages: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  return getColoState(
    profile.coloStage as ColoStage,
    profile.coloAccessories,
    profile._count.coloringImages,
  );
};

/**
 * Check for Colo evolution and update profile if needed
 * Called after saving artwork to check if the profile should evolve
 *
 * @param profileId - Optional profile ID, uses active profile if not provided
 */
export const checkAndUpdateColoEvolution = async (
  profileId?: string,
): Promise<EvolutionResult | null> => {
  const userId = await getUserId(ACTIONS.CHECK_COLO_EVOLUTION);

  if (!userId) {
    return null;
  }

  // Get profile ID (use provided or get active profile)
  let targetProfileId = profileId;
  if (!targetProfileId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeProfileId: true },
    });
    targetProfileId = user?.activeProfileId ?? undefined;
  }

  if (!targetProfileId) {
    return null;
  }

  // Get the profile with all data needed for evolution check
  const profile = await db.profile.findFirst({
    where: {
      id: targetProfileId,
      userId,
    },
    select: {
      id: true,
      coloStage: true,
      coloAccessories: true,
      _count: {
        select: {
          coloringImages: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  // Check for evolution
  const evolutionResult = checkEvolution(
    profile.coloStage as ColoStage,
    profile.coloAccessories,
    profile._count.coloringImages,
    // TODO: Add stats for accessory unlocks (sticker count, category counts, etc.)
  );

  // If evolved or unlocked new accessories, update the profile
  if (evolutionResult.evolved || evolutionResult.newAccessories.length > 0) {
    await db.profile.update({
      where: { id: profile.id },
      data: {
        coloStage: evolutionResult.newStage,
        coloAccessories: [
          ...profile.coloAccessories,
          ...evolutionResult.newAccessories,
        ],
      },
    });

    revalidatePath('/');
    revalidatePath('/account/profiles');
  }

  return evolutionResult;
};

/**
 * Get Colo state for a specific profile
 * Used for viewing profiles that aren't currently active
 */
export const getProfileColoState = async (
  profileId: string,
): Promise<ColoState | null> => {
  const userId = await getUserId(ACTIONS.GET_COLO_STATE);

  if (!userId) {
    return null;
  }

  const profile = await db.profile.findFirst({
    where: {
      id: profileId,
      userId,
    },
    select: {
      coloStage: true,
      coloAccessories: true,
      _count: {
        select: {
          coloringImages: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  return getColoState(
    profile.coloStage as ColoStage,
    profile.coloAccessories,
    profile._count.coloringImages,
  );
};
