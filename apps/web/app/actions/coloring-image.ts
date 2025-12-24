'use server';

import { put, del } from '@vercel/blob';
import { revalidatePath, updateTag, cacheLife, cacheTag } from 'next/cache';
import { after } from 'next/server';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  generateText,
  generateObject,
  getTracedModels,
  CLEAN_UP_DESCRIPTION_SYSTEM,
  IMAGE_METADATA_SYSTEM,
  IMAGE_METADATA_PROMPT,
  imageMetadataSchema,
  analyzeImageForAnalytics,
  generateColoringPageImage,
  getCurrentProviderConfig,
} from '@/lib/ai';
import { ACTIONS, TRACKING_EVENTS } from '@/constants';
import { track, trackWithUser } from '@/utils/analytics-server';
import {
  db,
  ColoringImage,
  GenerationType,
  CreditTransactionType,
} from '@chunky-crayon/db';
import { getRandomDescriptionSmart as getRandomDescription } from '@/utils/random';
import type { ColoringImageSearchParams } from '@/types';
import { getUserId } from '@/app/actions/user';
import { checkSvgImage, retraceImage, traceImage } from '@/utils/traceImage';

/**
 * Generate coloring image with provider abstraction and tracking
 *
 * Uses the provider abstraction layer which:
 * - Defaults to OpenAI (cheaper) with Gemini fallback
 * - Can be switched via IMAGE_PROVIDER env var
 * - Automatically falls back on provider failures
 */
