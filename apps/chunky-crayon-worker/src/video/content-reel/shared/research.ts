/**
 * Perplexity Sonar deep-research for ContentReel candidate generation.
 *
 * Two distinct calls to Sonar in this file:
 *   1. researchCandidates({ kind, count }) — Sonar deep-research
 *      brainstorms candidates (e.g. 30 myth claims about kid development
 *      that parents commonly believe). Returns lightweight drafts.
 *   2. (in factCheck.ts) factCheckContentReel(reel) — Sonar-pro verifies
 *      a specific draft against primary sources, returns confidence +
 *      strongest-source URL.
 *
 * Why two calls and not one:
 *   - Deep-research is expensive (~$0.30–1.20/call). We call it ONCE per
 *     batch to brainstorm, then verify each draft with the cheaper
 *     sonar-pro tier.
 *   - Generation prompts and verification prompts have different goals.
 *     Conflating them ("brainstorm AND verify in one call") loses
 *     fidelity on both — the model picks "creative" over "accurate" for
 *     the brainstorm half, then doesn't double-check the verification
 *     half against fresh sources.
 *
 * The schema returned by research is INTENTIONALLY light — just enough
 * to fact-check. Cover teaser, voice tokens, etc. get added later by
 * dedicated scripts.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { perplexity } from "@ai-sdk/perplexity";
import { generateText, Output } from "ai";
import { z } from "zod";

import type { ContentReel, ContentReelKind } from "./types";

// ---------------------------------------------------------------------------
// Lightweight draft schema — what we ask Sonar to brainstorm.
// ---------------------------------------------------------------------------

const draftSchema = z.object({
  /** Stable slug — Sonar should kebab-case the topic. */
  id: z.string(),
  hook: z.string().describe("Voice-friendly setup line. Problem-first."),
  payoff: z
    .string()
    .describe(
      "Voice-friendly resolution narration with the actual debunk/answer.",
    ),
  centerBlock: z
    .string()
    .describe(
      "For myths: 'False' or 'True'. For stats: a number. " +
        "For tips: a short action phrase. For facts: a short bold phrase.",
    ),
  sourceTitle: z.string().describe("A plausible primary source title."),
  sourceUrl: z
    .string()
    .describe(
      "URL to the strongest source Sonar can find. Real URLs only — " +
        "verification step will catch fakes.",
    ),
  category: z.string().describe("Category slug, e.g. 'sleep', 'fine-motor'."),
});

const draftsSchema = z.object({ drafts: z.array(draftSchema) });

export type ContentReelDraft = z.infer<typeof draftSchema>;

// ---------------------------------------------------------------------------
// Per-kind research prompts.
// ---------------------------------------------------------------------------

const RESEARCH_SYSTEM = `You are researching content for a parenting brand that posts daily short-form videos about kids, coloring, brain development, screen time, and creativity.

Generate engaging candidates that meet ALL of these:
- Backed by real, peer-reviewed or authoritative-institution research
- Have a clear "tap to learn" hook for parents
- Are NOT condescending or fear-mongering
- Use US-friendly spelling and phrasing

Output valid JSON only. Each draft must include a hook, payoff, center block, source title, source URL, and category.`;

