'use server';

import { put } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { db } from '@chunky-crayon/db';
import { generateAmbientSound } from '@/lib/elevenlabs';
import { createAmbientPrompt } from '@/lib/audio/prompts';

export type GenerateAmbientSoundResult =
  | {
      success: true;
      ambientSoundUrl: string;
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
export async function generateAmbientSoundForImage(
  coloringImageId: string,
): Promise<GenerateAmbientSoundResult> {
  try {
    // Fetch the coloring image
    const coloringImage = await db.coloringImage.findUnique({
      where: { id: coloringImageId },
      select: {
        id: true,
        title: true,
        tags: true,
        ambientSoundUrl: true,
      },
    });

    if (!coloringImage) {
      return { success: false, error: 'Coloring image not found' };
    }

    // Skip if already has ambient sound
    if (coloringImage.ambientSoundUrl) {
      return { success: true, ambientSoundUrl: coloringImage.ambientSoundUrl };
    }

    // Generate the ambient sound prompt
    const prompt = createAmbientPrompt(coloringImage.title, coloringImage.tags);

    // eslint-disable-next-line no-console
    console.log(
      `[AmbientSound] Generating for "${coloringImage.title}": ${prompt}`,
    );

    // Generate the ambient sound using ElevenLabs
    const audioBuffer = await generateAmbientSound(prompt);

    // Upload to blob storage
    const audioFileName = `uploads/coloring-images/${coloringImageId}/ambient.mp3`;
    const { url: ambientSoundUrl } = await put(audioFileName, audioBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    });

    // Update the database
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { ambientSoundUrl },
    });

    // eslint-disable-next-line no-console
    console.log(
      `[AmbientSound] Generated ambient sound for "${coloringImage.title}": ${ambientSoundUrl}`,
    );

    // Revalidate the coloring page
    revalidatePath(`/color/${coloringImageId}`);

    return { success: true, ambientSoundUrl };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[AmbientSound] Error generating ambient sound:', error);
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
export async function generateAmbientSoundsForExistingImages(
  limit: number = 10,
): Promise<{ processed: number; failed: number }> {
  // Find images without ambient sounds
  const images = await db.coloringImage.findMany({
    where: { ambientSoundUrl: null },
    select: { id: true, title: true },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  let processed = 0;
  let failed = 0;

  for (const image of images) {
    // eslint-disable-next-line no-console
    console.log(
      `[AmbientSound] Processing ${processed + 1}/${images.length}: "${image.title}"`,
    );

    const result = await generateAmbientSoundForImage(image.id);

    if (result.success) {
      processed++;
    } else {
      failed++;
      // eslint-disable-next-line no-console
      console.error(
        `[AmbientSound] Failed for "${image.title}": ${result.error}`,
      );
    }

    // Add a small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { processed, failed };
}
