/**
 * Screen-time / media-use dataset (Ofcom + Pew, hand-structured stats).
 *
 * Debate + solidarity content. CRITICAL framing constraint (research +
 * brand rule): we are a screen-based product, so every screen-time post
 * is harm-reduction / solidarity, never "screens are fine" and never
 * mocking cautious parents. Each row is a real published statistic turned
 * into a non-judgemental, conversation-shaped prompt. The brand-safety
 * jury still vets every built post as a backstop.
 *
 * Stats are curated (the reports are PDFs/tables, not feeds); ingest
 * upserts this seed list.
 */

import type { OrganicContent } from "../types";

export type ScreenTimeRow = {
  externalId: string;
  /** The published statistic, already paraphrased. */
  stat: string;
  /** Big-screen reveal phrase. */
  centerBlock: string;
  /** Solidarity/debate question — never shaming. */
  question: string;
  source: "Ofcom" | "Pew";
};

export const SCREEN_TIME_SOURCE = {
  key: "screentime-ofcom-pew",
  name: "Ofcom + Pew media-use stats",
  license: "Open Government Licence (Ofcom) / Pew (attribution, paraphrased)",
} as const;

const sourceMeta = (source: ScreenTimeRow["source"]) =>
  source === "Ofcom"
    ? {
        sourceTitle: "Ofcom, Children and parents: media use and attitudes",
        sourceUrl:
          "https://www.ofcom.org.uk/research-and-data/media-literacy-research/childrens",
      }
    : {
        sourceTitle: "Pew Research Center, parenting and screens",
        sourceUrl: "https://www.pewresearch.org/topic/internet-technology/",
      };

export const buildScreenTimeContent = (r: ScreenTimeRow): OrganicContent => ({
  hook: r.stat,
  payoff: r.question,
  centerBlock: r.centerBlock,
  coverTeaser: "Be honest: where do you land on this one?",
  category: "screen-time",
  ...sourceMeta(r.source),
});

/** Curated seed rows. Every question is solidarity-shaped, never shaming. */
export const SCREEN_TIME_SEED: ScreenTimeRow[] = [
  {
    externalId: "ofcom-3-4-tablet-home",
    stat: "Around half of UK children aged 3 to 4 use a tablet at home.",
    centerBlock: "~50%",
    question:
      "At what age did your child first get regular screen time, and do you wish it had been different?",
    source: "Ofcom",
  },
  {
    externalId: "pew-parents-too-much",
    stat: "Most US parents say their child spends too much time on a phone, but far fewer feel confident setting limits.",
    centerBlock: "Most parents",
    question:
      "Do you feel more guilty about saying yes, or about saying no? No judgement here.",
    source: "Pew",
  },
  {
    externalId: "ofcom-8-11-lost-control",
    stat: "Nearly one in three parents of 8 to 11 year olds say they find it hard to control their child's screen time.",
    centerBlock: "1 in 3",
    question:
      "If you have clawed back some balance in your house, what actually worked?",
    source: "Ofcom",
  },
];
