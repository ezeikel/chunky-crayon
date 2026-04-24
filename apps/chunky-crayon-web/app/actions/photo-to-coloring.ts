'use server';

import { put, del } from '@one-colored-pixel/storage';
import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { generateText, Output } from 'ai';
import {
  getTracedModels,
  createImageMetadataSystemPrompt,
  IMAGE_METADATA_PROMPT,
  imageMetadataSchema,
  analyzeImageForAnalytics,
  generateColoringPageFromPhoto,
} from '@/lib/ai';
import { ACTIONS, TRACKING_EVENTS } from '@/constants';
import { trackWithUser, track } from '@/utils/analytics-server';
import {
  db,
  ColoringImage,
  GenerationType,
  CreditTransactionType,
} from '@one-colored-pixel/db';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { checkSvgImage, retraceImage, traceImage } from '@/utils/traceImage';
import { generateAmbientSoundForImage } from '@/app/actions/ambient-sound';
import { generateRegionFillPoints } from '@/app/actions/generate-color-map';
import { generateColoredReference } from '@/app/actions/generate-colored-reference';

/**
 * Fire the Hetzner worker to generate a region store. Fire-and-forget —
 * see identical helper in coloring-image.ts for rationale.
 */
const requestRegionStoreFromWorker = (imageId: string): void => {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    console.error(
      `[region-store] CHUNKY_CRAYON_WORKER_URL not set — cannot request worker generation for ${imageId}`,
    );
    return;
  }
  fetch(`${workerUrl}/generate/region-store`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify({ imageId }),
    signal: AbortSignal.timeout(10_000),
  })
    .then(async (res) => {
      const text = await res.text().catch(() => '');
      console.log(
        `[region-store] worker response for ${imageId}: ${res.status} ${text.slice(0, 200)}`,
      );
    })
    .catch((err) => {
      console.error(
        `[region-store] worker request for ${imageId} failed:`,
        err instanceof Error ? err.message : err,
      );
    });
};

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

type CreateFromPhotoResult =
  | Partial<ColoringImage>
  | { error: string; credits?: number };

