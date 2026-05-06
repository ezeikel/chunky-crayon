/**
 * Daily-publish picker — chooses today's ContentReel via:
 *
 *   1. KIND ROTATION. We post one reel per day, cycling through kinds
 *      (stat → fact → tip → myth → stat → …). The next kind is
 *      determined by reading the most recently posted row's `kind` and
 *      moving forward in the rotation. Empty DB → starts at "stat".
 *
 *   2. CANDIDATE FILTERS within that kind:
 *      - factCheckConfidence (HIGH for stat/fact/myth, HIGH+MEDIUM for tip)
 *      - postedAt is null OR postedAt < 30 days ago (per-row dedup)
 *      - category NOT IN any category posted in the last 7 days (cross-kind
 *        topic cooldown — stops audience seeing 3 screen-time posts in
 *        a week even if they're stat/myth/tip kinds)
 *      - brand matches request
 *
 *   3. ORDER: oldest factCheckedAt first. Stale-but-still-valid items
 *      get aired before fresh ones — keeps the catalogue churning and
 *      gives the weekly re-check cron a reason to keep verifying.
 *
 * Two-pass:
 *   Pass 1 — strict (kind rotation + 30d row dedup + 7d category cooldown).
 *   Pass 2 — relax category cooldown if Pass 1 found nothing across all
 *            four kinds. Better to post a slightly-lumpy item than skip
 *            the day. Per-row 30d dedup is never relaxed — that's the
 *            hard "don't repeat the same item" rule.
 *
 * If both passes return null (no HIGH-confidence anything not posted in
 * 30d), the route handler escalates to an admin alert.
 */

import { db } from "@one-colored-pixel/db";

import { fromPrisma } from "../video/content-reel/shared/db.js";
import type { ContentReel } from "../video/content-reel/shared/types.js";

const ROTATION: Array<"STAT" | "FACT" | "TIP" | "MYTH"> = [
  "STAT",
  "FACT",
  "TIP",
  "MYTH",
];

const DEDUP_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// Category cooldown: don't post the same category twice within 7 days,
// even across kinds. Stops topic lumpiness (screen-time-stat Mon, then
// screen-time-myth Sun, then screen-time-tip Tue would all feel
// repetitive to the audience even though each row is technically
// distinct under the per-row 30d window). Soft fallback below: if NO
// kind has a category-fresh candidate, we relax the cooldown rather
// than skip the day entirely.
const CATEGORY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type PickContentReelOptions = {
  brand?: "CHUNKY_CRAYON" | "COLORING_HABITAT";
};

export async function pickTodaysContentReel(
  opts: PickContentReelOptions = {},
): Promise<ContentReel | null> {
  const brand = opts.brand ?? "CHUNKY_CRAYON";

  // Determine next kind: read most recent postedAt, find its index in the
  // rotation, advance by 1. Null result means "empty DB, start at STAT".
  const lastPosted = await db.contentReel.findFirst({
    where: { brand, postedAt: { not: null } },
    orderBy: { postedAt: "desc" },
    select: { kind: true },
  });
  const startIdx = lastPosted
    ? (ROTATION.indexOf(lastPosted.kind) + 1) % ROTATION.length
    : 0;

  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
  const categoryCutoff = new Date(Date.now() - CATEGORY_COOLDOWN_MS);

  // Categories used in the last 7 days — picker excludes them on the
  // first pass to avoid topic lumpiness across kinds. Falls back to
  // ignoring this list if no kind has a category-fresh candidate (rare
  // when categories are well-distributed; can happen if catalogue is
  // narrow on a few topics).
  const recentlyPostedCategories = await db.contentReel.findMany({
    where: { brand, postedAt: { gte: categoryCutoff } },
    select: { category: true },
    distinct: ["category"],
  });
  const cooldownCategories = recentlyPostedCategories.map((r) => r.category);
  if (cooldownCategories.length > 0) {
    console.log(
      `[pick] category cooldown active for: ${cooldownCategories.join(", ")}`,
    );
  }

  // Per-kind confidence threshold:
  //   stat / fact / myth → HIGH only (peer-reviewed or institutional
  //                                   source required; brand risk)
  //   tip                → HIGH or MEDIUM (advice-giving content has a
  //                                   lower bar — common parenting
  //                                   wisdom is fine even without a
  //                                   peer-reviewed cite)
  //
  // LOW is never auto-publishable for any kind.
  //
  // Two-pass selection:
  //   Pass 1 — rotation order, EXCLUDE recently-posted categories.
  //   Pass 2 — rotation order, IGNORE category cooldown (fallback).
  //
  // Pass 2 only fires if Pass 1 returns nothing across all 4 kinds —
  // means the catalogue is narrow on a few topics and we'd rather post
  // a slightly-lumpy item than skip the day.
  const tryPick = async (
    excludeCategories: typeof cooldownCategories,
  ): Promise<ContentReel | null> => {
    for (let i = 0; i < ROTATION.length; i++) {
      const kind = ROTATION[(startIdx + i) % ROTATION.length];
      const acceptableConfidences: Array<"HIGH" | "MEDIUM"> =
        kind === "TIP" ? ["HIGH", "MEDIUM"] : ["HIGH"];
      const row = await db.contentReel.findFirst({
        where: {
          brand,
          kind,
          factCheckConfidence: { in: acceptableConfidences },
          OR: [{ postedAt: null }, { postedAt: { lt: cutoff } }],
          ...(excludeCategories.length > 0
            ? { category: { notIn: excludeCategories } }
            : {}),
        },
        orderBy: [{ factCheckedAt: "asc" }, { createdAt: "asc" }],
      });
      if (row) {
        console.log(
          `[pick] selected ${row.id} (kind=${kind}, category=${row.category}, factCheckedAt=${row.factCheckedAt?.toISOString().slice(0, 10) ?? "?"})`,
        );
        return fromPrisma(row);
      }
      if (i === 0) {
        console.log(
          `[pick] no ${kind} candidates available; falling back through rotation`,
        );
      }
    }
    return null;
  };

  const pass1 = await tryPick(cooldownCategories);
  if (pass1) return pass1;

  if (cooldownCategories.length > 0) {
    console.warn(
      `[pick] no fresh-category candidate found; relaxing cooldown for fallback pass`,
    );
    return await tryPick([]);
  }

  return null;
}