const KIND_PROMPTS: Record<ContentReelKind, string> = {
  myth: `Brainstorm {{COUNT}} parenting myths around kid development, coloring, screen time, sleep, or learning.

Each myth must be:
- Genuinely held by parents in 2025 (not strawmen)
- Debunked by peer-reviewed research or major institution (AAP, WHO, etc.)
- Not politically charged
- Not about vaccines, illness, or major health controversies

For each myth:
- hook: state the myth as parents commonly say it
- payoff: deliver the debunk with the strongest evidence
- centerBlock: "False" or "True" — the verdict on the original claim
- sourceTitle, sourceUrl: the strongest debunking source
- category: pick from screen-time, attention, anxiety, fine-motor, creativity, family-bonding, parenting-tip, brain-development, sleep, common-misconception`,

  fact: `Brainstorm {{COUNT}} surprising facts about kid brain development, learning, fine-motor skills, or how coloring/play helps.

Each fact must be:
- Surprising to most parents
- Backed by peer-reviewed research
- Not an opinion or "study suggests" — must be settled science
- Concise (the centerBlock should be a short bold phrase or number)

For each fact:
- hook: a question or setup that makes parents want to know
- payoff: the answer with research backing
- centerBlock: short phrase or number that lands as the reveal
- sourceTitle, sourceUrl: peer-reviewed paper or institution
- category: pick from the same list as above`,

  tip: `Brainstorm {{COUNT}} actionable parenting tips around coloring, creative play, screen-time management, or kid bonding.

Each tip must be:
- Concrete (parents can do it tonight)
- Low-effort (no special materials needed)
- Backed by research OR established parenting expert wisdom (citing source is preferred but optional)
- Not generic ("spend time with your kid" — too vague)

For each tip:
- hook: pose the problem the tip solves
- payoff: explain the tip and why it works
- centerBlock: 3-5 word action phrase ("Color before bedtime", "Let them lead")
- sourceTitle, sourceUrl: optional but include if research-backed
- category: pick from the same list`,

  stat: `Brainstorm {{COUNT}} surprising statistics about kids, development, screen time, creativity, or coloring impact.

Each stat must be:
- A specific number (percentage, hours, age, count)
- From peer-reviewed research or major institution survey
- Recent (post-2018 ideally)
- Surprising to most parents

For each stat:
- hook: setup that contextualises the number
- payoff: the implication of the number
- centerBlock: the number itself ("7+ hrs", "-15%", "+18%")
- sourceTitle, sourceUrl: peer-reviewed paper or major survey
- category: pick from the same list`,
};

// ---------------------------------------------------------------------------
// Research call. Tier defaults to sonar-pro (cheap, fast) — fine for
// myths/tips/stats where Sonar's brainstorm + per-item verify catches
// most issues.
//
// Deep-research is the right tool for FACTS specifically because:
//   - Facts brand-risk is high (a wrong "did you know?" damages trust)
//   - sonar-pro tends to invent plausible Harvard/NIH URLs that fail
//     verification (we saw 0/5 publishable in earlier batches)
//   - deep-research grounds each claim against real fetched sources, so
//     the URLs survive the fact-check verify pass
//
// Cost: sonar-pro ~$0.005/call. Deep-research ~$0.30-1.20/call. Worth
// the upgrade for facts; overkill for everything else.
// ---------------------------------------------------------------------------

const sonarPro = perplexity("sonar-pro");
const sonarDeepResearch = perplexity("sonar-deep-research");

const MODEL_BY_KIND: Record<ContentReelKind, typeof sonarPro> = {
  stat: sonarPro,
  myth: sonarPro,
  tip: sonarPro,
  // Facts get deep-research because brainstorm-and-cite is the failure
  // mode (sonar-pro invents URLs). DR fetches and grounds.
  fact: sonarDeepResearch,
};

