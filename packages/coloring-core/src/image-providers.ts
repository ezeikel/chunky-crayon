import { put } from "@one-colored-pixel/storage";
import { generateText } from "ai";
import { models, MODEL_IDS } from "./models";
import OpenAI from "openai";

/**
 * Image Generation Provider Abstraction
 *
 * Provides a unified interface for generating coloring page images across
 * multiple providers (OpenAI, Gemini) with automatic fallback support.
 *
 * App-specific prompts and reference images are injected via ImageGenerationConfig
 * so this module stays brand-agnostic.
 */

export type ImageProvider = "openai" | "google";

export type GenerationResult = {
  url: string;
  tempFileName: string;
  generationTimeMs: number;
  provider: ImageProvider;
  model: string;
  imageBuffer: Buffer;
};

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export type DifficultyConfig = {
  targetAge: string;
  shapeSize: string;
  lineThickness: string;
  detailLevel: string;
  background: string;
  complexity: string;
  additionalRules: string[];
};

export type ProviderConfig = {
  id: string;
  name: string;
  provider: ImageProvider;
  costPerImage: number;
  supportsReferenceImages: boolean;
  generate: (
    description: string,
    difficulty?: Difficulty,
  ) => Promise<{
    imageBuffer: Buffer;
    generationTimeMs: number;
  }>;
};

/**
 * App-specific configuration injected into the image generation pipeline.
 * Each app provides its own prompts, reference images, and difficulty modifiers.
 */
export type ImageGenerationConfig = {
  /** Style reference image URLs for OpenAI images.edit and Gemini */
  referenceImages: readonly string[];
  /** Difficulty modifiers per level (app-specific content complexity) */
  difficultyModifiers: Partial<Record<Difficulty, DifficultyConfig>>;
  /** Create the primary coloring page prompt */
  createColoringImagePrompt: (description: string) => string;
  /** Create the Gemini-specific coloring page prompt */
  createGeminiColoringImagePrompt: (description: string) => string;
  /** Create a difficulty-aware prompt variant */
  createDifficultyAwarePrompt: (
    description: string,
    difficulty: string,
  ) => string;
  /** System prompt for photo-to-coloring transformation */
  photoToColoringSystem: string;
  /** Create the photo-to-coloring user prompt */
  createPhotoToColoringPrompt: (difficulty?: string) => string;
  /** System prompt for image-to-coloring transformation */
  imageToColoringSystem: string;
  /** Create the image-to-coloring user prompt */
  createImageToColoringPrompt: (
    description?: string,
    difficulty?: string,
  ) => string;
};

// =============================================================================
// Style Reference Image Helpers
// =============================================================================

let cachedStyleReferenceFiles: File[] | null = null;

/**
 * Fetch reference image URLs and convert to File objects for OpenAI images.edit.
 * Results are cached in memory for the lifetime of the process.
 */
async function getStyleReferenceFiles(
  referenceImages: readonly string[],
  maxImages = 4,
): Promise<File[]> {
  if (cachedStyleReferenceFiles) {
    return cachedStyleReferenceFiles.slice(0, maxImages);
  }

  const urls = referenceImages.slice(0, maxImages);
  const files = await Promise.all(
    urls.map(async (url, i) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const ext = url.endsWith(".webp") ? "webp" : "png";
      return new File([arrayBuffer], `style-ref-${i}.${ext}`, {
        type: `image/${ext}`,
      });
    }),
  );

  cachedStyleReferenceFiles = files;
  return files;
}

// =============================================================================
// Provider Factories
// =============================================================================

