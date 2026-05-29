/**
 * Shared lean image-generation pipeline for SEO backfill scripts.
 *
 * Both backfill-landings.ts and backfill-combo-pages.ts ran the same
 * sequence (gpt-image-2 with reference style anchoring → sharp WebP →
 * potrace SVG trace → QR code → R2 uploads). This module is the
 * consolidated version.
 *
 * Scope (deliberately narrow):
 *   - Produces image buffers + uploads to R2
 *   - Returns the URLs needed for the DB row
 *   - DOES NOT write to the DB — callers do that with their own row
 *     metadata (tags, generationType, purposeKey, sourcePrompt etc.)
 *
 * This stays a "lean" pipeline — no region store, no music, no colored
 * reference, no fill points. Keeps the cost at ~$0.006/image at gpt-image-2
 * low quality. The live daily/user generation paths in the worker remain
 * the One True Pipeline for full-fat images.
 *
 * Not consolidated in here (intentionally):
 *   - The worker's daily-pipeline.ts — streams partials, owns region store
 *   - The web app's utils/traceImage.ts — used by photo-to-coloring
 *   - DB row creation — each backfill has its own metadata contract
 */

import OpenAI from "openai";
import sharp from "sharp";
import QRCode from "qrcode";
import potrace from "oslllo-potrace";
import { put } from "@one-colored-pixel/storage";
import { getReferenceImages } from "../coloring-image/references";
import type { Difficulty } from "../image-providers";

const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_SIZE: "1024x1024" = "1024x1024";
const DEFAULT_QUALITY: "low" | "medium" | "high" = "low";

export type BackfillImageInput = {
  /** Scene description for the prompt. */
  description: string;
  /** Difficulty drives the reference-image pack used as style anchor. */
  difficulty: Difficulty;
  /** Stable row id used as the R2 path prefix and QR-code utm_source. */
  rowId: string;
  /** Optional overrides. */
  options?: {
    model?: string;
    size?: "1024x1024";
    quality?: "low" | "medium" | "high";
  };
};

export type BackfillImageOutput = {
  url: string;
  svgUrl: string;
  qrCodeUrl: string;
};

const generateImageBuffer = async (
  openai: OpenAI,
  description: string,
  difficulty: Difficulty,
  options: BackfillImageInput["options"],
): Promise<Buffer> => {
  const refUrls = getReferenceImages(difficulty).slice(0, 4);
  const refFiles = await Promise.all(
    refUrls.map(async (url, i) => {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const ext = url.endsWith(".webp") ? "webp" : "png";
      return new File([new Uint8Array(arrayBuffer)], `style-ref-${i}.${ext}`, {
        type: `image/${ext}`,
      });
    }),
  );

  const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.

Scene: ${description}.

Style: children's coloring book page, clean line art, thick black outlines on a pure white background. Cartoon style, friendly faces, large simple shapes. Every enclosed shape left completely white and unfilled. Outlines must be closed contours with no gaps. No shading, no gradients, no fill.`;

  const result = await openai.images.edit({
    model: options?.model ?? DEFAULT_MODEL,
    image: refFiles,
    prompt: styledPrompt,
    size: options?.size ?? DEFAULT_SIZE,
    quality: options?.quality ?? DEFAULT_QUALITY,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image data");
  return Buffer.from(b64, "base64");
};

const traceImageBufferToSvg = (imageBuffer: Buffer): Promise<string> =>
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
        if (err) return reject(err);
        try {
          const traced = await potrace(Buffer.from(pngBuffer), {
            threshold: 200,
            optimizeImage: true,
            turnPolicy: "majority",
          }).trace();
          resolve(traced);
        } catch (potraceErr) {
          reject(potraceErr);
        }
      });
  });

/**
 * Generate one coloring image and upload its assets to R2.
 *
 * Caller is responsible for:
 *   - Creating the DB row first (so `rowId` is stable and the QR can
 *     reference the canonical URL)
 *   - Updating the row with the returned URLs after this resolves
 *   - Setting tags, generationType, purposeKey, sourcePrompt etc.
 *
 * Throws if OpenAI returns no image data or R2 upload fails. Callers
 * should treat each call as fallible and log + skip on error.
 */
export const generateAndStoreColoringImage = async (
  openai: OpenAI,
  input: BackfillImageInput,
): Promise<BackfillImageOutput> => {
  const { description, difficulty, rowId, options } = input;

  const imageBuffer = await generateImageBuffer(
    openai,
    description,
    difficulty,
    options,
  );

  const [svg, webpBuffer] = await Promise.all([
    traceImageBufferToSvg(imageBuffer),
    sharp(imageBuffer).webp().toBuffer(),
  ]);

  const qrSvg = await QRCode.toString(
    `https://chunkycrayon.com?utm_source=${rowId}&utm_medium=pdf-qr-code&utm_campaign=coloring-image-pdf`,
    { type: "svg" },
  );

  const baseDir = `uploads/coloring-images/${rowId}`;
  const [
    { url: imageBlobUrl },
    { url: imageSvgBlobUrl },
    { url: qrCodeSvgBlobUrl },
  ] = await Promise.all([
    put(`${baseDir}/image.webp`, webpBuffer, { access: "public" }),
    put(`${baseDir}/image.svg`, Buffer.from(svg), { access: "public" }),
    put(`${baseDir}/qr-code.svg`, Buffer.from(qrSvg), { access: "public" }),
  ]);

  return {
    url: imageBlobUrl,
    svgUrl: imageSvgBlobUrl,
    qrCodeUrl: qrCodeSvgBlobUrl,
  };
};
