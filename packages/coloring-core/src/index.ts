/**
 * @one-colored-pixel/coloring-core
 *
 * Shared AI model configuration for all coloring apps.
 * Models, tracing, and image generation defaults are identical across apps.
 *
 * Note: Schemas (Zod) stay in each app due to TypeScript inference issues
 * with re-exported Zod types across package boundaries. Prompts stay in
 * each app because they contain brand-specific content.
 */

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

export { createImageGenerationPipeline } from "./image-providers";
export type {
  ImageProvider,
  GenerationResult,
  Difficulty,
  DifficultyConfig,
  ProviderConfig,
  ImageGenerationConfig,
} from "./image-providers";
