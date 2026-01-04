'use server';

import { put } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { db } from '@chunky-crayon/db';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { checkAndAwardStickers } from '@/lib/stickers/service';
import { checkAndUpdateColoEvolution } from '@/app/actions/colo';
import { ACTIONS } from '@/constants';
import type { Sticker } from '@/lib/stickers/types';
import type { EvolutionResult } from '@/lib/colo';

type SaveArtworkResult =
  | {
      success: true;
      artworkId: string;
      imageUrl: string;
      newStickers: Sticker[];
      evolutionResult: EvolutionResult | null;
    }
  | { success: false; error: string };

/**
 * Save a colored artwork to the user's gallery
 * @param coloringImageId - The ID of the original coloring image
 * @param imageDataUrl - The base64 data URL of the colored canvas
 * @param title - Optional custom title for the artwork
 */
export async function saveArtworkToGallery(
  coloringImageId: string,
  imageDataUrl: string,
  title?: string,
): Promise<SaveArtworkResult> {
  try {
    // Verify user is authenticated (works for both web session and mobile JWT)
    const userId = await getUserId(ACTIONS.SAVE_ARTWORK);
    if (!userId) {
      return { success: false, error: 'You must be signed in to save artwork' };
    }

    // Get active profile if any
    const activeProfile = await getActiveProfile();

    // Verify the coloring image exists
    const coloringImage = await db.coloringImage.findUnique({
      where: { id: coloringImageId },
    });

    if (!coloringImage) {
      return { success: false, error: 'Coloring image not found' };
    }

    // Convert data URL to buffer
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `uploads/saved-artwork/${userId}/${coloringImageId}/${timestamp}.png`;

    // Upload to Vercel Blob
    const { url: imageUrl } = await put(fileName, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    // Create the saved artwork record
    const savedArtwork = await db.savedArtwork.create({
      data: {
        userId,
        profileId: activeProfile?.id,
        coloringImageId,
        title: title || coloringImage.title,
        imageUrl,
      },
    });

    // Check for sticker unlocks after saving artwork
    const { newStickers } = await checkAndAwardStickers(
      userId,
      activeProfile?.id,
    );

    // Check for Colo evolution after saving artwork
    const evolutionResult = activeProfile?.id
      ? await checkAndUpdateColoEvolution(activeProfile.id)
      : null;

    // Revalidate the gallery page
    revalidatePath('/gallery');
    revalidatePath('/my-artwork');

    return {
      success: true,
      artworkId: savedArtwork.id,
      imageUrl,
      newStickers,
      evolutionResult,
    };
  } catch (error) {
    console.error('Error saving artwork:', error);
    return {
      success: false,
      error: 'Failed to save artwork. Please try again.',
    };
  }
}

/**
 * Get all saved artwork for the current user
 */
export async function getUserSavedArtwork() {
  const userId = await getUserId();
  if (!userId) {
    return [];
  }

  const activeProfile = await getActiveProfile();

  // If there's an active profile, filter by it; otherwise get all user artwork
  const where = activeProfile
    ? { userId, profileId: activeProfile.id }
    : { userId };

  const savedArtwork = await db.savedArtwork.findMany({
    where,
    include: {
      coloringImage: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return savedArtwork;
}

/**
 * Delete a saved artwork
 */
export async function deleteSavedArtwork(
  artworkId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: 'You must be signed in' };
    }

    // Verify ownership
    const artwork = await db.savedArtwork.findFirst({
      where: {
        id: artworkId,
        userId,
      },
    });

    if (!artwork) {
      return { success: false, error: 'Artwork not found' };
    }

    // Delete the record (blob storage cleanup can be done via cron)
    await db.savedArtwork.delete({
      where: { id: artworkId },
    });

    revalidatePath('/gallery');
    revalidatePath('/my-artwork');

    return { success: true };
  } catch (error) {
    console.error('Error deleting artwork:', error);
    return { success: false, error: 'Failed to delete artwork' };
  }
}

/**
 * Mobile API response types for saved artworks
 */
export type MobileSavedArtwork = {
  id: string;
  title: string;
  imageUrl: string;
  coloringImageId: string | null;
  coloringImage: {
    id: string;
    title: string;
    svgUrl: string | null;
  } | null;
  createdAt: string;
};

export type MobileSavedArtworksResponse = {
  artworks: MobileSavedArtwork[];
};

export type MobileSaveArtworkResponse =
  | {
      success: true;
      artworkId: string;
      imageUrl: string;
      newStickers: { id: string; name: string; imageUrl: string }[];
      evolutionResult: {
        evolved: boolean;
        previousStage: number;
        newStage: number;
        newAccessories: string[];
      } | null;
    }
  | { success: false; error: string };

/**
 * Get all saved artwork for mobile API
 * Returns formatted response for mobile consumption
 */
export async function getMobileSavedArtworksAction(): Promise<MobileSavedArtworksResponse> {
  const userId = await getUserId(ACTIONS.GET_SAVED_ARTWORKS);

  if (!userId) {
    return { artworks: [] };
  }

  // Get user's active profile
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

  const activeProfileId =
    user?.activeProfileId ||
    user?.profiles.find((p) => p.isDefault)?.id ||
    user?.profiles[0]?.id;

  // Filter by active profile if exists
  const where = activeProfileId
    ? { userId, profileId: activeProfileId }
    : { userId };

  const artworks = await db.savedArtwork.findMany({
    where,
    include: {
      coloringImage: {
        select: {
          id: true,
          title: true,
          svgUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return {
    artworks: artworks.map((artwork) => ({
      id: artwork.id,
      title: artwork.title || 'Untitled',
      imageUrl: artwork.imageUrl,
      coloringImageId: artwork.coloringImageId,
      coloringImage: artwork.coloringImage
        ? {
            id: artwork.coloringImage.id,
            title: artwork.coloringImage.title,
            svgUrl: artwork.coloringImage.svgUrl,
          }
        : null,
      createdAt: artwork.createdAt.toISOString(),
    })),
  };
}

/**
 * Save artwork for mobile API
 * Returns formatted response for mobile consumption
 */
export async function saveMobileArtworkAction(
  coloringImageId: string,
  imageDataUrl: string,
  title?: string,
): Promise<MobileSaveArtworkResponse> {
  const userId = await getUserId(ACTIONS.SAVE_ARTWORK);

  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's active profile
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

  const activeProfileId =
    user?.activeProfileId ||
    user?.profiles.find((p) => p.isDefault)?.id ||
    user?.profiles[0]?.id;

  // Verify the coloring image exists
  const coloringImage = await db.coloringImage.findUnique({
    where: { id: coloringImageId },
  });

  if (!coloringImage) {
    return { success: false, error: 'Coloring image not found' };
  }

  // Convert data URL to buffer
  const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Generate unique filename
  const timestamp = Date.now();
  const fileName = `uploads/saved-artwork/${userId}/${coloringImageId}/${timestamp}.png`;

  // Upload to Vercel Blob
  const { url: imageUrl } = await put(fileName, imageBuffer, {
    access: 'public',
    contentType: 'image/png',
  });

  // Create the saved artwork record
  const savedArtwork = await db.savedArtwork.create({
    data: {
      userId,
      profileId: activeProfileId,
      coloringImageId,
      title: title || coloringImage.title,
      imageUrl,
    },
  });

  // Check for sticker unlocks after saving artwork
  const { newStickers } = await checkAndAwardStickers(userId, activeProfileId);

  // Check for Colo evolution after saving artwork
  const evolutionResult = activeProfileId
    ? await checkAndUpdateColoEvolution(activeProfileId)
    : null;

  // Revalidate paths
  revalidatePath('/gallery');
  revalidatePath('/my-artwork');

  return {
    success: true,
    artworkId: savedArtwork.id,
    imageUrl,
    newStickers: newStickers.map((s) => ({
      id: s.id,
      name: s.name,
      imageUrl: s.imageUrl,
    })),
    evolutionResult: evolutionResult
      ? {
          evolved: evolutionResult.evolved,
          previousStage: evolutionResult.previousStage,
          newStage: evolutionResult.newStage,
          newAccessories: evolutionResult.newAccessories,
        }
      : null,
  };
}
