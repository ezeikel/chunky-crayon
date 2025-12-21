import { openai } from '@ai-sdk/openai';

/**
 * AI Model Configuration
 *
 * Centralized model definitions for consistent usage across the application.
 * Change models here to switch providers or model versions globally.
 */

// Model identifiers
export const MODEL_IDS = {
  // Text models
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',

  // Image models
  GPT_IMAGE: 'gpt-image-1',
  GPT_IMAGE_1_5: 'gpt-image-1.5',
  DALL_E_3: 'dall-e-3',
} as const;

// Pre-configured model instances
export const models = {
  // Primary text model for complex tasks (vision, structured output, reasoning)
  text: openai(MODEL_IDS.GPT_4O),

  // Faster/cheaper text model for simpler tasks
  textFast: openai(MODEL_IDS.GPT_4O_MINI),

  // Image generation model
  image: openai.image(MODEL_IDS.GPT_IMAGE_1_5),
} as const;

// Image generation defaults
export const IMAGE_DEFAULTS = {
  size: '1024x1024' as const,
  quality: 'high' as const,
} as const;

// Type exports
export type ModelId = (typeof MODEL_IDS)[keyof typeof MODEL_IDS];
