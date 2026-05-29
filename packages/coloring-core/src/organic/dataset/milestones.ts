/**
 * Child-development milestones dataset (CDC / NHS, hand-structured).
 *
 * Reassurance content: "by age X many children can Y, and here's why it's
 * normal if yours isn't there yet." High engagement (anxiety + relief),
 * very brand-safe. The research is explicit that this must NOT read as
 * diagnostic — every post normalises variation and points to a
 * professional only when appropriate, never "if your child can't do this,
 * something is wrong".
 *
 * Rows are curated (not scraped) because CDC/NHS publish prose, not a
 * table. The seed list below IS the dataset; ingest just upserts it. Pure
 * row->content builder lives here.
 */

import type { OrganicContent } from "../types";

export type MilestoneDomain =
  | "language"
  | "movement"
  | "social"
  | "cognitive"
  | "fine-motor";

export type MilestoneRow = {
  /** e.g. "by-3-language-short-sentences" */
  externalId: string;
  ageLabel: string; // "around age 3"
  domain: MilestoneDomain;
  /** What many children can do by this age. */
  milestone: string;
  /** Source body. */
  source: "CDC" | "NHS";
};

export const MILESTONE_SOURCE = {
  key: "milestones-cdc-nhs",
  name: "CDC + NHS developmental milestones",
  license: "US public domain (CDC) / Open Government Licence (NHS)",
} as const;

const sourceMeta = (source: MilestoneRow["source"]) =>
  source === "CDC"
    ? {
        sourceTitle: "CDC developmental milestones",
        sourceUrl: "https://www.cdc.gov/ncbddd/actearly/milestones/index.html",
      }
    : {
        sourceTitle: "NHS child development",
        sourceUrl: "https://www.nhs.uk/conditions/baby/babys-development/",
      };

export const buildMilestoneContent = (r: MilestoneRow): OrganicContent => {
  const meta = sourceMeta(r.source);
  return {
    hook: `${capitalize(r.ageLabel)}, many children can ${r.milestone}.`,
    payoff: `But the normal range is wide, and plenty of children get there later. If yours did, how did it turn out?`,
    centerBlock: r.ageLabel.replace(/^(around |by )/i, ""),
    coverTeaser: `What can most kids do ${r.ageLabel}?`,
    category: "milestones",
    ...meta,
  };
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Curated seed rows. Phrased as gentle, non-diagnostic prompts. */
export const MILESTONE_SEED: MilestoneRow[] = [
  {
    externalId: "by-3-language-short-sentences",
    ageLabel: "around age 3",
    domain: "language",
    milestone: "talk in short sentences of three to five words",
    source: "CDC",
  },
  {
    externalId: "by-4-movement-hop-one-foot",
    ageLabel: "around age 4",
    domain: "movement",
    milestone: "hop on one foot",
    source: "CDC",
  },
  {
    externalId: "by-2-fine-motor-stack-blocks",
    ageLabel: "around age 2",
    domain: "fine-motor",
    milestone: "stack four or more blocks",
    source: "CDC",
  },
  {
    externalId: "by-4-fine-motor-draw-circle",
    ageLabel: "around age 4",
    domain: "fine-motor",
    milestone: "copy a circle with a crayon",
    source: "NHS",
  },
  {
    externalId: "by-5-social-take-turns",
    ageLabel: "around age 5",
    domain: "social",
    milestone: "take turns and follow simple game rules",
    source: "CDC",
  },
  {
    externalId: "by-3-cognitive-follow-two-step",
    ageLabel: "around age 3",
    domain: "cognitive",
    milestone:
      "follow a two-step instruction like 'pick up your shoes and put them by the door'",
    source: "CDC",
  },
];
