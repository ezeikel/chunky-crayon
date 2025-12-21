/**
 * AI Module
 *
 * Centralized AI configuration and utilities for the application.
 * Import from '@/lib/ai' for all AI-related functionality.
 *
 * @example
 * import { models, prompts, schemas, generateColoringImage } from '@/lib/ai';
 *
 * // Use pre-configured models
 * const { text } = await generateText({ model: models.text, ... });
 *
 * // Use centralized prompts
 * const prompt = prompts.createColoringImagePrompt(description);
 *
 * // Use typed schemas
 * const { object } = await generateObject({ schema: schemas.imageMetadataSchema, ... });
 */

// Re-export Vercel AI SDK functions for convenience
export {
  generateText,
  generateObject,
  experimental_generateImage,
  streamText,
  streamObject,
} from 'ai';

// Re-export models
export { models, MODEL_IDS, IMAGE_DEFAULTS } from './models';
export type { ModelId } from './models';

// Re-export prompts
export * as prompts from './prompts';
export {
  // Reference assets
  REFERENCE_IMAGES,
  // Core rules
  TARGET_AGE,
  COPYRIGHTED_CHARACTER_INSTRUCTIONS,
  COLORING_IMAGE_RULES,
  COLORING_IMAGE_RULES_TEXT,
  // Image generation prompts
  COLORING_IMAGE_STYLE_SUFFIX,
  COLORING_IMAGE_DETAILED_SUFFIX,
  createColoringImagePrompt,
  createColoringImagePromptDetailed,
  CLEAN_UP_DESCRIPTION_SYSTEM,
  IMAGE_METADATA_SYSTEM,
  IMAGE_METADATA_PROMPT,
  // Validation prompts
  CHECK_SVG_IMAGE_SYSTEM,
  CHECK_SVG_IMAGE_PROMPT,
  // Social media prompts
  INSTAGRAM_CAPTION_SYSTEM,
  FACEBOOK_CAPTION_SYSTEM,
  createInstagramCaptionPrompt,
  createFacebookCaptionPrompt,
} from './prompts';

// Re-export schemas
export * as schemas from './schemas';
export { imageMetadataSchema, svgValidationSchema } from './schemas';
export type { ImageMetadata, SvgValidation } from './schemas';
