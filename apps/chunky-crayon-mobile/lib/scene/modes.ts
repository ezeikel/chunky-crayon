/**
 * Gateable input modes — mobile mirror of
 * `@one-colored-pixel/coloring-core`'s `GATEABLE_MODES`.
 *
 * Scene Builder is the privacy-first DEFAULT and is NEVER gateable. The
 * other three let a child feed arbitrary input into the AI, so they sit
 * behind a one-time parent gate (see feedback_cc_create_mode_parent_gating).
 *
 * Defined locally rather than imported from coloring-core: this is three
 * string literals and pulling the ESM `dist/` build into the Metro bundle
 * just for them isn't worth the bundler risk. The values MUST stay in
 * lockstep with coloring-core's source of truth.
 */

export const GATEABLE_MODES = ["text", "voice", "image"] as const;

export type GateableMode = (typeof GATEABLE_MODES)[number];

export const isGateableMode = (value: unknown): value is GateableMode =>
  typeof value === "string" &&
  (GATEABLE_MODES as readonly string[]).includes(value);
