/**
 * Baby-names dataset engine (ONS England+Wales + US SSA).
 *
 * Top-tier per the research: trivial to ingest, hyper-shareable
 * identity/nostalgia content, legally clean (ONS = Open Government
 * Licence, SSA = US public domain), aggregate-only (never identifies a
 * child). One row = one post.
 *
 * This module owns the PURE logic — row shape, the "is this row
 * post-worthy" filter, the rank/count delta math, and the row->content
 * builder. The actual HTTP fetch + DB upsert lives in the worker ingest
 * script (apps/chunky-crayon-worker/scripts/ingest-dataset.ts); it imports
 * these helpers so the interesting logic is unit-testable here.
 */

import type { OrganicContent } from "../types";

export type BabyNameRegion = "uk" | "us";
export type BabyNameSex = "F" | "M";

/**
 * One observation: a name's count (and rank, when the source gives it)
 * for a given year + region + sex. Persisted as DatasetRow.payload.
 */
export type BabyNameRow = {
  region: BabyNameRegion;
  name: string;
  sex: BabyNameSex;
  year: number;
  count: number;
  /** 1-based popularity rank within (region, sex, year). Optional. */
  rank?: number;
};

/** Stable natural key for dedup/upsert within the source. */
export const babyNameExternalId = (r: BabyNameRow): string =>
  `${r.region}-${r.year}-${r.sex}-${r.name.toLowerCase()}`;

/**
 * Percentage change in count between two observations of the same name.
 * Returns a rounded integer percent. Guards divide-by-zero: a rise from 0
 * is reported as null (no meaningful percentage), the caller frames it as
 * "from almost none to N" instead.
 */
export const countDeltaPct = (
  earlier: number,
  later: number,
): number | null => {
  if (earlier <= 0) return null;
  return Math.round(((later - earlier) / earlier) * 100);
};

/**
 * A row pair is "post-worthy" when the trend is dramatic enough to earn a
 * reaction: a big swing in count, a notable rank move, or a rise from near
 * zero. These thresholds keep the catalogue spicy — a name that drifted
 * 4% isn't a post.
 */
export const isPostWorthyPair = (
  earlier: BabyNameRow,
  later: BabyNameRow,
): boolean => {
  // Rise from near-nothing to something substantial.
  if (earlier.count <= 10 && later.count >= 200) return true;
  // Big rank move (lower rank number = more popular).
  if (
    earlier.rank != null &&
    later.rank != null &&
    Math.abs(earlier.rank - later.rank) >= 50
  ) {
    return true;
  }
  // Big proportional swing in either direction.
  const pct = countDeltaPct(earlier.count, later.count);
  if (pct != null && Math.abs(pct) >= 75) return true;
  return false;
};

const regionLabel = (region: BabyNameRegion): string =>
  region === "uk" ? "England and Wales" : "the US";

const sexNoun = (sex: BabyNameSex): string => (sex === "F" ? "girls" : "boys");

/**
 * Build the reel content for a name trend across two years. The hook is
 * curiosity/identity-first; the centerBlock is the headline number that
 * lands big on screen; the payoff invites a poll-shaped reaction. No
 * product mention, no AI framing, US-friendly phrasing.
 */
export const buildBabyNameContent = (
  earlier: BabyNameRow,
  later: BabyNameRow,
): OrganicContent => {
  const region = regionLabel(later.region);
  const noun = sexNoun(later.sex);
  const pct = countDeltaPct(earlier.count, later.count);
  const rose = later.count >= earlier.count;

  let centerBlock: string;
  let hook: string;
  if (earlier.count <= 10 && later.count >= 200) {
    centerBlock = `${later.count.toLocaleString()}`;
    hook = `In ${earlier.year}, almost no ${noun} in ${region} were named ${later.name}.`;
  } else if (pct != null) {
    centerBlock = `${pct > 0 ? "+" : ""}${pct}%`;
    hook = `Back in ${earlier.year}, ${earlier.count.toLocaleString()} ${noun} in ${region} were named ${later.name}.`;
  } else {
    centerBlock = `${later.count.toLocaleString()}`;
    hook = `In ${earlier.year}, ${earlier.count.toLocaleString()} ${noun} in ${region} were named ${later.name}.`;
  }

  const payoff = rose
    ? `By ${later.year} it was ${later.count.toLocaleString()}. If you picked ${later.name} to be unusual, how do you feel now?`
    : `By ${later.year} it was down to ${later.count.toLocaleString()}. Classic names making a comeback, or gone for good?`;

  return {
    hook,
    payoff,
    centerBlock,
    coverTeaser: `Is ${later.name} the most popular name you didn't expect?`,
    category: "baby-names",
    sourceTitle:
      later.region === "uk"
        ? "Office for National Statistics, baby names"
        : "US Social Security Administration, baby names",
    sourceUrl:
      later.region === "uk"
        ? "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/livebirths/bulletins/babynamesenglandandwales/latest"
        : "https://www.ssa.gov/oact/babynames/",
  };
};

export const BABY_NAMES_SOURCE_UK = {
  key: "babynames-ons",
  name: "ONS baby names (England & Wales)",
  license: "Open Government Licence v3.0",
} as const;

export const BABY_NAMES_SOURCE_US = {
  key: "babynames-ssa",
  name: "US SSA baby names",
  license: "US public domain",
} as const;
