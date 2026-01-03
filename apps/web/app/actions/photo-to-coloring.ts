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
  generateColoringPageFromPhoto,
} from '@/lib/ai';
import { ACTIONS, TRACKING_EVENTS } from '@/constants';
import { trackWithUser, track } from '@/utils/analytics-server';
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

type CreateFromPhotoResult = Partial<ColoringImage> | { error: string };

const isErrorResult = (
  result: CreateFromPhotoResult,
): result is { error: string } => 'error' in result;

/**
 * Generate a coloring image directly from a user's photo.
 *
 * This bypasses the description step and uses the photo as a reference
 * to create a coloring page that closely matches the original.
 *
 * @param photoBase64 - The photo as a base64 string
 * @param locale - Optional locale for metadata generation
 * @returns The created coloring image or an error
 */
export async function createColoringImageFromPhoto(
  photoBase64: string,
  locale: string = 'en',
): Promise<CreateFromPhotoResult> {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);

  if (!userId) {
    return { error: 'User not authenticated' };
  }

  // Get language info for the locale
  const languageInfo = LOCALE_LANGUAGE_MAP[locale] || LOCALE_LANGUAGE_MAP.en;

  // Get active profile for difficulty setting
  const activeProfile = await getActiveProfile();
  const difficulty = activeProfile?.difficulty;

  // Get traced models for observability
  const tracedModels = getTracedModels({
    userId,
    properties: { action: 'photo-to-coloring-generation', difficulty },
  });

  try {
    // eslint-disable-next-line no-console
    console.log('[PhotoToColoring] Starting generation from photo...');

    // Step 1: Generate coloring image directly from photo
    const {
      url: imageUrl,
      tempFileName,
      imageBuffer,
      generationTimeMs,
    } = await generateColoringPageFromPhoto(photoBase64, difficulty);

    if (!imageUrl || !imageBuffer) {
      throw new Error('Failed to generate coloring image from photo');
    }

    // Track successful generation
    await trackWithUser(userId, TRACKING_EVENTS.IMAGE_GENERATION_COMPLETED, {
      model: 'gemini-3-pro-image',
      provider: 'google',
      generationTimeMs,
      promptLength: 0, // Photo-based, no text prompt
      referenceImageCount: 1, // The user's photo
      success: true,
    });

    // Step 2: Run metadata, SVG trace, and WebP conversion in parallel
    const [metadataResult, svg, webpBuffer] = await Promise.all([
      // Generate metadata
      generateObject({
        model: tracedModels.textFast,
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
    console.log('[PhotoToColoring] Parallel processing complete:', {
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
      '[PhotoToColoring] Complete! Created:',
      updatedColoringImage.id,
    );

    return updatedColoringImage;
  } catch (error) {
    // Track failed generation
    await trackWithUser(userId, TRACKING_EVENTS.IMAGE_GENERATION_FAILED, {
      model: 'gemini-3-pro-image',
      provider: 'google',
      generationTimeMs: 0,
      promptLength: 0, // Photo-based, no text prompt
      referenceImageCount: 1, // The user's photo
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    console.error('[PhotoToColoring] Failed:', error);

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate coloring image from photo',
    };
  }
}
