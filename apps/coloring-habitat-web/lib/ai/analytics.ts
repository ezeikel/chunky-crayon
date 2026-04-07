/**
 * Image Analytics — Coloring Habitat
 *
 * Re-exports shared analytics from coloring-core with CH-specific prompts.
 */

import { analyzeImageForAnalytics as sharedAnalyze } from "@one-colored-pixel/coloring-core";
import type { ImageAnalytics } from "@one-colored-pixel/coloring-core";
import { IMAGE_ANALYTICS_SYSTEM, IMAGE_ANALYTICS_PROMPT } from "./prompts";

export const analyzeImageForAnalytics = async (
  imageUrl: string,
): Promise<ImageAnalytics | null> => {
  return sharedAnalyze(imageUrl, {
    system: IMAGE_ANALYTICS_SYSTEM,
    prompt: IMAGE_ANALYTICS_PROMPT,
  });
};

export type { ImageAnalytics } from "@one-colored-pixel/coloring-core";
