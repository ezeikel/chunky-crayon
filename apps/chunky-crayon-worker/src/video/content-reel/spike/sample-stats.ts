import type { CaptionToken, ContentReel } from "../shared/types";

/**
 * Hand-tuned per-word timings for the spike. Production reels will pull
 * these from ElevenLabs's `with_timestamps` response — no manual work.
 *
 * Helper: spread N words evenly across `totalMs` so each word gets a
 * roughly equal slice. Slightly imperfect but readable in the spike.
 */
const tokenize = (text: string, totalMs: number): CaptionToken[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const slice = totalMs / words.length;
  return words.map((text, i) => ({
    text,
    fromMs: Math.round(i * slice),
    toMs: Math.round((i + 1) * slice),
  }));
};

/**
 * Three sample stat-kind ContentReels for the Phase 0 visual spike — one
 * per template. These are placeholders to validate the visual system;
 * the real catalogue will live at
 * `packages/coloring-core/src/content-reels/catalogue.ts` (Phase B) with
 * Perplexity-fact-checked items spanning all four kinds.
 *
 * Each item includes a `coverTeaser` so the Satori cover renders the
 * question form (scroll stop) while the reel uses the declarative
 * `hook` for voiceover. Phase A2 hand-writes these; Phase B's pipeline
 * generates them via Claude with kind-specific prompts.
 */

export const SHOCK_STAT_SAMPLE: ContentReel = {
  id: "screen-time-7-hours-2025",
  kind: "stat",
  hook: "Kids aged 5-8 spend over 7 hours a day on screens.",
  hookTokens: tokenize(
    "Kids aged 5-8 spend over 7 hours a day on screens.",
    3000,
  ),
  payoff: "20 minutes of focused offline play rebuilds attention spans.",
  payoffTokens: tokenize(
    "20 minutes of focused offline play rebuilds attention spans.",
    3600,
  ),
  centerBlock: "7+ hrs",
  coverTeaser: "How long are kids 5–8 really on screens each day?",
  sourceTitle: "Common Sense Media, 2025",
  sourceUrl: "https://www.commonsensemedia.org/research",
  category: "screen-time",
};

export const WARM_STAT_SAMPLE: ContentReel = {
  id: "coloring-cortisol-drexel-2016",
  kind: "stat",
  hook: "Your kid's anxious brain has an off-switch you already own.",
  payoff: "20 minutes of coloring lowers cortisol levels by up to 15%.",
  centerBlock: "-15%",
  coverTeaser: "How much can 20 minutes of coloring lower a kid's stress?",
  sourceTitle: "Drexel University, 2016",
  sourceUrl: "https://drexel.edu/news/archive/2016/june/art-therapy-cortisol",
  category: "anxiety",
};

export const QUIET_STAT_SAMPLE: ContentReel = {
  id: "fine-motor-coloring-age-6",
  kind: "stat",
  hook: "Pre-K teachers can spot the difference by age six.",
  payoff:
    "Children who color regularly show 18% better fine-motor scores entering school.",
  centerBlock: "+18%",
  coverTeaser:
    "By how much do regular colorers outperform on fine-motor tests?",
  sourceTitle: "Journal of Early Childhood Research, 2019",
  sourceUrl: "https://journals.sagepub.com/home/ecr",
  category: "fine-motor",
};
