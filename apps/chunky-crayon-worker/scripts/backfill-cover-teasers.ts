/**
 * Backfill `coverTeaser` for ContentReel rows that don't have one.
 *
 * Idempotent — fetches all rows with `coverTeaser IS NULL OR ''`, runs
 * each through `generateCoverTeaser`, persists the result. Safe to
 * re-run after adding new rows from a research batch.
 *
 * Run from the worker dir:
 *   pnpm exec tsx scripts/backfill-cover-teasers.ts
 *   # or limit to one kind for testing:
 *   pnpm exec tsx scripts/backfill-cover-teasers.ts --kind myth
 *
 * Required env: ANTHROPIC_API_KEY, DATABASE_URL.
 */

import "dotenv/config";

import { db } from "@one-colored-pixel/db";

import { fromPrisma } from "../src/video/content-reel/shared/db";
import { generateCoverTeaser } from "../src/video/content-reel/shared/teaser";
import type { ContentReelKind } from "../src/video/content-reel/shared/types";

function parseArgs(): { kind?: ContentReelKind } {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--kind");
  if (idx === -1) return {};
  const v = args[idx + 1];
  if (v !== "stat" && v !== "fact" && v !== "tip" && v !== "myth") {
    throw new Error(`--kind must be stat|fact|tip|myth, got '${v}'`);
  }
  return { kind: v };
}

async function main() {
  const { kind } = parseArgs();
  const kindFilter = kind
    ? { kind: kind.toUpperCase() as "STAT" | "FACT" | "TIP" | "MYTH" }
    : {};

  const rows = await db.contentReel.findMany({
    where: {
      ...kindFilter,
      OR: [{ coverTeaser: null }, { coverTeaser: "" }],
    },
  });

  console.log(
    `[backfill] ${rows.length} rows missing coverTeaser${kind ? ` (kind=${kind})` : ""}`,
  );

  let updated = 0;
  for (const row of rows) {
    const reel = fromPrisma(row);
    const start = Date.now();
    try {
      const teaser = await generateCoverTeaser({
        kind: reel.kind,
        hook: reel.hook,
        centerBlock: reel.centerBlock,
      });
      await db.contentReel.update({
        where: { id: row.id },
        data: { coverTeaser: teaser },
      });
      const ms = Date.now() - start;
      console.log(`[backfill] ${row.id} (${ms}ms)`);
      console.log(`           → "${teaser}"`);
      updated++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[backfill] ${row.id} ERROR: ${message}`);
    }
  }

  console.log(`\n[backfill] done. ${updated}/${rows.length} updated.`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("[backfill] failed:", err);
  await db.$disconnect();
  process.exit(1);
});
