/**
 * Article fetch + readable-text extraction.
 *
 * Used by both the news engine and the tips engine to GROUND generated copy
 * on the real source instead of a 2-sentence Perplexity summary. Scripting
 * from a summary lets the model invent specifics (a stat, a price, a study
 * size) the source never stated — a real fabrication risk on a kids brand
 * that cites the source by name. Feeding the actual article prose to the
 * writer, plus a verification pass (see verify.ts), closes that gap.
 *
 * Deliberately dependency-free: a lightweight tag-strip + whitespace
 * collapse, not a full Readability port. The model only needs the prose to
 * check facts against; perfect boilerplate removal isn't required. We strip
 * script/style/nav/header/footer blocks so the extracted text is mostly
 * article body, then cap length so we don't blow the model's context.
 */

const MAX_ARTICLE_CHARS = 12000;

/** Strip a named block element (and its contents) from HTML, case-insensitive. */
const stripBlock = (html: string, tag: string): string =>
  html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), " ");

/**
 * Extract readable text from an HTML document. Best-effort: removes
 * non-content blocks, drops all remaining tags, decodes a handful of common
 * entities, collapses whitespace, and caps length.
 */
export const extractReadableText = (html: string): string => {
  let s = html;
  for (const tag of [
    "script",
    "style",
    "noscript",
    "nav",
    "header",
    "footer",
    "aside",
    "form",
    "svg",
  ]) {
    s = stripBlock(s, tag);
  }
  // Drop all remaining tags.
  s = s.replace(/<[^>]+>/g, " ");
  // Decode the entities that actually matter for reading prose.
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&[a-z]+;/gi, " ");
  // Collapse whitespace.
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, MAX_ARTICLE_CHARS);
};

export type FetchedArticle = {
  url: string;
  /** Extracted readable text. Empty string if extraction yielded nothing usable. */
  text: string;
};

/**
 * Fetch an article URL and return its readable text. Returns null on any
 * failure (non-200, timeout, non-HTML, too little text) so the caller can
 * skip grounding and fall back / discard the candidate. A browser-ish
 * User-Agent avoids the most basic bot blocks; sites that hard-block bots
 * just return null and we move on to the next candidate.
 */
export async function fetchArticleText(
  url: string,
): Promise<FetchedArticle | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ChunkyCrayonBot/1.0; +https://chunkycrayon.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;
    const html = await res.text();
    const text = extractReadableText(html);
    // Guard: a near-empty extraction (paywall stub, JS-only page) is useless
    // for grounding. Require enough prose to actually verify facts against.
    if (text.length < 400) return null;
    return { url, text };
  } catch {
    return null;
  }
}
