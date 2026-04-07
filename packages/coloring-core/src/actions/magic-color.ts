import { generateText, Output } from "ai";
import { getTracedModels } from "../models";
import { magicColorResponseSchema, type MagicColorResponse } from "../schemas";

// =============================================================================
// Types
// =============================================================================

export type MagicColorMode = "accurate" | "creative" | "surprise";

export type MagicColorResult =
  | { success: true; data: MagicColorResponse }
  | { success: false; error: string };

export type MagicColorInput = {
  imageBase64: string;
  touchX: number;
  touchY: number;
  mode?: MagicColorMode;
  imageDescription?: string;
};

export type MagicColorConfig = {
  /** System prompt for magic color AI */
  system: string;
  /** Create the user prompt given touch coords and mode */
  createPrompt: (
    touchX: number,
    touchY: number,
    mode: MagicColorMode,
    imageDescription?: string,
  ) => string;
};

// =============================================================================
// Logic
// =============================================================================

/**
 * Get AI-powered color suggestions for a touched region of a coloring page.
 * Uses Gemini Flash for fast vision analysis.
 */
export async function getMagicColorSuggestionsLogic(
  input: MagicColorInput,
  config: MagicColorConfig,
  userId?: string | null,
): Promise<MagicColorResult> {
  try {
    const {
      imageBase64,
      touchX,
      touchY,
      mode = "accurate",
      imageDescription,
    } = input;

    if (!imageBase64) {
      return { success: false, error: "No image provided" };
    }

    if (touchX < 0 || touchX > 1 || touchY < 0 || touchY > 1) {
      return { success: false, error: "Invalid touch coordinates" };
    }

    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { success: false, error: "Invalid image format" };
    }

    const [, mediaType, base64Data] = match;

    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(mediaType)) {
      return { success: false, error: "Unsupported image format" };
    }

    const tracedModels = getTracedModels({
      userId: userId || undefined,
      properties: {
        action: "magic-color",
        mode,
        touchX: touchX.toFixed(2),
        touchY: touchY.toFixed(2),
      },
    });

    const imageBuffer = Buffer.from(base64Data, "base64");

    console.log("[MagicColor] Processing request:", {
      mode,
      touchX: touchX.toFixed(2),
      touchY: touchY.toFixed(2),
      imageSize: imageBuffer.length,
    });

    const { output } = await generateText({
      model: tracedModels.analytics,
      output: Output.object({ schema: magicColorResponseSchema }),
      system: config.system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: config.createPrompt(touchX, touchY, mode, imageDescription),
            },
            { type: "image", image: imageBuffer },
          ],
        },
      ],
    });

    console.log("[MagicColor] Result:", {
      region: output!.regionDescription,
      suggestionsCount: output!.suggestions.length,
    });

    return { success: true, data: output! };
  } catch (error) {
    console.error("Error getting magic color suggestions:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again!",
    };
  }
}
