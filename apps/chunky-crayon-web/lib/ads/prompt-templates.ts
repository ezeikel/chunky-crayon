// B-roll prompt templates. Each template is a recipe for a specific
// shot type — the generic scaffolding (camera, lighting, realism
// levers, "no face visible", etc.) lives here, and per-campaign
// variables get plugged in at generation time.
//
// Adding a new campaign = pick a template + fill in 3-6 variables. You
// don't rewrite the 230-word amateur-phone-photo realism prose.
//
// Adding a new shot type = add a new template here, then reference its
// key from campaigns.ts BrollSpec.template.

/**
 * Schema for every template. Each template exports:
 *   - id:          the key referenced from BrollSpec.template
 *   - variables:   the required variable names (for static-check +
 *                  helpful error messages when campaigns forget one)
 *   - buildStill:  (vars) => full Nano Banana prompt string
 *   - buildMotion: (vars) => full i2v motion prompt string
 */
export type BrollTemplate<V extends Record<string, string>> = {
  id: string;
  /** List of required variable keys. Used for validation + docs. */
  variables: (keyof V)[];
  buildStill: (vars: V) => string;
  buildMotion: (vars: V) => string;
};

// ============================================================================
// Template 1: over-shoulder-colouring
// ============================================================================
//
// Discovered by iteration on 2026-04-21 + validated with Kling v3 Pro:
//   - Over-the-shoulder candid phone-photo framing (amateur parent shot)
//   - Kid partially visible (back of head + shoulder + arm), no face
//   - Hand grips a crayon resting lightly on the page
//   - Page clearly visible, partly coloured already
//   - Window light from left, ISO 800 grain, water ring / crumbs /
//     crayon shavings — anti-AI-gleam realism levers
//
// Best-in-class results using Kling v3 Pro. Seedance works but weaker on
// colouring motion (Kling handles crayon-on-page cleanly, Seedance
// flickers strokes in/out).
//
// Variables:
//   - crayonColour:     "red" | "orange" | "blue" | etc.
//   - referenceDesc:    what the crayon is touching on the page
//                       ("the T-rex's body", "the dragon's body")
//   - partialColouring: natural-language description of which parts of
//                       the page are already coloured in the still
//                       (so the motion can build on top of it)

type OverShoulderColouringVars = {
  crayonColour: string;
  referenceDesc: string;
  partialColouring: string;
};

export const OVER_SHOULDER_COLOURING: BrollTemplate<OverShoulderColouringVars> =
  {
    id: 'over-shoulder-colouring',
    variables: ['crayonColour', 'referenceDesc', 'partialColouring'],
    buildStill: (vars) =>
      `An amateur photograph taken by a parent on their iPhone 15, 9:16 vertical portrait. Over-the-shoulder view of a small child (age 5) sitting at a wooden kitchen table, colouring a printed coloring page. In the foreground (slightly out of focus): the back of the child's head with messy brown hair, the left shoulder in a faded grey t-shirt, and their right arm extending forward and down to the page — upper arm visible, elbow slightly bent, forearm reaching toward the page, and the small hand visibly gripping a ${vars.crayonColour} wax crayon. The crayon tip is resting lightly on the page on ${vars.referenceDesc}, mid-colouring. On the table (in sharp focus): a printed black-and-white coloring page reproduced exactly from the reference image provided. The page is partly coloured in with wax crayon: ${vars.partialColouring}. A loose pile of wax crayons (a few different colours) sits on the right side of the table, one crayon tipped over another. The wooden table has a faint water ring near the far edge, a few crayon shavings, and a tiny crumb. Phone-snap light from a window on the left, slightly uneven, with a soft natural shadow across the right side. ISO 800 grain visible. Slightly warm white balance. Shallow depth of field — the foreground shoulder and arm are softly out of focus, the page and the crayon tip are tack sharp. Candid, unposed, imperfectly framed. No faces visible. No text anywhere in the image.`,
    buildMotion: (vars) =>
      `Camera static. No pan, no tilt, no zoom. The child's right hand makes small, gentle back-and-forth colouring strokes with the ${vars.crayonColour} crayon on ${vars.referenceDesc}. Natural colouring rhythm — small wrist movement, slight shoulder shift. The crayon stays on the page. The page stays absolutely still. The illustration on the page does not morph. Crayons on the right do not move. The table does not move.`,
  };

// ============================================================================
// Registry
// ============================================================================
//
// Central lookup used by generate-broll.ts. Each template is exported
// with a typed variables shape above, but downstream code accesses via
// this untyped registry (the typecheck happens at campaigns.ts write-time
// via the BrollSpec discriminated union below).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BROLL_TEMPLATES: Record<string, BrollTemplate<any>> = {
  [OVER_SHOULDER_COLOURING.id]: OVER_SHOULDER_COLOURING,
};

/**
 * Expands a template + variables into the full still + motion prompts.
 * Throws if the template doesn't exist or a required variable is missing.
 */
export function expandBrollTemplate(
  templateId: string,
  vars: Record<string, string>,
): { stillPrompt: string; motionPrompt: string } {
  const template = BROLL_TEMPLATES[templateId];
  if (!template) {
    throw new Error(
      `Unknown broll template "${templateId}". Available: ${Object.keys(BROLL_TEMPLATES).join(', ')}`,
    );
  }
  const missing = template.variables.filter(
    (key) => !(key in vars) || vars[key as string] == null,
  );
  if (missing.length > 0) {
    throw new Error(
      `Template "${templateId}" missing required variables: ${missing.join(', ')}`,
    );
  }
  return {
    stillPrompt: template.buildStill(vars),
    motionPrompt: template.buildMotion(vars),
  };
}
