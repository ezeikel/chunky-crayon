/**
 * Copy sanitisation for user-facing reel text. Sonar/Claude love em dashes;
 * we don't (reads as AI-generated to parents). Centralised so every write
 * path — research, upsert, seed, manual fixture — gets the same treatment.
 */

const EM_DASH = "—";

/**
 * Replace em dashes with ", " and clean up the punctuation that produces.
 * Handles the two patterns the LLM emits:
 *   "warm — yet firm"  → "warm, yet firm"
 *   "calm—you teach"   → "calm, you teach"
 * Also strips the trailing-comma case ("foo, , bar" → "foo, bar") and
 * double spaces left by spaced em dashes.
 */
export function stripEmDashes(text: string): string {
  return text
    .replace(new RegExp(`\\s*${EM_DASH}\\s*`, "g"), ", ")
    .replace(/, ,/g, ",")
    .replace(/  +/g, " ")
    .trim();
}
