'use server';

import { put, del } from '@/lib/storage';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  generateObject,
  getTracedModels,
  createImageMetadataSystemPrompt,
  IMAGE_METADATA_PROMPT,
  imageMetadataSchema,
  generateColoringPageFromImage,
} from '@/lib/ai';
import { ACTIONS, TRACKING_EVENTS } from '@/constants';
import { trackWithUser } from '@/utils/analytics-server';
import { db, ColoringImage, GenerationType } from '@chunky-crayon/db';
import { getUserId } from '@/app/actions/user';
import { getActiveProfile } from '@/app/actions/profiles';
import { traceImage } from '@/utils/traceImage';

/**
 * Locale to language mapping for image metadata generation.
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

type CreateFromImageResult = Partial<ColoringImage> | { error: string };

/**
 * Generate a coloring image from a reference image while preserving character likeness.
 *
 * Unlike createColoringImageFromPhoto (which preserves composition), this function
 * focuses on preserving the character's exact visual identity and optionally places
 * them in a described scene.
 *
 * @param imageBase64 - The reference image as a base64 string
 * @param description - Optional scene description to place the character in
 * @param locale - Optional locale for metadata generation
 * @returns The created coloring image or an error
 */
export async function createColoringImageFromReference(
  imageBase64: string,
  description?: string,
  locale: string = 'en',
  skipAuth: boolean = false,
): Promise<CreateFromImageResult> {
  let userId: string | null = null;

  if (skipAuth && process.env.NODE_ENV === 'development') {
    userId = 'dev-user';
  } else {
    userId = (await getUserId(ACTIONS.CREATE_COLORING_IMAGE)) ?? null;
  }

  if (!userId) {
    return { error: 'User not authenticated' };
  }

  // Dev-only: skip DB/tracking/uploads and just return the generated image
  if (skipAuth && process.env.NODE_ENV === 'development') {
    try {
      // eslint-disable-next-line no-console
      console.log('[ImageToColoring] Dev mode — generating image only...');

      const {
        url: imageUrl,
        imageBuffer,
        generationTimeMs,
      } = await generateColoringPageFromImage(imageBase64, description);

      // eslint-disable-next-line no-console
      console.log(
        `[ImageToColoring] Dev mode — generated in ${generationTimeMs}ms`,
      );

      // Return a minimal result with the image URL (stored in blob)
      return { url: imageUrl } as Partial<ColoringImage>;
    } catch (error) {
      console.error('[ImageToColoring] Dev mode failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Generation failed',
      };
    }
  }

  // Get language info for the locale
  const languageInfo = LOCALE_LANGUAGE_MAP[locale] || LOCALE_LANGUAGE_MAP.en;

  // Get active profile for difficulty setting
  const activeProfile = await getActiveProfile();
  const difficulty = activeProfile?.difficulty;

  // Get traced models for observability
  const tracedModels = getTracedModels({
    userId,
    properties: {
      action: 'image-to-coloring-generation',
      difficulty,
      hasSceneDescription: !!description,
    },
  });

  try {
    // eslint-disable-next-line no-console
    console.log(
      `[ImageToColoring] Starting generation from reference image${description ? ` with scene: "${description}"` : ''}...`,
    );

    // Step 1: Generate coloring image from reference image
    const {
      url: imageUrl,
      tempFileName,
      imageBuffer,
      generationTimeMs,
    } = await generateColoringPageFromImage(
      imageBase64,
      description,
      difficulty,
    );

    if (!imageUrl || !imageBuffer) {
      throw new Error('Failed to generate coloring image from reference');
    }

    // Track successful generation
    await trackWithUser(userId, TRACKING_EVENTS.IMAGE_GENERATION_COMPLETED, {
      model: 'gemini-3-pro-image',
      provider: 'google',
      generationTimeMs,
      promptLength: description?.length ?? 0,
      referenceImageCount: 1,
      success: true,
    });

    // Step 2: Run metadata, SVG trace, and WebP conversion in parallel
    const [metadataResult, svg, webpBuffer] = await Promise.all([
      // Generate metadata
      generateObject({
        model: tracedModels.vision,
        schema: imageMetadataSchema,
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

      // Trace image to SVG
      traceImage(imageBuffer),

      // Convert to WebP
      sharp(imageBuffer).webp().toBuffer(),
    ]);

    const imageMetadata = metadataResult.object;

    // eslint-disable-next-line no-console
    console.log('[ImageToColoring] Parallel processing complete:', {
      title: imageMetadata.title,
      svgLength: svg.length,
      webpSize: webpBuffer.length,
    });

    // Step 3: Create DB record
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

    // Step 4: Generate QR code
    const qrCodeSvg = await QRCode.toString(
      `https://chunkycrayon.com?utm_source=${coloringImage.id}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
      { type: 'svg' },
    );

    const qrCodeSvgBuffer = Buffer.from(qrCodeSvg);
    const imageSvgBuffer = Buffer.from(svg);

    // Step 5: Upload all files in parallel
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

    // Step 6: Update DB record with URLs
    const updatedColoringImage = await db.coloringImage.update({
      where: { id: coloringImage.id },
      data: {
        url: imageBlobUrl,
        svgUrl: imageSvgBlobUrl,
        qrCodeUrl: qrCodeSvgBlobUrl,
      },
    });

    // Clean up temporary file
    try {
      if (tempFileName) {
        await del(tempFileName);
      }
    } catch (error) {
      console.error('Error cleaning up temporary file:', error);
    }

    // eslint-disable-next-line no-console
    console.log(
      '[ImageToColoring] Complete! Created:',
      updatedColoringImage.id,
    );

    return updatedColoringImage;
  } catch (error) {
    // Track failed generation
    await trackWithUser(userId, TRACKING_EVENTS.IMAGE_GENERATION_FAILED, {
      model: 'gemini-3-pro-image',
      provider: 'google',
      generationTimeMs: 0,
      promptLength: description?.length ?? 0,
      referenceImageCount: 1,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[ImageToColoring] Failed:', error);

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate coloring image from reference',
    };
  }
}
