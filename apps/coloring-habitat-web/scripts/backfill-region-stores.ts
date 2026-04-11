/**
 * Backfill region stores for every ColoringImage that doesn't have one yet.
 *
 * Mirror of apps/chunky-crayon-web/scripts/backfill-region-stores.ts, but
 * scoped to COLORING_HABITAT brand and targeting the CH dev server (default
 * port 3001). See the CC version for full documentation.
 *
 * Usage (from the CH app dir):
 *
 *   pnpm tsx scripts/backfill-region-stores.ts --dry-run
 *   pnpm tsx scripts/backfill-region-stores.ts --limit=5
 *   pnpm tsx scripts/backfill-region-stores.ts --concurrency=3
 *   pnpm tsx scripts/backfill-region-stores.ts --id=<specific-id> --force
 *   pnpm tsx scripts/backfill-region-stores.ts --base-url=http://localhost:3001
 */

import { db } from "@one-colored-pixel/db";
import { BRAND } from "../lib/db";

// ---------------------------------------------------------------------------
// Arg parsing (lightweight, zero deps)
// ---------------------------------------------------------------------------
type Args = {
  dryRun: boolean;
  limit: number;
  concurrency: number;
  force: boolean;
  id: string | null;
  baseUrl: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    limit: Infinity,
    concurrency: 3,
    force: false,
    id: null,
    baseUrl: "http://localhost:3001",
  };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--force") args.force = true;
    else if (arg.startsWith("--limit=")) {
      args.limit = parseInt(arg.slice("--limit=".length), 10);
    } else if (arg.startsWith("--concurrency=")) {
      args.concurrency = parseInt(arg.slice("--concurrency=".length), 10);
    } else if (arg.startsWith("--id=")) {
      args.id = arg.slice("--id=".length);
    } else if (arg.startsWith("--base-url=")) {
      args.baseUrl = arg.slice("--base-url=".length);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// HTTP call to the dev regenerate endpoint
// ---------------------------------------------------------------------------
type RegenerateResponse = {
  success: boolean;
  error?: string;
  elapsedMs?: number;
  regionCount?: number;
  gzippedBytes?: number;
  sceneDescription?: string;
  width?: number;
  height?: number;
};

async function regenerateOne(
  id: string,
  baseUrl: string,
  timeoutMs = 360_000,
): Promise<RegenerateResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(
      `${baseUrl}/api/dev/regenerate-region-store/${id}`,
      { method: "POST", signal: controller.signal },
    );
    const body = (await resp.json()) as RegenerateResponse;
    if (!resp.ok && body.success !== false) {
      return { success: false, error: `HTTP ${resp.status}` };
    }
    return body;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Worker pool — process candidates with bounded concurrency
// ---------------------------------------------------------------------------
async function processWithPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const runNext = async (): Promise<void> => {
    const i = nextIndex++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    await runNext();
  };

  const pool = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    runNext(),
  );
  await Promise.all(pool);
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  console.log(`[Backfill] Brand: ${BRAND}`);
  console.log(`[Backfill] Dry run: ${args.dryRun}`);
  console.log(`[Backfill] Concurrency: ${args.concurrency}`);
  console.log(`[Backfill] Base URL: ${args.baseUrl}`);
  if (args.id) console.log(`[Backfill] Targeted ID: ${args.id}`);
  if (args.force) console.log(`[Backfill] Force: re-process existing stores`);

  // Load candidates from the DB
  const candidates = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      svgUrl: { not: null },
      ...(args.id ? { id: args.id } : {}),
      ...(args.force || args.id ? {} : { regionMapUrl: null }),
    },
    orderBy: { createdAt: "desc" },
    take: isFinite(args.limit) ? args.limit : undefined,
    select: { id: true, title: true },
  });

  console.log(`\n[Backfill] Found ${candidates.length} candidate(s)\n`);

  if (candidates.length === 0) {
    console.log("Nothing to do.");
    process.exit(0);
  }

  if (args.dryRun) {
    console.log("Dry run — would process:\n");
    for (const c of candidates.slice(0, 20)) {
      console.log(`  ${c.id}  ${c.title}`);
    }
    if (candidates.length > 20) {
      console.log(`  ... and ${candidates.length - 20} more`);
    }
    const est5PerImage = candidates.length * 5;
    const estCostLow = (candidates.length * 0.05).toFixed(2);
    const estCostHigh = (candidates.length * 0.1).toFixed(2);
    console.log(
      `\nEstimated AI calls: ${est5PerImage} (5 per image)` +
        `\nEstimated cost: $${estCostLow}–$${estCostHigh}`,
    );
    process.exit(0);
  }

  // Confirm before burning AI credits on a large batch
  if (candidates.length > 20) {
    console.log(
      `⚠️  About to process ${candidates.length} images (≈${candidates.length * 5} Gemini calls, $${(candidates.length * 0.05).toFixed(2)}–$${(candidates.length * 0.1).toFixed(2)}).`,
    );
    console.log("Ctrl-C within 5 seconds to cancel...");
    await new Promise((r) => setTimeout(r, 5000));
  }

  const startedAt = Date.now();
  let okCount = 0;
  let failCount = 0;
  const failures: Array<{ id: string; error: string }> = [];

  await processWithPool(candidates, args.concurrency, async (image, i) => {
    const label = `[${i + 1}/${candidates.length}] ${image.id}`;
    const itemStart = Date.now();
    const result = await regenerateOne(image.id, args.baseUrl);
    const itemMs = Date.now() - itemStart;

    if (result.success) {
      okCount++;
      console.log(
        `${label} ✅ ${result.regionCount ?? "?"} regions, ${result.gzippedBytes ?? "?"}B gz, ${(itemMs / 1000).toFixed(1)}s`,
      );
    } else {
      failCount++;
      failures.push({ id: image.id, error: result.error ?? "unknown" });
      console.log(
        `${label} ❌ ${result.error ?? "unknown error"} (${(itemMs / 1000).toFixed(1)}s)`,
      );
    }

    // Progress snapshot every 10 items
    const done = okCount + failCount;
    if (done % 10 === 0 && done > 0) {
      const elapsedMin = (Date.now() - startedAt) / 60000;
      const rate = done / elapsedMin;
      const remaining = candidates.length - done;
      const etaMin = remaining / rate;
      console.log(
        `  — progress ${done}/${candidates.length} (${okCount} ok, ${failCount} fail), ${rate.toFixed(1)}/min, ETA ${etaMin.toFixed(1)} min`,
      );
    }
  });

  const totalMin = ((Date.now() - startedAt) / 60000).toFixed(1);
  console.log(`\n[Backfill] Done in ${totalMin} min`);
  console.log(`  ✅ ${okCount} successful`);
  console.log(`  ❌ ${failCount} failed`);

  if (failures.length > 0) {
    console.log("\nFailed IDs (retry with --id=<id>):");
    for (const f of failures.slice(0, 20)) {
      console.log(`  ${f.id}: ${f.error}`);
    }
    if (failures.length > 20) {
      console.log(`  ... and ${failures.length - 20} more`);
    }
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[Backfill] Fatal error:", err);
  process.exit(1);
});
