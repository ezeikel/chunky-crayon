/**
 * Editorial review dump — prints every ContentReel row of a given kind
 * (or all kinds) in a format that's easy to scan.
 *
 * Per the content-reels plan, the first 10 myths get human review
 * before the daily-publish cron fires. This script gives you the
 * rows in a form you can mark up:
 *
 *   pnpm exec tsx scripts/review-content-reels.ts --kind myth
 *
 * To deactivate a row that fails review, downgrade its confidence:
 *
 *   psql or Prisma Studio:
 *     UPDATE content_reels
 *        SET fact_check_confidence = 'LOW',
 *            fact_check_notes = 'Manual review: <reason>'
 *      WHERE id = '<id>';
 *
 * The publish-cron pick query filters HIGH-only, so a downgrade is
 * effectively "this row will never auto-publish."
 *
 * Required env: DATABASE_URL.
 */

import "dotenv/config";

import { db } from "@one-colored-pixel/db";

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
  const where = kind
    ? { kind: kind.toUpperCase() as "STAT" | "FACT" | "TIP" | "MYTH" }
    : {};

  const rows = await db.contentReel.findMany({
    where,
    orderBy: [{ kind: "asc" }, { factCheckedAt: "desc" }],
  });

  console.log(
    `\n=== Editorial review: ${rows.length} rows${kind ? ` (kind=${kind})` : ""} ===\n`,
  );

  for (const row of rows) {
    const stamp = row.factCheckedAt
      ? row.factCheckedAt.toISOString().slice(0, 10)
      : "?";
    console.log("─".repeat(80));
    console.log(`ID:           ${row.id}`);
    console.log(
      `KIND:         ${row.kind} / ${row.category} / confidence=${row.factCheckConfidence ?? "?"}`,
    );
    console.log(`FACT-CHECKED: ${stamp}`);
    console.log();
    console.log(`HOOK:         ${row.hook}`);
    console.log(`PAYOFF:       ${row.payoff}`);
    console.log(`CENTRE BLOCK: ${row.centerBlock}`);
    if (row.coverTeaser) console.log(`COVER TEASER: ${row.coverTeaser}`);
    if (row.sourceTitle) {
      console.log(
        `SOURCE:       ${row.sourceTitle}${row.sourceUrl ? ` (${row.sourceUrl})` : ""}`,
      );
    }
    if (row.factCheckNotes) {
      console.log();
      console.log(`SONAR NOTES:`);
      console.log(
        row.factCheckNotes
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n"),
      );
    }
    console.log();
  }

  console.log("─".repeat(80));
  console.log(
    `\nTo block a row from publishing:\n  UPDATE content_reels SET fact_check_confidence = 'LOW' WHERE id = '<id>';\n`,
  );

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("[review] failed:", err);
  await db.$disconnect();
  process.exit(1);
});
