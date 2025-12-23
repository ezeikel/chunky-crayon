'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@chunky-crayon/db';
import { getUserId } from './user';

export const updateShowCommunityImages = async (
  showCommunityImages: boolean,
) => {
  const userId = await getUserId('update settings');

  if (!userId) {
    return { error: 'You must be logged in to update settings.' };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { showCommunityImages },
    });

    revalidatePath('/');
    revalidatePath('/account/settings');

    return { success: true };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { error: 'Failed to update settings.' };
  }
};

export const getUserSettings = async () => {
  const userId = await getUserId('get settings');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      showCommunityImages: true,
    },
  });

  return user;
};
