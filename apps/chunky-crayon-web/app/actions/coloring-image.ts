'use server';

import { put, del } from '@one-colored-pixel/storage';
import { revalidatePath, revalidateTag, cacheLife, cacheTag } from 'next/cache';
import { after } from 'next/server';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { generateText, Output } from 'ai';
import {
  getTracedModels,
  CLEAN_UP_DESCRIPTION_SYSTEM,
  createImageMetadataSystemPrompt,
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
} from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { getRandomDescriptionSmart as getRandomDescription } from '@/utils/random';
import { getAIDescription } from '@/lib/scene-generation';
import type { ColoringImageSearchParams } from '@/types';
import {
  type CreateColoringImageResult,
  isErrorResult,
  isColoringImage,
} from './coloring-image-types';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { checkSvgImage, retraceImage, traceImage } from '@/utils/traceImage';
import { requestAllPipelineFromWorker } from '@/lib/worker';

// Worker fire-and-forget helpers live in @/lib/worker so this action
// and the photo-to-coloring action both share the same implementation.

/**
 * Locale to language mapping for image metadata generation.
 * Maps locale codes to language names for the AI prompt.
 */
const LOCALE_LANGUAGE_MAP: Record<
  string,
  { name: string; nativeName: string }
> = {
  en: { name: 'English', nativeName: 'English' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  de: { name: 'German', nativeName: 'Deutsch' },
  fr: { name: 'French', nativeName: 'Français' },
  es: { name: 'Spanish', nativeName: 'Español' },
};

/**
 * Generate coloring image with provider abstraction and tracking
 *
 * Uses the provider abstraction layer which:
 * - Defaults to OpenAI (cheaper) with Gemini fallback
 * - Can be switched via IMAGE_PROVIDER env var
 * - Automatically falls back on provider failures
 * - Uses difficulty level from profile for age-appropriate generation
 */
const generateColoringImage = async (
  description: string,
  userId?: string,
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT',
  clientDistinctId?: string,
) => {
  const providerConfig = getCurrentProviderConfig();

  try {
    const result = await generateColoringPageImage(description, difficulty);

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
      await track(
        TRACKING_EVENTS.IMAGE_GENERATION_COMPLETED,
        trackingData,
        clientDistinctId,
      );
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
      await track(
        TRACKING_EVENTS.IMAGE_GENERATION_FAILED,
        trackingData,
        clientDistinctId,
      );
    }

    // eslint-disable-next-line no-console
    console.error('Error generating image:', error);
    throw error;
  }
};

