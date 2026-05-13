/**
 * Difficulty-aware style reference images for Chunky Crayon coloring page
 * generation.
 *
 * Three reference sets (beginner / intermediate / advanced) each show
 * the SAME 8 subjects at a different complexity level. The generator
 * picks the right set based on the requested difficulty and passes the
 * 4 (or more) reference URLs to gpt-image-2's images.edit call. The
 * references teach the model what density of detail to produce — the
 * prompt's DIFFICULTY_MODIFIERS text gives the same signal in words.
 *
 * v1 references (single set, shading-heavy, mixed complexity) are
 * preserved at their original R2 paths as a rollback safety belt and
 * are NOT served from this helper.
 */

import type { Difficulty } from "../image-providers";

const R2_BASE =
  "https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev/reference-images/v2";

// The 8 subjects represented at every difficulty level. Mirrors the
// layout on R2 (`v2/{difficulty}/{subject}.png`).
const SUBJECTS = [
  "birthdays",
  "dinosaur",
  "family-and-friends",
  "farm-animals",
  "sea-creatures",
  "superheroes",
  "trains",
  "unicorns",
] as const;

const buildSet = (difficulty: "beginner" | "intermediate" | "advanced") =>
  SUBJECTS.map((subject) => `${R2_BASE}/${difficulty}/${subject}.png`);

const BEGINNER_REFERENCES = buildSet("beginner");
const INTERMEDIATE_REFERENCES = buildSet("intermediate");
const ADVANCED_REFERENCES = buildSet("advanced");

/**
 * Returns the 8 style reference URLs for the given difficulty tier.
 * EXPERT (adult / mandala) doesn't exist for Chunky Crayon and falls
 * back to ADVANCED so subscribers who pick the highest tier still get
 * the most detailed kid-appropriate output rather than a blank set.
 *
 * Default BEGINNER. This is the same default applied by the UI to
 * guest + free users and by all currently-existing rows in the DB
 * (`difficulty` column defaults to NULL/BEGINNER).
 */
export const getReferenceImages = (
  difficulty?: Difficulty | null,
): readonly string[] => {
  switch (difficulty) {
    case "INTERMEDIATE":
      return INTERMEDIATE_REFERENCES;
    case "ADVANCED":
    case "EXPERT":
      return ADVANCED_REFERENCES;
    case "BEGINNER":
    default:
      return BEGINNER_REFERENCES;
  }
};

/**
 * @deprecated Use `getReferenceImages(difficulty)` instead. Kept as a
 * back-compat shim for call sites that haven't been wired through yet.
 * Always returns the beginner set.
 */
export const REFERENCE_IMAGES: readonly string[] = BEGINNER_REFERENCES;
