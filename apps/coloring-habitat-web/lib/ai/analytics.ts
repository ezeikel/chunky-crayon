import { generateText, Output } from "ai";
import { models } from "./models";
import { imageAnalyticsSchema, type ImageAnalytics } from "./schemas";
import { IMAGE_ANALYTICS_SYSTEM, IMAGE_ANALYTICS_PROMPT } from "./prompts";

/**
 * Analyze a coloring page image using Gemini 3 Flash to extract
 * structured analytics data for PostHog tracking.
 *
 * This function is designed to be called in Next.js `after()` callbacks
 * to avoid adding latency to the main response.
 *
 * @param imageUrl - The URL of the coloring page image to analyze
 * @returns Structured analytics data about the image content
 *
 * @example
 * ```ts
 * after(async () => {
 *   const analytics = await analyzeImageForAnalytics(imageUrl);
 *   await trackImageAnalytics(coloringImageId, analytics);
 * });
 * ```
 */
export const analyzeImageForAnalytics = async (
  imageUrl: string,
): Promise<ImageAnalytics | null> => {
  try {
    const { output } = await generateText({
      model: models.analytics,
      output: Output.object({ schema: imageAnalyticsSchema }),
      system: IMAGE_ANALYTICS_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: IMAGE_ANALYTICS_PROMPT,
            },
            {
              type: "image",
              image: new URL(imageUrl),
            },
          ],
        },
      ],
    });

    return output ?? null;
  } catch (error) {
    // Log error but don't throw - analytics should never break the main flow
    // eslint-disable-next-line no-console
    console.error("Error analyzing image for analytics:", error);
    return null;
  }
};
