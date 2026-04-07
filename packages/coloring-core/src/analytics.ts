import { generateText, Output } from "ai";
import { models } from "./models";
import { imageAnalyticsSchema, type ImageAnalytics } from "./schemas";

/**
 * Analyze a coloring page image using Gemini 3 Flash to extract
 * structured analytics data for PostHog tracking.
 *
 * @param imageUrl - The URL of the coloring page image to analyze
 * @param config - App-specific analytics prompts
 * @returns Structured analytics data about the image content
 */
export const analyzeImageForAnalytics = async (
  imageUrl: string,
  config: { system: string; prompt: string },
): Promise<ImageAnalytics | null> => {
  try {
    const { output } = await generateText({
      model: models.analytics,
      output: Output.object({ schema: imageAnalyticsSchema }),
      system: config.system,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: config.prompt },
            { type: "image", image: new URL(imageUrl) },
          ],
        },
      ],
    });

    return output ?? null;
  } catch (error) {
    console.error("Error analyzing image for analytics:", error);
    return null;
  }
};
