import sharp from "sharp";
import { generateText, Output } from "ai";
import { models } from "../models";
import {
  gridColorMapSchema,
  regionFirstColorResponseSchema,
  type GridColorMap,
  type FillPointsData,
} from "../schemas";
import { detectAllRegionsFromPixels } from "@one-colored-pixel/canvas";

// =============================================================================
// Types
// =============================================================================

export type GenerateColorMapResult =
  | { success: true; colorMap: GridColorMap }
  | { success: false; error: string };

export type GenerateFillPointsResult =
  | { success: true; fillPoints: FillPointsData }
  | { success: false; error: string };

export type ColorPaletteEntry = { hex: string; name: string };

export type ColorMapConfig = {
  /** System prompt for grid color map generation */
  gridColorMapSystem: string;
  /** Create the grid color map prompt */
  createGridColorMapPrompt: (palette: ColorPaletteEntry[]) => string;
  /** System prompt for region fill points */
  regionFillPointsSystem: string;
  /** Create the region fill points prompt */
  createRegionFillPointsPrompt: (
    palette: ColorPaletteEntry[],
    regions: Array<{
      id: number;
      gridRow: number;
      gridCol: number;
      size: "small" | "medium" | "large";
      pixelPercentage: number;
    }>,
    sceneContext?: { title: string; description: string; tags: string[] },
  ) => string;
  /** Color palette (excluding white/black for fill points) */
  allColors: ColorPaletteEntry[];
};

// =============================================================================
// Helpers
// =============================================================================

function getSizeDescriptor(
  pixelCount: number,
  totalPixels: number,
): "small" | "medium" | "large" {
  const percentage = (pixelCount / totalPixels) * 100;
  if (percentage > 10) return "large";
  if (percentage > 2) return "medium";
  return "small";
}

// =============================================================================
// Grid Color Map Logic
// =============================================================================

/**
 * Generate a pre-computed 5x5 grid color map for an image.
 * Returns the color map data — caller handles DB persistence.
 */
export async function generateGridColorMapLogic(
  imageUrl: string,
  config: ColorMapConfig,
): Promise<GenerateColorMapResult> {
  try {
    const palette = config.allColors.map((c) => ({
      hex: c.hex,
      name: c.name,
    }));

    const startTime = Date.now();

    const { output } = await generateText({
      model: models.analyticsQuality,
      output: Output.object({ schema: gridColorMapSchema }),
      system: config.gridColorMapSystem,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: config.createGridColorMapPrompt(palette) },
            { type: "image", image: new URL(imageUrl) },
          ],
        },
      ],
    });

    const colorMap = output!;
    const elapsedMs = Date.now() - startTime;
    console.log(`[ColorMap] Generated in ${elapsedMs}ms:`, {
      sceneDescription: colorMap.sceneDescription,
      gridCellCount: colorMap.gridColors.length,
    });

    return { success: true, colorMap };
  } catch (error) {
    console.error("[ColorMap] Error generating color map:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Region Fill Points Logic
// =============================================================================

/**
 * Generate region-aware fill points for an image.
 * Returns the fill points data — caller handles DB persistence.
 */
export async function generateRegionFillPointsLogic(
  imageUrl: string,
  config: ColorMapConfig,
  sceneContext?: { title: string; description: string; tags: string[] },
): Promise<GenerateFillPointsResult> {
  try {
    const startTime = Date.now();

    // Step 1: Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Step 2: Convert to raw RGBA pixels
    const {
      data: rawPixels,
      info: { width: imageWidth, height: imageHeight },
    } = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
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
      100,
    );

    console.log(`[FillPoints] Detected ${regionMap.regions.length} regions`);

    if (regionMap.regions.length === 0) {
      return {
        success: false,
        error: "No colorable regions detected in image",
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

    // Exclude White and Black from palette
    const palette = config.allColors
      .filter((c) => c.hex !== "#FFFFFF" && c.hex !== "#212121")
      .map((c) => ({ hex: c.hex, name: c.name }));

    // Prepare image for AI
    const pngBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const imageBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;

    // Step 5: Call Gemini Pro for color assignment
    const { output } = await generateText({
      model: models.analyticsQuality,
      output: Output.object({ schema: regionFirstColorResponseSchema }),
      system: config.regionFillPointsSystem,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: config.createRegionFillPointsPrompt(
                palette,
                detectedRegions,
                sceneContext,
              ),
            },
            { type: "image", image: imageBase64 },
          ],
        },
      ],
    });

    const object = output!;
    const elapsedMs = Date.now() - startTime;
    console.log(`[FillPoints] AI response in ${elapsedMs}ms:`, {
      sceneDescription: object.sceneDescription,
      assignments: object.assignments.length,
      regions: regionMap.regions.length,
    });

    // Step 6: Map AI assignments to region centroids
    const regionById = new Map(regionMap.regions.map((r) => [r.id, r]));
    const points: FillPointsData["points"] = [];

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

    // Fill in unassigned regions with Sky Blue fallback
    const assignedIds = new Set(object.assignments.map((a) => a.regionId));
    const missed = regionMap.regions.filter((r) => !assignedIds.has(r.id));
    if (missed.length > 0) {
      console.warn(
        `[FillPoints] ${missed.length} regions not assigned — using Sky Blue fallback`,
      );
      for (const r of missed) {
        points.push({
          x: r.centroid.x,
          y: r.centroid.y,
          color: "#1E88E5",
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

    return { success: true, fillPoints: fillPointsData };
  } catch (error) {
    console.error("[FillPoints] Error generating fill points:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
