/**
 * Cover-teaser generator — produces the question-shaped string the
 * Satori cover uses to provoke a tap.
 *
 * Why a separate generator (not just reuse `hook`):
 *   The reel's `hook` is voice-friendly + declarative ("Kids 5-8 spend
 *   over 7 hours a day on screens"). Saying that as the cover text
 *   spoils the punchline before the user plays. The cover wants a
 *   QUESTION that points at the obscured centre block — "How long are
 *   kids 5-8 really on screens each day?" — so the brain auto-fills
 *   the gap and curiosity drives the tap.
 *
 * Cached on the row at write-time. The caller (research script,
 * backfill script, manual admin UI) decides when to invoke this; the
 * cover renderer just reads `reel.coverTeaser` and falls back to `hook`
 * if missing. Re-generation should bump `COVER_TEASER_PROMPT_VERSION`
 * so old caches get invalidated when the prompt evolves.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import type { ContentReel, ContentReelKind } from "./types";

/**
 * Bump this when the per-kind prompts below change in a way that should
 * invalidate previously-cached teasers. Persisted alongside the teaser
 * lets us identify rows whose teaser was generated with stale prompts.
 *
 * (We don't have a column for this yet — it's a string we COULD store
 * on the row in a follow-up migration. For now, treat any drift as a
 * one-shot wipe-and-regen via the backfill script.)
 */
export const COVER_TEASER_PROMPT_VERSION = "2026-05-05.1";

const SYSTEM_PROMPT = `You write social-media cover lines for a parenting brand.

The cover image shows the user's question. The pixelated centre block hides the answer. The user taps "play" to hear the full reveal.

Your job: rewrite the brand's research-friendly hook into a TEASER QUESTION that points at the hidden block without spoiling it.

Rules:
- 8-14 words.
- US-friendly spelling (color, vacation, organize).
- No em dashes — they read as AI-generated. Use commas or fresh sentences.
- No "AI" or "studies show" framing.
- Plain conversational parent voice — never condescending.
- Output the teaser line ONLY. No quotes, no preamble, no follow-up sentence.`;

const KIND_PROMPT_TEMPLATES: Record<ContentReelKind, string> = {
  stat: `The reel reveals a specific NUMBER. Rewrite the hook as a "How [much/many/long/often] ...?" question that points at the hidden number.

Example:
  hook: "Kids aged 5-8 spend over 7 hours a day on screens."
  centerBlock: "7+ hrs"
  → "How long are kids 5-8 really on screens each day?"

Now do the same for:
  hook: {{HOOK}}
  centerBlock: {{CENTER_BLOCK}}`,

  fact: `The reel reveals a SURPRISING FACT. Rewrite the hook as a "Did you know...?" or "What if I told you...?" question that hides the surprising element.

Example:
  hook: "Coloring activates the same brain regions as meditation."
  centerBlock: "Meditation regions"
  → "Did you know coloring activates this surprising part of a kid's brain?"

Now do the same for:
  hook: {{HOOK}}
  centerBlock: {{CENTER_BLOCK}}`,

  tip: `The reel reveals an ACTIONABLE TIP. Rewrite the hook as a "Want to know what helps with X?" question that hides the tip.

Example:
  hook: "Kids fight bedtime less when they wind down with their hands."
  centerBlock: "Color before bedtime"
  → "Want to know what stops the bedtime battle tonight?"

Now do the same for:
  hook: {{HOOK}}
  centerBlock: {{CENTER_BLOCK}}`,

  myth: `The reel reveals a MYTH-BUST verdict (TRUE or FALSE). Rewrite the hook as a "True or false:" line that states the myth claim — the cover hides the verdict.

Example:
  hook: "Sugar makes kids hyperactive — every parent knows it."
  centerBlock: "False"
  → "True or false: sugar makes kids hyperactive."

Now do the same for:
  hook: {{HOOK}}
  centerBlock: {{CENTER_BLOCK}}`,
};

const claude = anthropic("claude-sonnet-4-6");

export async function generateCoverTeaser(
  reel: Pick<ContentReel, "kind" | "hook" | "centerBlock">,
): Promise<string> {
  const prompt = KIND_PROMPT_TEMPLATES[reel.kind]
    .replace("{{HOOK}}", reel.hook)
    .replace("{{CENTER_BLOCK}}", reel.centerBlock);

  const result = await generateText({
    model: claude,
    system: SYSTEM_PROMPT,
    prompt,
    temperature: 0.5,
  });

  // Claude sometimes wraps the output in quotes despite the rule. Strip
  // surrounding "" or '' and collapse whitespace.
  const cleaned = result.text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ");

  return cleaned;
}
