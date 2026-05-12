/**
 * Character portrait generation.
 *
 * The web app's createCharacter action INSERTs a Character row with
 * status=GENERATING and then fires this endpoint. We:
 *
 *   1. Call gpt-image-2 with the stored referenceSheetPrompt to produce a
 *      flat-coloured cartoon portrait on a plain white background. No QA
 *      retry loop: unlike bundles (where the same hero appears across 10
 *      pages and the QA gate guards visual continuity), a single-page
 *      character portrait either works on the first pass or the parent
 *      can retry via regenerateCharacterPortrait.
 *
 *   2. Run potrace on a thresholded grayscale version of the raster to
 *      produce the line-art twin. Same pipeline as the bundle persist
 *      traceImage helper, copied here so the worker module stays
 *      self-contained.
 *
 *   3. Upload both artefacts to R2 under
 *        uploads/characters/${characterId}/portrait.webp
 *        uploads/characters/${characterId}/portrait-line-art.svg
 *      …and flip the Character row to status=READY.
 *
 *   4. On any error: flip status=FAILED + failureReason so the parent UI
 *      (and the /dev/characters debug viewer) can offer a retry.
 *
 * Why two assets, not one:
 *   - The line-art SVG is what users see in the /characters grid + on a
 *     character's profile page. It composites cleanly with outfit overlays.
 *   - The colored webp is the canonical reference image piped into
 *     gpt-image-2 for scene generation (Phase 5). Line-art conditioning
 *     experiments may eventually let us drop one of these — for now we
 *     ship both so the choice stays open.
 */

import OpenAI from "openai";
import sharp from "sharp";
import potrace from "oslllo-potrace";
import { db, CharacterStatus } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";

const MODEL_ID = "gpt-image-2";
const SIZE = "1024x1024" as const;

/**
 * Trace the line-art twin from the colored raster. Mirrors
 * apps/chunky-crayon-worker/src/bundles/persist.ts::traceImage so the
 * line-art style matches what bundle pages produce.
 */
const traceLineArt = async (imageBuffer: Buffer): Promise<string> =>
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

export type GenerateCharacterPortraitOptions = {
  /** Character.id — used to scope R2 paths and update the row. */
  characterId: string;
  /** Full portrait prompt built by buildCharacterPortraitPrompt. */
  prompt: string;
  /**
   * QA-checkable signature features. Currently passed through to logs
   * only; if v1 character generation drifts, we'll add a per-character
   * QA gate that re-uses the bundle jury. Kept in the API so adding it
   * later doesn't require a worker-route shape change.
   */
  signatureDetails: readonly string[];
};

export type GenerateCharacterPortraitResult = {
  portraitUrl: string;
  portraitLineArtUrl: string;
};

/**
 * Generate the two portrait artefacts for one character and persist them.
 * Throws on OpenAI / R2 / potrace errors — the caller (Hono route handler)
 * catches and flips the Character row to FAILED with the error message.
 */
export const generateCharacterPortrait = async (
  options: GenerateCharacterPortraitOptions,
): Promise<GenerateCharacterPortraitResult> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI();

  console.log(
    `[character-portrait] ${options.characterId} — generating (signatureDetails=${options.signatureDetails.length})`,
  );
  const start = Date.now();

  // Single-shot generation. We do NOT pass `image` references here: the
  // portrait IS the reference. The prompt itself names every signature
  // detail verbatim (see lib/characters/portrait-prompt.ts).
  const result = await client.images.generate({
    model: MODEL_ID,
    prompt: options.prompt,
    size: SIZE,
    quality: "high",
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[character-portrait] gpt-image-2 done in ${elapsed}s`);

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("[character-portrait] gpt-image-2 returned no image");
  }
  const rawBuffer = Buffer.from(b64, "base64");

  // Convert to webp for storage (smaller, identical visual quality at
  // this size). Trace the line-art twin in parallel.
  const [webpBuffer, lineArtSvg] = await Promise.all([
    sharp(rawBuffer).webp({ quality: 90 }).toBuffer(),
    traceLineArt(rawBuffer),
  ]);

  // R2 paths — convention: uploads/characters/${id}/...
  const portraitPath = `uploads/characters/${options.characterId}/portrait.webp`;
  const lineArtPath = `uploads/characters/${options.characterId}/portrait-line-art.svg`;

  const [{ url: portraitUrl }, { url: portraitLineArtUrl }] = await Promise.all(
    [
      put(portraitPath, webpBuffer, {
        access: "public",
        contentType: "image/webp",
        allowOverwrite: true,
      }),
      put(lineArtPath, Buffer.from(lineArtSvg), {
        access: "public",
        contentType: "image/svg+xml",
        allowOverwrite: true,
      }),
    ],
  );

  await db.character.update({
    where: { id: options.characterId },
    data: {
      portraitUrl,
      portraitLineArtUrl,
      status: CharacterStatus.READY,
      failureReason: null,
    },
  });

  console.log(
    `[character-portrait] ${options.characterId} READY (${elapsed}s total)`,
  );

  return { portraitUrl, portraitLineArtUrl };
};
