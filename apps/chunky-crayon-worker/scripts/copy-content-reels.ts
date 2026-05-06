/**
 * Copy ContentReel rows from one Neon branch to another via Prisma.
 *
 * Why this exists:
 *   The 167-row content_reels catalogue lives in the dev branch. After
 *   `prisma migrate deploy` runs on prod (auto-fired by the GH Action on
 *   push to main), prod's content_reels table is empty. We seed it from
 *   dev with this script — strictly Prisma, no raw SQL, no pg_dump.
 *
 * How it works (two phases):
 *   Phase 1 (--export):  read all rows with DATABASE_URL pointing at the
 *                        SOURCE branch, dump JSON to stdout (or --out).
 *   Phase 2 (--import):  read DATABASE_URL pointing at the TARGET branch,
 *                        consume the JSON file, upsert each row.
 *   Phase 3 (--dry-run): read both as snapshots and show the delta
 *                        WITHOUT writing. Reads stdin or --in for the
 *                        source export, then connects to the live
 *                        DATABASE_URL as target.
 *
 * Why two phases instead of one process opening two connections:
 *   Prisma 7's prisma-client generator doesn't accept a runtime
 *   datasource override on the constructor — the URL is fixed by the
 *   DATABASE_URL env var at module load. So a single-process two-branch
 *   copy isn't possible without forking or re-importing the module.
 *   Splitting into export + import is the path of least resistance and
 *   gives the operator a JSON checkpoint to inspect before importing.
 *
 * What gets copied:
 *   ALL rows, not just HIGH-confidence ones. The 22 deactivated LOW rows
 *   need to land on prod too so:
 *     - The editorial-review breadcrumbs (factCheckNotes "DEACTIVATED:")
 *       are preserved.
 *     - A future Sonar re-check might upgrade them back to HIGH/MEDIUM.
 *   The publish-cron picker filters by HIGH/MEDIUM at query time, so
 *   keeping LOW rows in the table is harmless.
 *
 *   We do NOT copy: postedAt, reelUrl, coverUrl, socialPostResults.
 *   Those are per-environment runtime state — prod will rebuild them as
 *   the publish cron renders + posts. Copying dev's would make prod
 *   think every row was already posted today.
 *
 * Run from worker dir:
 *
 *   # Phase 1: dump dev → JSON file
 *   pnpm exec tsx scripts/copy-content-reels.ts --export --out=tmp/content-reels-export.json
 *
 *   # Phase 2: switch DATABASE_URL to prod, then import
 *   DATABASE_URL="<prod-pooled-url>" pnpm exec tsx scripts/copy-content-reels.ts --import --in=tmp/content-reels-export.json
 *
 *   # Optional dry-run: read source export, count what would change on
 *   # the current DATABASE_URL target, no writes.
 *   DATABASE_URL="<prod-pooled-url>" pnpm exec tsx scripts/copy-content-reels.ts --dry-run --in=tmp/content-reels-export.json
 *
 * Idempotent — uses upsert keyed on `id`, so re-running after a partial
 * failure picks up where it left off without duplicates.
 */

import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";

import { db } from "@one-colored-pixel/db";

type Mode = "export" | "import" | "dry-run";

function parseArgs(): { mode: Mode; file?: string } {
  const args = process.argv.slice(2);
  const flags = new Set(
    args.filter((a) => a.startsWith("--") && !a.includes("=")),
  );
  const kvPairs = Object.fromEntries(
    args
      .filter((a) => a.startsWith("--") && a.includes("="))
      .map((a) => {
        const [k, v] = a.replace(/^--/, "").split("=");
        return [k, v];
      }),
  ) as Record<string, string>;

  let mode: Mode | null = null;
  if (flags.has("--export")) mode = "export";
  else if (flags.has("--import")) mode = "import";
  else if (flags.has("--dry-run")) mode = "dry-run";

  if (!mode) {
    throw new Error(
      "Specify a mode: --export, --import, or --dry-run. See script header for details.",
    );
  }

  const file = kvPairs.out ?? kvPairs.in;
  return { mode, file };
}

