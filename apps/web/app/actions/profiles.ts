'use server';

import { revalidatePath } from 'next/cache';
import { db, Prisma, AgeGroup, Difficulty } from '@chunky-crayon/db';
import { ACTIONS } from '@/constants';
import { getUserId } from './user';

// Age group to default difficulty mapping
const AGE_GROUP_DEFAULT_DIFFICULTY: Record<AgeGroup, Difficulty> = {
  [AgeGroup.TODDLER]: Difficulty.BEGINNER,
  [AgeGroup.CHILD]: Difficulty.BEGINNER,
  [AgeGroup.TWEEN]: Difficulty.INTERMEDIATE,
  [AgeGroup.TEEN]: Difficulty.ADVANCED,
  [AgeGroup.ADULT]: Difficulty.EXPERT,
};

export type ProfileWithStats = Prisma.ProfileGetPayload<{
  select: {
    id: true;
    name: true;
    avatarId: true;
    ageGroup: true;
    difficulty: true;
    isDefault: true;
    createdAt: true;
    updatedAt: true;
    _count: {
      select: {
        coloringImages: true;
      };
    };
  };
}>;

// Get all profiles for the current user
export const getProfiles = async (): Promise<ProfileWithStats[] | null> => {
  const userId = await getUserId(ACTIONS.GET_PROFILES);

  if (!userId) {
    return null;
  }

  const profiles = await db.profile.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      name: true,
      avatarId: true,
      ageGroup: true,
      difficulty: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          coloringImages: true,
        },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  return profiles;
};

// Get a single profile by ID
export const getProfile = async (
  profileId: string,
): Promise<ProfileWithStats | null> => {
  const userId = await getUserId(ACTIONS.GET_PROFILES);

  if (!userId) {
    return null;
  }

  const profile = await db.profile.findFirst({
    where: {
      id: profileId,
      userId, // Ensure user owns this profile
    },
    select: {
      id: true,
      name: true,
      avatarId: true,
      ageGroup: true,
      difficulty: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          coloringImages: true,
        },
      },
    },
  });

  return profile;
};

// Create a new profile
export type CreateProfileInput = {
  name: string;
  avatarId?: string;
  ageGroup?: AgeGroup;
  difficulty?: Difficulty;
};

export const createProfile = async (input: CreateProfileInput) => {
  const userId = await getUserId(ACTIONS.CREATE_PROFILE);

  if (!userId) {
    return { error: 'You must be logged in to create a profile.' };
  }

  try {
    // Check profile limit (max 10 profiles per account)
    const existingCount = await db.profile.count({
      where: { userId },
    });

    if (existingCount >= 10) {
      return { error: 'Maximum number of profiles reached (10).' };
    }

    // Determine if this should be the default profile
    const isDefault = existingCount === 0;

    // Get the age group (default to CHILD if not provided)
    const ageGroup = input.ageGroup || AgeGroup.CHILD;

    // Set difficulty based on age group if not explicitly provided
    const difficulty =
      input.difficulty || AGE_GROUP_DEFAULT_DIFFICULTY[ageGroup];

    const profile = await db.profile.create({
      data: {
        userId,
        name: input.name,
        avatarId: input.avatarId || 'default',
        ageGroup,
        difficulty,
        isDefault,
      },
      select: {
        id: true,
        name: true,
        avatarId: true,
        ageGroup: true,
        difficulty: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            coloringImages: true,
          },
        },
      },
    });

    // If this is the first profile, set it as active
    if (isDefault) {
      await db.user.update({
        where: { id: userId },
        data: { activeProfileId: profile.id },
      });
    }

    revalidatePath('/');
    revalidatePath('/account/profiles');
    revalidatePath('/account/settings');

    return { success: true, profile };
  } catch (error) {
    console.error('Error creating profile:', error);
    return { error: 'Failed to create profile.' };
  }
};

// Update an existing profile
export type UpdateProfileInput = {
  name?: string;
  avatarId?: string;
  ageGroup?: AgeGroup;
  difficulty?: Difficulty;
};

