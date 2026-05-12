/**
 * Portrait prompt for character generation.
 *
 * The portrait is generated ONCE per character and then reused as a
 * conditioning reference image on every subsequent coloring-page generation
 * that includes this character. This is the same pattern bundles use to keep
 * hero identity stable across multiple pages — see
 * `packages/coloring-core/src/bundles/profiles.ts` and the bundle hero
 * generation in `apps/chunky-crayon-worker/src/bundles/generate-page.ts`.
 *
 * Two outputs land on R2 after the worker runs:
 *   - colored portrait (white background) — used as the `referenceImageUrls`
 *     entry passed to gpt-image-2 for scene generation
 *   - line-art twin (potrace from the same raster) — shown in the
 *     /characters grid + profile UI, and used in Phase 5 as the actual
 *     conditioning reference (line-art conditioning yields cleaner
 *     coloring-page outputs than colored conditioning)
 *
 * We compose the prompt from the trait-extraction output because the
 * extraction already enforces the structural rules (3-5 signatureDetails,
 * single-paragraph, no scenery, etc.). The wrapper here adds the explicit
 * "drawn in our brand's chunky-line-art style" hint so the resulting raster
 * traces cleanly into watertight line-art.
 */

import type { ExtractedCharacter } from './trait-extraction';

/**
 * Build the gpt-image-2 prompt that produces a colored portrait of a
 * character. The portrait is the canonical reference image — its visual
 * details define what the character "is" for every future scene.
 *
 * `extracted.referenceSheetPrompt` already inlines every signatureDetail
 * verbatim and ends with the "single character / plain white background /
 * no scenery" anchor. This wrapper appends the chunky-line-art style
 * instructions so the generated raster looks like a Chunky Crayon
 * coloring-book-adjacent character even when it's colored in.
 */
export const buildCharacterPortraitPrompt = ({
  name,
  extracted,
}: {
  name: string;
  extracted: ExtractedCharacter;
}): string => {
  // Mirror the structural anchors used by bundles' GPT_IMAGE_STYLE_BLOCK
  // so traced line-art twins look brand-consistent across characters AND
  // across bundle heroes. Two differences vs the bundle block:
  //   1. We do want flat, simple shading on the portrait (it's the
  //      "color reference" — bundles produce pure outline).
  //   2. We allow the character to take up the full frame because the
  //      portrait will be cropped / composited downstream.
  return `Character: ${name}.

${extracted.referenceSheetPrompt}

Style: friendly cartoon character for a children's coloring book brand. Bold uniform-weight black outlines like a Sharpie marker. Single character only — no other figures, no props beyond what's explicitly listed in the signature details. Plain pure-white background.

Coloring: flat cell-shaded colors with simple highlights. No painterly textures, no gradients beyond a single cel-shade pass per region. Keep colors child-friendly and saturated but not neon. Where a signature detail names a colour, use that colour exactly.

Composition: centered, full-body, facing slightly toward the camera, neutral pose (standing or sitting), arms visible. No motion blur, no action poses. Frame leaves a small margin of white space on all sides.

Outlines must be CLOSED CONTOURS — every shape is fully sealed, with no breaks or gaps. This is critical: the same raster will be traced into watertight line-art for the profile-page display.

My prompt has full detail so no need to add more.`;
};
