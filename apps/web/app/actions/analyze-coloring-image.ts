'use server';

import { auth } from '@/auth';
import {
  generateObject,
  models,
  regionFirstColorResponseSchema,
  REGION_FIRST_COLOR_SYSTEM,
  createRegionFirstColorPrompt,
} from '@/lib/ai';
import type { RegionFirstColorResponse, DetectedRegionInput } from '@/lib/ai';
import { ALL_COLORING_COLORS } from '@/constants';

export type AssignColorsToRegionsResult =
  | {
      success: true;
      response: RegionFirstColorResponse;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Assign colors to detected regions using AI.
 *
 * Uses a region-first approach: client detects all colorable regions,
 * sends their positions to AI, and AI assigns a color to each one.
 * This guarantees 1:1 mapping between AI colors and canvas regions.
 *
 * @param imageBase64 - Base64 encoded image data
 * @param detectedRegions - Array of regions detected on the canvas (with grid positions)
 * @returns Color assignment for each detected region
 */
export async function assignColorsToRegions(
  imageBase64: string,
  detectedRegions: DetectedRegionInput[],
): Promise<AssignColorsToRegionsResult> {
  try {
    // Get user ID for tracing (optional)
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userId = session?.user?.id;

    // Prepare palette for the prompt
    const palette = ALL_COLORING_COLORS.map((color) => ({
      hex: color.hex,
      name: color.name,
    }));

    // Ensure the image has the proper data URI prefix
    const imageData = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    // NOTE: Keep these logs for debugging and future prompt improvements
    console.log('\n========== MAGIC FILL: REGION-FIRST APPROACH ==========');
    console.log(`Total regions to color: ${detectedRegions.length}`);
    console.log(
      'Sample regions:',
      detectedRegions
        .slice(0, 5)
        .map((r) => `#${r.id} at (${r.gridRow},${r.gridCol}) - ${r.size}`),
    );

    const startTime = Date.now();
    const { object } = await generateObject({
      model: models.analyticsQuality, // Gemini 3 Pro for vision analysis
      schema: regionFirstColorResponseSchema,
      system: REGION_FIRST_COLOR_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: createRegionFirstColorPrompt(palette, detectedRegions),
            },
            {
              type: 'image',
              image: imageData,
            },
          ],
        },
      ],
    });
    const duration = Date.now() - startTime;

    console.log(`Duration: ${duration}ms`);
    console.log(`Scene: ${object.sceneDescription}`);
    console.log(`Assignments returned: ${object.assignments.length}`);
    console.log(
      `Match rate: ${((object.assignments.length / detectedRegions.length) * 100).toFixed(1)}%`,
    );

    // Log sample assignments
    console.log('\nSample assignments:');
    object.assignments.slice(0, 10).forEach((a) => {
      console.log(
        `  #${a.regionId}: "${a.element}" → ${a.colorName} (${a.suggestedColor})`,
      );
    });
    console.log(
      '============================================================\n',
    );

    return {
      success: true,
      response: object,
    };
  } catch (error) {
    console.error('Error in region-first color assignment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign colors',
    };
  }
}