async function exportRows(outFile: string | undefined) {
  console.log("[copy:export] reading from current DATABASE_URL...");
  const rows = await db.contentReel.findMany();
  const stripped = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    hook: row.hook,
    payoff: row.payoff,
    centerBlock: row.centerBlock,
    coverTeaser: row.coverTeaser,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
    category: row.category,
    templateOverride: row.templateOverride,
    hookTokens: row.hookTokens,
    payoffTokens: row.payoffTokens,
    factCheckedAt: row.factCheckedAt,
    factCheckConfidence: row.factCheckConfidence,
    factCheckNotes: row.factCheckNotes,
    brand: row.brand,
    createdAt: row.createdAt,
  }));

  const json = JSON.stringify(stripped, null, 2);
  if (outFile) {
    await writeFile(outFile, json);
    console.log(`[copy:export] wrote ${rows.length} rows to ${outFile}`);
  } else {
    process.stdout.write(json);
    process.stderr.write(
      `\n[copy:export] dumped ${rows.length} rows to stdout\n`,
    );
  }
}

type ExportedRow = Awaited<ReturnType<typeof db.contentReel.findMany>>[number];

async function loadRows(inFile: string): Promise<ExportedRow[]> {
  const raw = await readFile(inFile, "utf-8");
  const parsed = JSON.parse(raw) as ExportedRow[];
  // Re-hydrate Date strings — JSON.stringify turns Date into ISO string,
  // Prisma needs a Date back when we upsert.
  return parsed.map((row) => ({
    ...row,
    factCheckedAt: row.factCheckedAt
      ? new Date(row.factCheckedAt as unknown as string)
      : null,
    createdAt: new Date(row.createdAt as unknown as string),
  }));
}

async function importRows(inFile: string) {
  const rows = await loadRows(inFile);
  console.log(
    `[copy:import] importing ${rows.length} rows into current DATABASE_URL...`,
  );

  let written = 0;
  for (const row of rows) {
    const data = {
      id: row.id,
      kind: row.kind,
      hook: row.hook,
      payoff: row.payoff,
      centerBlock: row.centerBlock,
      coverTeaser: row.coverTeaser,
      sourceTitle: row.sourceTitle,
      sourceUrl: row.sourceUrl,
      category: row.category,
      templateOverride: row.templateOverride,
      hookTokens: row.hookTokens === null ? undefined : row.hookTokens,
      payoffTokens: row.payoffTokens === null ? undefined : row.payoffTokens,
      factCheckedAt: row.factCheckedAt,
      factCheckConfidence: row.factCheckConfidence,
      factCheckNotes: row.factCheckNotes,
      brand: row.brand,
      createdAt: row.createdAt,
    };
    await db.contentReel.upsert({
      where: { id: row.id },
      create: data,
      update: data,
    });
    written++;
    if (written % 25 === 0) {
      console.log(`[copy:import] ${written}/${rows.length}...`);
    }
  }

  const summary = await db.contentReel.groupBy({
    by: ["kind"],
    _count: { kind: true },
  });
  console.log(`\n[copy:import] done. ${written} upserted.`);
  console.log(`[copy:import] target catalogue (by kind):`);
  for (const { kind, _count } of summary) {
    console.log(`  ${kind}: ${_count.kind}`);
  }
}

async function dryRunFromExport(inFile: string) {
  const sourceRows = await loadRows(inFile);
  console.log(`[copy:dry-run] source export has ${sourceRows.length} rows`);

  const targetRows = await db.contentReel.findMany({ select: { id: true } });
  const targetIds = new Set(targetRows.map((r) => r.id));
  const wouldInsert = sourceRows.filter((r) => !targetIds.has(r.id));
  const wouldUpdate = sourceRows.filter((r) => targetIds.has(r.id));
  const onlyOnTarget = targetIds.size - wouldUpdate.length;

  console.log(`[copy:dry-run] target currently has ${targetIds.size} rows`);
  console.log(`[copy:dry-run] would INSERT ${wouldInsert.length} new rows`);
  console.log(
    `[copy:dry-run] would UPDATE ${wouldUpdate.length} existing rows`,
  );
  if (onlyOnTarget > 0) {
    console.log(
      `[copy:dry-run] ${onlyOnTarget} rows on target NOT in source — would be left untouched (script never deletes).`,
    );
  }
  console.log(`\n[copy:dry-run] complete — no writes performed.`);
}

async function main() {
  const { mode, file } = parseArgs();

  switch (mode) {
    case "export":
      await exportRows(file);
      break;
    case "import":
      if (!file) throw new Error("--import requires --in=<path>");
      await importRows(file);
      break;
    case "dry-run":
      if (!file) throw new Error("--dry-run requires --in=<path>");
      await dryRunFromExport(file);
      break;
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("[copy] failed:", err);
  await db.$disconnect();
  process.exit(1);
});
