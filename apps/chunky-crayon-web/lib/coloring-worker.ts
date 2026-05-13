/**
 * Shared worker-dispatch primitives for coloring-image generation.
 *
 * Both flows that kick off a gen — the user-facing
 * `createPendingColoringImage` action and the comment-request action driven
 * by IG/FB `#drawthis` comments — POST the same `/jobs/coloring-image/start`
 * endpoint with the same body shape. This file owns that contract so the
 * two callers can't drift.
 *
 * What lives here:
 *   - WorkerBody type + postToWorker HTTP dispatch
 *   - buildTextModeWorkerBody — assembles prompt + reference image list for
 *     text-mode generations. Photo mode stays inline in
 *     createPendingColoringImage because it's the only photo caller and
 *     pulls inline base64 from the form.
 *
 * What does NOT live here:
 *   - Credit debit/refund (user-flow only)
 *   - Character resolution (user-flow only — comment-requests are
 *     anonymous, no character)
 *   - CAPI Lead fires (user-flow only)
 *   - GENERATING row creation (callers do this so they can attach
 *     flow-specific metadata: userId/profileId/sourcePrompt for the user
 *     action, generationType=COMMENT_REQUEST for comment-requests)
 */
import type { Brand } from '@one-colored-pixel/db';
import { type ImageQuality } from '@one-colored-pixel/coloring-core/image-quality';
import { REFERENCE_IMAGES, prompts } from '@/lib/ai';
import { buildCharacterAwareColoringPrompt } from '@/lib/ai/character-aware-prompts';

export type WorkerBody = {
  coloringImageId: string;
  prompt: string;
  description: string;
  locale: string;
  brand: Brand;
  /** Worker refunds this on FAILED. 0 for guest and comment-request flows. */
  creditCost: number;
  referenceImageUrls?: string[];
  imagesInline?: { b64: string; ext: 'png' | 'jpeg' | 'webp' }[];
  size: '1024x1024';
  quality: ImageQuality;
  partialImages: 3;
};

/**
 * Fire-and-forget POST to the worker. Throws on non-2xx so the caller can
 * flip its GENERATING row to FAILED. The worker drives the rest of the
 * pipeline (OpenAI stream, R2 upload, region store) async.
 */
export async function postToWorker(body: WorkerBody): Promise<void> {
  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    throw new Error('CHUNKY_CRAYON_WORKER_URL not set');
  }
  const resp = await fetch(`${workerUrl}/jobs/coloring-image/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(
      `worker /jobs/coloring-image/start failed: ${resp.status} ${text.slice(0, 300)}`,
    );
  }
}

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

type CharacterInPrompt = {
  name: string;
  species: string;
  traits: string[];
  signatureDetails: string[];
  /** Line-art portrait — first slot in referenceImageUrls so gpt-image-2
   *  treats it as the primary reference. */
  portraitLineArtUrl: string;
};

type BuildTextModeBodyArgs = {
  coloringImageId: string;
  description: string;
  locale: string;
  brand: Brand;
  quality: ImageQuality;
  /** 0 for guests + comment-requests. */
  creditCost: number;
  /** Active profile difficulty if any. BEGINNER falls through to the
   *  standard prompt (no difficulty modifiers). */
  difficulty?: Difficulty;
  /** Optional character to feature. Mutually exclusive with difficulty
   *  modifiers when present (character-aware prompt incorporates
   *  difficulty internally). */
  character?: CharacterInPrompt;
};

/**
 * Assemble the worker body for a text-mode (or comment-request) generation.
 * Returns a body ready to hand to `postToWorker`.
 *
 * Branch order (mirrors createPendingColoringImage):
 *   1. Character set → character-aware prompt + portrait at reference[0]
 *   2. Non-BEGINNER difficulty → difficulty-aware prompt
 *   3. Default → standard coloring prompt
 *
 * Style anchor line is prepended in all three branches so gpt-image-2
 * knows the reference images describe the target line-art aesthetic.
 */
export function buildTextModeWorkerBody({
  coloringImageId,
  description,
  locale,
  brand,
  quality,
  creditCost,
  difficulty,
  character,
}: BuildTextModeBodyArgs): WorkerBody {
  let corePrompt: string;
  let referenceImageUrls: string[];

  if (character) {
    corePrompt = buildCharacterAwareColoringPrompt({
      description,
      locale,
      difficulty,
      character: {
        name: character.name,
        species: character.species,
        traits: character.traits,
        signatureDetails: character.signatureDetails,
      },
    });
    // Character portrait first; then top up with brand style refs so
    // gpt-image-2 still knows the target line-art aesthetic. Cap at 4 to
    // stay well within OpenAI's 16-ref limit and to avoid drowning the
    // character ref in style refs.
    referenceImageUrls = [
      character.portraitLineArtUrl,
      ...REFERENCE_IMAGES.slice(0, 3),
    ];
  } else if (difficulty && difficulty !== 'BEGINNER') {
    corePrompt = prompts.createDifficultyAwarePrompt(description, difficulty);
    referenceImageUrls = REFERENCE_IMAGES.slice(0, 4);
  } else {
    corePrompt = prompts.createColoringImagePrompt(description);
    referenceImageUrls = REFERENCE_IMAGES.slice(0, 4);
  }

  const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.\n\n${corePrompt}`;

  return {
    coloringImageId,
    prompt: styledPrompt,
    description,
    locale,
    brand,
    creditCost,
    referenceImageUrls,
    size: '1024x1024',
    quality,
    partialImages: 3,
  };
}
