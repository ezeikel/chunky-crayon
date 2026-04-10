"use server";

import { put } from "@one-colored-pixel/storage";
import { revalidatePath } from "next/cache";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";
import { generateAmbientSound } from "@/lib/elevenlabs";
import { createAmbientPrompt } from "@/lib/audio/prompts";

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
 * Generate ambient music for a coloring image
 *
 * Creates a calming instrumental background track based on the image's
 * title, description, and tags, uploads it to blob storage, and updates
 * the database.
 *
 * @param coloringImageId - The ID of the coloring image
 * @returns The URL of the generated ambient music
 */
export async function generateAmbientSoundForImage(
  coloringImageId: string,
): Promise<GenerateAmbientSoundResult> {
  try {
    const coloringImage = await db.coloringImage.findFirst({
      where: { id: coloringImageId, brand: BRAND },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        ambientSoundUrl: true,
      },
    });

    if (!coloringImage) {
      return { success: false, error: "Coloring image not found" };
    }

    // Skip if already has ambient music
    if (coloringImage.ambientSoundUrl) {
      return { success: true, ambientSoundUrl: coloringImage.ambientSoundUrl };
    }

    const prompt = await createAmbientPrompt(
      coloringImage.title,
      coloringImage.description,
      coloringImage.tags,
    );

    // eslint-disable-next-line no-console
    console.log(
      `[AmbientSound] Generating for "${coloringImage.title}": ${prompt}`,
    );

    const audioBuffer = await generateAmbientSound(prompt);

    const audioFileName = `uploads/coloring-images/${coloringImageId}/ambient.mp3`;
    const { url: ambientSoundUrl } = await put(audioFileName, audioBuffer, {
      access: "public",
      contentType: "audio/mpeg",
    });

    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { ambientSoundUrl },
    });

    // eslint-disable-next-line no-console
    console.log(
      `[AmbientSound] Generated ambient music for "${coloringImage.title}": ${ambientSoundUrl}`,
    );

    revalidatePath(`/color/${coloringImageId}`);

    return { success: true, ambientSoundUrl };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[AmbientSound] Error generating ambient music:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Batch generate ambient music for multiple coloring images
 *
 * Useful for backfilling existing images. Processes sequentially with a
 * small delay between requests to avoid rate limiting.
 */
export async function generateAmbientSoundsForExistingImages(
  limit: number = 10,
): Promise<{ processed: number; failed: number }> {
  const images = await db.coloringImage.findMany({
    where: { brand: BRAND, ambientSoundUrl: null },
    select: { id: true, title: true },
    take: limit,
    orderBy: { createdAt: "desc" },
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

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { processed, failed };
}