export const generateColoringImageWithMetadata = async (
  description: string,
  userId?: string,
  generationType?: GenerationType,
  locale: string = 'en',
  sourcePrompt?: string,
  clientDistinctId?: string,
  // System-purpose images (generationType !== USER) can carry a stable
  // key so other parts of the app can look them up later. For AD images
  // this is the campaign asset key ('trex' | 'foxes' | 'dragon').
  purposeKey?: string,
) => {
  // Get language info for the locale (default to English if unknown)
  const languageInfo = LOCALE_LANGUAGE_MAP[locale] || LOCALE_LANGUAGE_MAP.en;

  // Get active profile early to use its difficulty setting for generation
  const activeProfile = await getActiveProfile();
  const difficulty = activeProfile?.difficulty;

  // Get traced models for observability (latency, tokens, costs)
  const tracedModels = getTracedModels({
    userId,
    properties: { action: 'coloring-image-generation', difficulty },
  });

  // Step 1: Clean up the user's description
  const { text: cleanedUpUserDescription } = await generateText({
    model: tracedModels.creative,
    system: CLEAN_UP_DESCRIPTION_SYSTEM,
    prompt: description,
  });

  // eslint-disable-next-line no-console
  console.log('[Pipeline] Description cleaned:', cleanedUpUserDescription);

  // Step 2: Generate the coloring image (returns buffer to avoid re-fetching)
  // Uses difficulty from active profile for age-appropriate generation
  const {
    url: imageUrl,
    tempFileName,
    imageBuffer,
  } = await generateColoringImage(
    cleanedUpUserDescription as string,
    userId,
    difficulty,
    clientDistinctId,
  );

  if (!imageUrl || !imageBuffer) {
    throw new Error('Failed to generate an acceptable image');
  }

  // Step 3: Run metadata, SVG trace, and WebP conversion in PARALLEL
  // This saves ~2-3 seconds compared to sequential execution
  const [metadataResult, svg, webpBuffer] = await Promise.all([
    // A) Generate metadata using faster model (GPT-4o-mini), with language support
    generateText({
      model: tracedModels.vision,
      output: Output.object({ schema: imageMetadataSchema }),
      system: createImageMetadataSystemPrompt(
        languageInfo.name,
        languageInfo.nativeName,
      ),
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

  const imageMetadata = metadataResult.output!;

  // eslint-disable-next-line no-console
  console.log('[Pipeline] Parallel processing complete:', {
    title: imageMetadata.title,
    svgLength: svg.length,
    webpSize: webpBuffer.length,
  });

  // Step 4: Create DB record (needs metadata)
  // Uses activeProfile fetched at start of function
  // Note: animationPrompt is generated in after() hook with image visibility
  const coloringImage = await db.coloringImage.create({
    data: {
      title: imageMetadata.title,
      description: imageMetadata.description,
      alt: imageMetadata.alt,
      tags: imageMetadata.tags,
      generationType: generationType || GenerationType.USER,
      userId,
      profileId: activeProfile?.id,
      sourcePrompt: sourcePrompt || undefined,
      purposeKey: purposeKey || undefined,
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
    locale: (formData.get('locale') as string) || 'en',
    clientDistinctId: (formData.get('clientDistinctId') as string) || undefined,
    purposeKey: (formData.get('purposeKey') as string) || undefined,
  };

  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);

  // Start timer BEFORE any work so the reported duration captures the
  // full user-perceived wait (credit check → image gen → R2 upload). We
  // stamp the end below, right after generation resolves but before the
  // after() hook fires — after() runs post-response so timing taken
  // inside it would be meaningless.
  const startedAt = Date.now();

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
          rawFormData.locale,
          rawFormData.description,
          rawFormData.clientDistinctId,
          rawFormData.purposeKey,
        );
      },
      {
        timeout: 120000, // 2 minutes for DALL-E image generation
      },
    );

    const durationMs = Date.now() - startedAt;

    // Fire ALL derived-asset pipeline endpoints to the Hetzner worker
    // BEFORE returning the response. We previously kicked these off
    // inside after(), but Vercel `after()` is best-effort and drops
    // ~50% of long-running tasks under CPU contention — when after()
    // dropped, the dangling fetches were killed before reaching the
    // worker, so derived assets never generated. Awaiting the 4
    // parallel acks here adds ~200-400ms of latency but guarantees the
    // worker actually receives every request.
    if (result.url && result.svgUrl) {
      await requestAllPipelineFromWorker(result.id);
    }

    after(async () => {
      if (!result.url || !result.svgUrl) {
        return;
      }

      await trackWithUser(userId, TRACKING_EVENTS.CREATION_COMPLETED, {
        coloringImageId: result.id,
        description: rawFormData.description,
        durationMs,
        creditsUsed: 5,
      });

      // Lightweight follow-up tasks — analytics + base-data tweaks
      // that don't strictly need to land before response. Tolerate
      // the after() drop rate (small impact: tracking + retrace).
      await Promise.allSettled([
        (async () => {
          const { isValid } = await checkSvgImage(result.svgUrl!);
          if (!isValid) {
            await retraceImage(result.id, result.url!);
          }
        })(),
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

      // Invalidate cache so new data (fill points, music) becomes available
      revalidateTag(`coloring-image-${result.id}`, { expire: 0 });
    });

    // Invalidate gallery cache so new image appears immediately
    revalidateTag('all-coloring-images', { expire: 0 });
    revalidatePath('/');
    return result;
  }

  // Guest users (not authenticated) - no credit check required
  const result = await generateColoringImageWithMetadata(
    rawFormData.description,
    undefined,
    rawFormData.generationType,
    rawFormData.locale,
    rawFormData.description,
    rawFormData.clientDistinctId,
    rawFormData.purposeKey,
  );

  const durationMs = Date.now() - startedAt;

  // Same sync-await pattern as the authenticated path above — fire the
  // worker pipeline before returning so the requests can't be killed
  // by Vercel function recycle.
  if (result.url && result.svgUrl) {
    await requestAllPipelineFromWorker(result.id);
  }

  after(async () => {
    if (!result.url || !result.svgUrl) {
      return;
    }

    await track(
      TRACKING_EVENTS.CREATION_COMPLETED,
      {
        coloringImageId: result.id,
        description: rawFormData.description,
        durationMs,
        creditsUsed: 0,
      },
      rawFormData.clientDistinctId,
    );

    await Promise.allSettled([
      (async () => {
        const { isValid } = await checkSvgImage(result.svgUrl!);
        if (!isValid) {
          await retraceImage(result.id, result.url!);
        }
      })(),
      (async () => {
        const imageAnalytics = await analyzeImageForAnalytics(result.url!);
        if (imageAnalytics) {
          await track(
            TRACKING_EVENTS.CREATION_ANALYZED,
            {
              coloringImageId: result.id,
              ...imageAnalytics,
            },
            rawFormData.clientDistinctId,
          );
        }
      })(),
    ]);

    // Invalidate cache so new data (color map, music) becomes available
    revalidateTag(`coloring-image-${result.id}`, { expire: 0 });
  });

  // Invalidate gallery cache so new image appears immediately
  revalidateTag('all-coloring-images', { expire: 0 });
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

  return db.coloringImage.findFirst({
    where: {
      id,
      brand: BRAND,
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
      backgroundMusicUrl: true,
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

const getAllColoringImagesBase = async (
  show = 'all',
  userId?: string,
  profileId?: string,
) => {
  'use cache';
  cacheLife('max');
  cacheTag('all-coloring-images');

  // Build where clause based on show mode and profile
  let whereClause;

  if (show === 'all') {
    if (userId) {
      // Show user's images (filtered by profile if available) + community images
      whereClause = {
        brand: BRAND,
        OR: [{ userId, ...(profileId ? { profileId } : {}) }, { userId: null }],
      };
    } else {
      // Logged out - show community images only
      whereClause = { brand: BRAND, userId: null };
    }
  } else {
    // show === 'user' - only user's images
    if (userId) {
      whereClause = {
        brand: BRAND,
        userId,
        ...(profileId ? { profileId } : {}),
      };
    } else {
      // No userId but trying to show user's images - return empty
      whereClause = { brand: BRAND, id: { in: [] } };
    }
  }

  return db.coloringImage.findMany({
    where: whereClause,
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

  // Get active profile for filtering
  let profileId: string | undefined;
  if (userId) {
    const activeProfile = await getActiveProfile();
    profileId = activeProfile?.id;
  }

  return getAllColoringImagesBase(show, userId || undefined, profileId);
};

// Static version for generateStaticParams - no user context needed
export const getAllColoringImagesStatic = async () => {
  // Return all public images for static generation
  // No userId needed since this runs at build time
  return getAllColoringImagesBase('all', undefined);
};

/**
 * Server-side helper for the demo-reel produce cron (text variant).
 * Generates a fresh AI scene description (same source as daily images),
 * runs the standard pipeline, and tags the row SYSTEM + purposeKey
 * 'demo-reel' so it stays out of community feeds. Skips credit checks
 * (no userId).
 *
 * Returns the created coloringImage row, or null if generation failed.
 */
export const generateDemoReelImageFromAIDescription =
  async (): Promise<Partial<ColoringImage> | null> => {
    const description = await getAIDescription();

    const result = await generateColoringImageWithMetadata(
      description,
      undefined,
      GenerationType.SYSTEM,
      'en',
      description,
      undefined,
      'demo-reel',
    );

    if (!result.url || !result.svgUrl) {
      console.error('[demo-reel] text generation incomplete:', result);
      return null;
    }

    // Fire derived-asset pipeline so region store + bg music are ready by
    // the time the reel renderer pulls the row.
    await requestAllPipelineFromWorker(result.id);

    return result;
  };

export const generateColoringImageOnly = async (
  generationType: GenerationType,
): Promise<Partial<ColoringImage>> => {
  let description: string;

  if (generationType === GenerationType.DAILY) {
    // For daily images: use Perplexity Sonar for seasonal/trending scene,
    // with fallback to static random on any failure
    description = await getAIDescription();
  } else {
    description = getRandomDescription();
  }

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
