/**
 * Perplexity Sonar fact-check for ContentReel items.
 *
 * Why this exists:
 *   Stat / fact / myth reels CARRY a research claim that, if wrong,
 *   damages the brand. Manual eyeballing doesn't scale once the
 *   catalogue is 200+ items. So every non-tip ContentReel passes
 *   through this verification step at write-time, then re-checks
 *   weekly for items >180d old (Sonar may have newer research that
 *   contradicts the original).
 *
 * What it does:
 *   1. Builds a standardised verification prompt from the reel.
 *   2. Calls Sonar with `output: Output.object({...})` so we get
 *      typed JSON back instead of prose.
 *   3. Returns `{ confidence, recommendation, ... }` for the caller
 *      to write onto the reel row.
 *
 * What it does NOT do:
 *   - Decide whether to publish. The caller looks at `recommendation`
 *     and `confidence` and makes that call. We return the verdict;
 *     the publish gate enforces the policy.
 *   - Mutate the reel. Pure function. The caller persists the result.
 *
 * Cost shape (rough — bracket via dry-run before scaling):
 *   - sonar (cheap)        ~ $0.01-0.05 per call
 *   - sonar-pro (mid)      ~ $0.10-0.30 per call
 *   - sonar deep-research  ~ $0.30-1.20 per call
 *
 *   For verification I default to `sonar-pro` — needs to cite real
 *   sources (sonar's smaller context isn't enough for myth-busts that
 *   reference multiple studies) but doesn't need deep-research depth.
 *   Switching to deep-research is one constant change here if the
 *   pro tier turns out unreliable.
 */

import { perplexity } from "@ai-sdk/perplexity";
import { generateText, Output } from "ai";
import { z } from "zod";

import type { ContentReel, FactCheckConfidence } from "./types";

// ---------------------------------------------------------------------------
// Verification result schema — matches the standardised prompt below.
// ---------------------------------------------------------------------------

const factCheckResultSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  verifiedClaim: z
    .string()
    .describe(
      "The claim restated as Sonar would phrase it after verification. " +
        "Useful for spotting drift between what we say and what the " +
        "research actually supports.",
    ),
  strongestSource: z
    .object({
      title: z.string(),
      url: z.string(),
      year: z.number().int().nullable(),
    })
    .describe(
      "The most authoritative primary source Sonar can find for the " +
        "claim. Peer-reviewed > government institution > established " +
        "expert organisation > everything else.",
    ),
  concerns: z
    .string()
    .nullable()
    .describe(
      "Free-text — anything Sonar flagged: contestation, retraction, " +
        "more recent research that disagrees, methodology issues. Null " +
        "if nothing concerning came up.",
    ),
  recommendation: z.enum(["publish", "revise", "drop"]),
});

export type FactCheckResult = z.infer<typeof factCheckResultSchema> & {
  /** Cost / token info from the Sonar call, for budgeting. Optional — */
  /** the AI SDK doesn't always surface this. */
  meta?: {
    promptTokens?: number;
    completionTokens?: number;
    finishReason?: string;
  };
};

// ---------------------------------------------------------------------------
// Standardised verification prompt — one prompt for all kinds, branches
// internally on `kind`. Keeping this here (not in coloring-core) for the
// dry-run; hoisting to a shared package is a Phase B move.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are fact-checking a claim that will appear in a parenting content piece on social media. Your job is to verify the claim, find the strongest primary source, and flag anything concerning.

Be conservative. If the claim is roughly right but the cited number is sourced from a non-primary aggregator, downgrade confidence to medium. If the claim contradicts more recent research, recommend revise. If the claim is false or has been retracted, recommend drop.

For myths: verify both that the myth claim genuinely exists in the wild AND that the debunk is well-supported by evidence. A myth without a real population believing it isn't worth posting.

Output valid JSON only. Do not include prose outside the JSON.`;

const buildUserPrompt = (reel: ContentReel): string =>
  [
    `Kind: ${reel.kind}`,
    `Hook: ${reel.hook}`,
    `Payoff: ${reel.payoff}`,
    `Center block (the dramatic reveal): ${reel.centerBlock}`,
    reel.sourceTitle
      ? `Cited source: ${reel.sourceTitle}`
      : "Cited source: none",
    reel.sourceUrl ? `Cited URL: ${reel.sourceUrl}` : "",
    "",
    "Tasks:",
    "1. Verify the claim is accurate as stated.",
    "2. Identify the strongest primary source (peer-reviewed study, government institution, or established expert organisation).",
    "3. Flag if the claim is contested, has been retracted, or has more recent contradicting research.",
    reel.kind === "myth"
      ? "4. Confirm both that the myth claim exists and that the debunk is well-supported."
      : "",
    "",
    "Return JSON matching this schema:",
    "{",
    '  "confidence": "high" | "medium" | "low",',
    '  "verifiedClaim": string,',
    '  "strongestSource": { "title": string, "url": string, "year": number | null },',
    '  "concerns": string | null,',
    '  "recommendation": "publish" | "revise" | "drop"',
    "}",
  ]
    .filter(Boolean)
    .join("\n");

// ---------------------------------------------------------------------------
// Verification call. Two-tier fallback like daily-scene.ts: structured
// output first, plain generateText + manual parse if Sonar refuses to
// honour the schema. Throws if both fail — the caller decides whether
// to retry, drop the item, or alert.
// ---------------------------------------------------------------------------

const sonarPro = perplexity("sonar-pro");

export async function factCheckContentReel(
  reel: ContentReel,
): Promise<FactCheckResult> {
  const prompt = buildUserPrompt(reel);

  try {
    const result = await generateText({
      model: sonarPro,
      output: Output.object({ schema: factCheckResultSchema }),
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.2,
    });
    if (result.output) {
      return {
        ...result.output,
        meta: {
          promptTokens: result.usage?.inputTokens,
          completionTokens: result.usage?.outputTokens,
          finishReason: result.finishReason,
        },
      };
    }
  } catch (err) {
    console.warn(
      "[factCheck] structured output failed, falling back to text parse:",
      err instanceof Error ? err.message : err,
    );
  }

  // Fallback: ask for raw text, parse manually.
  const result = await generateText({
    model: sonarPro,
    system: `${SYSTEM_PROMPT}\n\nIMPORTANT: Respond with valid JSON matching the schema. No prose outside the JSON.`,
    prompt,
    temperature: 0.2,
  });

  // Sonar sometimes wraps JSON in ```json fences; strip them defensively.
  const cleaned = result.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed = factCheckResultSchema.parse(JSON.parse(cleaned));
  return {
    ...parsed,
    meta: {
      promptTokens: result.usage?.inputTokens,
      completionTokens: result.usage?.outputTokens,
      finishReason: result.finishReason,
    },
  };
}

// ---------------------------------------------------------------------------
// Convenience: should this reel be allowed to publish?
// Caller can use this; production policy may add other gates (e.g.
// minimum age of source).
// ---------------------------------------------------------------------------

export const isPublishable = (
  result: FactCheckResult,
  minConfidence: FactCheckConfidence = "high",
): boolean => {
  if (result.recommendation !== "publish") return false;
  if (minConfidence === "high" && result.confidence !== "high") return false;
  if (minConfidence === "medium" && result.confidence === "low") return false;
  return true;
};
