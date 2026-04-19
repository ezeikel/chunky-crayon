/**
 * AI Model Configuration — Chunky Crayon
 *
 * Shared model definitions and tracing wrapper come from
 * @one-colored-pixel/coloring-core. This file only injects the app's
 * PostHog client so every call site can keep using `getTracedModels(options)`
 * without threading the client through.
 */

import { getPostHogClient } from '@/lib/posthog-server';
import {
  models,
  MODEL_IDS,
  IMAGE_DEFAULTS,
  getImageModel,
  getImageQualityModel,
  withAITracing as withAITracingBase,
  getTracedModels as getTracedModelsBase,
} from '@one-colored-pixel/coloring-core';
import type { TracingOptions } from '@one-colored-pixel/coloring-core';
import type { LanguageModel as LanguageModelV3 } from 'ai';

export {
  models,
  MODEL_IDS,
  IMAGE_DEFAULTS,
  getImageModel,
  getImageQualityModel,
};
export type { ModelId, TracingOptions } from '@one-colored-pixel/coloring-core';

export const withAITracing = (
  model: LanguageModelV3,
  options: TracingOptions = {},
) => withAITracingBase(model, getPostHogClient(), options);

export const getTracedModels = (options: TracingOptions = {}) =>
  getTracedModelsBase(getPostHogClient(), options);
