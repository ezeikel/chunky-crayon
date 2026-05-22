/**
 * Character portrait generation — two assets, two gpt-image-2 calls.
 *
 * The web app's createCharacter action INSERTs a Character row with
 * status=GENERATING and fires this endpoint. We:
 *
 *   1. Line-art call — `images.generate` with the line-art prompt
 *      produces a clean black-and-white coloring-book outline. This is
 *      the canonical asset: the coloring-page pipeline conditions on it
 *      when the character appears in a scene.
 *
 *   2. Colored call — `images.edit` with the line-art raster from step
 *      1 fed back as the reference `image`, plus the coloring prompt
 *      ("color this in, warm Chunky Crayon recipe"). Because the
 *      colored portrait is drawn ON the exact line-art, the two assets
 *      are guaranteed to match — same pose, proportions, details.
 *
 *   3. Upload both to R2 under
 *        uploads/characters/${characterId}/portrait-line-art.webp
 *        uploads/characters/${characterId}/portrait.webp
 *      …and flip the Character row to status=READY.
 *
 *   4. On any error: flip status=FAILED + failureReason so the parent UI
 *      (and the /dev/characters debug viewer) can offer a retry.
 *
 * No QA retry loop: a single-page character portrait either works on the
 * first pass or the parent retries via regenerateCharacterPortrait.
 *
 * Why two assets:
 *   - portraitLineArtUrl — the coloring-page reference (line-art
 *     conditioning yields cleaner pages than colored conditioning).
 *   - portraitUrl — the colored illustration shown in the /characters
 *     grid + cockpit. The kid's actual orange dragon.
 *
 * (Previously this generated one raster and `potrace`-traced a line-art
 * twin from it. That made both assets line-art and never produced a
 * real colored version — see the portrait-prompt.ts history.)
 */

import OpenAI from "openai";
import sharp from "sharp";
import { db, CharacterStatus } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";

const MODEL_ID = "gpt-image-2";
const SIZE = "1024x1024" as const;

export type GenerateCharacterPortraitOptions = {
  /** Character.id — used to scope R2 paths and update the row. */
  characterId: string;
  /** Prompt for call 1 — the clean line-art portrait. */
  lineArtPrompt: string;
  /** Prompt for call 2 — colour in the line-art (warm brand recipe). */
  coloringPrompt: string;
  /**
   * QA-checkable signature features. Currently passed through to logs
   * only; if character generation drifts we'll add a per-character QA
   * gate reusing the bundle jury. Kept in the API so adding it later
   * needs no worker-route shape change.
   */
  signatureDetails: readonly string[];
};

export type GenerateCharacterPortraitResult = {
  portraitUrl: string;
  portraitLineArtUrl: string;
};

/** Decode a gpt-image-2 b64 result to a raw PNG buffer. */
const decodeImage = (
  result: OpenAI.Images.ImagesResponse,
  label: string,
): Buffer => {
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`[character-portrait] ${label} returned no image`);
  }
  return Buffer.from(b64, "base64");
};

/**
 * Generate the two portrait artefacts for one character and persist them.
 * Throws on OpenAI / R2 errors — the caller (Hono route handler) catches
 * and flips the Character row to FAILED with the error message.
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

  // ── Call 1: line-art ──────────────────────────────────────────────
  const lineArtResult = await client.images.generate({
    model: MODEL_ID,
    prompt: options.lineArtPrompt,
    size: SIZE,
    quality: "high",
  });
  const lineArtRaw = decodeImage(lineArtResult, "line-art");
  const lineArtElapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[character-portrait] ${options.characterId} line-art done in ${lineArtElapsed}s`,
  );

  // ── Call 2: colour in the line-art ────────────────────────────────
  // The line-art raster is the reference image. gpt-image-2's
  // `images.edit` colours inside the existing outline (same pattern as
  // coloring-image/jobs.ts). PNG so the model gets the cleanest input.
  const lineArtFile = new File([new Uint8Array(lineArtRaw)], "line-art.png", {
    type: "image/png",
  });
  const coloredResult = await client.images.edit({
    model: MODEL_ID,
    image: [lineArtFile],
    prompt: options.coloringPrompt,
    size: SIZE,
    quality: "high",
  });
  const coloredRaw = decodeImage(coloredResult, "colored");
  const totalElapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[character-portrait] ${options.characterId} colored done (${totalElapsed}s total)`,
  );

  // Convert both to webp for storage (smaller, identical visual quality
  // at this size).
  const [lineArtWebp, coloredWebp] = await Promise.all([
    sharp(lineArtRaw).webp({ quality: 90 }).toBuffer(),
    sharp(coloredRaw).webp({ quality: 90 }).toBuffer(),
  ]);

  // R2 paths — convention: uploads/characters/${id}/...
  const lineArtPath = `uploads/characters/${options.characterId}/portrait-line-art.webp`;
  const portraitPath = `uploads/characters/${options.characterId}/portrait.webp`;

  const [{ url: portraitLineArtUrl }, { url: portraitUrl }] = await Promise.all(
    [
      put(lineArtPath, lineArtWebp, {
        access: "public",
        contentType: "image/webp",
        allowOverwrite: true,
      }),
      put(portraitPath, coloredWebp, {
        access: "public",
        contentType: "image/webp",
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
    `[character-portrait] ${options.characterId} READY (${totalElapsed}s total)`,
  );

  return { portraitUrl, portraitLineArtUrl };
};
