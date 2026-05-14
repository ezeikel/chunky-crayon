/**
 * SERP research pre-draft step for the daily blog cron.
 *
 * Before Claude drafts a post, we ask Perplexity Sonar (which has
 * built-in web search) to pull the top 3 organic results for the
 * topic + keyword cluster and return parsed structure: estimated word
 * counts, H2 sections, notable elements.
 *
 * The blog prompt then steers Claude to match the SERP's average word
 * count, cover the common sections, and address the gaps competitors
 * miss.
 *
 * Resilience: this is a quality-lift step, not a critical path.
 * Failures return `null` and the pipeline falls back to its previous
 * behavior. We must not regress the daily post's availability for
 * this feature.
 *
 * Cache by topic for the duration of a single cron run so repeated
 * calls (manual retry, test harness) don't hammer Perplexity.
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { models } from "../models";

// Schema. No array .min(N>1) per Anthropic rule. Counts described.
const serpResultSchema = z.object({
  url: z.string().describe("Canonical URL of the result"),
  title: z.string().describe("Page title as shown in the SERP"),
  estimatedWordCount: z
    .number()
    .describe(
      "Best estimate of body word count, excluding headers/footers/comments",
    ),
  h2Sections: z
    .array(z.string())
    .describe(
      "Plain text of the H2 headings found on the page, in document order. 3 to 10 items typical.",
    ),
  notableElements: z
    .array(z.string())
    .describe(
      "Short labels for distinctive page elements (e.g. 'has FAQ block', 'comparison table', 'embedded video', 'numbered list of tips').",
    ),
});

export const serpResearchSchema = z.object({
  topicSearched: z
    .string()
    .describe("Exact phrase searched (echo back the topic)"),
  topResults: z
    .array(serpResultSchema)
    .describe(
      "Top 3 organic content results. Skip Reddit, YouTube, Quora, Pinterest, forums, and SERP feature snippets — they're different intent.",
    ),
  averageWordCount: z
    .number()
    .describe("Mean estimatedWordCount across topResults"),
  commonSections: z
    .array(z.string())
    .describe(
      "H2-style section phrases that appeared on 2 or more of the top results. Phrase them as headings, not sentences.",
    ),
  gaps: z
    .array(z.string())
    .describe(
      "Angles or sub-topics the top results do NOT cover that a new piece could differentiate on. 3 to 6 items.",
    ),
});

export type SerpResult = z.infer<typeof serpResultSchema>;
export type SerpResearch = z.infer<typeof serpResearchSchema>;

const SERP_SYSTEM = `You are an SEO research assistant. You will be given a topic and a keyword cluster. Use your live web search to fetch the top 3 organic content results (not Reddit, YouTube, Pinterest, Quora, forums, or featured snippets) and return their structure.

For each result return: url, title, an estimated word count of the body, the H2 headings in document order, and a few notable element labels.

Then summarize:
- averageWordCount across the 3 results
- commonSections: H2-style phrases that appear on 2 or more of the results
- gaps: angles or sub-topics the top results don't cover (3 to 6 items)

Be specific. "Tips" is not a useful commonSection — "Tips for getting kids started" is. "Mention of cost" is not a gap — "No comparison of crayon brands by paper feel" is.

If you cannot fetch real pages, return your best inferred structure from training data and label any element you're uncertain about by prefixing with "likely: " inside the value.`;

// Per-run cache. Worker process is recycled by systemd between runs,
// so an in-memory Map is fine. Key is the topic string verbatim.
const cache = new Map<string, SerpResearch>();

/**
 * Research the top 3 SERPs for a topic + keyword cluster.
 *
 * Returns null on failure. Caller must handle null and fall through
 * to drafting without SERP guidance.
 *
 * Budget: aim for under 60s. If the Perplexity call hangs longer we
 * still let the pipeline continue — caller can layer its own timeout.
 */
export async function researchTopSerps(
  topic: string,
  keywords: string[],
): Promise<SerpResearch | null> {
  const cacheKey = topic.trim().toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { output } = await generateText({
      model: models.search,
      system: SERP_SYSTEM,
      prompt: `Topic: "${topic}"

Keyword cluster (use these to refine your search, but the topic is the primary query):
${keywords.slice(0, 20).join(", ")}

Return the top 3 organic content results and the summary fields described in the system prompt.`,
      output: Output.object({ schema: serpResearchSchema }),
      temperature: 0.2,
    });

    if (!output || !output.topResults?.length) {
      console.warn(
        "[serp-research] perplexity returned no results, returning null",
      );
      return null;
    }

    cache.set(cacheKey, output);
    return output;
  } catch (err) {
    console.warn(
      "[serp-research] research failed, post will draft without SERP guidance:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Test-only helper: clear the in-memory cache so a re-run with the
 * same topic doesn't short-circuit.
 */
export function _clearSerpResearchCache() {
  cache.clear();
}
