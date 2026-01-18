import { put } from '@/lib/storage';
import { generateImage, generateText } from 'ai';
import { models, MODEL_IDS } from './models';
import {
  createColoringImagePrompt,
  createGeminiColoringImagePrompt,
  createDifficultyAwarePrompt,
  REFERENCE_IMAGES,
  DIFFICULTY_MODIFIERS,
  PHOTO_TO_COLORING_SYSTEM,
  createPhotoToColoringPrompt,
} from './prompts';
import { openai } from '@ai-sdk/openai';

/**
 * Image Generation Provider Abstraction
 *
 * Provides a unified interface for generating coloring page images across
 * multiple providers (OpenAI, Gemini) with automatic fallback support.
 */

export type ImageProvider = 'openai' | 'google';

export type GenerationResult = {
  url: string;
  tempFileName: string;
  generationTimeMs: number;
  provider: ImageProvider;
  model: string;
  imageBuffer: Buffer; // Raw image data to avoid re-fetching
};

export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type ProviderConfig = {
  id: string;
  name: string;
  provider: ImageProvider;
  costPerImage: number; // Approximate USD
  supportsReferenceImages: boolean;
  generate: (
    description: string,
    difficulty?: Difficulty,
  ) => Promise<{
    imageBuffer: Buffer;
    generationTimeMs: number;
  }>;
};

// OpenAI configuration - uses generateImage API
const openaiProvider: ProviderConfig = {
  id: MODEL_IDS.GPT_IMAGE_1_5,
  name: 'OpenAI GPT Image 1.5',
  provider: 'openai',
  costPerImage: 0.08, // ~$0.04-0.17, using middle estimate
  supportsReferenceImages: false,
  generate: async (description: string, difficulty?: Difficulty) => {
    const startTime = Date.now();

    // Use difficulty-aware prompt if difficulty is provided, otherwise use default
    const prompt =
      difficulty && difficulty !== 'BEGINNER'
        ? createDifficultyAwarePrompt(description, difficulty)
        : createColoringImagePrompt(description);

    const result = await generateImage({
      model: openai.image(MODEL_IDS.GPT_IMAGE_1_5),
      prompt,
      size: '1024x1024',
      providerOptions: {
        openai: {
          quality: 'high',
        },
      },
    });

    const generationTimeMs = Date.now() - startTime;

    // Get the first image
    const imageData = result.images[0];
    if (!imageData?.base64) {
      throw new Error('OpenAI did not return an image');
    }

    const imageBuffer = Buffer.from(imageData.base64, 'base64');

    return { imageBuffer, generationTimeMs };
  },
};

