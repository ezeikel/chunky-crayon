/**
 * News discovery — the Perplexity half of the news engine.
 *
 * Per run:
 *   1. Run the NEWS_VEINS live-search queries in parallel (Perplexity
 *      Sonar). Each returns candidate articles with URLs + summaries.
 *   2. Parse to a flat candidate list, drop ones older than 14 days /
 *      missing a URL, dedup by URL.
 *   3. Score each candidate's engagement signals (model-rated), combine +
 *      clamp via the pure `scoreEngagement`. Keep the highest.
 *   4. Verify the winner's URL is reachable (Perplexity hallucinates URLs).
 *   5. Script it into OrganicContent.
 *
 * The caller (worker news-discover job) then runs the brand-safety jury,
 * fact-check confidence, and the recent-dedup against the DB before
 * upserting an OrganicPost. Discovery itself stays DB-free and pure-ish
 * (only network/LLM), mirroring the satellite-blog topic engine.
 */

import { generateText, Output } from "ai";
import { z } from "zod";

import { models } from "../../models";
import { NEWS_DISCOVERY_SYSTEM, NEWS_VEINS, type NewsVein } from "./prompts";
import {
  MIN_PUBLISHABLE_SCORE,
  scoreEngagement,
  type EngagementSignals,
} from "./scoring";
import { fetchArticleText } from "../shared/article";
import { groundedScript, verifyGrounding } from "../shared/grounding";
import { isDuplicateOfRecent, type RecentItem } from "../shared/dedup";
import type { OrganicContent, OrganicCategory } from "../types";

const candidateListSchema = z.object({
  articles: z.array(
    z.object({
      headline: z.string(),
      summary: z.string(),
      url: z.string(),
      publishedWithin14Days: z.boolean(),
    }),
  ),
});

export type NewsCandidate = {
  headline: string;
  summary: string;
  url: string;
  category: OrganicCategory;
  score: number;
};

const today = (): string => new Date().toISOString().slice(0, 10);

// Hosts that aren't credible news articles. Perplexity sometimes returns a
// YouTube/Reddit/social link even though the prompt asks for articles, and
// those pass a HEAD 200 check, so we hard-filter by host. A reel built off a
// YouTube video link is off-brand and the source card looks broken.
const BLOCKED_HOSTS = [
  "youtube.com",
  "youtu.be",
  "reddit.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "threads.net",
];