const generateColoringImage = async (description: string, userId?: string) => {
  const providerConfig = getCurrentProviderConfig();

  try {
    const result = await generateColoringPageImage(description);

    // Track successful generation with timing
    const trackingData = {
      model: result.model,
      provider: result.provider,
      generationTimeMs: result.generationTimeMs,
      promptLength: description.length,
      referenceImageCount: providerConfig.supportsReferenceImages ? 8 : 0,
      success: true as const,
    };

    if (userId) {
      await trackWithUser(
        userId,
        TRACKING_EVENTS.IMAGE_GENERATION_COMPLETED,
        trackingData,
      );
    } else {
      await track(TRACKING_EVENTS.IMAGE_GENERATION_COMPLETED, trackingData);
    }

    return {
      url: result.url,
      tempFileName: result.tempFileName,
      generationTimeMs: result.generationTimeMs,
      imageBuffer: result.imageBuffer,
    };
  } catch (error) {
    // Track failed generation
    const trackingData = {
      model: providerConfig.id,
      provider: providerConfig.provider,
      generationTimeMs: 0, // We don't have timing on complete failure
      promptLength: description.length,
      referenceImageCount: providerConfig.supportsReferenceImages ? 8 : 0,
      success: false as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    if (userId) {
      await trackWithUser(
        userId,
        TRACKING_EVENTS.IMAGE_GENERATION_FAILED,
        trackingData,
      );
    } else {
      await track(TRACKING_EVENTS.IMAGE_GENERATION_FAILED, trackingData);
    }

    // eslint-disable-next-line no-console
    console.error('Error generating image:', error);
    throw error;
  }
};

type CreateColoringImageResult =
  | Partial<ColoringImage>
  | { error: string; credits: number };

const isErrorResult = (
  result: CreateColoringImageResult,
): result is { error: string; credits: number } => 'error' in result;

const isColoringImage = (
  result: CreateColoringImageResult,
): result is Partial<ColoringImage> => !isErrorResult(result);

const generateColoringImageWithMetadata = async (
  description: string,
  userId?: string,
  generationType?: GenerationType,
) => {
  // Get traced models for observability (latency, tokens, costs)
  const tracedModels = getTracedModels({
    userId,
    properties: { action: 'coloring-image-generation' },
  });

  // Step 1: Clean up the user's description
  const { text: cleanedUpUserDescription } = await generateText({
    model: tracedModels.text,
    system: CLEAN_UP_DESCRIPTION_SYSTEM,
    prompt: description,
  });

  // eslint-disable-next-line no-console
  console.log('[Pipeline] Description cleaned:', cleanedUpUserDescription);

  // Step 2: Generate the coloring image (returns buffer to avoid re-fetching)
  const {
    url: imageUrl,
    tempFileName,
    imageBuffer,
  } = await generateColoringImage(cleanedUpUserDescription as string, userId);

  if (!imageUrl || !imageBuffer) {
    throw new Error('Failed to generate an acceptable image');
  }

  // Step 3: Run metadata, SVG trace, and WebP conversion in PARALLEL
  // This saves ~2-3 seconds compared to sequential execution
  const [metadataResult, svg, webpBuffer] = await Promise.all([
    // A) Generate metadata using faster model (GPT-4o-mini)
    generateObject({
      model: tracedModels.textFast,
      schema: imageMetadataSchema,
      system: IMAGE_METADATA_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IMAGE_METADATA_PROMPT },
            { type: 'image', image: new URL(imageUrl) },
          ],
        },
      ],
    }),

    // B) Trace image to SVG (CPU-intensive)
    traceImage(imageBuffer),

    // C) Convert to WebP (CPU-intensive)
    sharp(imageBuffer).webp().toBuffer(),
  ]);

  const imageMetadata = metadataResult.object;

  // eslint-disable-next-line no-console
  console.log('[Pipeline] Parallel processing complete:', {
    title: imageMetadata.title,
    svgLength: svg.length,
    webpSize: webpBuffer.length,
  });

  // Step 4: Create DB record (needs metadata)
  const coloringImage = await db.coloringImage.create({
    data: {
      title: imageMetadata.title,
      description: imageMetadata.description,
      alt: imageMetadata.alt,
      tags: imageMetadata.tags,
      generationType: generationType || GenerationType.USER,
      userId,
    },
  });

  // Step 5: Generate QR code (needs coloringImage.id, but very fast ~50ms)
  const qrCodeSvg = await QRCode.toString(
    `https://chunkycrayon.com?utm_source=${coloringImage.id}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
    { type: 'svg' },
  );

  const qrCodeSvgBuffer = Buffer.from(qrCodeSvg);
  const imageSvgBuffer = Buffer.from(svg);

  // Step 6: Upload all files in parallel
  const imageFileName = `uploads/coloring-images/${coloringImage.id}/image.webp`;
  const svgFileName = `uploads/coloring-images/${coloringImage.id}/image.svg`;
  const qrCodeFileName = `uploads/coloring-images/${coloringImage.id}/qr-code.svg`;

  const [
    { url: imageBlobUrl },
    { url: imageSvgBlobUrl },
    { url: qrCodeSvgBlobUrl },
  ] = await Promise.all([
    put(imageFileName, webpBuffer, {
      access: 'public',
    }),
    put(svgFileName, imageSvgBuffer, {
      access: 'public',
    }),
    put(qrCodeFileName, qrCodeSvgBuffer, {
      access: 'public',
    }),
  ]);

  // update coloringImage in db with qr code url
  const updatedColoringImage = await db.coloringImage.update({
    where: {
      id: coloringImage.id,
    },
    data: {
      url: imageBlobUrl,
      svgUrl: imageSvgBlobUrl,
      qrCodeUrl: qrCodeSvgBlobUrl,
    },
  });

  // clean up temporary file
  try {
    if (tempFileName) {
      await del(tempFileName);
    }
  } catch (error) {
    console.error('Error cleaning up temporary file:', error);
  }

  return updatedColoringImage;
};

export const createColoringImage = async (
  formData: FormData,
): Promise<CreateColoringImageResult> => {
  const rawFormData = {
    description: (formData.get('description') as string) || '',
    generationType:
      (formData.get('generationType') as GenerationType) || undefined,
  };

  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);

  // Check credits for authenticated users
  if (userId) {
    // get user's credit balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user || user.credits < 5) {
      return {
        error: 'Insufficient credits',
        credits: user?.credits || 0,
      };
    }

    // use a transaction to deduct credits and create the coloring image
    const result = await db.$transaction(
      async (tx) => {
        // deduct credits
        await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 5 } },
        });

        // create credit transaction record
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -5,
            type: CreditTransactionType.GENERATION,
          },
        });

        return generateColoringImageWithMetadata(
          rawFormData.description,
          userId,
          rawFormData.generationType,
        );
      },
      {
        timeout: 120000, // 2 minutes for DALL-E image generation
      },
    );

    after(async () => {
      if (!result.url || !result.svgUrl) {
        return;
      }

      // Run SVG check and analytics in parallel, independently
      await Promise.allSettled([
        // Check SVG validity and retrace if needed
        (async () => {
          const { isValid } = await checkSvgImage(result.svgUrl!);
          if (!isValid) {
            await retraceImage(result.id, result.url!);
          }
        })(),

        // Analyze image content for PostHog insights (using Gemini 3 Flash)
        (async () => {
          const imageAnalytics = await analyzeImageForAnalytics(result.url!);
          if (imageAnalytics && userId) {
            await trackWithUser(userId, TRACKING_EVENTS.CREATION_ANALYZED, {
              coloringImageId: result.id,
              ...imageAnalytics,
            });
          }
        })(),
      ]);
    });

    // Invalidate gallery cache so new image appears immediately
    updateTag('all-coloring-images');
    revalidatePath('/');
    return result;
  }

  // Guest users (not authenticated) - no credit check required
  const result = await generateColoringImageWithMetadata(
    rawFormData.description,
    undefined,
    rawFormData.generationType,
  );

  after(async () => {
    if (!result.url || !result.svgUrl) {
      return;
    }

    // Run SVG check and analytics in parallel, independently
    await Promise.allSettled([
      // Check SVG validity and retrace if needed
      (async () => {
        const { isValid } = await checkSvgImage(result.svgUrl!);
        if (!isValid) {
          await retraceImage(result.id, result.url!);
        }
      })(),

      // Analyze image content for PostHog insights (using Gemini 3 Flash)
      (async () => {
        const imageAnalytics = await analyzeImageForAnalytics(result.url!);
        if (imageAnalytics) {
          await track(TRACKING_EVENTS.CREATION_ANALYZED, {
            coloringImageId: result.id,
            ...imageAnalytics,
          });
        }
      })(),
    ]);
  });

  // Invalidate gallery cache so new image appears immediately
  updateTag('all-coloring-images');
  revalidatePath('/');
  return result;
};

// Base cached function for fetching a coloring image by ID
export const getColoringImageBase = async (
  id: string,
): Promise<Partial<ColoringImage> | null> => {
  'use cache';

  // The id parameter is serializable and becomes part of the cache key
  cacheLife('max');
  cacheTag('coloring-image', `coloring-image-${id}`);

  return db.coloringImage.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      alt: true,
      tags: true,
      url: true,
      svgUrl: true,
      qrCodeUrl: true,
    },
  });
};

// Wrapper for page components that receive params as Promise
export const getColoringImage = async (
  params: Promise<{ id: string }>,
): Promise<Partial<ColoringImage> | null> => {
  const { id } = await params;
  return getColoringImageBase(id);
};

// Export for components that have a plain string ID
export const getColoringImageById = async (
  id: string,
): Promise<Partial<ColoringImage> | null> => {
  return getColoringImageBase(id);
};

const getAllColoringImagesBase = async (show = 'all', userId?: string) => {
  'use cache';
  cacheLife('max');
  cacheTag('all-coloring-images');

  return db.coloringImage.findMany({
    where: {
      OR:
        show === 'all'
          ? userId
            ? [{ userId }, { userId: null }]
            : [{ userId: null }]
          : userId
            ? [{ userId }]
            : [{ id: { in: [] } }], // Empty result if filtering by user but no userId
    },
    select: {
      id: true,
      svgUrl: true,
      title: true,
      description: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getAllColoringImages = async (
  searchParams: Promise<ColoringImageSearchParams>,
) => {
  const { show = 'all' } = await searchParams;

  const userId = await getUserId(ACTIONS.GET_ALL_COLORING_IMAGES);
  return getAllColoringImagesBase(show, userId || undefined);
};

// Static version for generateStaticParams - no user context needed
export const getAllColoringImagesStatic = async () => {
  // Return all public images for static generation
  // No userId needed since this runs at build time
  return getAllColoringImagesBase('all', undefined);
};

export const generateColoringImageOnly = async (
  generationType: GenerationType,
): Promise<Partial<ColoringImage>> => {
  const description = getRandomDescription();

  const formData = new FormData();

  formData.append('description', description);
  formData.append('generationType', generationType);

  const coloringImage = await createColoringImage(formData);

  if (!isColoringImage(coloringImage)) {
    throw new Error(
      coloringImage.error ||
        `Error generating ${generationType.toLowerCase()} coloring image`,
    );
  }

  return coloringImage;
};
