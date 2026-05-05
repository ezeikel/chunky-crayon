/**
 * Weekly fact-check refresh — re-verifies any ContentReel where
 * factCheckedAt is older than 180 days.
 *
 * Why this matters:
 *   Sonar's "verified" verdict is a snapshot in time. New research can
 *   contradict an older claim, a study can be retracted, an institution
 *   can revise its guidance. Once a row is in the catalogue we can't
 *   trust it forever — we have to keep re-checking.
 *
 * Behaviour:
 *   - Query rows where factCheckedAt < (now - 180d).
 *   - Re-run factCheckContentReel on each.
 *   - Persist new confidence + notes + factCheckedAt.
 *   - If new verdict is `recommendation: drop` OR `confidence: low`:
 *     log a warning. Publish gate already filters non-HIGH rows so
 *     they go inactive automatically — but we want a clear breadcrumb
 *     in the cron log so operators can spot a brand-risk regression.
 *
 * Cost: ~$0.005 per row × catalogue size. ~250 items every 6 months
 * means ~42 rows/week on average → ~$0.21/week. Negligible.
 */

import { db } from "@one-colored-pixel/db";

import { fromPrisma } from "../video/content-reel/shared/db.js";
import { factCheckContentReel } from "../video/content-reel/shared/factCheck.js";

const STALE_AFTER_MS = 180 * 24 * 60 * 60 * 1000;

const CONFIDENCE_TO_DB = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
} as const;

export type RefreshSummary = {
  total: number;
  rechecked: number;
  upgraded: number;
  downgraded: number;
  unchanged: number;
  errored: number;
  drops: Array<{
    id: string;
    previous: string;
    newConfidence: string;
    reason: string;
  }>;
};

export async function refreshStaleFactChecks(): Promise<RefreshSummary> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);

  const rows = await db.contentReel.findMany({
    where: { factCheckedAt: { lt: cutoff } },
    orderBy: { factCheckedAt: "asc" },
  });

  console.log(
    `[refreshFactChecks] ${rows.length} rows stale (factCheckedAt < ${cutoff.toISOString()})`,
  );

  const summary: RefreshSummary = {
    total: rows.length,
    rechecked: 0,
    upgraded: 0,
    downgraded: 0,
    unchanged: 0,
    errored: 0,
    drops: [],
  };

  for (const row of rows) {
    const reel = fromPrisma(row);
    const previous = row.factCheckConfidence ?? "NULL";
    try {
      const verdict = await factCheckContentReel(reel);
      const newDb = CONFIDENCE_TO_DB[verdict.confidence];
      await db.contentReel.update({
        where: { id: row.id },
        data: {
          factCheckedAt: new Date(),
          factCheckConfidence: newDb,
          factCheckNotes: verdict.concerns ?? null,
          // Adopt Sonar's strongest source if it found a better one —
          // catches retracted citations being replaced by valid ones.
          sourceTitle: verdict.strongestSource.title || row.sourceTitle,
          sourceUrl: verdict.strongestSource.url || row.sourceUrl,
        },
      });
      summary.rechecked++;

      if (newDb === previous) {
        summary.unchanged++;
      } else if (
        (previous === "LOW" || previous === "MEDIUM") &&
        newDb === "HIGH"
      ) {
        summary.upgraded++;
      } else if (
        (previous === "HIGH" || previous === "MEDIUM") &&
        (newDb === "LOW" || verdict.recommendation === "drop")
      ) {
        summary.downgraded++;
        summary.drops.push({
          id: row.id,
          previous,
          newConfidence: newDb,
          reason: verdict.concerns ?? verdict.recommendation,
        });
        console.warn(
          `[refreshFactChecks] DOWNGRADE ${row.id}: ${previous} → ${newDb} (${verdict.recommendation}). ${verdict.concerns?.slice(0, 200) ?? ""}`,
        );
      } else {
        summary.unchanged++;
      }
    } catch (err) {
      summary.errored++;
      console.error(
        `[refreshFactChecks] error on ${row.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(`[refreshFactChecks] done: ${JSON.stringify(summary, null, 2)}`);
  return summary;
}
