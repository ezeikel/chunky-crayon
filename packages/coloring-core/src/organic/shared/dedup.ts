/**
 * Semantic dedup — the "should we post this given what we've already
 * covered" gate that the sister project (PTP) has and the first cut of this
 * engine lacked. URL exclusion alone misses the same event reported by a
 * second outlet (BBC vs Sky on the same policy change). This compares a
 * candidate against recently-posted items and drops near-duplicates.
 *
 * Deliberately a "strict editor": it only flags the SAME underlying event /
 * the same practical tip, NOT merely the same broad topic. Two different
 * screen-time stories in a month is fine; the identical study twice is not.
 * Conservative because a false "duplicate" silently starves the feed.
 *
 * Fails OPEN on error (treats as not-duplicate) — a dedup outage should not
 * block posting; the brand-safety + grounding gates are the hard stops.
 */

import { generateText, Output } from "ai";
import { z } from "zod";

import { models } from "../../models";

export type RecentItem = {
  /** Headline / title / hook — enough to recognise the story. */
  title: string;
  /** Optional extra context (summary / centerBlock). */
  detail?: string;
};

const verdictSchema = z.object({
  duplicate: z
    .boolean()
    .describe(
      "true ONLY if the candidate is the SAME underlying event or the SAME specific tip as one of the recent items",
    ),
  reason: z.string(),
});

/**
 * Returns true if `candidate` is a near-duplicate of any `recent` item.
 * `recent` should be the last ~30 posted items for the same engine/brand.
 */
export async function isDuplicateOfRecent(input: {
  candidate: RecentItem;
  recent: RecentItem[];
}): Promise<{ duplicate: boolean; reason: string }> {
  if (input.recent.length === 0)
    return { duplicate: false, reason: "no recent items" };
  try {
    const { output } = await generateText({
      model: models.analytics,
      system:
        "You are a strict editor preventing repeats in a content feed. You decide if a CANDIDATE covers the SAME underlying event (for news) or the SAME specific tip/activity (for tips) as any RECENT item. Same broad TOPIC is NOT a duplicate (two different screen-time stories are fine). Only the same specific story/tip is a duplicate.",
      prompt: [
        `CANDIDATE:\n- ${input.candidate.title}${input.candidate.detail ? `\n  ${input.candidate.detail}` : ""}`,
        "",
        "RECENT (already posted):",
        ...input.recent
          .slice(0, 30)
          .map((r) => `- ${r.title}${r.detail ? `\n  ${r.detail}` : ""}`),
        "",
        'Is the candidate a duplicate of any recent item? JSON only: { "duplicate": boolean, "reason": string }.',
      ].join("\n"),
      output: Output.object({ schema: verdictSchema }),
      temperature: 0,
    });
    return {
      duplicate: !!output?.duplicate,
      reason: output?.reason ?? "no reason",
    };
  } catch (err) {
    // Fail open — don't let a dedup outage block the feed.
    return {
      duplicate: false,
      reason: `dedup error (treated as unique): ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}