export const updateProfile = async (
  profileId: string,
  input: UpdateProfileInput,
) => {
  const userId = await getUserId(ACTIONS.UPDATE_PROFILE);

  if (!userId) {
    return { error: 'You must be logged in to update a profile.' };
  }

  try {
    // Verify the user owns this profile
    const existingProfile = await db.profile.findFirst({
      where: {
        id: profileId,
        userId,
      },
    });

    if (!existingProfile) {
      return { error: 'Profile not found.' };
    }

    // If age group is changing and difficulty is not explicitly provided,
    // update difficulty to match new age group default
    const updateData: Prisma.ProfileUpdateInput = { ...input };

    if (input.ageGroup && !input.difficulty) {
      updateData.difficulty = AGE_GROUP_DEFAULT_DIFFICULTY[input.ageGroup];
    }

    const profile = await db.profile.update({
      where: { id: profileId },
      data: updateData,
      select: {
        id: true,
        name: true,
        avatarId: true,
        ageGroup: true,
        difficulty: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            coloringImages: true,
          },
        },
      },
    });

    revalidatePath('/');
    revalidatePath('/account/profiles');
    revalidatePath('/account/settings');

    return { success: true, profile };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { error: 'Failed to update profile.' };
  }
};

// Delete a profile
export const deleteProfile = async (profileId: string) => {
  const userId = await getUserId(ACTIONS.DELETE_PROFILE);

  if (!userId) {
    return { error: 'You must be logged in to delete a profile.' };
  }

  try {
    // Verify the user owns this profile
    const profile = await db.profile.findFirst({
      where: {
        id: profileId,
        userId,
      },
    });

    if (!profile) {
      return { error: 'Profile not found.' };
    }

    // Get user to check if this is the active profile
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeProfileId: true },
    });

    // Delete the profile (coloring images will keep profileId as null)
    await db.profile.delete({
      where: { id: profileId },
    });

    // If the deleted profile was the default or active, set a new one
    if (profile.isDefault || user?.activeProfileId === profileId) {
      const remainingProfile = await db.profile.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (remainingProfile) {
        await db.$transaction([
          db.profile.update({
            where: { id: remainingProfile.id },
            data: { isDefault: true },
          }),
          db.user.update({
            where: { id: userId },
            data: { activeProfileId: remainingProfile.id },
          }),
        ]);
      } else {
        // No profiles left, clear active profile
        await db.user.update({
          where: { id: userId },
          data: { activeProfileId: null },
        });
      }
    }

    revalidatePath('/');
    revalidatePath('/account/profiles');
    revalidatePath('/account/settings');

    return { success: true };
  } catch (error) {
    console.error('Error deleting profile:', error);
    return { error: 'Failed to delete profile.' };
  }
};

// Set the active profile for the current session
export const setActiveProfile = async (profileId: string) => {
  const userId = await getUserId(ACTIONS.SET_ACTIVE_PROFILE);

  if (!userId) {
    return { error: 'You must be logged in to switch profiles.' };
  }

  try {
    // Verify the user owns this profile
    const profile = await db.profile.findFirst({
      where: {
        id: profileId,
        userId,
      },
    });

    if (!profile) {
      return { error: 'Profile not found.' };
    }

    await db.user.update({
      where: { id: userId },
      data: { activeProfileId: profileId },
    });

    revalidatePath('/');
    revalidatePath('/account/profiles');

    return { success: true, profile };
  } catch (error) {
    console.error('Error setting active profile:', error);
    return { error: 'Failed to switch profile.' };
  }
};

// Get the currently active profile
export const getActiveProfile = async (): Promise<ProfileWithStats | null> => {
  const userId = await getUserId(ACTIONS.GET_ACTIVE_PROFILE);

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeProfileId: true },
  });

  if (!user?.activeProfileId) {
    // Return the default profile if no active profile is set
    const defaultProfile = await db.profile.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      select: {
        id: true,
        name: true,
        avatarId: true,
        ageGroup: true,
        difficulty: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            coloringImages: true,
          },
        },
      },
    });

    return defaultProfile;
  }

  const profile = await db.profile.findFirst({
    where: {
      id: user.activeProfileId,
      userId,
    },
    select: {
      id: true,
      name: true,
      avatarId: true,
      ageGroup: true,
      difficulty: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          coloringImages: true,
        },
      },
    },
  });

  return profile;
};

// Helper function to get difficulty for the active profile
export const getActiveProfileDifficulty = async (): Promise<Difficulty> => {
  const profile = await getActiveProfile();

  // Default to BEGINNER if no profile exists
  return profile?.difficulty || Difficulty.BEGINNER;
};
