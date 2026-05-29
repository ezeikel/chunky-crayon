/**
 * Daily-publish picker for the organic content engine.
 *
 * Mirrors content-reel/pick.ts but generic across the two engines:
 *
 *   1. ENGINE ROTATION. Alternate NEWS / DATASET day to day so the feed
 *      stays varied (a week of only baby-name posts would feel thin).
 *      Reads the most recent posted row's engine and flips. Empty DB →
 *      starts at NEWS (timeliest).
 *   2. CANDIDATE FILTERS within the chosen engine:
 *      - safetyVerdict = APPROVED (hard requirement — kids brand)
 *      - postedAt null OR < 30 days ago (per-row dedup)
 *      - category NOT IN categories posted in the last 7 days (cooldown)
 *      - brand matches
 *   3. ORDER: news → highest engagementScore first; dataset → oldest
 *      createdAt first (churn the catalogue).
 *
 * Two-pass: relax the category cooldown if pass 1 is empty across both
 * engines, rather than skip the day. Per-row 30d dedup is never relaxed.
 */

import { db } from "@one-colored-pixel/db";
import type { OrganicPost as PrismaOrganicPost } from "@one-colored-pixel/db";

const ENGINES = ["NEWS", "DATASET"] as const;
type Engine = (typeof ENGINES)[number];

const DEDUP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const CATEGORY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type PickOrganicPostOptions = {
  brand?: "CHUNKY_CRAYON" | "COLORING_HABITAT";
};

export async function pickTodaysOrganicPost(
  opts: PickOrganicPostOptions = {},
): Promise<PrismaOrganicPost | null> {
  const brand = opts.brand ?? "CHUNKY_CRAYON";

  const lastPosted = await db.organicPost.findFirst({
    where: { brand, postedAt: { not: null } },
    orderBy: { postedAt: "desc" },
    select: { engine: true },
  });
  const startIdx = lastPosted
    ? (ENGINES.indexOf(lastPosted.engine as Engine) + 1) % ENGINES.length
    : 0;

  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
  const categoryCutoff = new Date(Date.now() - CATEGORY_COOLDOWN_MS);

  const recentlyPostedCategories = await db.organicPost.findMany({
    where: { brand, postedAt: { gte: categoryCutoff } },
    select: { category: true },
    distinct: ["category"],
  });
  const cooldownCategories = recentlyPostedCategories.map((r) => r.category);
  if (cooldownCategories.length > 0) {
    console.log(
      `[organic/pick] category cooldown active for: ${cooldownCategories.join(", ")}`,
    );
  }

  const tryPick = async (
    excludeCategories: typeof cooldownCategories,
  ): Promise<PrismaOrganicPost | null> => {
    for (let i = 0; i < ENGINES.length; i++) {
      const engine = ENGINES[(startIdx + i) % ENGINES.length];
      const row = await db.organicPost.findFirst({
        where: {
          brand,
          engine,
          safetyVerdict: "APPROVED",
          OR: [{ postedAt: null }, { postedAt: { lt: cutoff } }],
          ...(excludeCategories.length > 0
            ? { category: { notIn: excludeCategories } }
            : {}),
        },
        orderBy:
          engine === "NEWS"
            ? [{ engagementScore: "desc" }, { createdAt: "asc" }]
            : [{ createdAt: "asc" }],
      });
      if (row) {
        console.log(
          `[organic/pick] selected ${row.id} (engine=${engine}, category=${row.category})`,
        );
        return row;
      }
      if (i === 0) {
        console.log(
          `[organic/pick] no ${engine} candidates; falling through engines`,
        );
      }
    }
    return null;
  };

  const pass1 = await tryPick(cooldownCategories);
  if (pass1) return pass1;

  if (cooldownCategories.length > 0) {
    console.warn(
      `[organic/pick] no fresh-category candidate; relaxing cooldown for fallback`,
    );
    return await tryPick([]);
  }
  return null;
}
