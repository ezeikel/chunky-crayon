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
  regionLabelAssignmentSchema,
  regionLabellingResponseSchema,
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
  RegionLabelAssignment,
  RegionLabellingResponse,
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

export {
  generateRegionStoreLogic,
  PALETTE_VARIANTS,
  DEFAULT_PALETTE_VARIANT_MODIFIERS,
  type PaletteVariant,
  type RegionStoreRegion,
  type RegionStoreJson,
  type GenerateRegionStoreConfig,
  type GenerateRegionStoreResult,
} from "./actions/generate-regions";

// Blog content generation (prompts + topic/author catalogue)
export {
  BLOG_POST_SYSTEM,
  createBlogPostPrompt,
  BLOG_META_SYSTEM,
  createBlogMetaPrompt,
  BLOG_IMAGE_PROMPT_SYSTEM,
  createBlogImagePromptPrompt,
} from "./blog/prompts";
export { BLOG_CATEGORIES, BLOG_TOPICS, BLOG_AUTHORS } from "./blog/topics";
export type { BlogCategory, BlogTopic, BlogAuthor } from "./blog/topics";

// Daily scene generation (Perplexity Sonar) + image metadata prompts
export {
  CLEAN_UP_DESCRIPTION_SYSTEM,
  createImageMetadataSystemPrompt,
  IMAGE_METADATA_SYSTEM,
  IMAGE_METADATA_PROMPT,
  SCENE_DESCRIPTION_SYSTEM,
  createDailyScenePrompt,
} from "./scene/prompts";
export {
  SEASONAL_EVENTS,
  getUpcomingEvents,
  getCurrentSeason,
} from "./scene/seasonal-calendar";
export type { SeasonalEvent } from "./scene/seasonal-calendar";

// Bundles — hero character profiles + page QA gate. Shared between web
// (admin UI, retry endpoint) and worker (page generation pipeline).
export {
  DINO_DANCE_PARTY,
  HERO_BUNDLES,
  getBundleProfile,
  getHero,
} from "./bundles/profiles";
export type { Hero, HeroBundle } from "./bundles/profiles";
export { qaBundlePage, qaResultSchema } from "./bundles/qa";
export type { QAResult } from "./bundles/qa";

// Comic strip cast — recurring characters used in 4-panel weekly strips.
// Shared between web (cron trigger, admin) and worker (script + panel
// generation pipeline).
export {
  COMIC_STRIP_CAST,
  COMIC_CAST_BY_ID,
  COMIC_STYLE_BLOCK,
} from "./comic/cast";
export type { ComicCastMember, ComicCastId } from "./comic/cast";

// Comic strip prompts — script writing + per-panel image prompt assembly.
export {
  COMIC_SCRIPT_SYSTEM,
  createComicScriptPrompt,
  buildPanelImagePrompt,
} from "./comic/prompts";
export type {
  PanelScript,
  Scene,
  BuildPanelImagePromptInput,
} from "./comic/prompts";

// Comic strip QC — script gate (text) + panel gate (vision).
export {
  scriptQcResultSchema,
  SCRIPT_QC_SYSTEM,
  createScriptQcPrompt,
  panelQcResultSchema,
  PANEL_QC_SYSTEM,
  createPanelQcPrompt,
} from "./comic/qc";
export type { ScriptQcResult, PanelQcResult } from "./comic/qc";

// Utilities
export { default as formatNumber } from "./utils/formatNumber";
export { default as streamToBuffer } from "./utils/streamToBuffer";
export { createGalleryRefresh } from "./utils/galleryRefresh";
export {
  createRandomDescriptionGenerator,
  type RandomSeedConfig,
} from "./utils/random";
