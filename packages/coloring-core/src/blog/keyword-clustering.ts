/**
 * Keyword cluster expansion for the daily blog cron.
 *
 * Each BLOG_TOPIC has ~5-10 keywords. To give Claude usable H2/H3
 * phrase candidates instead of having it invent them, we expand each
 * topic into a 15-25-keyword cluster (primary + secondary + question
 * forms + semantic neighbors) before drafting the post.
 *
 * Uses Claude Sonnet 4.5 — this is pattern expansion, not web search.
 * Claude already knows how parents Google. Perplexity would be overkill
 * and slower.
 *
 * Resilience: failures fall back to a minimal cluster shaped from the
 * topic's existing flat keywords list so the daily post still ships.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { BlogTopic } from "./topics";

const claudeModel = anthropic("claude-sonnet-4-5-20250929");

// Schema notes:
//   - No `.min(N)` with N > 1 on arrays (Anthropic schema rule).
//   - Counts are described in `.describe()` strings and validated /
//     trimmed at runtime by the caller if needed. Claude reliably
//     respects the described counts on Sonnet 4.5.
export const expandedClusterSchema = z.object({
  primary: z
    .string()
    .describe(
      "The single strongest target keyword for this topic. Pick the one most likely to be the page's primary query.",
    ),
  secondary: z
    .array(z.string())
    .describe(
      "10 to 15 close variants and long-tail forms of the primary keyword. Lowercase, no duplicates, no punctuation.",
    ),
  questions: z
    .array(z.string())
    .describe(
      "5 to 8 question-form keywords parents would actually type into Google (e.g. 'why do kids love coloring dinosaurs', 'how long should a 4 year old color'). Good as FAQ H3s.",
    ),
  semantic: z
    .array(z.string())
    .describe(
      "5 to 10 broader semantically related terms a writer would weave through the body (e.g. 'fine motor skills', 'screen-free play', 'rainy day activities').",
    ),
});

export type ExpandedCluster = z.infer<typeof expandedClusterSchema>;

const CLUSTER_SYSTEM = `You are an SEO research assistant for a family-friendly coloring page brand. You expand a single blog topic into a focused keyword cluster a parenting-blog writer would actually target.

Rules:
- Lowercase everything. Strip punctuation except hyphens inside compound words.
- No duplicates across the four buckets.
- Use American English spellings (color, favorite, behavior). Never use UK-only words like "half-term" or "holiday" when the US reading is Christmas.
- Long-tail bias: prefer "calming coloring pages for adhd kids" over "adhd coloring".
- Question forms must read like real Google searches, not formal English. "how to get a 3 year old to color inside the lines" is good. "What Are the Benefits of Coloring for Children?" is not.
- No brand names. No competitor names.`;

function fallbackCluster(topic: BlogTopic): ExpandedCluster {
  // Best-effort minimal cluster when the expansion call fails. Better
  // than blocking the daily post on a single API failure.
  const keywords = topic.keywords.filter(Boolean);
  const primary = keywords[0] ?? topic.topic.toLowerCase();
  const secondary = keywords.slice(1).map((k) => k.toLowerCase());
  return {
    primary: primary.toLowerCase(),
    secondary,
    questions: [],
    semantic: [],
  };
}

/**
 * Expand a blog topic into a 15-25-keyword cluster. Falls back to a
 * minimal cluster from the existing flat keywords list on failure so
 * the daily post still ships.
 */
export async function expandKeywordCluster(
  topic: BlogTopic,
): Promise<ExpandedCluster> {
  try {
    const { output } = await generateText({
      model: claudeModel,
      system: CLUSTER_SYSTEM,
      prompt: `Topic: "${topic.topic}"
Existing seed keywords: ${topic.keywords.join(", ")}

Expand this into a keyword cluster a parenting-blog SEO writer would target. Include the primary keyword, 10 to 15 secondary long-tails, 5 to 8 question forms, and 5 to 10 semantic neighbors. No duplicates across buckets.`,
      output: Output.object({ schema: expandedClusterSchema }),
      temperature: 0.4,
    });

    if (!output) {
      return fallbackCluster(topic);
    }

    // Light runtime tidy: ensure no duplicates across buckets, drop
    // empties, cap each bucket at the upper bound from the prompt so
    // the H2/H3 list doesn't get unwieldy.
    const seen = new Set<string>();
    const dedupe = (xs: string[], cap: number) => {
      const out: string[] = [];
      for (const raw of xs) {
        const k = raw.trim().toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(k);
        if (out.length >= cap) break;
      }
      return out;
    };

    const primary = output.primary.trim().toLowerCase();
    seen.add(primary);
    const secondary = dedupe(output.secondary ?? [], 15);
    const questions = dedupe(output.questions ?? [], 8);
    const semantic = dedupe(output.semantic ?? [], 10);

    return { primary, secondary, questions, semantic };
  } catch (err) {
    console.warn(
      "[keyword-clustering] expansion failed, using fallback cluster:",
      err instanceof Error ? err.message : err,
    );
    return fallbackCluster(topic);
  }
}
