/**
 * @one-colored-pixel/coloring-core
 *
 * Shared AI configuration, schemas, and generation pipelines for all coloring apps.
 * Brand-specific prompts stay in each app; everything else is shared here.
 */

// Models & tracing
export {
  models,
  MODEL_IDS,
  IMAGE_DEFAULTS,
  getImageModel,
  getImageQualityModel,
  withAITracing,
  getTracedModels,
} from "./models";
export type { ModelId, TracingOptions } from "./models";

// Image generation pipeline
export { createImageGenerationPipeline } from "./image-providers";
export type {
  ImageProvider,
  GenerationResult,
  Difficulty,
  DifficultyConfig,
  ProviderConfig,
  ImageGenerationConfig,
} from "./image-providers";

// Video generation
export {
  generateAnimationFromImage,
  pollForVideoCompletion,
  downloadVideoFromUri,
  fetchImageAsBase64,
  isVideoGenerationAvailable,
} from "./video-providers";
export type { VideoGenerationResult } from "./video-providers";

// Analytics
export { analyzeImageForAnalytics } from "./analytics";

// Animation prompt generation
export { generateAnimationPromptFromImage } from "./animation";
export type { AnimationConfig } from "./animation";

// Schemas (Zod)
export {
  sceneDescriptionSchema,
  imageMetadataSchema,
  svgValidationSchema,
  imageAnalyticsSchema,
  audioTranscriptionSchema,
  imageDescriptionSchema,
  magicColorSuggestionSchema,
  magicColorResponseSchema,
  detectedRegionInputSchema,
  regionColorAssignmentSchema,
  regionFirstColorResponseSchema,
  fillPointSchema,
  fillPointsDataSchema,
  gridCellColorSchema,
  gridColorMapSchema,
  blogMetaSchema,
  blogPostSchema,
  blogImagePromptSchema,
} from "./schemas";
export type {
  SceneDescription,
  ImageMetadata,
  SvgValidation,
  ImageAnalytics,
  AudioTranscription,
  ImageDescription,
  MagicColorSuggestion,
  MagicColorResponse,
  DetectedRegionInput,
  RegionColorAssignment,
  RegionFirstColorResponse,
  FillPoint,
  FillPointsData,
  GridCellColor,
  GridColorMap,
  BlogMeta,
  BlogPost,
  BlogImagePrompt,
} from "./schemas";

// Shared action logic
export {
  transcribeAudioLogic,
  describeImageLogic,
  type TranscribeAudioResult,
  type DescribeImageResult,
  type InputProcessingConfig,
} from "./actions/input-processing";

export {
  getMagicColorSuggestionsLogic,
  type MagicColorMode,
  type MagicColorResult,
  type MagicColorInput,
  type MagicColorConfig,
} from "./actions/magic-color";

export {
  generateGridColorMapLogic,
  generateRegionFillPointsLogic,
  type GenerateColorMapResult,
  type GenerateFillPointsResult,
  type ColorPaletteEntry,
  type ColorMapConfig,
} from "./actions/generate-color-map";

// Utilities
export { default as formatNumber } from "./utils/formatNumber";
export { default as streamToBuffer } from "./utils/streamToBuffer";
export { createGalleryRefresh } from "./utils/galleryRefresh";
export {
  createRandomDescriptionGenerator,
  type RandomSeedConfig,
} from "./utils/random";