export const isCredibleArticleUrl = (url: string): boolean => {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return !BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`));
  } catch {
    return false;
  }
};

async function searchVein(vein: NewsVein): Promise<NewsCandidate[]> {
  try {
    const { output } = await generateText({
      model: models.search,
      system: NEWS_DISCOVERY_SYSTEM,
      prompt: `Today is ${today()}. ${vein.query}`,
      output: Output.object({ schema: candidateListSchema }),
      temperature: 0.3,
    });
    if (!output?.articles?.length) return [];
    return output.articles
      .filter((a) => a.publishedWithin14Days && isCredibleArticleUrl(a.url))
      .map((a) => ({
        headline: a.headline,
        summary: a.summary,
        url: a.url,
        category: vein.category,
        score: 0,
      }));
  } catch (err) {
    console.warn(
      `[news-discovery] vein ${vein.id} failed:`,
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

const signalSchema = z.object({
  debate: z.number(),
  relatability: z.number(),
  timeliness: z.number(),
  visualClarity: z.number(),
  toxicity: z.number(),
});

async function scoreCandidate(c: NewsCandidate): Promise<number> {
  try {
    const { output } = await generateText({
      model: models.analytics,
      system:
        "You rate how a parenting/teaching news story would perform on social, returning sub-signals 0..1. Be calibrated, not generous.",
      prompt: [
        `Headline: ${c.headline}`,
        `Summary: ${c.summary}`,
        "",
        "Rate each 0..1:",
        "- debate: will parents/teachers argue or weigh in?",
        "- relatability: does it hit a real weekly pain?",
        "- timeliness: is it fresh/timely?",
        "- visualClarity: easy to summarise in a 15-30s reel?",
        "- toxicity: is it divisive in a culture-war / pile-on way (HIGH is bad)?",
        "JSON only.",
      ].join("\n"),
      output: Output.object({ schema: signalSchema }),
      temperature: 0,
    });
    return scoreEngagement(output as EngagementSignals);
  } catch {
    return 0;
  }
}

export type DiscoveredNews = {
  content: OrganicContent;
  score: number;
};

export type DiscoverNewsOptions = {
  /** Recently-posted URLs — hard-excluded (exact match). */
  excludeUrls?: string[];
  /** Recently-posted stories — semantic dedup drops same-event candidates. */
  recent?: RecentItem[];
};

/**
 * Full discovery, faithful + deduped:
 *   search → URL-exclude → score → (per winner) semantic-dedup → fetch
 *   real article text → grounded script → verify claims → return.
 *
 * The winner loop tries candidates in score order; any that fails dedup,
 * fetch, grounding, or verification is skipped for the next. Returns the
 * first that clears every gate, or null.
 */
export async function discoverNewsStory(
  opts: DiscoverNewsOptions = {},
): Promise<DiscoveredNews | null> {
  const excludeUrls = opts.excludeUrls ?? [];
  const recent = opts.recent ?? [];
  const veinResults = await Promise.all(NEWS_VEINS.map(searchVein));
  const seen = new Set(excludeUrls.map((u) => u.toLowerCase()));
  const flat: NewsCandidate[] = [];
  for (const list of veinResults) {
    for (const c of list) {
      const key = c.url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      flat.push(c);
    }
  }
  if (flat.length === 0) {
    console.log("[news-discovery] no fresh candidates this run");
    return null;
  }

  // Score all, keep the best above the floor.
  const scored = await Promise.all(
    flat.map(async (c) => ({ ...c, score: await scoreCandidate(c) })),
  );
  scored.sort((a, b) => b.score - a.score);

  for (const winner of scored) {
    if (winner.score < MIN_PUBLISHABLE_SCORE) {
      console.log(
        `[news-discovery] best remaining score ${winner.score.toFixed(2)} below floor ${MIN_PUBLISHABLE_SCORE}; stopping`,
      );
      return null;
    }

    // Semantic dedup — same event from a different outlet as something we
    // already posted? Skip it (URL-exclude alone misses this).
    const dup = await isDuplicateOfRecent({
      candidate: { title: winner.headline, detail: winner.summary },
      recent,
    });
    if (dup.duplicate) {
      console.log(
        `[news-discovery] skipping duplicate: ${winner.headline} (${dup.reason})`,
      );
      continue;
    }

    // Fetch the real article text and GROUND the script on it (not the
    // 2-sentence Perplexity summary) so we never publish an invented stat.
    const article = await fetchArticleText(winner.url);
    if (!article) {
      console.warn(
        `[news-discovery] could not fetch/extract article, trying next: ${winner.url}`,
      );
      continue;
    }
    const script = await groundedScript({
      kind: "news",
      title: winner.headline,
      sourceText: article.text,
    });
    if (!script) {
      console.warn(
        `[news-discovery] grounded script failed, trying next: ${winner.url}`,
      );
      continue;
    }
    const verdict = await verifyGrounding({ script, sourceText: article.text });
    if (!verdict.supported) {
      console.warn(
        `[news-discovery] claims unsupported by source, discarding: ${winner.headline} (${verdict.reason})`,
      );
      continue;
    }

    const content: OrganicContent = {
      hook: script.hook,
      payoff: script.payoff,
      centerBlock: script.centerBlock,
      coverTeaser: script.coverTeaser,
      category: winner.category,
      sourceTitle: winner.headline,
      sourceUrl: winner.url,
    };
    return { content, score: winner.score };
  }
  return null;
}
