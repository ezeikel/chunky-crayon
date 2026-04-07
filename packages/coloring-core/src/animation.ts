import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// Direct model for animation - avoids posthog/anthropic dependency issues in CI
const animationModel = google("gemini-2.0-flash");

export type AnimationConfig = {
  /** System prompt for the animation expert */
  system: string;
  /** User-facing prompt describing what to analyze in the image */
  userPrompt: string;
  /** Fallback prompt if generation fails */
  defaultPrompt: string;
};

/**
 * Generate an expert-level Veo 3 animation prompt by analyzing the actual image.
 *
 * Uses Gemini Flash to view the image and create a prompt referencing
 * specific visual elements. Designed for Next.js `after()` callbacks.
 *
 * @param imageUrl - The URL of the coloring page image to analyze
 * @param config - App-specific animation prompts
 * @returns A tailored Veo 3 animation prompt for this specific image
 */
export const generateAnimationPromptFromImage = async (
  imageUrl: string,
  config: AnimationConfig,
): Promise<string> => {
  try {
    const { text } = await generateText({
      model: animationModel,
      system: config.system,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: config.userPrompt },
            { type: "image", image: new URL(imageUrl) },
          ],
        },
      ],
    });

    const prompt = text.trim();

    if (!prompt || prompt.length < 20) {
      console.warn("[Animation] Generated prompt too short, using default");
      return config.defaultPrompt;
    }

    return prompt;
  } catch (error) {
    console.error("[Animation] Error generating prompt from image:", error);
    return config.defaultPrompt;
  }
};
