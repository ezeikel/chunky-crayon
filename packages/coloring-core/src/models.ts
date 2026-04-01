import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { perplexity } from "@ai-sdk/perplexity";
import { createReplicate } from "@ai-sdk/replicate";
import { withTracing } from "@posthog/ai";
import type { LanguageModel as LanguageModelV3, ImageModel } from "ai";

/**
 * AI Model Configuration
 *
 * Centralized model definitions for consistent usage across all apps.
 * Change models here to switch providers or model versions globally.
 */

// Model identifiers
export const MODEL_IDS = {
  // Anthropic Text models
  CLAUDE_SONNET_4_5: "claude-sonnet-4-5-20250929",

  // OpenAI multimodal models (vision + text)
  GPT_5_2: "gpt-5.2",

  // OpenAI Image models
  GPT_IMAGE_1_5: "gpt-image-1.5",

  // FLUX Image models via Replicate (faster, cheaper)
  FLUX_SCHNELL: "black-forest-labs/flux-schnell",
  FLUX_DEV: "black-forest-labs/flux-dev",
  FLUX_PRO: "black-forest-labs/flux-1.1-pro",

  // Perplexity search models (has built-in web search)
  PERPLEXITY_SONAR: "sonar",

  // Google Gemini models
  GEMINI_3_FLASH: "gemini-3-flash-preview",
  GEMINI_3_PRO_IMAGE: "gemini-3-pro-image-preview",
  GEMINI_2_5_FLASH_IMAGE: "gemini-2.5-flash-image-preview",
} as const;

// Lazy-initialized Replicate provider (avoids build-time API key check)
let _replicateProvider: ReturnType<typeof createReplicate> | null = null;
function getReplicateProvider() {
  if (!_replicateProvider) {
    _replicateProvider = createReplicate();
  }
  return _replicateProvider;
}

// Lazy-initialized image models
let _imageModel: ImageModel | null = null;
let _imageQualityModel: ImageModel | null = null;

export function getImageModel(): ImageModel {
  if (!_imageModel) {
    _imageModel = openai.image(MODEL_IDS.GPT_IMAGE_1_5);
  }
  return _imageModel;
}

export function getImageQualityModel(): ImageModel {
  if (!_imageQualityModel) {
    _imageQualityModel = getReplicateProvider().image(MODEL_IDS.FLUX_DEV);
  }
  return _imageQualityModel;
}

// Pre-configured model instances
export const models = {
  creative: anthropic(MODEL_IDS.CLAUDE_SONNET_4_5),
  vision: openai(MODEL_IDS.GPT_5_2),
  get image() {
    return getImageModel();
  },
  get imageQuality() {
    return getImageQualityModel();
  },
  search: perplexity(MODEL_IDS.PERPLEXITY_SONAR),
  analytics: google(MODEL_IDS.GEMINI_3_FLASH),
  analyticsQuality: google(MODEL_IDS.GEMINI_3_PRO_IMAGE),
  geminiImage: google(MODEL_IDS.GEMINI_3_PRO_IMAGE),
};

export const IMAGE_DEFAULTS = {
  size: "1024x1024" as const,
  quality: "high" as const,
} as const;

export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];

export type TracingOptions = {
  userId?: string;
  traceId?: string;
  properties?: Record<string, unknown>;
};

/**
 * Wrap a model with PostHog tracing for observability.
 * Accepts an injected PostHog client so the package doesn't depend on app-specific setup.
 */
export function withAITracing(
  model: LanguageModelV3,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posthogClient: any,
  options: TracingOptions = {},
): LanguageModelV3 {
  if (!posthogClient) {
    return model;
  }

  const tracingOptions: Record<string, unknown> = {
    posthogDistinctId: options.userId || "anonymous",
    posthogProperties: options.properties ?? {},
  };
  if (options.traceId) {
    tracingOptions.posthogTraceId = options.traceId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traced = withTracing(
    model as any,
    posthogClient,
    tracingOptions as any,
  ) as unknown as LanguageModelV3;

  // Fix: withTracing uses object spread which loses prototype properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy(traced as any, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (model as any)[prop];
    },
  }) as LanguageModelV3;
}

/**
 * Get traced versions of all models.
 * Accepts an injected PostHog client.
 */
export function getTracedModels(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posthogClient: any,
  options: TracingOptions = {},
) {
  return {
    creative: withAITracing(models.creative, posthogClient, options),
    vision: withAITracing(models.vision, posthogClient, options),
    search: withAITracing(models.search, posthogClient, options),
    analytics: withAITracing(models.analytics, posthogClient, options),
    analyticsQuality: withAITracing(
      models.analyticsQuality,
      posthogClient,
      options,
    ),
  };
}
