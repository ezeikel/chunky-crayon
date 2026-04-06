/**
 * AI Model Configuration — Coloring Habitat
 *
 * Uses shared model definitions from @one-colored-pixel/coloring-core
 * but applies tracing directly with @posthog/ai at the app level.
 *
 * NOTE: Tracing must use the app-level @posthog/ai (v7+) rather than
 * coloring-core's bundled version (v1.x) because coloring-core's
 * @posthog/ai@1.x bundles ai@4 which wraps models as specificationVersion
 * "v1", incompatible with the root ai@6 SDK that expects "v3".
 */

import { withTracing } from "@posthog/ai";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  models,
  MODEL_IDS,
  IMAGE_DEFAULTS,
  getImageModel,
  getImageQualityModel,
} from "@one-colored-pixel/coloring-core";
import type { TracingOptions } from "@one-colored-pixel/coloring-core";
import type { LanguageModel as LanguageModelV3 } from "ai";

// Re-export everything from the shared package
export {
  models,
  MODEL_IDS,
  IMAGE_DEFAULTS,
  getImageModel,
  getImageQualityModel,
};
export type { ModelId, TracingOptions } from "@one-colored-pixel/coloring-core";

/**
 * Wrap a model with PostHog tracing using this app's PostHog client.
 *
 * Note: Using type assertion for @posthog/ai compatibility with AI SDK 6.
 * The Proxy ensures prototype properties (e.g. specificationVersion) are
 * preserved from the original model.
 */
export function withAITracing(
  model: LanguageModelV3,
  options: TracingOptions = {},
): LanguageModelV3 {
  const posthog = getPostHogClient();

  if (!posthog) {
    return model;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traced = withTracing(model as any, posthog, {
    posthogDistinctId: options.userId || "anonymous",
    posthogTraceId: options.traceId,
    posthogProperties: options.properties ?? {},
  }) as unknown as LanguageModelV3;

  // Fix: withTracing uses object spread which loses prototype properties.
  // Wrap in a Proxy that falls through to the original model for missing props.
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
 * Get traced versions of all models using this app's PostHog client.
 */
export function getTracedModels(options: TracingOptions = {}) {
  return {
    creative: withAITracing(models.creative, options),
    vision: withAITracing(models.vision, options),
    search: withAITracing(models.search, options),
    analytics: withAITracing(models.analytics, options),
    analyticsQuality: withAITracing(models.analyticsQuality, options),
  };
}
