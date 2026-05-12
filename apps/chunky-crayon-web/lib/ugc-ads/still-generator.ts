/**
 * Still generator — produces the two canonical images per persona via
 * Higgsfield, then mirrors them to our R2 so they survive past
 * Higgsfield's CDN TTL.
 *
 * Two functions, same module — both shell out to `runHiggsfield`:
 *
 *   generateCanonicalFace(handle, faceBrief)
 *     GPT Image 2, 9:16, 2k. Produces the persona's source-of-truth
 *     selfie. Used as identity reference for everything downstream
 *     (PFP variant, ad stills via Nano Banana Pro identity-locked).
 *
 *   generatePfp(handle, faceBrief, faceStillUrl)
 *     Nano Banana Pro with the face still passed as identity reference.
 *     Different shot (square framing, different outfit/setting) so a
 *     reverse-image-search of the PFP doesn't hit the ad video stills.
 *
 * Both return the **R2** public URL (not the Higgsfield URL). Callers
 * persist that on `Persona.faceStillUrl` / `Persona.pfpUrl`.
 *
 * Realism prompt structure is the one that won the side-by-side bake-off
 * (GPT Image 2 + explicit imperfections + named-camera + "NOT a beauty
 * shot" negatives). The FaceBrief schema already enforces the inputs;
 * this module composes them into the final prompt string.
 */

import { put } from '@one-colored-pixel/storage';
import type { FaceBrief } from './types';
import { personaStoragePaths } from './storage';
import { runHiggsfield } from './higgsfield';

// ─────────────────────────────────────────────────────────────────────
// Prompt composition
// ─────────────────────────────────────────────────────────────────────

/**
 * Build the GPT Image 2 prompt for the canonical face still. Embeds the
 * persona's explicit imperfections + named-camera + negatives — these
 * are the moves that broke the AI-sheen in our test.
 */
function composeCanonicalFacePrompt(brief: FaceBrief): string {
  return [
    `Selfie photo, front camera of an iPhone 13, taken by a ${brief.ageRange} ${brief.ethnicity} ${brief.profession} in ${brief.city}.`,
    `Morning, ${brief.lightingNotes}.`,
    `Skin: ${brief.skinDescription}.`,
    `Hair: ${brief.hairDescription}.`,
    `Wearing: ${brief.clothing}.`,
    `She is smiling warmly at the camera, holding her phone in selfie mode.`,
    `Background: ${brief.kitchenStyle}.`,
    `Vertical 9:16 framing. Slight motion blur from the handheld phone. Faint JPEG compression artifacts. Slightly out of focus in the corners.`,
    `This is a casual snapshot, not a beauty shot, not a product photo, not a professional portrait.`,
    ...brief.doNotInclude.map((n) => `Do not include: ${n}.`),
  ].join(' ');
}

/**
 * Build the Nano Banana Pro prompt for the PFP variant. The face still
 * is passed via `--image` so identity locks; this prompt only describes
 * what's DIFFERENT — different shot, different outfit, different
 * background — so the resulting image cannot be reverse-image-search
 * matched to the ad-video still while still being recognizably her.
 */
function composePfpPrompt(brief: FaceBrief): string {
  return [
    `Square 1:1 social media profile picture of the same woman from the reference image.`,
    `Outdoor portrait, soft natural sun on her face, slight squint from the light.`,
    `Different outfit from the reference: casual oversized sweater in a different color, hair down loose around her shoulders (not the bun from the reference).`,
    `Friendly half-smile, looking just past camera, candid feel.`,
    `Out-of-focus city street background, suggestion of trees but not specific landmarks.`,
    `Skin: ${brief.skinDescription}. Identity must match the reference image (same face, same ethnicity, same age range).`,
    `Casual snapshot quality, slight JPEG compression, this is a profile picture a real person would post.`,
    `Do not include: glossy retouched skin. Do not include: studio lighting. Do not include: any kitchen or indoor setting. Do not include: the coloring page or any paper.`,
  ].join(' ');
}

// ─────────────────────────────────────────────────────────────────────
// R2 mirror helper — fetch from Higgsfield CDN, upload to our R2.
// Important because Higgsfield URLs are CDN-cached but not promised to
// persist; our R2 is the system of record for persona assets.
// ─────────────────────────────────────────────────────────────────────

