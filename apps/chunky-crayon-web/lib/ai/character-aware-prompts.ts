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
 * Cap: up to MAX_SUBJECTS (2) recurring characters per scene, any mix of
 * the kid's saved characters. Each one's portrait is prepended to the
 * worker's referenceImageUrls in the same order. (Was v1-capped at one;
 * gpt-image-2 multi-subject fidelity is fragile, so two is the ceiling and
 * each character carries its own reference portrait + named continuity
 * block to keep both identities stable.)
 */

import { GPT_IMAGE_STYLE_BLOCK, DIFFICULTY_MODIFIERS } from './prompts';
import type {
  CharacterPromptInput,
  CharacterForPrompt,
} from './character-prompt-types';

// One named continuity block per character. The "MUST match the reference
// image exactly" line is load-bearing: without it gpt-image-2 happily
// redraws a similar-but-not-the-same dragon. With two characters, the
// reference portraits are sent in the same order the characters are listed,
// so the model can map each block to its portrait.
const characterContinuityBlock = (c: CharacterForPrompt): string => `
"${c.name}", a ${c.species}:
Distinguishing visual details that MUST be visible and match its reference image exactly:
${c.signatureDetails.map((d) => `- ${d}`).join('\n')}
Personality cues (shape the pose/activity, not the appearance):
${c.traits.length > 0 ? c.traits.map((t) => `- ${t}`).join('\n') : '- friendly and curious'}`;

/**
 * Build the gpt-image-2 prompt for a coloring page that must contain one or
 * two named, recurring characters. Each character's portrait is conditioned
 * via the worker's referenceImageUrls slot at the call site (not here), in
 * the same order as `input.characters`.
 */
export const buildCharacterAwareColoringPrompt = (
  input: CharacterPromptInput,
): string => {
  const { description, characters, difficulty } = input;

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

  // CHARACTER continuity block. Mirrors the bundles pattern. The header
  // differs for one vs two characters so the model knows both are required
  // (and equal protagonists, not one main + one cameo).
  const names = characters.map((c) => `"${c.name}"`);
  const header =
    characters.length > 1
      ? `Character continuity — this page MUST include BOTH of these recurring characters, ${names.join(
          ' and ',
        )}, together in the same scene as equal protagonists.`
      : `Character continuity — this page MUST include the recurring character ${names[0]}, a ${characters[0].species}.`;

  const continuityBlock = `
${header}
${characters.map(characterContinuityBlock).join('\n')}

The character${characters.length > 1 ? 's are the protagonists' : ' is the protagonist'} of the page; the user's scene description (above) describes what they are doing or where they are. Do NOT replace ${
    characters.length > 1 ? 'them' : 'the character'
  } with a generic figure of the same species.`;

  return `Scene: ${description}.
${difficultyBlock}${continuityBlock}

${GPT_IMAGE_STYLE_BLOCK}`;
};
