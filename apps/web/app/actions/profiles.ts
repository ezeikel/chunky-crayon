'use server';

import { revalidatePath } from 'next/cache';
import { Difficulty } from '@chunky-crayon/db';
import { ACTIONS } from '@/constants';
import { getUserId } from './user';
import {
  getProfilesForUser,
  getProfileById,
  createProfileForUser,
  updateProfileForUser,
  deleteProfileForUser,
  setActiveProfileForUser,
  getActiveProfileForUser,
  getActiveProfileDifficultyForUser,
  type ProfileWithStats,
  type CreateProfileInput,
  type UpdateProfileInput,
} from '@/lib/profiles/service';

// Re-export types from service
export type { ProfileWithStats, CreateProfileInput, UpdateProfileInput };

// Get all profiles for the current user
export const getProfiles = async (): Promise<ProfileWithStats[] | null> => {
  const userId = await getUserId(ACTIONS.GET_PROFILES);

  if (!userId) {
    return null;
  }

  return getProfilesForUser(userId);
};

// Get a single profile by ID
export const getProfile = async (
  profileId: string,
): Promise<ProfileWithStats | null> => {
  const userId = await getUserId(ACTIONS.GET_PROFILES);

  if (!userId) {
    return null;
  }

  return getProfileById(profileId, userId);
};

// Create a new profile
export const createProfile = async (input: CreateProfileInput) => {
  const userId = await getUserId(ACTIONS.CREATE_PROFILE);

  if (!userId) {
    return { error: 'You must be logged in to create a profile.' };
  }

  const result = await createProfileForUser(userId, input);

  if ('success' in result) {
    revalidatePath('/');
    revalidatePath('/account/profiles');
    revalidatePath('/account/settings');
  }

  return result;
};

// Update an existing profile
export const updateProfile = async (
  profileId: string,
  input: UpdateProfileInput,
) => {
  const userId = await getUserId(ACTIONS.UPDATE_PROFILE);

  if (!userId) {
    return { error: 'You must be logged in to update a profile.' };
  }

  const result = await updateProfileForUser(profileId, userId, input);

  if ('success' in result) {
    revalidatePath('/');
    revalidatePath('/account/profiles');
    revalidatePath('/account/settings');
  }

  return result;
};

// Delete a profile
export const deleteProfile = async (profileId: string) => {
  const userId = await getUserId(ACTIONS.DELETE_PROFILE);

  if (!userId) {
    return { error: 'You must be logged in to delete a profile.' };
  }

  const result = await deleteProfileForUser(profileId, userId);

  if ('success' in result) {
    revalidatePath('/');
    revalidatePath('/account/profiles');
    revalidatePath('/account/settings');
  }

  return result;
};

// Set the active profile for the current session
export const setActiveProfile = async (profileId: string) => {
  const userId = await getUserId(ACTIONS.SET_ACTIVE_PROFILE);

  if (!userId) {
    return { error: 'You must be logged in to switch profiles.' };
  }

  const result = await setActiveProfileForUser(profileId, userId);

  if ('success' in result) {
    revalidatePath('/');
    revalidatePath('/account/profiles');
  }

  return result;
};

// Get the currently active profile
export const getActiveProfile = async (): Promise<ProfileWithStats | null> => {
  const userId = await getUserId(ACTIONS.GET_ACTIVE_PROFILE);

  if (!userId) {
    return null;
  }

  return getActiveProfileForUser(userId);
};

// Helper function to get difficulty for the active profile
export const getActiveProfileDifficulty = async (): Promise<Difficulty> => {
  const userId = await getUserId(ACTIONS.GET_ACTIVE_PROFILE);

  if (!userId) {
    return Difficulty.BEGINNER;
  }

  return getActiveProfileDifficultyForUser(userId);
};
