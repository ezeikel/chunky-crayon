/**
 * Voice mode safety stack.
 *
 * Used between every untrusted-text boundary in the 2-turn voice flow:
 *   1. After Deepgram STT, before passing to Claude (kid input)
 *   2. After Claude generates the follow-up, before passing to ElevenLabs TTS
 *      (LLM output — could be offside even from clean input)
 *
 * Layers, in order:
 *   - Length cap (50 words). Prevents prompt-injection floods + flagrant abuse.
 *   - Hard-coded blocklist. Catches things the OpenAI Moderation API misses
 *     (named real people, specific scary themes, brand mentions, URLs).
 *   - OpenAI Moderation API (free, fast). Catches sexual/violence/hate/etc.
 *
 * Returns a discriminated union the caller can switch on:
 *   { ok: true } → safe to forward
 *   { ok: false, code: '...' } → block, log, fall back
 *
 * Both apps (CC kids + CH adults) use the same checks. The blocklist itself
 * is shared — a kid mentioning brand names is no more okay than an adult
 * doing it (for image-gen reasons), and the OpenAI flag thresholds are
 * appropriate for both audiences without per-brand tuning.
 *
 * See docs/voice-mode/README.md for the full safety story.
 */
import OpenAI from "openai";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** Hard input length cap. Anything longer is rejected before any API call. */
const MAX_WORDS = 50;

/**
 * Hard-coded blocklist patterns. Lowercase, word-boundary-matched.
 * Categories and rationale:
 *
 *   - Real people / celebrities: image-gen safety + likeness/IP issues
 *   - Specific scary or violent themes: covers gaps in OpenAI Moderation
 *     for a kids audience
 *   - Brand / IP names: prevents copyrighted-character coloring pages
 *   - URLs: prompt injection vector + irrelevant
 *   - Profanity not always caught by Moderation (mild swears)
 *
 * This is intentionally short. The OpenAI Moderation API does the heavy
 * lifting; this catches the long tail. Add to it as we hit real-world cases.
 */
const BLOCKLIST_PATTERNS: RegExp[] = [
  // URLs / domains — anything resembling a link
  /https?:\/\//i,
  /\bwww\.\w/i,
  /\b\w+\.(com|net|org|io|co\.uk)\b/i,

  // Email addresses
  /\b\S+@\S+\.\S+\b/i,

  // Common prompt-injection phrasings
  /\bignore\s+(?:previous|prior|all)\s+(?:instructions?|prompts?|rules?)\b/i,
  /\bdisregard\s+(?:previous|prior|all)\s+(?:instructions?|prompts?|rules?)\b/i,
  /\bsystem\s+prompt\b/i,
  /\bdeveloper\s+(?:mode|prompt)\b/i,
  /\bjailbreak\b/i,

  // Mild profanity not always caught by Moderation API
  /\b(?:damn|hell|crap|piss|bitch)\b/i,

  // Specific scary themes that slip past Moderation thresholds for kids
  /\b(?:suicide|self[-\s]?harm|kill\s+(?:myself|yourself|himself|herself))\b/i,
  /\b(?:nazi|hitler|isis|terror(?:ist)?)\b/i,

  // Common copyrighted characters / brands kids ask for. The image-gen
  // pipeline already has its own COPYRIGHTED_CHARACTER_INSTRUCTIONS; this
  // is belt-and-braces at the input boundary so we don't waste a Claude
  // call generating a follow-up about a character we won't render.
  /\b(?:mickey\s+mouse|donald\s+duck|spider[-\s]?man|batman|superman|elsa|moana|paw\s+patrol|peppa\s+pig|mario|sonic|pikachu|pokemon|disney)\b/i,
];

// ────────────────────────────────────────────────────────────────────────────
// OpenAI Moderation API client
// ────────────────────────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;
const getOpenAI = () => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not set");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

// ────────────────────────────────────────────────────────────────────────────
// Result types
// ────────────────────────────────────────────────────────────────────────────

export type ModerationCode =
  | "too_long"
  | "blocklisted"
  | "moderation_flagged"
  | "moderation_unavailable";

export type ModerationResult =
  | { ok: true }
  | {
      ok: false;
      code: ModerationCode;
      /** Human-readable reason — useful for server logs, never sent to client. */
      reason: string;
      /**
       * For OpenAI flags: which categories tripped. Empty for length / blocklist.
       * Sent to server logs only — clients only see the code.
       */
      categories?: string[];
    };

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run the full moderation stack against a piece of text. Use at every
 * untrusted-text boundary in the voice flow.
 *
 * Order matters: cheap checks first, expensive last. We exit early on the
 * first failure, so a too-long input never burns an OpenAI API call.
 */
export async function moderateVoiceText(
  text: string,
): Promise<ModerationResult> {
  const trimmed = text.trim();

  // 1. Length cap (cheapest)
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount > MAX_WORDS) {
    return {
      ok: false,
      code: "too_long",
      reason: `input ${wordCount} words exceeds cap of ${MAX_WORDS}`,
    };
  }

  // 2. Blocklist regex sweep (still cheap, no network)
  for (const pattern of BLOCKLIST_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        code: "blocklisted",
        reason: `matched blocklist pattern ${pattern.source}`,
      };
    }
  }

  // 3. OpenAI Moderation API (free, ~100-300ms). Only path that costs latency.
  try {
    const openai = getOpenAI();
    const response = await openai.moderations.create({
      // omni-moderation-latest covers text + image; for our text-only use
      // case it's the most up-to-date model with the broadest category set.
      model: "omni-moderation-latest",
      input: trimmed,
    });
    const result = response.results[0];
    if (result?.flagged) {
      const categories = Object.entries(result.categories)
        .filter(([, flagged]) => flagged)
        .map(([cat]) => cat);
      return {
        ok: false,
        code: "moderation_flagged",
        reason: `OpenAI Moderation flagged: ${categories.join(", ")}`,
        categories,
      };
    }
  } catch (err) {
    // Fail-closed: if Moderation API is down, treat as flagged. Voice mode
    // for kids is too high-risk to fail-open. Production logs surface this
    // so we know if we're losing a moderation budget.
    console.error("[moderation] OpenAI Moderation API failed:", err);
    return {
      ok: false,
      code: "moderation_unavailable",
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  return { ok: true };
}
