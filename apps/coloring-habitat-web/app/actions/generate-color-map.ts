"use server";

import {
  generateGridColorMapLogic,
  generateRegionFillPointsLogic,
  type GenerateColorMapResult,
  type GenerateFillPointsResult,
} from "@one-colored-pixel/coloring-core";
import type { GridColorMap } from "@one-colored-pixel/coloring-core";
import {
  GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
  REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
} from "@/lib/ai";
import { ALL_COLORING_COLORS_EXTENDED } from "@/constants";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";

const colorMapConfig = {
  gridColorMapSystem: GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
  regionFillPointsSystem: REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  allColors: ALL_COLORING_COLORS_EXTENDED.map((c) => ({
    hex: c.hex,
    name: c.name,
  })),
};

/**
 * Generate a pre-computed 5x5 grid color map and save to DB.
 */
export async function generateGridColorMap(
  coloringImageId: string,
  imageUrl: string,
): Promise<GenerateColorMapResult> {
  const result = await generateGridColorMapLogic(imageUrl, colorMapConfig);

  if (result.success) {
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: {
        colorMapJson: JSON.stringify(result.colorMap),
        colorMapGeneratedAt: new Date(),
      },
    });
    console.log(`[ColorMap] Saved color map for image ${coloringImageId}`);
  }

  return result;
}

/**
 * Get the pre-computed color map for a coloring image.
 */
export async function getColorMapForImage(
  coloringImageId: string,
): Promise<GridColorMap | null> {
  const image = await db.coloringImage.findFirst({
    where: { id: coloringImageId, brand: BRAND },
    select: { colorMapJson: true },
  });

  if (!image?.colorMapJson) return null;

  try {
    return JSON.parse(image.colorMapJson) as GridColorMap;
  } catch {
    console.error(
      `[ColorMap] Failed to parse colorMapJson for image ${coloringImageId}`,
    );
    return null;
  }
}

/**
 * Generate region-aware fill points and save to DB.
 */
export async function generateRegionFillPoints(
  coloringImageId: string,
  imageUrl: string,
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<GenerateFillPointsResult> {
  console.log(
    `[FillPoints] Generating region fill points for image ${coloringImageId}`,
  );

  const result = await generateRegionFillPointsLogic(
    imageUrl,
    colorMapConfig,
    sceneContext,
  );

  if (result.success) {
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: {
        fillPointsJson: JSON.stringify(result.fillPoints),
        fillPointsGeneratedAt: new Date(),
      },
    });
    console.log(`[FillPoints] Saved fill points for image ${coloringImageId}`);
  }

  return result;
}