function createOpenAIProvider(config: ImageGenerationConfig): ProviderConfig {
  return {
    id: MODEL_IDS.GPT_IMAGE_1_5,
    name: "OpenAI GPT Image 1.5",
    provider: "openai",
    costPerImage: 0.08,
    supportsReferenceImages: true,
    generate: async (description: string, difficulty?: Difficulty) => {
      const startTime = Date.now();

      const prompt =
        difficulty && difficulty !== "BEGINNER"
          ? config.createDifficultyAwarePrompt(description, difficulty)
          : config.createColoringImagePrompt(description);

      const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n${prompt}`;

      const styleFiles = await getStyleReferenceFiles(
        config.referenceImages,
        4,
      );

      const client = new OpenAI();
      const result = await client.images.edit({
        model: MODEL_IDS.GPT_IMAGE_1_5,
        image: styleFiles,
        prompt: styledPrompt,
        size: "1024x1024",
        quality: "high",
      });

      const generationTimeMs = Date.now() - startTime;

      const b64 = result.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("OpenAI did not return an image");
      }

      return { imageBuffer: Buffer.from(b64, "base64"), generationTimeMs };
    },
  };
}

function createGeminiProvider(config: ImageGenerationConfig): ProviderConfig {
  return {
    id: MODEL_IDS.GEMINI_3_PRO_IMAGE,
    name: "Gemini 3 Pro Image",
    provider: "google",
    costPerImage: 0.18,
    supportsReferenceImages: true,
    generate: async (description: string, difficulty?: Difficulty) => {
      const startTime = Date.now();

      let prompt = config.createGeminiColoringImagePrompt(description);
      if (difficulty && difficulty !== "BEGINNER") {
        const diffConfig = config.difficultyModifiers[difficulty];
        if (diffConfig) {
          const difficultyContext = `
DIFFICULTY LEVEL: ${difficulty}
Target audience: ${diffConfig.targetAge}

Complexity requirements:
- Shape sizes: ${diffConfig.shapeSize}
- Line thickness: ${diffConfig.lineThickness}
- Detail level: ${diffConfig.detailLevel}
- Background: ${diffConfig.background}
- Overall complexity: ${diffConfig.complexity}

Additional requirements:
${diffConfig.additionalRules.map((rule: string, i: number) => `${i + 1}. ${rule}`).join("\n")}
`;
          prompt = `${difficultyContext}\n\n${prompt}`;
        }
      }

      const selectedRefs = config.referenceImages.slice(0, 4);
      const messageContent: Array<
        { type: "text"; text: string } | { type: "image"; image: URL }
      > = [
        { type: "text", text: prompt },
        ...selectedRefs.map((url) => ({
          type: "image" as const,
          image: new URL(url),
        })),
      ];

      const result = await generateText({
        model: models.geminiImage,
        messages: [{ role: "user", content: messageContent }],
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
      });

      const generationTimeMs = Date.now() - startTime;

      const generatedImage = result.files?.find((file) =>
        file.mediaType?.startsWith("image/"),
      );

      if (!generatedImage?.base64) {
        throw new Error("Gemini did not return an image");
      }

      return {
        imageBuffer: Buffer.from(generatedImage.base64, "base64"),
        generationTimeMs,
      };
    },
  };
}

// =============================================================================
// Error Classification
// =============================================================================

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes("400") || message.includes("bad request")) return true;
  if (
    message.includes("content_policy") ||
    message.includes("safety") ||
    message.includes("moderation")
  )
    return true;
  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("504")
  )
    return true;
  if (message.includes("timeout")) return true;
  return false;
}

function shouldImmediateFallback(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const message = error.message.toLowerCase();
  if (message.includes("rate limit") || message.includes("quota")) return true;
  if (message.includes("503") || message.includes("unavailable")) return true;
  if (message.includes("401") || message.includes("403")) return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Public API
// =============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Create an image generation pipeline configured for a specific app.
 *
 * @param config - App-specific prompts, reference images, and difficulty modifiers
 * @returns Object with generateColoringPageImage, generateColoringPageFromPhoto,
 *          generateColoringPageFromImage, getCurrentProviderConfig
 */
export function createImageGenerationPipeline(config: ImageGenerationConfig) {
  const openaiProvider = createOpenAIProvider(config);
  const geminiProvider = createGeminiProvider(config);

  const PROVIDERS: Record<ImageProvider, ProviderConfig> = {
    openai: openaiProvider,
    google: geminiProvider,
  };

  const PRIMARY_PROVIDER: ImageProvider =
    (process.env.IMAGE_PROVIDER as ImageProvider) || "openai";
  const FALLBACK_PROVIDER: ImageProvider =
    PRIMARY_PROVIDER === "openai" ? "google" : "openai";

  async function generateColoringPageImage(
    description: string,
    difficulty?: Difficulty,
  ): Promise<GenerationResult> {
    const primaryConfig = PROVIDERS[PRIMARY_PROVIDER];
    const fallbackConfig = PROVIDERS[FALLBACK_PROVIDER];

    console.log(
      `[ImageGeneration] Using ${primaryConfig.name} (primary)${difficulty ? ` with difficulty: ${difficulty}` : ""}`,
    );

    let lastPrimaryError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { imageBuffer, generationTimeMs } = await primaryConfig.generate(
          description,
          difficulty,
        );

        const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
        const { url } = await put(tempFileName, imageBuffer, {
          access: "public",
        });

        if (attempt > 1) {
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

        console.error(
          `[ImageGeneration] ${primaryConfig.name} attempt ${attempt}/${MAX_RETRIES} failed:`,
          lastPrimaryError.message,
        );

        if (shouldImmediateFallback(error)) {
          console.log(
            `[ImageGeneration] Error requires immediate fallback, skipping remaining retries`,
          );
          break;
        }

        if (!isRetryableError(error)) {
          console.log(
            `[ImageGeneration] Error is not retryable, moving to fallback`,
          );
          break;
        }

        if (attempt < MAX_RETRIES) {
          console.log(
            `[ImageGeneration] Retrying ${primaryConfig.name} in ${RETRY_DELAY_MS}ms...`,
          );
          await sleep(RETRY_DELAY_MS);
        }
      }
    }

    console.log(
      `[ImageGeneration] ${primaryConfig.name} failed after ${MAX_RETRIES} attempts, falling back to ${fallbackConfig.name}`,
    );

    try {
      const { imageBuffer, generationTimeMs } = await fallbackConfig.generate(
        description,
        difficulty,
      );

      const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
      const { url } = await put(tempFileName, imageBuffer, {
        access: "public",
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
      console.error(
        `[ImageGeneration] Fallback ${fallbackConfig.name} also failed:`,
        fallbackError instanceof Error ? fallbackError.message : fallbackError,
      );

      throw new Error(
        `Image generation failed with both providers. Primary (${primaryConfig.name}): ${lastPrimaryError?.message || "Unknown error"}. Fallback (${fallbackConfig.name}): ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`,
      );
    }
  }

  async function generateColoringPageFromPhoto(
    photoBase64: string,
    difficulty?: Difficulty,
  ): Promise<GenerationResult> {
    console.log(
      `[PhotoToColoring] Generating coloring page from photo${difficulty ? ` with difficulty: ${difficulty}` : ""}`,
    );

    const startTime = Date.now();

    const selectedRefs = config.referenceImages.slice(0, 4);
    const messageContent: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: URL }
      | { type: "image"; image: string }
    > = [
      { type: "text", text: config.photoToColoringSystem },
      ...selectedRefs.map((url) => ({
        type: "image" as const,
        image: new URL(url),
      })),
      {
        type: "image",
        image: photoBase64.startsWith("data:")
          ? photoBase64
          : `data:image/jpeg;base64,${photoBase64}`,
      },
      { type: "text", text: config.createPhotoToColoringPrompt(difficulty) },
    ];

    try {
      const result = await generateText({
        model: models.geminiImage,
        messages: [{ role: "user", content: messageContent }],
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
      });

      const generationTimeMs = Date.now() - startTime;

      const generatedImage = result.files?.find((file) =>
        file.mediaType?.startsWith("image/"),
      );

      if (!generatedImage?.base64) {
        throw new Error(
          "Gemini did not return an image for photo transformation",
        );
      }

      const imageBuffer = Buffer.from(generatedImage.base64, "base64");

      const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
      const { url } = await put(tempFileName, imageBuffer, {
        access: "public",
      });

      console.log(`[PhotoToColoring] Generated in ${generationTimeMs}ms`);

      return {
        url,
        tempFileName,
        generationTimeMs,
        provider: "google",
        model: MODEL_IDS.GEMINI_3_PRO_IMAGE,
        imageBuffer,
      };
    } catch (error) {
      console.error(
        "[PhotoToColoring] Failed:",
        error instanceof Error ? error.message : error,
      );
      throw new Error(
        `Photo-to-coloring generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async function generateColoringPageFromImage(
    imageBase64: string,
    description?: string,
    difficulty?: Difficulty,
  ): Promise<GenerationResult> {
    console.log(
      `[ImageToColoring] Generating coloring page from reference image${description ? ` with scene: "${description}"` : ""}${difficulty ? ` difficulty: ${difficulty}` : ""}`,
    );

    const startTime = Date.now();

    const userPrompt = config.createImageToColoringPrompt(
      description,
      difficulty,
    );
    const prompt = `Image 1 is the character to transform. Images 2-5 show the target coloring book style — match their line weight, simplicity, and outline-only aesthetic.\n\n${config.imageToColoringSystem}\n\n${userPrompt}`;

    const rawBase64 = imageBase64.startsWith("data:")
      ? imageBase64.replace(/^data:image\/\w+;base64,/, "")
      : imageBase64;

    const imageBuffer = Buffer.from(rawBase64, "base64");
    const imageFile = new File([imageBuffer], "reference.png", {
      type: "image/png",
    });

    const styleFiles = await getStyleReferenceFiles(config.referenceImages, 4);
    const allImages = [imageFile, ...styleFiles];

    const client = new OpenAI();

    try {
      const result = await client.images.edit({
        model: MODEL_IDS.GPT_IMAGE_1_5,
        image: allImages,
        prompt,
        size: "1024x1024",
        n: 1,
      });

      const generationTimeMs = Date.now() - startTime;

      const b64 = result.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error(
          "GPT Image did not return an image for character-to-coloring transformation",
        );
      }

      const outputBuffer = Buffer.from(b64, "base64");

      const tempFileName = `temp/${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
      const { url } = await put(tempFileName, outputBuffer, {
        access: "public",
      });

      console.log(`[ImageToColoring] Generated in ${generationTimeMs}ms`);

      return {
        url,
        tempFileName,
        generationTimeMs,
        provider: "openai",
        model: MODEL_IDS.GPT_IMAGE_1_5,
        imageBuffer: outputBuffer,
      };
    } catch (error) {
      console.error(
        "[ImageToColoring] Failed:",
        error instanceof Error ? error.message : error,
      );
      throw new Error(
        `Image-to-coloring generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  function getCurrentProviderConfig(): ProviderConfig {
    return PROVIDERS[PRIMARY_PROVIDER];
  }

  function getAvailableProviders(): ProviderConfig[] {
    return Object.values(PROVIDERS);
  }

  return {
    generateColoringPageImage,
    generateColoringPageFromPhoto,
    generateColoringPageFromImage,
    getCurrentProviderConfig,
    getAvailableProviders,
  };
}
