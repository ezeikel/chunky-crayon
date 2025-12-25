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
  generateImage,
  streamText,
  streamObject,
} from 'ai';

// Re-export models
export {
  models,
  MODEL_IDS,
  IMAGE_DEFAULTS,
  withAITracing,
  getTracedModels,
} from './models';
export type { ModelId, TracingOptions } from './models';

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
  COLORING_IMAGE_DETAILED_SUFFIX,
  createColoringImagePrompt,
  createGeminiColoringImagePrompt,
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
  // Analytics prompts
  IMAGE_ANALYTICS_SYSTEM,
  IMAGE_ANALYTICS_PROMPT,
  // Audio transcription prompts (for voice input)
  AUDIO_TRANSCRIPTION_SYSTEM,
  AUDIO_TRANSCRIPTION_PROMPT,
  // Image description prompts (for image/photo input)
  IMAGE_DESCRIPTION_SYSTEM,
  IMAGE_DESCRIPTION_PROMPT,
  // Colo mascot voice prompts (for loading screen)
  COLO_VOICE_SCRIPT_SYSTEM,
  createColoVoiceScriptPrompt,
  // Blog post generation prompts (for automated SEO)
  BLOG_POST_SYSTEM,
  createBlogPostPrompt,
  BLOG_META_SYSTEM,
  createBlogMetaPrompt,
  BLOG_IMAGE_PROMPT_SYSTEM,
  createBlogImagePromptPrompt,
} from './prompts';

// Re-export schemas
export * as schemas from './schemas';
export {
  imageMetadataSchema,
  svgValidationSchema,
  imageAnalyticsSchema,
  audioTranscriptionSchema,
  imageDescriptionSchema,
  blogMetaSchema,
  blogPostSchema,
  blogImagePromptSchema,
} from './schemas';
export type {
  ImageMetadata,
  SvgValidation,
  ImageAnalytics,
  AudioTranscription,
  ImageDescription,
  BlogMeta,
  BlogPost,
  BlogImagePrompt,
} from './schemas';

// Re-export analytics functions
export { analyzeImageForAnalytics } from './analytics';

// Re-export image provider abstraction
export {
  generateColoringPageImage,
  getCurrentProviderConfig,
  getAvailableProviders,
} from './image-providers';
export type {
  ImageProvider,
  GenerationResult,
  ProviderConfig,
} from './image-providers';
