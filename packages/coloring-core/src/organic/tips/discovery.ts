/**
 * Parent Tips discovery — the dynamic, grounded replacement for the old
 * hardcoded dataset. Mirrors the news engine, reusing the shared
 * fetch/ground/verify/dedup machinery, but for evergreen save-worthy tips
 * (drills, activities, recipes, money-saving, things to do) rather than
 * news flashpoints.
 *
 * Per run:
 *   1. Run the TIP_VEINS live searches in parallel (Perplexity Sonar).
 *   2. Flatten + URL-exclude + credible-host filter.
 *   3. Per candidate (rotated so we don't always lead with the same vein):
 *      semantic-dedup vs recent tips → fetch real source → grounded
 *      "tip" script → verify claims → QUALITY check (is it specific +
 *      genuinely useful, not generic) → return.
 *
 * Returns the first candidate that clears every gate, or null.
 */

import { generateText, Output } from "ai";
import { z } from "zod";

import { models } from "../../models";
import { TIP_DISCOVERY_SYSTEM, TIP_VEINS, type TipVein } from "./veins";
import { isCredibleArticleUrl } from "../news/discovery";
import { fetchArticleText } from "../shared/article";
import { groundedScript, verifyGrounding } from "../shared/grounding";
import { isDuplicateOfRecent, type RecentItem } from "../shared/dedup";
import type { OrganicContent, OrganicCategory } from "../types";

const TIP_AUDIENCE = "parents of children aged 3 to 8";

const candidateListSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      url: z.string(),
    }),
  ),
});

export type TipCandidate = {
  title: string;
  summary: string;
  url: string;
  category: OrganicCategory;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const VEIN_CATEGORY_TO_DB: Record<TipVein["category"], OrganicCategory> = {
  "childhood-play": "childhood-play",
  "reading-literacy": "reading-literacy",
  "school-food": "school-food",
  creativity: "creativity",
  nostalgia: "nostalgia",
};

async function searchVein(vein: TipVein): Promise<TipCandidate[]> {
  try {
    const { output } = await generateText({
      model: models.search,
      system: TIP_DISCOVERY_SYSTEM,
      prompt: `Today is ${today()}. ${vein.query}`,
      output: Output.object({ schema: candidateListSchema }),
      temperature: 0.4,
    });
    if (!output?.items?.length) return [];
    return output.items
      .filter((i) => isCredibleArticleUrl(i.url))
      .map((i) => ({
        title: i.title,
        summary: i.summary,
        url: i.url,
        category: VEIN_CATEGORY_TO_DB[vein.category],
      }));
  } catch (err) {
    console.warn(
      `[tips-discovery] vein ${vein.id} failed:`,
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

const qualitySchema = z.object({
  useful: z
    .boolean()
    .describe("true only if specific + genuinely save-worthy, not generic"),
  reason: z.string(),
});

/**
 * Quality gate — a tip must be specific and genuinely useful enough that a
 * parent would save it, not generic filler ("spend time with your kids").
 * Fails closed (treats as not-useful) on error.
 */
async function passesQuality(content: OrganicContent): Promise<boolean> {
  try {
    const { output } = await generateText({
      model: models.analytics,
      system:
        "You judge whether a parenting tip reel is SPECIFIC and genuinely SAVE-WORTHY for a parent of a 3-8 year old, versus generic filler. Specific drill/recipe/activity/deal = useful. Vague platitudes ('spend quality time', 'read more') = not useful.",
      prompt: [
        `hook: ${content.hook}`,
        `centerBlock: ${content.centerBlock}`,
        `payoff: ${content.payoff}`,
        "",
        'Is this specific + save-worthy? JSON only: { "useful": boolean, "reason": string }.',
      ].join("\n"),
      output: Output.object({ schema: qualitySchema }),
      temperature: 0,
    });
    if (!output?.useful) {
      console.log(
        `[tips-discovery] quality reject: ${output?.reason ?? "no reason"}`,
      );
    }
    return !!output?.useful;
  } catch {
    return false;
  }
}

export type DiscoveredTip = {
  content: OrganicContent;
};

export type DiscoverTipOptions = {
  excludeUrls?: string[];
  recent?: RecentItem[];
};

export async function discoverTip(
  opts: DiscoverTipOptions = {},
): Promise<DiscoveredTip | null> {
  const excludeUrls = opts.excludeUrls ?? [];
  const recent = opts.recent ?? [];
  const veinResults = await Promise.all(TIP_VEINS.map(searchVein));
  const seen = new Set(excludeUrls.map((u) => u.toLowerCase()));

  // Interleave candidates across veins (round-robin) so we don't always
  // exhaust one topic before trying another — keeps topic variety.
  const flat: TipCandidate[] = [];
  const maxLen = Math.max(0, ...veinResults.map((r) => r.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of veinResults) {
      const c = list[i];
      if (!c) continue;
      const key = c.url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      flat.push(c);
    }
  }
  if (flat.length === 0) {
    console.log("[tips-discovery] no fresh candidates this run");
    return null;
  }

  for (const cand of flat) {
    const dup = await isDuplicateOfRecent({
      candidate: { title: cand.title, detail: cand.summary },
      recent,
    });
    if (dup.duplicate) {
      console.log(
        `[tips-discovery] skipping duplicate: ${cand.title} (${dup.reason})`,
      );
      continue;
    }

    const article = await fetchArticleText(cand.url);
    if (!article) {
      console.warn(
        `[tips-discovery] could not fetch/extract, trying next: ${cand.url}`,
      );
      continue;
    }
    const script = await groundedScript({
      kind: "tip",
      title: cand.title,
      sourceText: article.text,
      audience: TIP_AUDIENCE,
    });
    if (!script) continue;
    const verdict = await verifyGrounding({ script, sourceText: article.text });
    if (!verdict.supported) {
      console.warn(
        `[tips-discovery] claims unsupported, discarding: ${cand.title} (${verdict.reason})`,
      );
      continue;
    }

    const content: OrganicContent = {
      hook: script.hook,
      payoff: script.payoff,
      centerBlock: script.centerBlock,
      coverTeaser: script.coverTeaser,
      category: cand.category,
      sourceTitle: cand.title,
      sourceUrl: cand.url,
    };
    if (!(await passesQuality(content))) continue;
    return { content };
  }
  return null;
}
