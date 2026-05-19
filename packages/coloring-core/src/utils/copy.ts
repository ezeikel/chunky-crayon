/**
 * Copy sanitisation for user-facing AI-generated text.
 *
 * Shared by the web app (social captions, blog posts, scene descriptions)
 * and the worker (content-reel hooks/payoffs). Two layers of defence:
 *   1. Rule strings (NO_EM_DASHES_RULE / NO_MARKDOWN_RULE) — included in
 *      generation system prompts so the model is told not to produce the
 *      bad output in the first place.
 *   2. Sanitisers at the output boundary, in case the model slips:
 *        - stripEmDashes(text)  — em/en dashes → commas
 *        - stripMarkdown(text)  — strip markdown the platform won't render
 *        - sanitizeCaption(text) — both, for social captions
 *
 * Why both layers: prompt instructions are probabilistic — the model still
 * emits `# Heading`, `**bold**`, and em dashes often enough that a LinkedIn
 * post once shipped with literal "# LinkedIn Post:" and "**" in it (LinkedIn
 * renders no markdown). The sanitiser is the deterministic guarantee.
 */

const EM_DASH = "—";

export const NO_EM_DASHES_RULE = `Never use em dashes (—) in user-facing copy. Em dashes read as AI-generated. Use commas, parentheses, or split into separate sentences instead. This applies to every word the reader sees, including hooks, body copy, captions, hashtags, and CTAs.`;

export const NO_MARKDOWN_RULE = `Output plain text only. No markdown whatsoever: no # headings, no **bold** or *italic* or __underline__, no \`code\`, no markdown links, no bullet/numbered list markers. Social platforms render none of it, so it shows up literally as "#" and "**" in the post. Use line breaks, emojis, and plain sentences for structure instead.`;

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

/**
 * Strip markdown that social platforms (LinkedIn, Instagram, Facebook,
 * TikTok, X, Threads, Pinterest) render literally rather than as
 * formatting. Conservative on purpose — only removes markup syntax, never
 * the words. Preserves emojis, #hashtags (NOT markdown headings — see
 * below), URLs, and line breaks.
 *
 * A leading "#" is only a heading when followed by space(s) then text
 * ("# LinkedIn Post:" / "### Tips"). "#WeddingPlanning" with no space is a
 * hashtag and is kept. That distinction is the whole reason this is regex
 * and not a markdown parser.
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // ATX headings: leading #'s + space(s), per line. Keep the heading text.
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
      // Setext heading underlines (=== / --- on their own line under text).
      .replace(/^[ \t]*[=-]{3,}[ \t]*$/gm, "")
      // Bold/italic: ***x*** **x** *x* ___x___ __x__ _x_ — keep inner text.
      // Run strong before emphasis so **x** doesn't leave a stray *.
      .replace(/(\*\*\*|___)(.+?)\1/g, "$2")
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, "$2")
      // Inline code / code fences — keep the contents, drop the backticks.
      .replace(/```[a-zA-Z]*\n?/g, "")
      .replace(/`([^`]+)`/g, "$1")
      // Markdown links [text](url) → "text url" (keep both; URL matters).
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 $2")
      // …and bare [text](path) with no URL → just the text.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Blockquote markers at line start.
      .replace(/^[ \t]*>[ \t]?/gm, "")
      // Unordered list markers: leading -, *, + then space. NOT a "-" mid
      // sentence and NOT "*emphasis*" (handled above already).
      .replace(/^[ \t]*[-*+][ \t]+/gm, "")
      // Ordered list markers: "1. " / "12) " at line start.
      .replace(/^[ \t]*\d+[.)][ \t]+/gm, "")
      // Horizontal rules on their own line (***, ---, ___).
      .replace(/^[ \t]*([*_-])(?:[ \t]*\1){2,}[ \t]*$/gm, "")
      .trim()
  );
}

/**
 * Full sanitiser for a social caption: strip markdown the platform won't
 * render, then normalise em/en dashes. Order matters — markdown removal
 * first so a stray dash from a converted "- list item" still gets handled.
 * This is what every caption-returning function should pass its model
 * output through before posting / scheduling.
 */
export function sanitizeCaption(text: string): string {
  return stripEmDashes(stripMarkdown(text)).trim();
}
