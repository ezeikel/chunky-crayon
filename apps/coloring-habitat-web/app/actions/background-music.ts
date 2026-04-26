"use server";

import { put } from "@one-colored-pixel/storage";
import { revalidatePath } from "next/cache";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";
import { generateBackgroundMusic } from "@/lib/elevenlabs";
import { createMusicPrompt } from "@/lib/audio/prompts";

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
 * Generate ambient music for a coloring image
 *
 * Creates a calming instrumental background track based on the image's
 * title, description, and tags, uploads it to blob storage, and updates
 * the database.
 *
 * @param coloringImageId - The ID of the coloring image
 * @returns The URL of the generated ambient music
 */
export async function generateBackgroundMusicForImage(
  coloringImageId: string,
): Promise<GenerateBackgroundMusicResult> {
  try {
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
      return { success: false, error: "Coloring image not found" };
    }

    // Skip if already has ambient music
    if (coloringImage.backgroundMusicUrl) {
      return {
        success: true,
        backgroundMusicUrl: coloringImage.backgroundMusicUrl,
      };
    }

    const prompt = await createMusicPrompt(
      coloringImage.title,
      coloringImage.description,
      coloringImage.tags,
    );

    // eslint-disable-next-line no-console
    console.log(
      `[BackgroundMusic] Generating for "${coloringImage.title}": ${prompt}`,
    );

    const audioBuffer = await generateBackgroundMusic(prompt);

    const audioFileName = `uploads/coloring-images/${coloringImageId}/ambient.mp3`;
    const { url: backgroundMusicUrl } = await put(audioFileName, audioBuffer, {
      access: "public",
      contentType: "audio/mpeg",
    });

    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { backgroundMusicUrl },
    });

    // eslint-disable-next-line no-console
    console.log(
      `[BackgroundMusic] Generated ambient music for "${coloringImage.title}": ${backgroundMusicUrl}`,
    );

    revalidatePath(`/color/${coloringImageId}`);

    return { success: true, backgroundMusicUrl };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[BackgroundMusic] Error generating ambient music:", error);
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
export async function generateBackgroundMusicForExistingImages(
  limit: number = 10,
): Promise<{ processed: number; failed: number }> {
  const images = await db.coloringImage.findMany({
    where: { brand: BRAND, backgroundMusicUrl: null },
    select: { id: true, title: true },
    take: limit,
    orderBy: { createdAt: "desc" },
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

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { processed, failed };
}
