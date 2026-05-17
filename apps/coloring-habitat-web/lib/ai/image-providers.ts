/**
 * Image Generation — Coloring Habitat
 *
 * Creates the image generation pipeline using shared coloring-core
 * with CH-specific prompts and reference images.
 */

import {
  createImageGenerationPipeline,
  type ImageGenerationConfig,
} from "@one-colored-pixel/coloring-core";
import {
  createColoringImagePrompt,
  createGeminiColoringImagePrompt,
  createDifficultyAwarePrompt,
  REFERENCE_IMAGES,
  DIFFICULTY_MODIFIERS,
  PHOTO_TO_COLORING_SYSTEM,
  createPhotoToColoringPrompt,
  IMAGE_TO_COLORING_SYSTEM,
  createImageToColoringPrompt,
} from "./prompts";

const config: ImageGenerationConfig = {
  // CH uses its own adult-oriented reference set (not coloring-core's
  // kid-oriented getReferenceImages). The config contract changed to a
  // difficulty-aware getter; CH's set isn't tiered, so return it for any
  // difficulty.
  getReferenceImages: () => REFERENCE_IMAGES,
  difficultyModifiers: DIFFICULTY_MODIFIERS,
  createColoringImagePrompt,
  createGeminiColoringImagePrompt,
  createDifficultyAwarePrompt,
  photoToColoringSystem: PHOTO_TO_COLORING_SYSTEM,
  createPhotoToColoringPrompt,
  imageToColoringSystem: IMAGE_TO_COLORING_SYSTEM,
  createImageToColoringPrompt,
};

const pipeline = createImageGenerationPipeline(config);

export const {
  generateColoringPageImage,
  generateColoringPageFromPhoto,
  generateColoringPageFromImage,
  getCurrentProviderConfig,
  getAvailableProviders,
} = pipeline;

// Re-export types
export type {
  ImageProvider,
  GenerationResult,
  Difficulty,
  ProviderConfig,
} from "@one-colored-pixel/coloring-core";
