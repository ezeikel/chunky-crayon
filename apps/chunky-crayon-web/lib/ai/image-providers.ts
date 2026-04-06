/**
 * Image Generation — Chunky Crayon
 *
 * Creates the image generation pipeline using shared coloring-core
 * with CC-specific prompts and reference images.
 */

import {
  createImageGenerationPipeline,
  type ImageGenerationConfig,
} from '@one-colored-pixel/coloring-core';
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
} from './prompts';

const config: ImageGenerationConfig = {
  referenceImages: REFERENCE_IMAGES,
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
} from '@one-colored-pixel/coloring-core';
