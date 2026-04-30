/**
 * Worker-side persistence for a freshly-generated coloring-image buffer.
 *
 * Ported from `apps/chunky-crayon-web/lib/coloring-image/persist.ts`. The
 * canvas-as-loader pipeline runs the OpenAI stream + persist on the worker
 * so the final R2 upload + DB UPDATE can be `pg_notify`'d immediately to
 * any browser SSE listeners — avoiding the 0-30s lag a Vercel-cron handoff
 * would introduce.
 *
 * Differences from the Vercel version:
 *   - UPDATEs the existing row (status=GENERATING) rather than INSERTing
 *     a new one. Row is already created by `createPendingColoringImage` on
 *     Vercel before the worker job starts.
 *   - Skips PostHog tracing — worker has no PostHog client wired up yet.
 *     `withAITracing` short-circuits cleanly when given a null client.
 *   - Inlines the metadata schema + prompt instead of reaching into the
 *     web app's `lib/ai`. The prompt is short and stable; duplicating
 *     beats coupling worker → web.
 *   - `traceImage` is inlined (sharp + potrace pipeline). The web app's
 *     full `traceImage` util has Playwright + Sentry validation paths used
 *     only by an admin retrace flow — worker doesn't need them.
 *
 * Does NOT do (caller's responsibility):
 *   - Credit debit / refund (handled on Vercel before/after the job)
 *   - Derived-asset pipeline kickoff (region store, colored ref, ambient
 *     music) — those are existing worker endpoints called separately
 *   - SSE event emission — caller does `pg_notify` after this returns
 */
import { put } from "@one-colored-pixel/storage";
import { db } from "@one-colored-pixel/db";
import { getTracedModels } from "@one-colored-pixel/coloring-core";
import { generateText, Output } from "ai";
import { z } from "zod";
import sharp from "sharp";
import potrace from "oslllo-potrace";
import QRCode from "qrcode";

// ---------------------------------------------------------------------------
// Inlined metadata schema + prompt (kept in sync with chunky-crayon-web)
// ---------------------------------------------------------------------------

const imageMetadataSchema = z.object({
  title: z.string().describe("SEO-friendly title for the coloring page"),
  description: z
    .string()
    .describe("Brief description of the image for SEO purposes"),
  alt: z.string().describe("Accessible alt text for the image"),
  tags: z
    .array(z.string())
    .describe("Relevant tags/keywords for categorization"),
});

const createImageMetadataSystemPrompt = (
  targetLanguage?: string,
  nativeName?: string,
): string => {
  const languageInstruction =
    targetLanguage && targetLanguage !== "English"
      ? `

IMPORTANT LANGUAGE REQUIREMENT:
- The "title" field MUST be in ${targetLanguage} (${nativeName}) - use natural, child-friendly expressions
- The "description", "alt", and "tags" fields MUST remain in English for consistency and filtering
- Only translate the title, nothing else`
      : "";

  return `You are an assistant that generates metadata for images to be used for SEO and accessibility. The metadata should include a title, a description, and an alt text for the image alt attribute. The information should be concise, relevant to the image, and suitable for children aged 3-8.${languageInstruction}`;
};

const IMAGE_METADATA_PROMPT = `Generate metadata for the generated image based on the following image:`;

const LOCALE_LANGUAGE_MAP: Record<
  string,
  { name: string; nativeName: string }
> = {
  en: { name: "English", nativeName: "English" },
  fr: { name: "French", nativeName: "Français" },
  de: { name: "German", nativeName: "Deutsch" },
  nl: { name: "Dutch", nativeName: "Nederlands" },
  es: { name: "Spanish", nativeName: "Español" },
};

// ---------------------------------------------------------------------------
// PNG → SVG via sharp + potrace. Same params as Vercel's traceImage.
// ---------------------------------------------------------------------------

const traceImage = async (imageBuffer: Buffer): Promise<string> =>
  new Promise((resolve, reject) => {
    sharp(imageBuffer)
      .flatten({ background: "#ffffff" })
      .resize({ width: 1024 })
      .grayscale()
      .normalize()
      .linear(1.3, -40)
      .threshold(210)
      .toFormat("png")
      .toBuffer(async (err, pngBuffer) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          const traced = await potrace(Buffer.from(pngBuffer), {
            threshold: 200,
            optimizeImage: true,
            turnPolicy: "majority",
          }).trace();
          resolve(traced);
        } catch (traceErr) {
          reject(
            traceErr instanceof Error ? traceErr : new Error(String(traceErr)),
          );
        }
      });
  });

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type PersistColoringImageOptions = {
  /** id of the existing GENERATING row that this final image belongs to. */
  coloringImageId: string;
  /** Raw final image buffer from OpenAI (PNG bytes for gpt-image-2). */
  imageBuffer: Buffer;
  /**
   * Original user-supplied description, written to sourcePrompt. Empty
   * string means photo mode (no description) — sourcePrompt stays unset.
   */
  description: string;
  locale?: string;
  /**
   * Brand for the QR code utm_source URL. CC and CH need different
   * landing domains; passed in by caller from row.brand.
   */
  brand: "CHUNKY_CRAYON" | "COLORING_HABITAT";
};

