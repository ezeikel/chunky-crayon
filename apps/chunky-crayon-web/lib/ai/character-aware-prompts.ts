/**
 * Character-aware coloring-page prompts.
 *
 * When a user picks a character in the create form, this builder takes
 * over from `createColoringImagePrompt` / `createDifficultyAwarePrompt`.
 * It composes the standard scene prompt and then appends a CHARACTER
 * continuity block that:
 *
 *   1. Names the character verbatim (name + species) so gpt-image-2 can
 *      anchor it as the page's protagonist rather than a generic figure.
 *   2. Inlines every signatureDetail so the model knows which visual
 *      features it must preserve from the reference image. This mirrors
 *      the bundle pipeline's `buildScenePrompt` continuity block (see
 *      apps/chunky-crayon-worker/src/bundles/generate-page.ts) — which is
 *      our proven recipe for cross-page identity stability.
 *   3. Passes the personality traits as soft context for the activity
 *      (a "sleepy" character can be drawn yawning, a "brave" one
 *      mid-leap, etc.). Traits don't drive QA, just feel.
 *
 * The character's `portraitLineArtUrl` is sent alongside this prompt via
 * the existing `referenceImageUrls: string[]` slot in the worker's
 * /jobs/coloring-image/start payload. Line-art conditioning is what the
 * bundle pipeline uses; it produces cleaner coloring-page outputs than
 * a full-colour reference (less likely to bleed colour into the line-art).
 *
 * v1 cap: ONE character per scene. Memory + bundle work both confirmed
 * gpt-image-2 multi-subject fidelity is fragile.
 */

import { GPT_IMAGE_STYLE_BLOCK, DIFFICULTY_MODIFIERS } from './prompts';
import type { CharacterPromptInput } from './character-prompt-types';

/**
 * Build the gpt-image-2 prompt for a coloring page that must contain a
 * named, recurring character. The character's portrait is conditioned
 * via the worker's referenceImageUrls slot at the call site (not here).
 */
export const buildCharacterAwareColoringPrompt = (
  input: CharacterPromptInput,
): string => {
  const { description, character, difficulty } = input;

  // Difficulty block — only applied when the active profile has stepped
  // beyond BEGINNER. Matches the existing createDifficultyAwarePrompt
  // branching so character-in-scene pages stay age-appropriate.
  const config =
    difficulty && difficulty !== 'BEGINNER'
      ? (DIFFICULTY_MODIFIERS[difficulty] ?? DIFFICULTY_MODIFIERS.BEGINNER)
      : null;

  const difficultyBlock = config
    ? `\nTarget audience: ${config.targetAge}\nComplexity: ${config.complexity}\nShape sizes: ${config.shapeSize}\nLine thickness: ${config.lineThickness}\nDetail level: ${config.detailLevel}\nBackground: ${config.background}\n\n${config.additionalRules
        .map((rule) => `- ${rule}`)
        .join('\n')}\n`
    : '';

  // CHARACTER continuity block. Mirrors the bundles pattern. The "MUST
  // match the reference image exactly" line is load-bearing: without it
  // gpt-image-2 happily redraws a similar-but-not-the-same dragon.
  const continuityBlock = `
Character continuity — this page MUST include the recurring character "${character.name}", a ${character.species}.

Distinguishing visual details that MUST be visible and match the reference image exactly:
${character.signatureDetails.map((d) => `- ${d}`).join('\n')}

Personality cues (use these to shape the pose and activity, not the appearance):
${character.traits.length > 0 ? character.traits.map((t) => `- ${t}`).join('\n') : '- friendly and curious'}

The character is the protagonist of the page; the user's scene description (above) describes what they are doing or where they are. Do NOT replace the character with a generic figure of the same species. If the scene description names a different character, draw "${character.name}" in that role instead.`;

  return `Scene: ${description}.
${difficultyBlock}${continuityBlock}

${GPT_IMAGE_STYLE_BLOCK}`;
};
