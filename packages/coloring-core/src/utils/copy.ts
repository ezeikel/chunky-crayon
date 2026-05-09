/**
 * Copy sanitisation for user-facing AI-generated text.
 *
 * Shared by the web app (social captions, blog posts, scene descriptions)
 * and the worker (content-reel hooks/payoffs). Two layers of defence:
 *   1. NO_EM_DASHES_RULE  — included in every generation system prompt so
 *      the model is told not to produce em dashes in the first place.
 *   2. stripEmDashes(text) — sanitiser at the output boundary, in case the
 *      model slips. Em dashes read as AI-generated to parents.
 */

const EM_DASH = "—";

export const NO_EM_DASHES_RULE = `Never use em dashes (—) in user-facing copy. Em dashes read as AI-generated. Use commas, parentheses, or split into separate sentences instead. This applies to every word the reader sees, including hooks, body copy, captions, hashtags, and CTAs.`;

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
