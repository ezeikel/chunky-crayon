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

/**
 * Mobile API response types for Colo
 */
export type MobileColoState = {
  stage: number;
  stageName: string;
  imagePath: string;
  accessories: string[];
  progressToNext: {
    current: number;
    required: number;
    percentage: number;
  } | null;
};

export type MobileEvolutionResult = {
  evolved: boolean;
  previousStage: number;
  newStage: number;
  newAccessories: string[];
};

export type MobileColoResponse = {
  coloState: MobileColoState | null;
};

export type MobileColoEvolutionResponse = {
  coloState: MobileColoState | null;
  evolutionResult: MobileEvolutionResult | null;
};

/**
 * Get the current Colo state for mobile API
 * Returns formatted response for mobile consumption
 */
export const getMobileColoStateAction =
  async (): Promise<MobileColoResponse> => {
    const userId = await getUserId(ACTIONS.GET_COLO_STATE);

    if (!userId) {
      return { coloState: null };
    }

    // Get user's active profile with Colo data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        activeProfileId: true,
        profiles: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            isDefault: true,
            coloStage: true,
            coloAccessories: true,
            _count: {
              select: {
                savedArtworks: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.profiles.length === 0) {
      return { coloState: null };
    }

    const activeProfile =
      user.profiles.find((p) => p.id === user.activeProfileId) ||
      user.profiles.find((p) => p.isDefault) ||
      user.profiles[0];

    const coloState = getColoState(
      activeProfile.coloStage as ColoStage,
      activeProfile.coloAccessories,
      activeProfile._count.savedArtworks,
    );

    return {
      coloState: {
        stage: coloState.stage,
        stageName: coloState.stageName,
        imagePath: coloState.imagePath,
        accessories: coloState.accessories,
        progressToNext: coloState.progressToNext,
      },
    };
  };

/**
 * Check for Colo evolution for mobile API
 * Called after saving artwork to check if the profile should evolve
 */
export const checkMobileColoEvolutionAction = async (
  requestedProfileId?: string,
): Promise<MobileColoEvolutionResponse> => {
  const userId = await getUserId(ACTIONS.CHECK_COLO_EVOLUTION);

  if (!userId) {
    return { coloState: null, evolutionResult: null };
  }

  // Get user's active profile or use the requested one
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      activeProfileId: true,
      profiles: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, isDefault: true },
      },
    },
  });

  const profileId =
    requestedProfileId ||
    user?.activeProfileId ||
    user?.profiles.find((p) => p.isDefault)?.id ||
    user?.profiles[0]?.id;

  if (!profileId) {
    return { coloState: null, evolutionResult: null };
  }

  // Verify profile belongs to user
  const profile = await db.profile.findFirst({
    where: {
      id: profileId,
      userId,
    },
    select: {
      id: true,
      coloStage: true,
      coloAccessories: true,
      _count: {
        select: {
          savedArtworks: true,
        },
      },
    },
  });

  if (!profile) {
    return { coloState: null, evolutionResult: null };
  }

  // Check for evolution
  const evolutionResult = checkEvolution(
    profile.coloStage as ColoStage,
    profile.coloAccessories,
    profile._count.savedArtworks,
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

  // Get updated Colo state
  const coloState = getColoState(
    evolutionResult.newStage as ColoStage,
    [...profile.coloAccessories, ...evolutionResult.newAccessories],
    profile._count.savedArtworks,
  );

  return {
    coloState: {
      stage: coloState.stage,
      stageName: coloState.stageName,
      imagePath: coloState.imagePath,
      accessories: coloState.accessories,
      progressToNext: coloState.progressToNext,
    },
    evolutionResult: {
      evolved: evolutionResult.evolved,
      previousStage: evolutionResult.previousStage,
      newStage: evolutionResult.newStage,
      newAccessories: evolutionResult.newAccessories,
    },
  };
};
