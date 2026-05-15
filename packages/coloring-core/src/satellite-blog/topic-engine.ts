/**
 * Dynamic, SEO-grounded topic discovery for satellite blogs.
 *
 * Per run, for a site:
 *  1. discoverTopic() — Perplexity (live web search) finds ONE underserved
 *     long-tail parent-intent query the site should own, plus a SERP gist.
 *  2. vetTopic() — a 3-judge jury (cheap tier) gates it: on-brand,
 *     non-harmful, NOT cannibalizing Chunky Crayon's coloring SERPs, not a
 *     near-duplicate of already-published topics, genuinely useful.
 *  3. The pipeline retries discovery up to 3x feeding the rejection reason
 *     back; if all fail it falls back to the site's static seed `topics`
 *     so a post still ships, and alerts admin.
 *
 * Anti-cannibalization is first-class: satellites funnel TO chunkycrayon.com
 * and must never compete with it for "coloring" SERPs, or Google splits the
 * ranking signal across the same owner's properties.
 *
 * Resilience mirrors serp-research.ts: failures degrade to the seed list,
 * never break the daily post.
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { models } from "../models";
import { runJury } from "../jury";
import type { SatelliteSiteConfig, SatelliteBlogTopic } from "./types";

/**
 * Keywords Chunky Crayon already ranks for. Satellite topics must NEVER
 * target these — the satellites drive traffic TO CC, they don't compete
 * with it. Injected into both the discovery prompt and the jury rubric.
 */
export const CC_PROTECTED_KEYWORDS = [
  "coloring page",
  "coloring pages",
  "coloring book",
  "coloring sheet",
  "coloring sheets",
  "printable coloring",
  "free coloring",
  "color by number",
  "coloring for kids",
  "colouring page",
  "colouring book",
];

const discoveredTopicSchema = z.object({
  topic: z
    .string()
    .describe(
      "A specific, long-tail blog post title phrased as the definitive answer to a real parent search. Not a broad category. e.g. 'How to handle a 4-year-old who refuses the morning routine' not 'Morning routines'.",
    ),
  primaryQuery: z
    .string()
    .describe("The underserved search query a parent would actually type"),
  keywords: z
    .array(z.string())
    .describe(
      "5 to 8 related search terms to weave in naturally. Long-tail, parent-intent.",
    ),
  serpGist: z
    .string()
    .describe(
      "2-3 sentence summary of what currently ranks for this query and where it's weak (the gap this post fills).",
    ),
  whyUnderserved: z
    .string()
    .describe("One sentence: why existing results don't fully answer this."),
});

export type DiscoveredTopic = z.infer<typeof discoveredTopicSchema>;

const buildDiscoverySystem = (site: SatelliteSiteConfig) =>
  `You are an SEO content strategist for ${site.displayName} (${site.domain}).

Niche: ${site.niche}

Your job: using live web search, find ONE underserved long-tail search query that parents in this niche actually type into Google, where the existing top results are weak, thin, or miss an angle — a query ${site.displayName} could realistically own with one excellent post.

HARD RULES:
- The topic MUST be squarely in this site's niche (${site.niche}). Do not drift into adjacent products.
- The topic MUST NOT target, mention as the primary subject, or be optimized for any of these protected terms (a sister site, Chunky Crayon, owns these — we drive traffic TO it, we must not compete with it for these SERPs): ${CC_PROTECTED_KEYWORDS.join(", ")}. A post may mention coloring in passing as a reward idea, but the post's TARGET QUERY and keywords must be about ${site.niche}, never about coloring pages/books themselves.
- Prefer specific, problem-shaped queries ("how to...", "what to do when...", "X for Y-year-olds") over broad heads.
- It must be genuinely useful to a stressed parent, and safe — no medical/clinical/diagnostic advice (ADHD, autism, mental health) presented as authoritative guidance.

Return the topic, the primary query, a keyword cluster, a gist of what currently ranks and its weakness, and why it's underserved.`;

const buildDiscoveryPrompt = (
  alreadyCovered: string[],
  rejectionFeedback: string | null,
) => `Find one underserved topic now.

${
  alreadyCovered.length
    ? `Already published on this site (do NOT pick anything that overlaps or is a near-duplicate of these):\n${alreadyCovered
        .slice(0, 60)
        .map((t) => `- ${t}`)
        .join("\n")}`
    : "Nothing published yet on this site."
}
${
  rejectionFeedback
    ? `\nA previous attempt this run was REJECTED for: "${rejectionFeedback}". Pick a meaningfully different topic that avoids that problem.`
    : ""
}

Use live search. Return the structured fields.`;

/**
 * Discover one candidate topic via Perplexity. Returns null on failure
 * (caller retries or falls back to seed list).
 */
