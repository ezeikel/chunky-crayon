/**
 * Minimal CC image-gen prompt set for the worker's blog cron.
 *
 * Style block is duplicated from apps/chunky-crayon-web/lib/ai/prompts.ts
 * because the worker can't import the brand-specific prompt module. Drift
 * on the style block is the cost of the duplication; revisit by hoisting
 * if the duplication grows.
 *
 * Reference URLs were also duplicated until the difficulty-aware v2 set
 * landed; they're now imported from @one-colored-pixel/coloring-core so
 * web + worker share a single source for the per-tier reference URLs.
 */

import {
  REFERENCE_IMAGES as CORE_REFERENCE_IMAGES,
  getReferenceImages as coreGetReferenceImages,
} from "@one-colored-pixel/coloring-core";

const TARGET_AGE = "3-8 years old";

const COPYRIGHTED_CHARACTER_INSTRUCTIONS = `If the description includes a copyrighted name like Spiderman, then describe the character's physical appearance in detail instead. Describe their costume, logos, accessories, mask, eyes, muscles, etc. Specify that this must be in black and white only and simplify any complex details so that the image remains simple and avoids any complicated shapes or patterns. Update the original description replacing the copyrighted character name with this detailed description of the character. If the description does not include any copyrighted characters, then please ignore this step.`;

export const REFERENCE_IMAGES = CORE_REFERENCE_IMAGES;
export const getReferenceImages = coreGetReferenceImages;

export const GPT_IMAGE_STYLE_BLOCK = `Style: children's coloring book page, clean line art, thick black outlines on a pure white background.
Medium: thick black ink outlines only, completely unfilled, white interior on every shape.
Audience: simple enough for a child aged ${TARGET_AGE} to color with chunky crayons.

Composition: a single centered subject with a simple, relevant background. Large shapes, minimal detail, maximum 5-7 distinct colorable areas. Every element drawn with bold, uniform-weight outlines.

Characters: cartoon-like, friendly, approachable faces. Hair and fur rendered as simple flowing lines. All clothing and accessories drawn as outlines only, matching the same line weight.

Technical: high contrast between black outlines and white space. Every enclosed shape left completely white and unfilled. Smooth, continuous line work suitable for printing on standard paper. No duplicate elements unless the description asks for them.

Outlines must be CLOSED CONTOURS — every shape is fully sealed, with no breaks, gaps, or unconnected line endings. Where one region meets another, the boundary line is unbroken from end to end. This is critical: every region must be fully enclosed so the page can be filled in cleanly without colour bleeding across shapes.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

My prompt has full detail so no need to add more.`;

export const createColoringImagePrompt = (description: string) =>
  `Scene: ${description}.

${GPT_IMAGE_STYLE_BLOCK}`;
