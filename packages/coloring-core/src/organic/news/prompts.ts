/**
 * News-engine prompts — Perplexity search veins + the reel-script prompt.
 *
 * Sync constants only (no AI calls), so this file carries no 'use server'
 * concern and can be imported by both the worker and any web caller.
 *
 * Veins are the research-ranked parenting/education flashpoints. Each is a
 * scheduled live-search query that surfaces fresh stories parents and
 * teachers argue about. Culture-war / panic veins are deliberately ABSENT
 * — the brand-safety jury is the backstop, but we don't even go fishing
 * in those waters.
 */

import { NO_EM_DASHES_RULE } from "../../utils/copy";

export type NewsVein = {
  id: string;
  /** Maps to OrganicCategory. */
  category:
    | "school-policy"
    | "screen-time"
    | "reading-literacy"
    | "childcare-cost"
    | "school-food"
    | "homework"
    | "teacher-support"
    | "childhood-play";
  /** The live-search query (prefixed with today's date at call time). */
  query: string;
};

export const NEWS_VEINS: NewsVein[] = [
  {
    id: "school-phones",
    category: "school-policy",
    query:
      "UK and US news this week about schools restricting or banning phones, and how parents and teachers reacted. Return article URLs, headlines, and 2-sentence summaries.",
  },
  {
    id: "reading-wars",
    category: "reading-literacy",
    query:
      "Recent UK and US news about how children are taught to read, phonics vs other methods, literacy scores, and reading reform, with parent and teacher reaction.",
  },
  {
    id: "childcare-cost",
    category: "childcare-cost",
    query:
      "Recent UK and US news about childcare and nursery costs, funding changes, waiting lists, and how families are affected.",
  },
  {
    id: "school-food",
    category: "school-food",
    query:
      "Recent UK and US news about school lunches, packed-lunch or snack rules, and food standards, with parent reaction.",
  },
  {
    id: "homework",
    category: "homework",
    query:
      "Recent UK and US news about homework loads in primary or elementary school, schools dropping or adding homework, and the debate about pressure on young children.",
  },
  {
    id: "teacher-support",
    category: "teacher-support",
    query:
      "Recent UK and US news about teacher shortages, class sizes, school funding pressure, and arts or creative-time cuts, framed around the impact on children.",
  },
  {
    id: "screen-time",
    category: "screen-time",
    query:
      "Recent UK and US news and research about children's screen time, paediatric guidance, and creative vs passive screen use, with parent reaction.",
  },
  {
    id: "childhood-play",
    category: "childhood-play",
    query:
      "Recent UK and US news and research about play, creativity, drawing, and 'let kids be kids', including pushback on over-scheduling and early academics.",
  },
];

/** System prompt for the live-search discovery pass. */
export const NEWS_DISCOVERY_SYSTEM = `You are a news scout for Chunky Crayon, a brand whose social audience is parents and teachers. You find real, recent, link-able news stories that this audience would react to, comment on, or share. You return only stories from the last 14 days from credible UK or US outlets. You never invent URLs. You return articles, not opinion.`;

/**
 * Script prompt for turning a chosen story into a reel. Built at call time
 * with the story facts. Enforces the brand voice + the kids-app framing:
 * curious and pro-child, empathetic to both parents and teachers, calm,
 * never partisan, never shaming, no product mention.
 */
export const buildNewsScriptPrompt = (story: {
  headline: string;
  summary: string;
  sourceUrl: string;
}): string =>
  [
    "Turn this news story into a short reel script for parents and teachers.",
    "",
    `Headline: ${story.headline}`,
    `Summary: ${story.summary}`,
    `Source URL: ${story.sourceUrl}`,
    "",
    "Voice + rules:",
    "- Curious, calm, pro-child. Empathetic to BOTH parents and teachers.",
    "- Frame as 'here is what is happening, what do you think', never 'pick a side and fight'.",
    "- Punch up at systems and policies, never down at individual parents, teachers, or children.",
    "- No party-political framing. No product mention. No 'AI' framing.",
    "- US-friendly spelling.",
    `- ${NO_EM_DASHES_RULE}`,
    "",
    "Return JSON with exactly these fields:",
    '  "hook": a problem/curiosity-first opening line (max ~16 words),',
    '  "centerBlock": a 1 to 3 word reveal phrase that lands big on screen,',
    '  "payoff": one or two sentences that end on a genuine question to drive comments,',
    '  "coverTeaser": a question-shaped line for the cover image.',
    "JSON only.",
  ].join("\n");
