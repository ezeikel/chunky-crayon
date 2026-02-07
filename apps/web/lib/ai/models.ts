import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createReplicate } from '@ai-sdk/replicate';
import { withTracing } from '@posthog/ai';
import type { LanguageModel as LanguageModelV3, ImageModel } from 'ai';
import { getPostHogClient } from '@/lib/posthog-server';

/**
 * AI Model Configuration
 *
 * Centralized model definitions for consistent usage across the application.
 * Change models here to switch providers or model versions globally.
 */

// Model identifiers
export const MODEL_IDS = {
  // Anthropic Text models
  CLAUDE_SONNET_4_5: 'claude-sonnet-4-5-20250929',

  // OpenAI Text models (kept for image generation pipelines)
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',

  // OpenAI Image models (legacy - slower, more expensive)
  GPT_IMAGE: 'gpt-image-1',
  GPT_IMAGE_1_5: 'gpt-image-1.5',
  DALL_E_3: 'dall-e-3',

  // FLUX Image models via Replicate (faster, cheaper)
  // Schnell: ~1.3s, $0.003/image - best for speed
  // Dev: ~3-5s, $0.025/image - balance of speed/quality
  // Pro: ~15s, $0.055/image - highest quality
  FLUX_SCHNELL: 'black-forest-labs/flux-schnell',
  FLUX_DEV: 'black-forest-labs/flux-dev',
  FLUX_PRO: 'black-forest-labs/flux-1.1-pro',

  // Google Gemini models
  GEMINI_3_FLASH: 'gemini-3-flash-preview',
  // Gemini image generation models (use with generateText, not generateImage)
  GEMINI_3_PRO_IMAGE: 'gemini-3-pro-image-preview',
  GEMINI_2_5_FLASH_IMAGE: 'gemini-2.5-flash-image-preview',
} as const;

// Lazy-initialized Replicate provider (avoids build-time API key check)
let _replicateProvider: ReturnType<typeof createReplicate> | null = null;
function getReplicateProvider() {
  if (!_replicateProvider) {
    _replicateProvider = createReplicate();
  }
  return _replicateProvider;
}

// Lazy-initialized image models (created on first access)
let _imageModel: ImageModel | null = null;
let _imageQualityModel: ImageModel | null = null;

/**
 * Get the primary image model.
 * Using OpenAI gpt-image-1.5 for best coloring page style adherence.
 * Note: FLUX models are faster but don't support reference images.
 */
export function getImageModel(): ImageModel {
  if (!_imageModel) {
    _imageModel = openai.image(MODEL_IDS.GPT_IMAGE_1_5);
  }
  return _imageModel;
}

/**
 * Get the higher quality image model (FLUX Dev).
 * ~3-5s generation time, $0.025/image
 */
export function getImageQualityModel(): ImageModel {
  if (!_imageQualityModel) {
    _imageQualityModel = getReplicateProvider().image(MODEL_IDS.FLUX_DEV);
  }
  return _imageQualityModel;
}

// Pre-configured model instances (text models are safe to initialize eagerly)
export const models = {
  // Primary text model for complex tasks (vision, structured output, reasoning)
  text: anthropic(MODEL_IDS.CLAUDE_SONNET_4_5),

  // Faster/cheaper text model for simpler tasks (same model, single tier for now)
  textFast: anthropic(MODEL_IDS.CLAUDE_SONNET_4_5),

  // Image generation model - use getter function for lazy initialization
  // ~1.3s generation time, $0.003/image (vs DALL-E 3's 15-45s, $0.04-0.08)
  get image() {
    return getImageModel();
  },

  // Legacy image model (DALL-E 3) - kept for fallback/comparison
  imageLegacy: openai.image(MODEL_IDS.GPT_IMAGE_1_5),

  // Higher quality FLUX model for when quality matters more than speed
  get imageQuality() {
    return getImageQualityModel();
  },

  // Ultra-fast vision model for analytics (Gemini 3 Flash)
  // Best for: image analysis, categorization, structured extraction
  // Pricing: $0.50/1M input, $3/1M output tokens
  analytics: google(MODEL_IDS.GEMINI_3_FLASH),

  // High-quality vision model for detailed analysis (Gemini 3 Pro)
  // Best for: complex scene understanding, nuanced color assignment
  // Use when quality matters more than latency (e.g., pipeline integration)
  analyticsQuality: google(MODEL_IDS.GEMINI_3_PRO_IMAGE),

  // Gemini image generation model (uses generateText, not generateImage)
  // Supports reference images as actual inputs for style matching
  // Gemini 3 Pro Image: highest quality, requires billing enabled
  geminiImage: google(MODEL_IDS.GEMINI_3_PRO_IMAGE),
};

// Image generation defaults
export const IMAGE_DEFAULTS = {
  size: '1024x1024' as const,
  quality: 'high' as const,
} as const;

// Type exports
export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

/**
 * Tracing options for AI calls
 */
export type TracingOptions = {
  userId?: string;
  traceId?: string;
  properties?: Record<string, unknown>;
};

/**
 * Wrap a model with PostHog tracing for observability.
 * Captures: latency, token usage, costs, errors, model info
 *
 * Note: Using type assertion for @posthog/ai compatibility with AI SDK 6.
 * See: https://github.com/PostHog/posthog-js/issues/2522
 *
 * @example
 * const tracedModel = withAITracing(models.text, { userId: 'user_123' });
 * const { text } = await generateText({ model: tracedModel, prompt: '...' });
 */
export function withAITracing(
  model: LanguageModelV3,
  options: TracingOptions = {},
): LanguageModelV3 {
  const posthog = getPostHogClient();

  if (!posthog) {
    // Return untraced model if PostHog not configured
    return model;
  }

  // Type assertion needed: @posthog/ai uses LanguageModelV2 types but
  // AI SDK 6 provides LanguageModelV3. Runtime API is compatible.
  // Note: posthogProperties must be an object, not undefined (library calls Object.entries on it)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return withTracing(model as any, posthog, {
    posthogDistinctId: options.userId || 'anonymous',
    posthogTraceId: options.traceId,
    posthogProperties: options.properties ?? {},
  }) as unknown as LanguageModelV3;
}

/**
 * Get traced versions of all models for a specific user/request
 *
 * @example
 * const traced = getTracedModels({ userId: 'user_123', traceId: 'req_abc' });
 * const { text } = await generateText({ model: traced.text, prompt: '...' });
 */
export function getTracedModels(options: TracingOptions = {}) {
  return {
    text: withAITracing(models.text, options),
    textFast: withAITracing(models.textFast, options),
    analytics: withAITracing(models.analytics, options),
    analyticsQuality: withAITracing(models.analyticsQuality, options),
    // Note: Image models use a different API and don't support withTracing
  };
}