const generatePhotoColoringImageWithMetadata = async (
  photoBase64: string,
  userId?: string,
  locale: string = 'en',
) => {
  const languageInfo = LOCALE_LANGUAGE_MAP[locale] || LOCALE_LANGUAGE_MAP.en;

  const activeProfile = await getActiveProfile();
  const difficulty = activeProfile?.difficulty;

  const tracedModels = getTracedModels({
    userId,
    properties: {
      action: 'photo-to-coloring-generation',
      difficulty,
    },
  });

  try {
    const {
      url: imageUrl,
      tempFileName,
      imageBuffer,
      generationTimeMs,
      provider: generationProvider,
      model: generationModel,
    } = await generateColoringPageFromPhoto(photoBase64, difficulty);

    if (!imageUrl || !imageBuffer) {
      throw new Error('Failed to generate coloring image from photo');
    }

    const trackingData = {
      model: generationModel,
      provider: generationProvider,
      generationTimeMs,
      promptLength: 0,
      referenceImageCount: 1,
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

    const [metadataResult, svg, webpBuffer] = await Promise.all([
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
      traceImage(imageBuffer),
      sharp(imageBuffer).webp().toBuffer(),
    ]);

    const imageMetadata = metadataResult.output!;

    // eslint-disable-next-line no-console
    console.log('[PhotoToColoring] Parallel processing complete:', {
      title: imageMetadata.title,
      svgLength: svg.length,
      webpSize: webpBuffer.length,
    });

    const coloringImage = await db.coloringImage.create({
      data: {
        title: imageMetadata.title,
        description: imageMetadata.description,
        alt: imageMetadata.alt,
        tags: imageMetadata.tags,
        generationType: GenerationType.USER,
        userId,
        profileId: activeProfile?.id,
      },
    });

    const qrCodeSvg = await QRCode.toString(
      `https://chunkycrayon.com?utm_source=${coloringImage.id}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
      { type: 'svg' },
    );

    const qrCodeSvgBuffer = Buffer.from(qrCodeSvg);
    const imageSvgBuffer = Buffer.from(svg);

    const imageFileName = `uploads/coloring-images/${coloringImage.id}/image.webp`;
    const svgFileName = `uploads/coloring-images/${coloringImage.id}/image.svg`;
    const qrCodeFileName = `uploads/coloring-images/${coloringImage.id}/qr-code.svg`;

    const [
      { url: imageBlobUrl },
      { url: imageSvgBlobUrl },
      { url: qrCodeSvgBlobUrl },
    ] = await Promise.all([
      put(imageFileName, webpBuffer, { access: 'public' }),
      put(svgFileName, imageSvgBuffer, { access: 'public' }),
      put(qrCodeFileName, qrCodeSvgBuffer, { access: 'public' }),
    ]);

    const updatedColoringImage = await db.coloringImage.update({
      where: { id: coloringImage.id },
      data: {
        url: imageBlobUrl,
        svgUrl: imageSvgBlobUrl,
        qrCodeUrl: qrCodeSvgBlobUrl,
      },
    });

    try {
      if (tempFileName) {
        await del(tempFileName);
      }
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }

    return updatedColoringImage;
  } catch (error) {
    const trackingData = {
      model: 'gpt-image-1.5',
      provider: 'openai' as const,
      generationTimeMs: 0,
      promptLength: 0,
      referenceImageCount: 1,
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

    console.error('[PhotoToColoring] Failed:', error);
    throw error;
  }
};

const runPhotoPostProcessing = async (
  result: Partial<ColoringImage> & { id: string },
  userId: string | undefined,
  durationMs: number,
) => {
  if (!result.url || !result.svgUrl) {
    return;
  }

  const completedTrackingData = {
    coloringImageId: result.id,
    description: result.description ?? '',
    durationMs,
    creditsUsed: userId ? 5 : 0,
  };
  if (userId) {
    await trackWithUser(
      userId,
      TRACKING_EVENTS.CREATION_COMPLETED,
      completedTrackingData,
    );
  } else {
    await track(TRACKING_EVENTS.CREATION_COMPLETED, completedTrackingData);
  }

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
        const analyzedData = {
          coloringImageId: result.id,
          ...imageAnalytics,
        };
        if (userId) {
          await trackWithUser(
            userId,
            TRACKING_EVENTS.CREATION_ANALYZED,
            analyzedData,
          );
        } else {
          await track(TRACKING_EVENTS.CREATION_ANALYZED, analyzedData);
        }
      }
    })(),

    (async () => {
      const fillPointsResult = await generateRegionFillPoints(
        result.id,
        result.url!,
        {
          title: result.title ?? '',
          description: result.description ?? '',
          tags: (result.tags as string[]) ?? [],
        },
      );
      if (fillPointsResult.success) {
        // eslint-disable-next-line no-console
        console.log(`[Pipeline] Fill points generated for ${result.id}`);
      } else {
        console.error(
          `[Pipeline] Failed to generate fill points: ${fillPointsResult.error}`,
        );
      }
    })(),

    (async () => {
      const refResult = await generateColoredReference(result.id, result.url!, {
        title: result.title ?? undefined,
        description: result.description ?? undefined,
      });
      if (refResult.success) {
        // eslint-disable-next-line no-console
        console.log(`[Pipeline] Colored reference generated for ${result.id}`);
      } else {
        console.error(
          `[Pipeline] Failed to generate colored reference: ${refResult.error}`,
        );
      }
    })(),

    (async () => {
      const soundResult = await generateAmbientSoundForImage(result.id);
      if (soundResult.success) {
        // eslint-disable-next-line no-console
        console.log(`[Pipeline] Ambient sound generated for ${result.id}`);
      } else {
        console.error(
          `[Pipeline] Failed to generate ambient sound: ${soundResult.error}`,
        );
      }
    })(),
  ]);

  // Region store — offloaded to Hetzner worker (see helper above).
  requestRegionStoreFromWorker(result.id);

  revalidateTag(`coloring-image-${result.id}`, { expire: 0 });
};

/**
 * Generate a coloring image directly from a user's photo.
 *
 * Uses Gemini 3 Pro Image to trace the photo into line art, preserving
 * composition and subject placement. Full post-processing pipeline
 * (fill points, region store, colored reference, ambient sound) runs
 * in an after() hook so Magic Fill / Magic Brush / Auto Color / ambient
 * sound all work on the resulting page, matching the text-generated path.
 */
export async function createColoringImageFromPhoto(
  photoBase64: string,
  locale: string = 'en',
): Promise<CreateFromPhotoResult> {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);

  // Capture end-to-end wait from when we start the credit-checked
  // transaction through image generation + uploads. after() runs
  // post-response so we stamp the elapsed time before handing off.
  const startedAt = Date.now();

  if (userId) {
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

    const result = await db.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 5 } },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -5,
            type: CreditTransactionType.GENERATION,
          },
        });

        return generatePhotoColoringImageWithMetadata(
          photoBase64,
          userId,
          locale,
        );
      },
      {
        timeout: 180000,
      },
    );

    const authedDurationMs = Date.now() - startedAt;
    after(() => runPhotoPostProcessing(result, userId, authedDurationMs));

    revalidateTag('all-coloring-images', { expire: 0 });
    revalidatePath('/');
    return result;
  }

  const result = await generatePhotoColoringImageWithMetadata(
    photoBase64,
    undefined,
    locale,
  );

  const guestDurationMs = Date.now() - startedAt;
  after(() => runPhotoPostProcessing(result, undefined, guestDurationMs));

  revalidateTag('all-coloring-images', { expire: 0 });
  revalidatePath('/');
  return result;
}
