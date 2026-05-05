/**
 * Daily-publish picker — chooses today's ContentReel via:
 *
 *   1. KIND ROTATION. We post one reel per day, cycling through kinds
 *      (stat → fact → tip → myth → stat → …). The next kind is
 *      determined by reading the most recently posted row's `kind` and
 *      moving forward in the rotation. Empty DB → starts at "stat".
 *
 *   2. CANDIDATE FILTER within that kind:
 *      - factCheckConfidence = HIGH (publish gate; lower confidence means
 *        we caught a sourcing concern that needs human review)
 *      - postedAt is null OR postedAt < 30 days ago (dedup window)
 *      - brand matches request
 *
 *   3. ORDER: oldest factCheckedAt first. Stale-but-still-valid items
 *      get aired before fresh ones — keeps the catalogue churning and
 *      gives the weekly re-check cron a reason to keep verifying.
 *
 * If no candidate matches in the next-kind, the picker FALLS BACK by
 * trying each subsequent kind in rotation order. Only fully empty
 * pipelines (no HIGH-confidence anything) return null. The route
 * handler escalates that to an admin alert.
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

  // Try each kind in rotation order from `startIdx`. First HIGH-confidence,
  // not-recently-posted candidate wins.
  for (let i = 0; i < ROTATION.length; i++) {
    const kind = ROTATION[(startIdx + i) % ROTATION.length];
    const row = await db.contentReel.findFirst({
      where: {
        brand,
        kind,
        factCheckConfidence: "HIGH",
        OR: [{ postedAt: null }, { postedAt: { lt: cutoff } }],
      },
      // Oldest factCheckedAt first — older verified items get aired
      // before fresh ones, so the catalogue stays in rotation.
      orderBy: [{ factCheckedAt: "asc" }, { createdAt: "asc" }],
    });
    if (row) {
      console.log(
        `[pick] selected ${row.id} (kind=${kind}, factCheckedAt=${row.factCheckedAt?.toISOString().slice(0, 10) ?? "?"})`,
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
}
