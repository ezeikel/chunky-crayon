'use server';

import {
  generateObject,
  models,
  gridColorMapSchema,
  GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
} from '@/lib/ai';
import type { GridColorMap } from '@/lib/ai';
import { ALL_COLORING_COLORS } from '@/constants';
import { db } from '@chunky-crayon/db';

export type GenerateColorMapResult =
  | {
      success: true;
      colorMap: GridColorMap;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Generate a pre-computed 5x5 grid color map for an image.
 *
 * This runs in after() during image generation to pre-compute colors.
 * The client then looks up colors by grid position for instant Magic Fill.
 *
 * @param coloringImageId - ID of the ColoringImage to update
 * @param imageUrl - URL of the coloring page image to analyze
 * @returns The generated color map
 */
export async function generateGridColorMap(
  coloringImageId: string,
  imageUrl: string,
): Promise<GenerateColorMapResult> {
  try {
    // Prepare palette for the prompt
    const palette = ALL_COLORING_COLORS.map((color) => ({
      hex: color.hex,
      name: color.name,
    }));

    console.log(
      `[ColorMap] Generating grid color map for image ${coloringImageId}`,
    );
    const startTime = Date.now();

    const { object } = await generateObject({
      model: models.analyticsQuality, // Gemini Pro for high-accuracy vision analysis (runs in after() so latency not an issue)
      schema: gridColorMapSchema,
      system: GRID_COLOR_MAP_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: createGridColorMapPrompt(palette),
            },
            {
              type: 'image',
              image: new URL(imageUrl),
            },
          ],
        },
      ],
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[ColorMap] Generated in ${elapsedMs}ms:`, {
      sceneDescription: object.sceneDescription,
      gridCellCount: object.gridColors.length,
    });

    // Save to database
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: {
        colorMapJson: JSON.stringify(object),
        colorMapGeneratedAt: new Date(),
      },
    });

    console.log(`[ColorMap] Saved color map for image ${coloringImageId}`);

    return {
      success: true,
      colorMap: object,
    };
  } catch (error) {
    console.error('[ColorMap] Error generating color map:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the pre-computed color map for a coloring image.
 * Returns null if the color map hasn't been generated yet.
 */
export async function getColorMapForImage(
  coloringImageId: string,
): Promise<GridColorMap | null> {
  const image = await db.coloringImage.findUnique({
    where: { id: coloringImageId },
    select: { colorMapJson: true },
  });

  if (!image?.colorMapJson) {
    return null;
  }

  try {
    return JSON.parse(image.colorMapJson) as GridColorMap;
  } catch {
    console.error(
      `[ColorMap] Failed to parse colorMapJson for image ${coloringImageId}`,
    );
    return null;
  }
}
