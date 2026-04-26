'use server';

import { put } from '@one-colored-pixel/storage';
import { revalidatePath } from 'next/cache';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { generateBackgroundMusic } from '@/lib/elevenlabs';
import { createMusicPrompt } from '@/lib/audio/prompts';

export type GenerateBackgroundMusicResult =
  | {
      success: true;
      backgroundMusicUrl: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Generate ambient sound for a coloring image
 *
 * Creates a calming background soundscape based on the image's title and tags,
 * uploads it to blob storage, and updates the database.
 *
 * @param coloringImageId - The ID of the coloring image
 * @returns The URL of the generated ambient sound
 */
export async function generateBackgroundMusicForImage(
  coloringImageId: string,
): Promise<GenerateBackgroundMusicResult> {
  try {
    // Fetch the coloring image
    const coloringImage = await db.coloringImage.findFirst({
      where: { id: coloringImageId, brand: BRAND },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        backgroundMusicUrl: true,
      },
    });

    if (!coloringImage) {
      return { success: false, error: 'Coloring image not found' };
    }

    // Skip if already has ambient sound
    if (coloringImage.backgroundMusicUrl) {
      return {
        success: true,
        backgroundMusicUrl: coloringImage.backgroundMusicUrl,
      };
    }

    // Generate the ambient sound prompt (async — calls Claude)
    const prompt = await createMusicPrompt(
      coloringImage.title,
      coloringImage.description,
      coloringImage.tags,
    );

    // eslint-disable-next-line no-console
    console.log(
      `[BackgroundMusic] Generating for "${coloringImage.title}": ${prompt}`,
    );

    // Generate the ambient sound using ElevenLabs
    const audioBuffer = await generateBackgroundMusic(prompt);

    // Upload to blob storage
    const audioFileName = `uploads/coloring-images/${coloringImageId}/ambient.mp3`;
    const { url: backgroundMusicUrl } = await put(audioFileName, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    });

    // Update the database
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { backgroundMusicUrl },
    });

    // eslint-disable-next-line no-console
    console.log(
      `[BackgroundMusic] Generated ambient sound for "${coloringImage.title}": ${backgroundMusicUrl}`,
    );

    // Revalidate the coloring page
    revalidatePath(`/color/${coloringImageId}`);

    return { success: true, backgroundMusicUrl };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[BackgroundMusic] Error generating ambient sound:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch generate ambient sounds for multiple coloring images
 *
 * Useful for generating sounds for existing images that don't have them yet.
 * Processes images sequentially to avoid rate limiting.
 *
 * @param limit - Maximum number of images to process
 * @returns Number of images processed
 */
export async function generateBackgroundMusicForExistingImages(
  limit: number = 10,
): Promise<{ processed: number; failed: number }> {
  // Find images without ambient sounds
  const images = await db.coloringImage.findMany({
    where: { brand: BRAND, backgroundMusicUrl: null },
    select: { id: true, title: true },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  let processed = 0;
  let failed = 0;

  for (const image of images) {
    // eslint-disable-next-line no-console
    console.log(
      `[BackgroundMusic] Processing ${processed + 1}/${images.length}: "${image.title}"`,
    );

    const result = await generateBackgroundMusicForImage(image.id);

    if (result.success) {
      processed++;
    } else {
      failed++;
      // eslint-disable-next-line no-console
      console.error(
        `[BackgroundMusic] Failed for "${image.title}": ${result.error}`,
      );
    }

    // Add a small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { processed, failed };
}
