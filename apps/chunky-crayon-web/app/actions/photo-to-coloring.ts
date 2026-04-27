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
import { requestAllPipelineFromWorker } from '@/lib/worker';

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
  // System-purpose images (e.g. demo-reel cron) override defaults to mark
  // the row as SYSTEM + carry a stable lookup key. User-uploaded photos
  // keep the existing USER + null purposeKey behaviour.
  generationType: GenerationType = GenerationType.USER,
  purposeKey?: string,
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
        generationType,
        purposeKey: purposeKey || undefined,
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

// Lighter follow-up tasks that don't strictly need to land before the
// response. Tolerates Vercel after() drop rate (small impact: tracking +
// retrace). The heavyweight worker pipeline kick is awaited inline in
// the action below, BEFORE the response — see comment there.
const runPhotoFollowUp = async (
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
  ]);

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
    // Fire pipeline before returning — see lib/worker.ts comment.
    if (result.url && result.svgUrl) {
      await requestAllPipelineFromWorker(result.id);
    }
    after(() => runPhotoFollowUp(result, userId, authedDurationMs));

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
  if (result.url && result.svgUrl) {
    await requestAllPipelineFromWorker(result.id);
  }
  after(() => runPhotoFollowUp(result, undefined, guestDurationMs));

  revalidateTag('all-coloring-images', { expire: 0 });
  revalidatePath('/');
  return result;
}

/**
 * Server-side helper for the demo-reel produce cron. Fetches a public
 * photo URL, base64-encodes it, runs it through the same generation
 * pipeline as the user-facing flow, but tagged SYSTEM + purposeKey so it
 * doesn't appear in community feeds. Skips credit checks (no userId) and
 * skips the after() user-tracking hook — derived-asset pipeline still
 * fires so the reel renderer has region store + voiceover ready.
 *
 * Returns the created coloringImage row, or null if generation failed.
 */
export async function generateDemoReelImageFromPhotoUrl(
  photoUrl: string,
): Promise<Partial<ColoringImage> | null> {
  const photoResp = await fetch(photoUrl, { cache: 'no-store' });
  if (!photoResp.ok) {
    console.error(
      `[demo-reel] photo fetch failed: ${photoResp.status} ${photoUrl}`,
    );
    return null;
  }
  const buf = Buffer.from(await photoResp.arrayBuffer());
  const photoBase64 = buf.toString('base64');

  const result = await generatePhotoColoringImageWithMetadata(
    photoBase64,
    undefined,
    'en',
    GenerationType.SYSTEM,
    'demo-reel',
  );

  if (!result.url || !result.svgUrl) {
    console.error('[demo-reel] photo generation incomplete:', result);
    return null;
  }

  // Same as the user paths — fire the derived-asset pipeline so the reel
  // renderer can read region store + colored reference + background music
  // when it's ready to compose.
  await requestAllPipelineFromWorker(result.id);

  return result;
}
