/**
 * Persistence pipeline for a freshly-generated coloring-image buffer.
 *
 * Extracted from `app/actions/coloring-image.ts:generateColoringImageWithMetadata`
 * (steps 3-6) so it can be reused by:
 *   - the existing server-action create path (text variant, server-action shape)
 *   - the new SSE streaming route handler (cannot use 'use server' actions
 *     inside a route handler that returns a streaming Response)
 *
 * Given:
 *   - the raw PNG/WebP buffer that just came back from OpenAI (or any
 *     image gen provider that returns a buffer),
 *   - the user's description for sourcePrompt + metadata-prompt context,
 *   - the user + profile + locale + generationType context,
 * does:
 *   - metadata gen (Claude/GPT-5 vision) -> title/alt/tags/description
 *   - SVG trace (potrace via traceImage util)
 *   - WebP conversion (sharp)
 *   - DB row create
 *   - QR code render + upload
 *   - WebP + SVG + QR upload to R2
 *   - DB row update with R2 URLs
 *
 * Returns the persisted coloring-image row (with url/svgUrl/qrCodeUrl set).
 *
 * Does NOT do:
 *   - credit debit (caller's responsibility)
 *   - description cleanup or initial image gen (caller has already done these)
 *   - derived-asset pipeline kickoff (caller's responsibility, e.g.
 *     `requestAllPipelineFromWorker(result.id)` after we return)
 *   - tracking events (caller does these in `after()`)
 */
import { put } from '@one-colored-pixel/storage';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { generateText, Output } from 'ai';
import {
  getTracedModels,
  createImageMetadataSystemPrompt,
  IMAGE_METADATA_PROMPT,
  imageMetadataSchema,
} from '@/lib/ai';
import { db, GenerationType } from '@one-colored-pixel/db';
import { traceImage } from '@/utils/traceImage';

const LOCALE_LANGUAGE_MAP: Record<
  string,
  { name: string; nativeName: string }
> = {
  en: { name: 'English', nativeName: 'English' },
  fr: { name: 'French', nativeName: 'Français' },
  de: { name: 'German', nativeName: 'Deutsch' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  es: { name: 'Spanish', nativeName: 'Español' },
};

export type PersistColoringImageOptions = {
  /** Raw image buffer from the provider (PNG bytes typical for gpt-image-2). */
  imageBuffer: Buffer;
  /**
   * Original user-supplied description, used as sourcePrompt. Empty
   * string is allowed — for photo mode the kid uploaded a picture and
   * never wrote a description; we leave sourcePrompt null in that case
   * (the AI vision metadata pass produces title/alt/tags from the image).
   */
  description: string;
  /** Authenticated user id (always present for user-facing flows). */
  userId: string;
  /** Active profile id (drives difficulty + ownership). Optional. */
  profileId?: string | null;
  generationType?: GenerationType;
  locale?: string;
  /** stable key for system-purpose images (ad campaigns etc.). */
  purposeKey?: string;
  /** PostHog distinct id for analytics, threaded through tracedModels. */
  clientDistinctId?: string;
};

export const persistGeneratedColoringImage = async ({
  imageBuffer,
  description,
  userId,
  profileId,
  generationType = GenerationType.USER,
  locale = 'en',
  purposeKey,
  clientDistinctId,
}: PersistColoringImageOptions) => {
  const languageInfo = LOCALE_LANGUAGE_MAP[locale] ?? LOCALE_LANGUAGE_MAP.en;

  const tracedModels = getTracedModels({
    userId,
    properties: {
      action: 'coloring-image-generation',
      ...(clientDistinctId ? { clientDistinctId } : {}),
    },
  });

  // Run metadata, SVG trace, WebP conversion in parallel — same shape as
  // the existing action. ~2-3s saved vs sequential.
  const [metadataResult, svg, webpBuffer] = await Promise.all([
    // Metadata needs an HTTP-fetchable image. Pass the buffer as a data
    // URL so we don't have to upload-then-fetch — saves a network round
    // trip vs the legacy path.
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
            {
              type: 'image',
              image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
            },
          ],
        },
      ],
    }),
    traceImage(imageBuffer),
    sharp(imageBuffer).webp().toBuffer(),
  ]);

  const imageMetadata = metadataResult.output!;
  console.log('[Persist] metadata + trace + webp done:', {
    title: imageMetadata.title,
    svgLength: svg.length,
    webpSize: webpBuffer.length,
  });

  // Create the row — needs metadata.
  const coloringImage = await db.coloringImage.create({
    data: {
      title: imageMetadata.title,
      description: imageMetadata.description,
      alt: imageMetadata.alt,
      tags: imageMetadata.tags,
      generationType,
      userId,
      profileId: profileId ?? undefined,
      sourcePrompt: description || undefined,
      purposeKey: purposeKey || undefined,
    },
  });

  // QR code (needs the row id).
  const qrCodeSvg = await QRCode.toString(
    `https://chunkycrayon.com?utm_source=${coloringImage.id}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
    { type: 'svg' },
  );
  const qrCodeSvgBuffer = Buffer.from(qrCodeSvg);
  const imageSvgBuffer = Buffer.from(svg);

  // Parallel R2 uploads.
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

  return updatedColoringImage;
};
