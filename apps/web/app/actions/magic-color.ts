'use server';

import {
  generateObject,
  getTracedModels,
  MAGIC_COLOR_SYSTEM,
  createMagicColorPrompt,
  magicColorResponseSchema,
  type MagicColorMode,
  type MagicColorResponse,
} from '@/lib/ai';
import { ACTIONS } from '@/constants';
import { getUserId } from '@/app/actions/user';

// =============================================================================
// Magic Color Suggestions (AI-powered color recommendations)
// =============================================================================

export type MagicColorResult =
  | { success: true; data: MagicColorResponse }
  | { success: false; error: string };

export type MagicColorInput = {
  /** Base64-encoded image data (PNG/JPEG) */
  imageBase64: string;
  /** Normalized X position (0-1) from left */
  touchX: number;
  /** Normalized Y position (0-1) from top */
  touchY: number;
  /** Mode for color suggestions */
  mode?: MagicColorMode;
  /** Optional description of the image for context */
  imageDescription?: string;
};

/**
 * Get AI-powered color suggestions for a touched region of a coloring page.
 * Uses Gemini Flash for fast vision analysis.
 *
 * @param input - Image data and touch coordinates
 * @returns Color suggestions with kid-friendly names and reasons
 */
export async function getMagicColorSuggestions(
  input: MagicColorInput,
): Promise<MagicColorResult> {
  try {
    const {
      imageBase64,
      touchX,
      touchY,
      mode = 'accurate',
      imageDescription,
    } = input;

    // Validate input
    if (!imageBase64) {
      return { success: false, error: 'No image provided' };
    }

    if (touchX < 0 || touchX > 1 || touchY < 0 || touchY > 1) {
      return { success: false, error: 'Invalid touch coordinates' };
    }

    // Extract the base64 data and media type
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { success: false, error: 'Invalid image format' };
    }

    const [, mediaType, base64Data] = match;

    // Validate media type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(mediaType)) {
      return { success: false, error: 'Unsupported image format' };
    }

    const userId = await getUserId(ACTIONS.MAGIC_COLOR);

    // Get traced models for PostHog observability
    const tracedModels = getTracedModels({
      userId: userId || undefined,
      properties: {
        action: 'magic-color',
        mode,
        touchX: touchX.toFixed(2),
        touchY: touchY.toFixed(2),
      },
    });

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    console.log('[MagicColor] Processing request:', {
      mode,
      touchX: touchX.toFixed(2),
      touchY: touchY.toFixed(2),
      imageSize: imageBuffer.length,
    });

    const { object } = await generateObject({
      model: tracedModels.analytics, // Gemini 3 Flash - fast vision model
      schema: magicColorResponseSchema,
      system: MAGIC_COLOR_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: createMagicColorPrompt(
                touchX,
                touchY,
                mode,
                imageDescription,
              ),
            },
            {
              type: 'image',
              image: imageBuffer,
            },
          ],
        },
      ],
    });

    console.log('[MagicColor] Result:', {
      region: object.regionDescription,
      suggestionsCount: object.suggestions.length,
    });

    return { success: true, data: object };
  } catch (error) {
    console.error('Error getting magic color suggestions:', error);
    return {
      success: false,
      error: 'Something went wrong. Please try again!',
    };
  }
}