export async function discoverTopic(
  site: SatelliteSiteConfig,
  alreadyCovered: string[],
  rejectionFeedback: string | null = null,
): Promise<DiscoveredTopic | null> {
  try {
    const { output } = await generateText({
      model: models.search,
      system: buildDiscoverySystem(site),
      prompt: buildDiscoveryPrompt(alreadyCovered, rejectionFeedback),
      output: Output.object({ schema: discoveredTopicSchema }),
      temperature: 0.4,
    });
    if (!output?.topic || !output.keywords?.length) {
      console.warn(
        `[topic-engine][${site.slug}] discovery returned no usable topic`,
      );
      return null;
    }
    return output;
  } catch (err) {
    console.warn(
      `[topic-engine][${site.slug}] discovery failed:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

const juryVerdictSchema = z.object({
  approved: z
    .boolean()
    .describe("true only if the topic passes ALL rubric checks"),
  reason: z
    .string()
    .describe(
      "If rejected, the single most important reason, phrased so the next discovery attempt can avoid it. If approved, a brief why.",
    ),
});

type TopicJuryVerdict = z.infer<typeof juryVerdictSchema>;

const buildJurySystem = (site: SatelliteSiteConfig) =>
  `You are vetting a proposed blog topic for ${site.displayName} (${site.domain}). Niche: ${site.niche}.

Approve ONLY if ALL are true:
1. ON-BRAND: squarely within "${site.niche}". Not a drift into an adjacent product or a generic parenting platitude.
2. NOT CANNIBALIZING: the topic's target query/keywords are NOT about and do NOT compete for any of these protected terms owned by a sister site: ${CC_PROTECTED_KEYWORDS.join(", ")}. (Mentioning coloring once as a reward inside a post is fine; the topic being ABOUT coloring pages/books is an automatic reject.)
3. SAFE: no clinical, medical, diagnostic, or therapeutic advice presented as authoritative — especially around ADHD, autism, or mental health. A logistics/parenting-tips angle is fine; "how to treat..." is not.
4. USEFUL & SPECIFIC: a real, specific parent problem with a concrete answer. Not "Tips for parents".
5. NOT A DUPLICATE: meaningfully distinct from the already-covered list provided.

Reply with JSON only: { "approved": boolean, "reason": string }.`;

const buildJuryPrompt = (
  candidate: DiscoveredTopic,
  alreadyCovered: string[],
) => `Proposed topic: "${candidate.topic}"
Primary query: "${candidate.primaryQuery}"
Keywords: ${candidate.keywords.join(", ")}
SERP gist: ${candidate.serpGist}

Already covered on this site:
${
  alreadyCovered.length
    ? alreadyCovered
        .slice(0, 60)
        .map((t) => `- ${t}`)
        .join("\n")
    : "(none yet)"
}

Approve or reject per the rubric. JSON only.`;

/**
 * Gate a candidate topic through a 3-judge cheap-tier jury.
 * Returns { passed, reason } — reason feeds the next discovery retry.
 */
export async function vetTopic(
  site: SatelliteSiteConfig,
  candidate: DiscoveredTopic,
  alreadyCovered: string[],
): Promise<{ passed: boolean; reason: string }> {
  try {
    const verdict = await runJury<TopicJuryVerdict>({
      system: buildJurySystem(site),
      prompt: buildJuryPrompt(candidate, alreadyCovered),
      schema: juryVerdictSchema,
      getPassed: (r) => r.approved,
      tier1: ["haiku-4.5", "gemini-3-flash", "gpt-5.4-mini"],
    });

    const firstReason =
      verdict.verdicts.find((v) => v.ok)?.result?.reason ??
      "rejected by topic jury";
    return { passed: verdict.passed, reason: firstReason };
  } catch (err) {
    // Jury failure shouldn't block the day — treat as a soft reject so
    // the caller retries, and ultimately falls back to the seed list.
    console.warn(
      `[topic-engine][${site.slug}] jury errored, treating as reject:`,
      err instanceof Error ? err.message : err,
    );
    return { passed: false, reason: "topic jury unavailable" };
  }
}

export type ResolvedTopic = {
  topic: string;
  keywords: string[];
  /** Present when dynamically discovered; absent for seed fallback. */
  serpGist?: string;
  source: "dynamic" | "seed";
};

/**
 * Full topic resolution: discover → vet, retry up to `maxAttempts`, then
 * fall back to a random uncovered seed topic. Never returns null unless
 * even the seed list is exhausted (caller then alerts + skips).
 */
export async function resolveTopic(
  site: SatelliteSiteConfig,
  alreadyCovered: string[],
  maxAttempts = 3,
): Promise<{ resolved: ResolvedTopic | null; attempts: string[] }> {
  const attempts: string[] = [];
  let rejectionFeedback: string | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    const candidate = await discoverTopic(
      site,
      alreadyCovered,
      rejectionFeedback,
    );
    if (!candidate) {
      attempts.push(`attempt ${i + 1}: discovery returned nothing`);
      continue;
    }
    const { passed, reason } = await vetTopic(site, candidate, alreadyCovered);
    if (passed) {
      return {
        resolved: {
          topic: candidate.topic,
          keywords: candidate.keywords,
          serpGist: candidate.serpGist,
          source: "dynamic",
        },
        attempts,
      };
    }
    attempts.push(
      `attempt ${i + 1}: "${candidate.topic}" rejected — ${reason}`,
    );
    rejectionFeedback = reason;
  }

  // Fallback: a seed topic not already covered.
  const seed = pickUncoveredSeed(site, alreadyCovered);
  if (seed) {
    return {
      resolved: {
        topic: seed.topic,
        keywords: seed.keywords,
        source: "seed",
      },
      attempts,
    };
  }
  return { resolved: null, attempts };
}

function pickUncoveredSeed(
  site: SatelliteSiteConfig,
  alreadyCovered: string[],
): SatelliteBlogTopic | null {
  const coveredLower = new Set(
    alreadyCovered.map((t) => t.trim().toLowerCase()),
  );
  const uncovered = site.topics.filter(
    (t) => !coveredLower.has(t.topic.trim().toLowerCase()),
  );
  if (uncovered.length === 0) return null;
  return uncovered[Math.floor(Math.random() * uncovered.length)] ?? null;
}
