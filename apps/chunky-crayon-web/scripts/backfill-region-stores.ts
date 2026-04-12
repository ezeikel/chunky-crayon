/**
 * Backfill region stores for every ColoringImage that doesn't have one yet.
 *
 * This script reads candidate image IDs directly from the DB, then POSTs
 * each ID to the local dev server's /api/dev/regenerate-region-store/[id]
 * route. The dev server does all the heavy lifting (tracing, rasterising,
 * region detection, Gemini labelling + 4 palette variants, R2 uploads,
 * DB persistence) — this script is just a fancy driver loop.
 *
 * Why go through HTTP? Direct tsx invocation of the region store pipeline
 * pulls in @one-colored-pixel/coloring-core → models.ts → @posthog/ai,
 * which crashes at module load under tsx because of ESM/CJS interop with
 * the Anthropic SDK. The dev server loads the same code through Next's
 * bundler which handles the interop correctly. The HTTP hop is <1ms
 * locally — the real cost is the 5 Gemini calls per image, not the
 * transport.
 *
 * Usage (from the CC app dir):
 *
 *   pnpm tsx scripts/backfill-region-stores.ts --dry-run
 *   pnpm tsx scripts/backfill-region-stores.ts --limit=5
 *   pnpm tsx scripts/backfill-region-stores.ts --concurrency=3
 *   pnpm tsx scripts/backfill-region-stores.ts --id=<specific-id> --force
 *   pnpm tsx scripts/backfill-region-stores.ts --base-url=http://localhost:3000
 *
 * Requires a running dev server on the given base URL (default localhost:3000).
 * DATABASE_URL must be set in the shell env or inherited from .env.local.
 */

import { db } from '@one-colored-pixel/db';
import { BRAND } from '../lib/db';

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
    // Gemini rate-limit contention makes concurrency > 1 slower than sequential
    // for images with hundreds of regions — each parallel call stretches to 3×
    // baseline latency. Keep sequential by default.
    concurrency: 1,
    force: false,
    id: null,
    baseUrl: 'http://localhost:3000',
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg.startsWith('--limit=')) {
      args.limit = parseInt(arg.slice('--limit='.length), 10);
    } else if (arg.startsWith('--concurrency=')) {
      args.concurrency = parseInt(arg.slice('--concurrency='.length), 10);
    } else if (arg.startsWith('--id=')) {
      args.id = arg.slice('--id='.length);
    } else if (arg.startsWith('--base-url=')) {
      args.baseUrl = arg.slice('--base-url='.length);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// HTTP call + DB poll for the dev regenerate endpoint
// ---------------------------------------------------------------------------
type RegenerateResponse = {
  success: boolean;
  error?: string;
  source?: 'http' | 'db-poll'; // which signal we used to declare done
  elapsedMs?: number;
  regionCount?: number;
  gzippedBytes?: number;
  sceneDescription?: string;
  width?: number;
  height?: number;
};

/**
 * Poll the DB for this image until its regionsGeneratedAt is newer than the
 * recorded startedAt (meaning a completed save happened after we fired the
 * POST), or the hard timeout is hit.
 */
async function waitForRegionStoreSave(
  id: string,
  startedAt: Date,
  timeoutMs: number,
  pollIntervalMs = 15_000,
): Promise<RegenerateResponse> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const row = await db.coloringImage.findUnique({
      where: { id },
      select: {
        regionMapUrl: true,
        regionMapWidth: true,
        regionMapHeight: true,
        regionsGeneratedAt: true,
        regionsJson: true,
      },
    });
    if (
      row?.regionMapUrl &&
      row.regionsGeneratedAt &&
      row.regionsGeneratedAt.getTime() > startedAt.getTime()
    ) {
      let regionCount: number | undefined;
      try {
        const parsed = JSON.parse(row.regionsJson ?? '{}');
        regionCount = Array.isArray(parsed?.regions)
          ? parsed.regions.length
          : undefined;
      } catch {
        /* ignore */
      }
      return {
        success: true,
        source: 'db-poll',
        width: row.regionMapWidth ?? undefined,
        height: row.regionMapHeight ?? undefined,
        regionCount,
      };
    }
  }
  return {
    success: false,
    source: 'db-poll',
    error: `DB save did not land within ${Math.round(timeoutMs / 60000)} min`,
  };
}

/**
 * Regenerate one image by POSTing the dev route, then race the HTTP response
 * against a DB poll. Whichever wins first determines success.
 *
 * - Happy path (image < ~4 min): HTTP response arrives with full metadata.
 * - Slow path (image > 5 min, Next's dev response cap kicks in): HTTP throws
 *   or closes, DB poll sees the save land and returns success.
 * - Failure path: both paths fail — HTTP errors AND DB poll times out.
 *
 * The dev route handler runs to completion in-process even if Next closes
 * the HTTP response, so the DB save happens regardless of client-side
 * aborts.
 */
async function regenerateOne(
  id: string,
  baseUrl: string,
  perImageTimeoutMs = 20 * 60 * 1000,
): Promise<RegenerateResponse> {
  const startedAt = new Date();

  const httpLeg = (async (): Promise<RegenerateResponse> => {
    try {
      const resp = await fetch(
        `${baseUrl}/api/dev/regenerate-region-store/${id}`,
        { method: 'POST' },
      );
      const body = (await resp.json()) as RegenerateResponse;
      if (!resp.ok && body.success !== false) {
        return { success: false, source: 'http', error: `HTTP ${resp.status}` };
      }
      return { ...body, source: 'http' };
    } catch (err) {
      return {
        success: false,
        source: 'http',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  })();

  const dbLeg = waitForRegionStoreSave(id, startedAt, perImageTimeoutMs);

  const raced = await Promise.race([
    httpLeg.then((r) => ({ result: r, done: r.success })),
    dbLeg.then((r) => ({ result: r, done: r.success })),
  ]);

  if (raced.done) {
    return raced.result;
  }

  const dbResult = await dbLeg;
  if (dbResult.success) {
    return dbResult;
  }

  const httpResult = await httpLeg;
  return {
    success: false,
    source: 'db-poll',
    error: `http: ${httpResult.error ?? 'unknown'} | db: ${dbResult.error ?? 'unknown'}`,
  };
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
    orderBy: { createdAt: 'desc' },
    take: isFinite(args.limit) ? args.limit : undefined,
    select: { id: true, title: true },
  });

  console.log(`\n[Backfill] Found ${candidates.length} candidate(s)\n`);

  if (candidates.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  if (args.dryRun) {
    console.log('Dry run — would process:\n');
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
    console.log('Ctrl-C within 5 seconds to cancel...');
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
      const gz = result.gzippedBytes ? `${result.gzippedBytes}B gz` : '';
      const via = result.source === 'db-poll' ? ' [via db-poll]' : '';
      console.log(
        `${label} ✅ ${result.regionCount ?? '?'} regions${gz ? ', ' + gz : ''}, ${(itemMs / 1000).toFixed(1)}s${via}`,
      );
    } else {
      failCount++;
      failures.push({ id: image.id, error: result.error ?? 'unknown' });
      console.log(
        `${label} ❌ ${result.error ?? 'unknown error'} (${(itemMs / 1000).toFixed(1)}s)`,
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
    console.log('\nFailed IDs (retry with --id=<id>):');
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
  console.error('[Backfill] Fatal error:', err);
  process.exit(1);
});
