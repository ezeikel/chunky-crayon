/**
 * Seed the 3 sample stat fixtures into the content_reels table on the
 * Neon dev branch so the publish path has rows to read against.
 *
 * Idempotent — uses `upsert` keyed on `id` so re-running won't duplicate.
 * Marks each row as factCheckedAt=now / confidence=HIGH so the publish-cron
 * lookup ("oldest fact-checked, not posted in 30d, kind=K") matches them.
 *
 * Run from the worker dir:
 *   pnpm exec tsx scripts/seed-content-reels.ts
 *
 * Required env: DATABASE_URL (worker .env) — points at the dev branch.
 */

import "dotenv/config";

import { db } from "@one-colored-pixel/db";

import { toPrismaCreate } from "../src/video/content-reel/shared/db";
import {
  SHOCK_STAT_SAMPLE,
  WARM_STAT_SAMPLE,
  QUIET_STAT_SAMPLE,
} from "../src/video/content-reel/spike/sample-stats";
import type { ContentReel } from "../src/video/content-reel/shared/types";

const SAMPLES: ContentReel[] = [
  // The samples are pre-fact-checked from the original B-phase research,
  // so we mark them HIGH at seed time so the publish gate accepts them.
  {
    ...SHOCK_STAT_SAMPLE,
    factCheckedAt: new Date().toISOString().slice(0, 10),
    factCheckConfidence: "high",
    factCheckNotes: "Seeded from spike sample, pre-verified manually.",
  },
  {
    ...WARM_STAT_SAMPLE,
    factCheckedAt: new Date().toISOString().slice(0, 10),
    factCheckConfidence: "high",
    factCheckNotes: "Seeded from spike sample, pre-verified manually.",
  },
  {
    ...QUIET_STAT_SAMPLE,
    factCheckedAt: new Date().toISOString().slice(0, 10),
    factCheckConfidence: "high",
    factCheckNotes: "Seeded from spike sample, pre-verified manually.",
  },
];

async function main() {
  console.log(`[seed] upserting ${SAMPLES.length} ContentReel rows`);

  for (const reel of SAMPLES) {
    const data = toPrismaCreate(reel);
    const row = await db.contentReel.upsert({
      where: { id: reel.id },
      create: data,
      update: data,
    });
    console.log(
      `[seed] ${row.kind.padEnd(4)} ${row.id} (cat=${row.category}) → ${row.factCheckConfidence}`,
    );
  }

  // Sanity check: count rows by kind so we can confirm at the end.
  const total = await db.contentReel.count();
  const byKind = await db.contentReel.groupBy({
    by: ["kind"],
    _count: { kind: true },
  });
  console.log(`\n[seed] total rows: ${total}`);
  for (const g of byKind) {
    console.log(`[seed]   ${g.kind}: ${g._count.kind}`);
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("[seed] failed:", err);
  await db.$disconnect();
  process.exit(1);
});