const QR_LANDING_BY_BRAND: Record<string, string> = {
  CHUNKY_CRAYON: "https://chunkycrayon.com",
  COLORING_HABITAT: "https://coloringhabitat.com",
};

/**
 * Run metadata + trace + WebP conversion in parallel, then push everything
 * to R2 in parallel, then UPDATE the row to status=READY with all the URLs.
 *
 * Returns the updated row.
 */
export const persistGeneratedColoringImage = async ({
  coloringImageId,
  imageBuffer,
  description,
  locale = "en",
  brand,
}: PersistColoringImageOptions) => {
  const languageInfo = LOCALE_LANGUAGE_MAP[locale] ?? LOCALE_LANGUAGE_MAP.en;

  // No PostHog client on worker yet — withAITracing short-circuits, returns
  // raw model. Wire PostHog later if/when we want worker-side observability.
  const tracedModels = getTracedModels(null);

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
          role: "user",
          content: [
            { type: "text", text: IMAGE_METADATA_PROMPT },
            {
              type: "image",
              image: `data:image/png;base64,${imageBuffer.toString("base64")}`,
            },
          ],
        },
      ],
    }),
    traceImage(imageBuffer),
    sharp(imageBuffer).webp().toBuffer(),
  ]);

  const imageMetadata = metadataResult.output;
  if (!imageMetadata) {
    throw new Error("[persist] image metadata generation returned no output");
  }
  console.log("[persist] metadata + trace + webp done:", {
    coloringImageId,
    title: imageMetadata.title,
    svgLength: svg.length,
    webpSize: webpBuffer.length,
  });

  const qrLanding =
    QR_LANDING_BY_BRAND[brand] ?? QR_LANDING_BY_BRAND.CHUNKY_CRAYON;
  const qrCodeSvg = await QRCode.toString(
    `${qrLanding}?utm_source=${coloringImageId}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
    { type: "svg" },
  );
  const qrCodeSvgBuffer = Buffer.from(qrCodeSvg);
  const imageSvgBuffer = Buffer.from(svg);

  const imageFileName = `uploads/coloring-images/${coloringImageId}/image.webp`;
  const svgFileName = `uploads/coloring-images/${coloringImageId}/image.svg`;
  const qrCodeFileName = `uploads/coloring-images/${coloringImageId}/qr-code.svg`;

  const [
    { url: imageBlobUrl },
    { url: imageSvgBlobUrl },
    { url: qrCodeSvgBlobUrl },
  ] = await Promise.all([
    put(imageFileName, webpBuffer, { access: "public" }),
    put(svgFileName, imageSvgBuffer, { access: "public" }),
    put(qrCodeFileName, qrCodeSvgBuffer, { access: "public" }),
  ]);

  // UPDATE the existing GENERATING row → READY. The row was created by
  // createPendingColoringImage on Vercel; we're only filling in the bits
  // that needed the final image + the AI-derived metadata.
  //
  // NOTE: `sourcePrompt` is intentionally NOT overwritten here. Vercel
  // sets it at row creation to a short kid-friendly subject (via the
  // quick-title pass), which feeds the streaming-page heading and Colo's
  // voiceover script. Overwriting with the full `description` here was
  // a bug — it replaced "a diving elephant" with the verbose voice
  // transcript like "An elephant diving into a pool. He's wearing
  // goggles." Title gets the long SEO version, sourcePrompt stays kid-
  // pronounceable.
  const updated = await db.coloringImage.update({
    where: { id: coloringImageId },
    data: {
      title: imageMetadata.title,
      description: imageMetadata.description,
      alt: imageMetadata.alt,
      tags: imageMetadata.tags,
      url: imageBlobUrl,
      svgUrl: imageSvgBlobUrl,
      qrCodeUrl: qrCodeSvgBlobUrl,
      status: "READY",
      streamingPartialUrl: null,
    },
  });

  return updated;
};
