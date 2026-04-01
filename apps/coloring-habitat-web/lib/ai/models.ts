/**
 * AI Model Configuration — Coloring Habitat
 *
 * Re-exports shared models from @one-colored-pixel/coloring-core
 * and adds app-specific PostHog tracing integration.
 */

import { getPostHogClient } from "@/lib/posthog-server";
import {
  models,
  MODEL_IDS,
  IMAGE_DEFAULTS,
  getImageModel,
  getImageQualityModel,
  withAITracing as sharedWithAITracing,
  getTracedModels as sharedGetTracedModels,
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
 */
export function withAITracing(
  model: LanguageModelV3,
  options: TracingOptions = {},
): LanguageModelV3 {
  const posthog = getPostHogClient();
  return sharedWithAITracing(model, posthog, options);
}

/**
 * Get traced versions of all models using this app's PostHog client.
 */
export function getTracedModels(options: TracingOptions = {}) {
  const posthog = getPostHogClient();
  return sharedGetTracedModels(posthog, options);
}