export async function researchCandidates(opts: {
  kind: ContentReelKind;
  count: number;
}): Promise<ContentReelDraft[]> {
  const { kind, count } = opts;
  const model = MODEL_BY_KIND[kind];
  const prompt = KIND_PROMPTS[kind].replace(/\{\{COUNT\}\}/g, String(count));

  // Try structured output first.
  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: draftsSchema }),
      system: RESEARCH_SYSTEM,
      prompt,
      temperature: 0.7,
    });
    if (result.output?.drafts?.length) {
      return result.output.drafts;
    }
  } catch (err) {
    console.warn(
      "[research] structured output failed, falling back to text parse:",
      err instanceof Error ? err.message : err,
    );
  }

  // Fallback: ask for raw text, parse manually. Same per-kind model.
  const result = await generateText({
    model,
    system: `${RESEARCH_SYSTEM}\n\nIMPORTANT: Respond with valid JSON matching: { "drafts": [...] }. No prose outside the JSON.`,
    prompt,
    temperature: 0.7,
  });

  // Strip Sonar deep-research's chain-of-thought wrapper. DR responses
  // start with <think>...</think> reasoning blocks before the body; the
  // sonar-pro tier doesn't include these. Multiline + greedy match because
  // the think block is huge (often 5-10k chars of reasoning).
  const cleaned = result.text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Try direct JSON parse first — sonar-pro usually returns clean JSON.
  // Find the first { and last } to extract just the JSON payload.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const jsonText = cleaned.slice(firstBrace, lastBrace + 1);
      const parsed = draftsSchema.parse(JSON.parse(jsonText));
      return parsed.drafts;
    } catch (err) {
      console.warn(
        "[research] direct JSON parse failed, escalating to Claude extraction:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Last-resort fallback for sonar-deep-research, which often returns
  // long markdown reports instead of JSON. Hand the prose to Claude with
  // a tight extractor prompt — Claude is reliable at structured output
  // from long inputs. Cost: ~$0.01-0.05 per extraction. Worth it because
  // DR was already a $0.30-1.20 call we don't want to throw away.
  return extractDraftsFromProse({ prose: cleaned, kind, count });
}

const claudeExtractor = anthropic("claude-sonnet-4-6");

async function extractDraftsFromProse(opts: {
  prose: string;
  kind: ContentReelKind;
  count: number;
}): Promise<ContentReelDraft[]> {
  const { prose, kind, count } = opts;

  const result = await generateText({
    model: claudeExtractor,
    output: Output.object({ schema: draftsSchema }),
    system:
      "You extract structured ContentReel drafts from a research report. " +
      "Output valid JSON only. Each draft must have id (kebab-case slug), " +
      "hook, payoff, centerBlock, sourceTitle, sourceUrl, category. " +
      "Skip items that lack a real source URL. US-friendly spelling.",
    prompt: [
      `Extract up to ${count} ${kind}-kind ContentReel drafts from this research report.`,
      "",
      "Each draft should have:",
      "- hook: a voice-friendly setup line (problem-first for stats/myths, question-form for facts/tips)",
      "- payoff: the resolution narration (~1-2 sentences with the key finding)",
      "- centerBlock: for stats a number ('7+ hrs'); for facts a short bold phrase; for tips a 3-5 word action; for myths 'False' or 'True'",
      "- sourceTitle / sourceUrl: the strongest cited source. SKIP items where no real URL is given.",
      "- category: pick from screen-time, attention, anxiety, fine-motor, creativity, family-bonding, parenting-tip, brain-development, sleep, common-misconception",
      "",
      "RESEARCH REPORT:",
      prose,
    ].join("\n"),
    temperature: 0.2,
  });

  if (!result.output?.drafts?.length) {
    throw new Error(
      `[research] Claude extraction returned 0 drafts from ${prose.length}-char prose`,
    );
  }
  console.log(
    `[research] Claude extracted ${result.output.drafts.length} drafts from prose`,
  );
  return result.output.drafts;
}

/**
 * Slugify a hook string into a stable kebab-case ID. We do this on our
 * side (instead of trusting Sonar's output) because:
 *   - Sonar often returns numeric IDs ("1", "2", "3") which would
 *     collide across batches.
 *   - Slugifying the hook keeps the ID self-documenting in the DB.
 *   - Stable input → stable output → re-running the same draft is
 *     idempotent (the upsert hits the same row).
 */
function slugifyHook(hook: string, kind: ContentReelKind): string {
  const slug = hook
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${kind}-${slug}`;
}

/**
 * Promote a draft → full ContentReel. Adds the kind, validates the
 * category against the type union, fills in the cover teaser as undefined
 * (separate generator handles those), and slugifies the ID from the hook
 * (Sonar's draft.id is unreliable — often "1", "2", "3"), and returns a
 * value the rest of the pipeline can pass into factCheckContentReel +
 * the DB.
 */
export function draftToContentReel(
  draft: ContentReelDraft,
  kind: ContentReelKind,
): ContentReel {
  // Validate category — Sonar might invent slugs we don't have. If the
  // category isn't in our type union, default to a sensible one per kind.
  const validCategories = new Set([
    "screen-time",
    "attention",
    "anxiety",
    "fine-motor",
    "creativity",
    "family-bonding",
    "parenting-tip",
    "brain-development",
    "sleep",
    "common-misconception",
  ]);
  const fallbackCategoryByKind = {
    stat: "screen-time",
    fact: "brain-development",
    tip: "parenting-tip",
    myth: "common-misconception",
  } as const;
  const category = validCategories.has(draft.category)
    ? (draft.category as ContentReel["category"])
    : fallbackCategoryByKind[kind];

  return {
    id: slugifyHook(draft.hook, kind),
    kind,
    hook: draft.hook,
    payoff: draft.payoff,
    centerBlock: draft.centerBlock,
    sourceTitle: draft.sourceTitle,
    sourceUrl: draft.sourceUrl,
    category,
  };
}
