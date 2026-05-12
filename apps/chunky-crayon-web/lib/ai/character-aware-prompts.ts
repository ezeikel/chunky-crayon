/**
 * Character-aware coloring-page prompts.
 *
 * Phase 5 entry point. When a user picks a character in the create form,
 * we swap the standard `createColoringImagePrompt` for this builder so the
 * scene prompt explicitly demands that the picked character appear, and
 * we pipe the character's portrait into gpt-image-2 via the existing
 * `referenceImageUrls` slot in `createPendingColoringImage` /
 * `app/jobs/coloring-image/start`.
 *
 * This file is intentionally a scaffold in Phase 2 — the action wiring
 * isn't live yet. Phase 5 fleshes out the prompt body. Keeping the file
 * present (rather than introducing it later) lets us co-locate the future
 * call site with the existing prompt-builders module without an awkward
 * mid-feature import shuffle.
 */

import type { CharacterPromptInput } from './character-prompt-types';

/**
 * Build the gpt-image-2 prompt for a coloring page that must contain a
 * named, recurring character. Mirrors the bundles "continuity block"
 * pattern (see worker/src/bundles/generate-page.ts: buildScenePrompt) —
 * signatureDetails are named verbatim so the model knows exactly which
 * visual features it must preserve from the reference image.
 *
 * Phase 5 will wire this into `createPendingColoringImage` and the
 * non-streaming variant. Until then this throws — the caller path doesn't
 * exist yet.
 */
export const buildCharacterAwareColoringPrompt = (
  _input: CharacterPromptInput,
): string => {
  throw new Error(
    '[character-aware-prompts] buildCharacterAwareColoringPrompt not implemented — fleshed out in Phase 5',
  );
};
