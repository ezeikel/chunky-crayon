'use server';

import sharp from 'sharp';
import {
  generateObject,
  models,
  gridColorMapSchema,
  GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
  regionFirstColorResponseSchema,
  REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
} from '@/lib/ai';
import type { GridColorMap, FillPointsData } from '@/lib/ai';
import { ALL_COLORING_COLORS } from '@/constants';
import { db } from '@chunky-crayon/db';
import { detectAllRegionsFromPixels } from '@/utils/regionDetectionNode';

export type GenerateColorMapResult =
  | {
      success: true;
      colorMap: GridColorMap;
    }
  | {
      success: false;
      error: string;
    };

export type GenerateFillPointsResult =
  | {
      success: true;
      fillPoints: FillPointsData;
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

// =============================================================================
// Region-First Fill Points (replaces grid approach for new images)
// =============================================================================

function getSizeDescriptor(
  pixelCount: number,
  totalPixels: number,
): 'small' | 'medium' | 'large' {
  const percentage = (pixelCount / totalPixels) * 100;
  if (percentage > 10) return 'large';
  if (percentage > 2) return 'medium';
  return 'small';
}

/**
 * Generate region-aware fill points for an image.
 *
 * Pipeline:
 * 1. Fetch image from URL → buffer
 * 2. Convert to raw RGBA pixels with sharp (resize to 1024 max dimension)
 * 3. Detect regions with scanline flood fill
 * 4. Call Gemini Pro with artist-quality prompt + image + palette + regions
 * 5. Map AI response back to region centroids
 * 6. Save fillPointsJson + fillPointsGeneratedAt to DB
 */
export async function generateRegionFillPoints(
  coloringImageId: string,
  imageUrl: string,
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<GenerateFillPointsResult> {
  try {
    console.log(
      `[FillPoints] Generating region fill points for image ${coloringImageId}`,
    );
    const startTime = Date.now();

    // Step 1: Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Step 2: Convert to raw RGBA pixels, resize to max 1024 dimension
    const {
      data: rawPixels,
      info: { width: imageWidth, height: imageHeight },
    } = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(rawPixels);

    console.log(`[FillPoints] Image resized to ${imageWidth}x${imageHeight}`);

    // Step 3: Detect regions
    const regionMap = detectAllRegionsFromPixels(
      pixels,
      imageWidth,
      imageHeight,
      100, // MIN_REGION_SIZE
    );

    console.log(`[FillPoints] Detected ${regionMap.regions.length} regions`);

    if (regionMap.regions.length === 0) {
      return {
        success: false,
        error: 'No colorable regions detected in image',
      };
    }

    // Step 4: Format regions for AI
    const totalPixels = imageWidth * imageHeight;
    const detectedRegions = regionMap.regions.map((r) => ({
      id: r.id,
      gridRow: Math.min(
        5,
        Math.max(1, Math.ceil((r.centroid.y / imageHeight) * 5)),
      ),
      gridCol: Math.min(
        5,
        Math.max(1, Math.ceil((r.centroid.x / imageWidth) * 5)),
      ),
      size: getSizeDescriptor(r.pixelCount, totalPixels),
      pixelPercentage: Number(((r.pixelCount / totalPixels) * 100).toFixed(1)),
    }));

    // Exclude White and Black from palette (invisible or overlaps outlines)
    const palette = ALL_COLORING_COLORS.filter(
      (c) => c.hex !== '#FFFFFF' && c.hex !== '#212121',
    ).map((c) => ({ hex: c.hex, name: c.name }));

    // Prepare image for AI (PNG for lossless)
    const pngBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    const imageBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    // Step 5: Call Gemini Pro for color assignment
    const { object } = await generateObject({
      model: models.analyticsQuality,
      schema: regionFirstColorResponseSchema,
      system: REGION_FILL_POINTS_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: createRegionFillPointsPrompt(
                palette,
                detectedRegions,
                sceneContext,
              ),
            },
            { type: 'image', image: imageBase64 },
          ],
        },
      ],
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[FillPoints] AI response in ${elapsedMs}ms:`, {
      sceneDescription: object.sceneDescription,
      assignments: object.assignments.length,
      regions: regionMap.regions.length,
    });

    // Step 6: Map AI assignments back to region centroids
    const regionById = new Map(regionMap.regions.map((r) => [r.id, r]));
    const points: FillPointsData['points'] = [];

    let matched = 0;
    for (const assignment of object.assignments) {
      const region = regionById.get(assignment.regionId);
      if (region) {
        points.push({
          x: region.centroid.x,
          y: region.centroid.y,
          color: assignment.suggestedColor,
          label: assignment.element,
        });
        matched++;
      }
    }

    // Fill in any regions the AI missed with Sky Blue fallback
    const assignedIds = new Set(object.assignments.map((a) => a.regionId));
    const missed = regionMap.regions.filter((r) => !assignedIds.has(r.id));
    if (missed.length > 0) {
      console.warn(
        `[FillPoints] ${missed.length} regions not assigned by AI — using Sky Blue fallback`,
      );
      for (const r of missed) {
        points.push({
          x: r.centroid.x,
          y: r.centroid.y,
          color: '#1E88E5',
          label: `unassigned region #${r.id}`,
        });
      }
    }

    const fillPointsData: FillPointsData = {
      sourceWidth: imageWidth,
      sourceHeight: imageHeight,
      sceneDescription: object.sceneDescription,
      points,
    };

    console.log(
      `[FillPoints] ${points.length} fill points (${matched} from AI, ${missed.length} fallback)`,
    );

    // Step 7: Save to database
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: {
        fillPointsJson: JSON.stringify(fillPointsData),
        fillPointsGeneratedAt: new Date(),
      },
    });

    console.log(`[FillPoints] Saved fill points for image ${coloringImageId}`);

    return {
      success: true,
      fillPoints: fillPointsData,
    };
  } catch (error) {
    console.error('[FillPoints] Error generating fill points:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
