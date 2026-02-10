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
 * const { text } = await generateText({ model: models.creative, ... });
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
  // Difficulty modifiers
  DIFFICULTY_MODIFIERS,
  getTargetAgeForDifficulty,
  createDifficultyAwarePrompt,
  // Core rules & style blocks
  TARGET_AGE,
  COPYRIGHTED_CHARACTER_INSTRUCTIONS,
  GPT_IMAGE_STYLE_BLOCK,
  /** @deprecated Use GPT_IMAGE_STYLE_BLOCK */ COLORING_IMAGE_RULES,
  /** @deprecated Use GPT_IMAGE_STYLE_BLOCK */ COLORING_IMAGE_RULES_TEXT,
  // Image generation prompts
  /** @deprecated */ COLORING_IMAGE_DETAILED_SUFFIX,
  createColoringImagePrompt,
  createGeminiColoringImagePrompt,
  CLEAN_UP_DESCRIPTION_SYSTEM,
  createImageMetadataSystemPrompt,
  IMAGE_METADATA_SYSTEM,
  IMAGE_METADATA_PROMPT,
  // Validation prompts
  CHECK_SVG_IMAGE_SYSTEM,
  CHECK_SVG_IMAGE_PROMPT,
  // Social media prompts
  INSTAGRAM_CAPTION_SYSTEM,
  FACEBOOK_CAPTION_SYSTEM,
  PINTEREST_CAPTION_SYSTEM,
  TIKTOK_CAPTION_SYSTEM,
  createInstagramCaptionPrompt,
  createFacebookCaptionPrompt,
  createPinterestCaptionPrompt,
  createTikTokCaptionPrompt,
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
  createColoVoiceScriptSystemPrompt,
  createColoVoiceScriptPrompt,
  // Blog post generation prompts (for automated SEO)
  BLOG_POST_SYSTEM,
  createBlogPostPrompt,
  BLOG_META_SYSTEM,
  createBlogMetaPrompt,
  BLOG_IMAGE_PROMPT_SYSTEM,
  createBlogImagePromptPrompt,
  // Magic color prompts (for AI-powered color suggestions)
  MAGIC_COLOR_SYSTEM,
  createMagicColorPrompt,
  // Region-first prompts (1:1 mapping guaranteed)
  REGION_FIRST_COLOR_SYSTEM,
  createRegionFirstColorPrompt,
  // Pre-computed grid color map prompts (for instant Magic Fill)
  GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
  // Animation prompts (for Veo 3 video generation)
  ANIMATION_PROMPT_SYSTEM,
  createAnimationPromptPrompt,
  DEFAULT_ANIMATION_PROMPT,
  // Scene description prompts (for AI-powered daily generation)
  SCENE_DESCRIPTION_SYSTEM,
  createDailyScenePrompt,
} from './prompts';
export type { MagicColorMode } from './prompts';

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
  magicColorSuggestionSchema,
  magicColorResponseSchema,
  // Region-first approach (1:1 mapping guaranteed)
  detectedRegionInputSchema,
  regionColorAssignmentSchema,
  regionFirstColorResponseSchema,
  // Scene description schema (for AI-powered daily generation)
  sceneDescriptionSchema,
  // Pre-computed grid color map schemas (for instant Magic Fill)
  gridCellColorSchema,
  gridColorMapSchema,
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
  MagicColorSuggestion,
  MagicColorResponse,
  // Region-first types
  DetectedRegionInput,
  RegionColorAssignment,
  RegionFirstColorResponse,
  // Scene description type
  SceneDescription,
  // Pre-computed grid color map types
  GridCellColor,
  GridColorMap,
} from './schemas';

// Re-export analytics functions
export { analyzeImageForAnalytics } from './analytics';

// Re-export animation prompt generation (for after() hooks)
export { generateAnimationPromptFromImage } from './animation';

// Re-export image provider abstraction
export {
  generateColoringPageImage,
  generateColoringPageFromPhoto,
  getCurrentProviderConfig,
  getAvailableProviders,
} from './image-providers';
export type {
  ImageProvider,
  GenerationResult,
  ProviderConfig,
} from './image-providers';

// Re-export video provider abstraction (Veo 3)
export {
  generateAnimationFromImage,
  isVideoGenerationAvailable,
} from './video-providers';
export type { VideoGenerationResult } from './video-providers';
