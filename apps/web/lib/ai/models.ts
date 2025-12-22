import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { withTracing } from '@posthog/ai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { getPostHogClient } from '@/lib/posthog-server';

/**
 * AI Model Configuration
 *
 * Centralized model definitions for consistent usage across the application.
 * Change models here to switch providers or model versions globally.
 */

// Model identifiers
export const MODEL_IDS = {
  // OpenAI Text models
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',

  // OpenAI Image models
  GPT_IMAGE: 'gpt-image-1',
  GPT_IMAGE_1_5: 'gpt-image-1.5',
  DALL_E_3: 'dall-e-3',

  // Google Gemini models
  GEMINI_3_FLASH: 'gemini-3-flash-preview',
} as const;

// Pre-configured model instances
export const models = {
  // Primary text model for complex tasks (vision, structured output, reasoning)
  text: openai(MODEL_IDS.GPT_4O),

  // Faster/cheaper text model for simpler tasks
  textFast: openai(MODEL_IDS.GPT_4O_MINI),

  // Image generation model
  image: openai.image(MODEL_IDS.GPT_IMAGE_1_5),

  // Ultra-fast vision model for analytics (Gemini 3 Flash)
  // Best for: image analysis, categorization, structured extraction
  // Pricing: $0.50/1M input, $3/1M output tokens
  analytics: google(MODEL_IDS.GEMINI_3_FLASH),
} as const;

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
 * @example
 * const tracedModel = withAITracing(models.text, { userId: 'user_123' });
 * const { text } = await generateText({ model: tracedModel, prompt: '...' });
 */
export function withAITracing(
  model: LanguageModelV2,
  options: TracingOptions = {},
): LanguageModelV2 {
  const posthog = getPostHogClient();

  if (!posthog) {
    // Return untraced model if PostHog not configured
    return model;
  }

  return withTracing(model, posthog, {
    posthogDistinctId: options.userId || 'anonymous',
    posthogTraceId: options.traceId,
    posthogProperties: options.properties,
  });
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
    // Note: Image models use a different API and don't support withTracing
  };
}