// Gemini configuration - uses generateText with image modality
const geminiProvider: ProviderConfig = {
  id: MODEL_IDS.GEMINI_3_PRO_IMAGE,
  name: 'Gemini 3 Pro Image',
  provider: 'google',
  costPerImage: 0.18, // ~$0.13-0.24, using middle estimate
  supportsReferenceImages: true,
  generate: async (description: string, difficulty?: Difficulty) => {
    const startTime = Date.now();

    // Use difficulty-aware prompt for non-beginner levels
    // Gemini uses reference images, so we add difficulty context to the Gemini prompt
    let prompt = createGeminiColoringImagePrompt(description);
    if (difficulty && difficulty !== 'BEGINNER') {
      const config = DIFFICULTY_MODIFIERS[difficulty];
      const difficultyContext = `
DIFFICULTY LEVEL: ${difficulty}
Target audience: ${config.targetAge}

Complexity requirements:
- Shape sizes: ${config.shapeSize}
- Line thickness: ${config.lineThickness}
- Detail level: ${config.detailLevel}
- Background: ${config.background}
- Overall complexity: ${config.complexity}

Additional requirements:
${config.additionalRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}
`;
      prompt = `${difficultyContext}\n\n${prompt}`;
    }

    // Build message content with reference images as actual inputs
    const messageContent: Array<
      { type: 'text'; text: string } | { type: 'image'; image: URL }
    > = [
      { type: 'text', text: prompt },
      ...REFERENCE_IMAGES.map((url) => ({
        type: 'image' as const,
        image: new URL(url),
      })),
    ];

    const result = await generateText({
      model: models.geminiImage,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
      providerOptions: {
        google: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
    });

    const generationTimeMs = Date.now() - startTime;

    // Extract the generated image from the response
    const generatedImage = result.files?.find((file) =>
      file.mediaType?.startsWith('image/'),
    );

    if (!generatedImage?.base64) {
      throw new Error('Gemini did not return an image');
    }

    const imageBuffer = Buffer.from(generatedImage.base64, 'base64');

    return { imageBuffer, generationTimeMs };
  },
};

// Provider registry
const PROVIDERS: Record<ImageProvider, ProviderConfig> = {
  openai: openaiProvider,
  google: geminiProvider,
};

// Configuration
const PRIMARY_PROVIDER: ImageProvider =
  (process.env.IMAGE_PROVIDER as ImageProvider) || 'openai';
const FALLBACK_PROVIDER: ImageProvider =
  PRIMARY_PROVIDER === 'openai' ? 'google' : 'openai';

// Retry configuration - OpenAI gives most consistent images, so retry before fallback
const MAX_RETRIES = 3; // Total attempts on primary provider before fallback
const RETRY_DELAY_MS = 1000; // Wait 1 second between retries

/**
 * Check if an error is retryable on the same provider
 * These are typically transient errors that may succeed on retry
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Content policy / 400 errors - OpenAI may accept on retry with same prompt
  // (content moderation can be non-deterministic)
  if (message.includes('400') || message.includes('bad request')) return true;

  // Content policy violations (OpenAI specific) - worth retrying
  if (
    message.includes('content_policy') ||
    message.includes('safety') ||
    message.includes('moderation')
  )
    return true;

  // Transient server errors
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('504')
  )
    return true;

  // Timeout - may succeed on retry
  if (message.includes('timeout')) return true;

  return false;
}

/**
 * Check if an error should trigger immediate fallback to another provider
 * (skip retries on primary provider)
 */
function shouldImmediateFallback(error: unknown): boolean {
  if (!(error instanceof Error)) return true;

  const message = error.message.toLowerCase();

  // Rate limiting or quota errors - no point retrying, switch provider
  if (message.includes('rate limit') || message.includes('quota')) return true;

  // Service unavailable - provider is down
  if (message.includes('503') || message.includes('unavailable')) return true;

  // Authentication errors - won't be fixed by retry
  if (message.includes('401') || message.includes('403')) return true;

  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a coloring page image with retry logic and automatic fallback
 *
 * Strategy:
 * 1. Try primary provider (OpenAI) up to MAX_RETRIES times
 * 2. If all retries fail, fallback to secondary provider (Gemini)
 * 3. Some errors (rate limits, auth) trigger immediate fallback without retries
 *
 * @param description - The user's description of what to generate
 * @param difficulty - Optional difficulty level for age-appropriate generation
 * @returns The generated image URL and metadata
 */
export async function generateColoringPageImage(
  description: string,
  difficulty?: Difficulty,
): Promise<GenerationResult> {
  const primaryConfig = PROVIDERS[PRIMARY_PROVIDER];
  const fallbackConfig = PROVIDERS[FALLBACK_PROVIDER];

  // eslint-disable-next-line no-console
  console.log(
    `[ImageGeneration] Using ${primaryConfig.name} (primary)${difficulty ? ` with difficulty: ${difficulty}` : ''}`,
  );

  let lastPrimaryError: Error | null = null;

  // Try primary provider with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { imageBuffer, generationTimeMs } = await primaryConfig.generate(
        description,
        difficulty,
      );

      // Save to blob storage
      const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
      const { url } = await put(tempFileName, imageBuffer, {
        access: 'public',
      });

      if (attempt > 1) {
        // eslint-disable-next-line no-console
        console.log(
          `[ImageGeneration] ${primaryConfig.name} succeeded on attempt ${attempt}`,
        );
      }

      return {
        url,
        tempFileName,
        generationTimeMs,
        provider: primaryConfig.provider,
        model: primaryConfig.id,
        imageBuffer,
      };
    } catch (error) {
      lastPrimaryError =
        error instanceof Error ? error : new Error(String(error));

      // eslint-disable-next-line no-console
      console.error(
        `[ImageGeneration] ${primaryConfig.name} attempt ${attempt}/${MAX_RETRIES} failed:`,
        lastPrimaryError.message,
      );

      // Check if we should skip retries and immediately fallback
      if (shouldImmediateFallback(error)) {
        // eslint-disable-next-line no-console
        console.log(
          `[ImageGeneration] Error requires immediate fallback, skipping remaining retries`,
        );
        break;
      }

      // Check if the error is retryable
      if (!isRetryableError(error)) {
        // eslint-disable-next-line no-console
        console.log(
          `[ImageGeneration] Error is not retryable, moving to fallback`,
        );
        break;
      }

      // If we have more retries, wait before the next attempt
      if (attempt < MAX_RETRIES) {
        // eslint-disable-next-line no-console
        console.log(
          `[ImageGeneration] Retrying ${primaryConfig.name} in ${RETRY_DELAY_MS}ms...`,
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  // All retries exhausted or non-retryable error, try fallback provider
  // eslint-disable-next-line no-console
  console.log(
    `[ImageGeneration] ${primaryConfig.name} failed after ${MAX_RETRIES} attempts, falling back to ${fallbackConfig.name}`,
  );

  try {
    const { imageBuffer, generationTimeMs } = await fallbackConfig.generate(
      description,
      difficulty,
    );

    // Save to blob storage
    const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
    const { url } = await put(tempFileName, imageBuffer, {
      access: 'public',
    });

    return {
      url,
      tempFileName,
      generationTimeMs,
      provider: fallbackConfig.provider,
      model: fallbackConfig.id,
      imageBuffer,
    };
  } catch (fallbackError) {
    // eslint-disable-next-line no-console
    console.error(
      `[ImageGeneration] Fallback ${fallbackConfig.name} also failed:`,
      fallbackError instanceof Error ? fallbackError.message : fallbackError,
    );

    // Re-throw with context about both failures
    throw new Error(
      `Image generation failed with both providers. Primary (${primaryConfig.name}): ${lastPrimaryError?.message || 'Unknown error'}. Fallback (${fallbackConfig.name}): ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
    );
  }
}

/**
 * Get the current provider configuration
 */
export function getCurrentProviderConfig(): ProviderConfig {
  return PROVIDERS[PRIMARY_PROVIDER];
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS);
}

/**
 * Generate a coloring page directly from a user's photo.
 *
 * This uses Gemini's multimodal capabilities to:
 * 1. Analyze the user's photo
 * 2. Recreate it as a coloring page that closely matches the composition
 * 3. Apply the same style as our reference coloring pages
 *
 * @param photoBase64 - The user's photo as a base64 string
 * @param difficulty - Optional difficulty level for age-appropriate generation
 * @returns The generated coloring page image and metadata
 */
export async function generateColoringPageFromPhoto(
  photoBase64: string,
  difficulty?: Difficulty,
): Promise<GenerationResult> {
  // eslint-disable-next-line no-console
  console.log(
    `[PhotoToColoring] Generating coloring page from photo${difficulty ? ` with difficulty: ${difficulty}` : ''}`,
  );

  const startTime = Date.now();

  // Build message content with:
  // 1. The user's photo as the primary reference
  // 2. Our style reference images
  // 3. The transformation prompt
  const messageContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: URL }
    | { type: 'image'; image: string }
  > = [
    // System context and prompt
    { type: 'text', text: PHOTO_TO_COLORING_SYSTEM },
    // User's photo (as base64)
    {
      type: 'image',
      image: photoBase64.startsWith('data:')
        ? photoBase64
        : `data:image/jpeg;base64,${photoBase64}`,
    },
    // Transformation instructions
    { type: 'text', text: createPhotoToColoringPrompt(difficulty) },
    // Style reference images
    {
      type: 'text',
      text: 'Here are examples of the coloring page style to match:',
    },
    ...REFERENCE_IMAGES.map((url) => ({
      type: 'image' as const,
      image: new URL(url),
    })),
  ];

  try {
    const result = await generateText({
      model: models.geminiImage,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
      providerOptions: {
        google: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
    });

    const generationTimeMs = Date.now() - startTime;

    // Extract the generated image from the response
    const generatedImage = result.files?.find((file) =>
      file.mediaType?.startsWith('image/'),
    );

    if (!generatedImage?.base64) {
      throw new Error(
        'Gemini did not return an image for photo transformation',
      );
    }

    const imageBuffer = Buffer.from(generatedImage.base64, 'base64');

    // Save to blob storage
    const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
    const { url } = await put(tempFileName, imageBuffer, { access: 'public' });

    // eslint-disable-next-line no-console
    console.log(`[PhotoToColoring] Generated in ${generationTimeMs}ms`);

    return {
      url,
      tempFileName,
      generationTimeMs,
      provider: 'google',
      model: MODEL_IDS.GEMINI_3_PRO_IMAGE,
      imageBuffer,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      '[PhotoToColoring] Failed:',
      error instanceof Error ? error.message : error,
    );

    // Re-throw with context
    throw new Error(
      `Photo-to-coloring generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