async function mirrorToR2(
  higgsfieldUrl: string,
  r2Path: string,
): Promise<string> {
  const res = await fetch(higgsfieldUrl);
  if (!res.ok) {
    throw new Error(
      `[ugc-still] failed to download higgsfield asset ${higgsfieldUrl}: ${res.status}`,
    );
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const { url } = await put(r2Path, buffer, {
    access: 'public',
    contentType: 'image/png',
    // Persona stills are immutable per-persona; overwrite-allowed handles
    // the case where the operator re-runs the launch script during dev.
    allowOverwrite: true,
  });
  return url;
}

// ─────────────────────────────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────────────────────────────

export type CanonicalFaceResult = {
  /** Public R2 URL of the still. Source-of-truth identity image. */
  r2Url: string;
  /** Higgsfield job id, kept for debugging / cost auditing. */
  higgsfieldJobId: string;
  /** The composed prompt actually sent (logged on the persona row's notes). */
  prompt: string;
};

/**
 * Generate the persona's canonical face still via Higgsfield GPT Image 2.
 * 9:16, 2k, no input image (text-only). Cost ≈ 15 credits.
 */
export async function generateCanonicalFace(
  handle: string,
  brief: FaceBrief,
): Promise<CanonicalFaceResult> {
  const prompt = composeCanonicalFacePrompt(brief);
  const job = await runHiggsfield({
    model: 'gpt_image_2',
    prompt,
    params: {
      aspect_ratio: '9:16',
      quality: 'high',
      resolution: '2k',
    },
    waitTimeout: '10m',
  });

  const paths = personaStoragePaths(handle);
  const r2Url = await mirrorToR2(job.resultUrl, paths.faceStill);

  return { r2Url, higgsfieldJobId: job.id, prompt };
}

export type PfpResult = {
  r2Url: string;
  higgsfieldJobId: string;
  prompt: string;
};

/**
 * Generate the PFP variant via Nano Banana Pro, conditioned on the
 * canonical face still as identity reference. The face URL must be
 * publicly fetchable (Higgsfield uploads it before passing).
 *
 * Pass the R2 URL of the face still (NOT a local path) — Higgsfield's CLI
 * uploads paths but mirrors URLs via download. R2 is faster.
 *
 * Cost ≈ 10 credits.
 */
export async function generatePfp(
  handle: string,
  brief: FaceBrief,
  faceStillR2Url: string,
): Promise<PfpResult> {
  const prompt = composePfpPrompt(brief);

  // Download the face still to a tmp path so the CLI can pass it as
  // `--image`. (The CLI's URL-as-arg behavior isn't well documented;
  // local-path-then-CLI-uploads is the safer shape.)
  const tmpFacePath = await downloadToTmp(faceStillR2Url, 'png');

  const job = await runHiggsfield({
    model: 'nano_banana_2',
    prompt,
    media: { image: tmpFacePath },
    params: {
      aspect_ratio: '1:1',
      // 1k not 2k — Google Vision Web Detection caps content at 10MB and
      // Nano Banana Pro at 2k routinely exceeds it. TikTok PFPs render
      // at 200×200 so the higher resolution buys us nothing visible.
      resolution: '1k',
    },
    waitTimeout: '10m',
  });

  const paths = personaStoragePaths(handle);
  const r2Url = await mirrorToR2(job.resultUrl, paths.pfp);

  return { r2Url, higgsfieldJobId: job.id, prompt };
}

// ─────────────────────────────────────────────────────────────────────
// Small util — download a URL to a tmp file, return its path.
// Kept private; used so we can hand the Higgsfield CLI a local path
// (its supported input mode) without re-implementing the upload step.
// ─────────────────────────────────────────────────────────────────────

async function downloadToTmp(url: string, ext: string): Promise<string> {
  const { writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { randomUUID } = await import('node:crypto');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `[ugc-still] tmp download failed for ${url}: ${res.status}`,
    );
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const path = join(tmpdir(), `ugc-still-${randomUUID()}.${ext}`);
  await writeFile(path, buffer);
  return path;
}
