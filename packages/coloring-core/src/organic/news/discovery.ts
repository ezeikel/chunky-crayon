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
import {
  NEWS_DISCOVERY_SYSTEM,
  NEWS_VEINS,
  buildNewsScriptPrompt,
  type NewsVein,
} from "./prompts";
import {
  MIN_PUBLISHABLE_SCORE,
  scoreEngagement,
  type EngagementSignals,
} from "./scoring";
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

async function urlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type DiscoveredNews = {
  content: OrganicContent;
  score: number;
};

/**
 * Full discovery: search → dedup → score → verify → script. Returns the
 * single best publishable story, or null if nothing cleared the floor.
 * `excludeUrls` lets the caller pass recently-posted URLs so we don't
 * re-surface the same story (DB-driven, kept out of here).
 */
export async function discoverNewsStory(
  excludeUrls: string[] = [],
): Promise<DiscoveredNews | null> {
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
        `[news-discovery] best score ${winner.score.toFixed(2)} below floor ${MIN_PUBLISHABLE_SCORE}; skipping`,
      );
      return null;
    }
    if (!(await urlReachable(winner.url))) {
      console.warn(
        `[news-discovery] winner URL unreachable, trying next: ${winner.url}`,
      );
      continue;
    }
    const content = await scriptStory(winner);
    if (content) return { content, score: winner.score };
  }
  return null;
}

async function scriptStory(c: NewsCandidate): Promise<OrganicContent | null> {
  const scriptSchema = z.object({
    hook: z.string(),
    centerBlock: z.string(),
    payoff: z.string(),
    coverTeaser: z.string(),
  });
  try {
    const { output } = await generateText({
      model: models.creative,
      prompt: buildNewsScriptPrompt({
        headline: c.headline,
        summary: c.summary,
        sourceUrl: c.url,
      }),
      output: Output.object({ schema: scriptSchema }),
      temperature: 0.5,
    });
    if (!output?.hook) return null;
    return {
      hook: output.hook,
      payoff: output.payoff,
      centerBlock: output.centerBlock,
      coverTeaser: output.coverTeaser,
      category: c.category,
      sourceTitle: c.headline,
      sourceUrl: c.url,
    };
  } catch (err) {
    console.warn(
      "[news-discovery] scripting failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
