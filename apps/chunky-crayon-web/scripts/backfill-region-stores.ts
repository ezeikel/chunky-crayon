/**
 * Backfill region stores for every CC ColoringImage that doesn't have one.
 *
 * Runs the region store pipeline IN-PROCESS from tsx — no dev server, no
 * HTTP layer, no timeouts. This is possible because coloring-core's
 * models.ts now lazy-imports @posthog/ai only when withAITracing is called
 * with a real posthog client, so standalone scripts can load the module.
 *
 * Usage (from the CC app dir):
 *
 *   pnpm tsx scripts/backfill-region-stores.ts --dry-run
 *   pnpm tsx scripts/backfill-region-stores.ts --limit=5
 *   pnpm tsx scripts/backfill-region-stores.ts --id=<specific-id> --force
 *
 * Requires DATABASE_URL in the shell env (source .env.local first).
 */

import { put } from '@one-colored-pixel/storage';
import {
  generateRegionStoreLogic,
  DEFAULT_PALETTE_VARIANT_MODIFIERS,
} from '@one-colored-pixel/coloring-core';
import { db } from '@one-colored-pixel/db';
// Deep-import prompts directly to avoid the @/lib/ai barrel, which pulls in
// models.ts and would trigger the @posthog/ai load. Prompts are plain
// constants with no side effects.
import {
  REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
} from '../lib/ai/prompts';
import { ALL_COLORING_COLORS_EXTENDED } from '../constants';
import { BRAND } from '../lib/db';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const regionStoreConfig = {
  gridColorMapSystem: GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
  regionFillPointsSystem: REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  allColors: ALL_COLORING_COLORS_EXTENDED.map((c) => ({
    hex: c.hex,
    name: c.name,
  })),
  paletteVariantModifiers: DEFAULT_PALETTE_VARIANT_MODIFIERS,
};

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------
type Args = {
  dryRun: boolean;
  limit: number;
  force: boolean;
  id: string | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    limit: Infinity,
    force: false,
    id: null,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg.startsWith('--limit=')) {
      args.limit = parseInt(arg.slice('--limit='.length), 10);
    } else if (arg.startsWith('--id=')) {
      args.id = arg.slice('--id='.length);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Per-image pipeline — mirrors apps/chunky-crayon-web/app/actions/generate-regions.ts
// ---------------------------------------------------------------------------
type ProcessResult = {
  success: boolean;
  error?: string;
  regionCount?: number;
  gzippedBytes?: number;
  elapsedMs: number;
};

// Unbuffered stderr logger with millisecond-precise timestamps.
const startedOverallAt = Date.now();
function log(msg: string) {
  const s = ((Date.now() - startedOverallAt) / 1000).toFixed(1).padStart(6);
  process.stderr.write(`[${s}s] ${msg}\n`);
}

const withTimeout = <T>(p: Promise<T>, ms: number, label: string) =>
  Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);

async function processOne(image: {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  svgUrl: string;
}): Promise<ProcessResult> {
  const start = Date.now();
  const tag = `[${image.id}]`;

  log(`${tag} STEP 1/5: fetch SVG`);
  let svgBuffer: Buffer;
  try {
    const svgStart = Date.now();
    const resp = await withTimeout(fetch(image.svgUrl), 30_000, 'SVG fetch');
    if (!resp.ok) {
      return {
        success: false,
        elapsedMs: Date.now() - start,
        error: `Failed to fetch SVG: ${resp.status} ${resp.statusText}`,
      };
    }
    svgBuffer = Buffer.from(await resp.arrayBuffer());
    log(
      `${tag} STEP 1/5: SVG fetched (${svgBuffer.byteLength}B, ${Date.now() - svgStart}ms)`,
    );
  } catch (err) {
    return {
      success: false,
      elapsedMs: Date.now() - start,
      error:
        err instanceof Error ? `SVG fetch threw: ${err.message}` : String(err),
    };
  }

  log(`${tag} STEP 2/5: generateRegionStoreLogic start`);
  const genStart = Date.now();
  const result = await generateRegionStoreLogic(svgBuffer, regionStoreConfig, {
    title: image.title ?? '',
    description: image.description ?? '',
    tags: image.tags ?? [],
  });
  log(
    `${tag} STEP 2/5: generateRegionStoreLogic done (success=${result.success}, ${Date.now() - genStart}ms)`,
  );

  if (!result.success) {
    return {
      success: false,
      elapsedMs: Date.now() - start,
      error: result.error,
    };
  }

  log(`${tag} STEP 3/5: R2 put (${result.regionMapGzipped.byteLength}B) start`);
  let regionMapUrl: string;
  try {
    const r2Start = Date.now();
    const fileName = `uploads/coloring-images/${image.id}/regions.bin.gz`;
    const putResult = await withTimeout(
      put(fileName, result.regionMapGzipped, {
        access: 'public',
        contentType: 'application/gzip',
        allowOverwrite: true,
      }),
      60_000,
      'R2 put',
    );
    regionMapUrl = putResult.url;
    log(`${tag} STEP 3/5: R2 put done (${Date.now() - r2Start}ms)`);
  } catch (err) {
    return {
      success: false,
      elapsedMs: Date.now() - start,
      error:
        err instanceof Error ? `R2 put failed: ${err.message}` : String(err),
    };
  }

  // Wake up stale Neon connection before the real update. After 3+ minutes
  // of Gemini calls, the pooled WebSocket may have gone idle and the Neon
  // compute may have suspended.
  log(`${tag} STEP 4/5: DB warmup + update start`);
  try {
    await withTimeout(db.$executeRaw`SELECT 1`, 15_000, 'DB warmup');
    const dbStart = Date.now();
    await withTimeout(
      db.coloringImage.update({
        where: { id: image.id, brand: BRAND },
        data: {
          regionMapUrl,
          regionMapWidth: result.width,
          regionMapHeight: result.height,
          regionsJson: JSON.stringify(result.regionsJson),
          regionsGeneratedAt: new Date(),
        },
      }),
      30_000,
      'DB update',
    );
    log(`${tag} STEP 4/5: DB update done (${Date.now() - dbStart}ms)`);
  } catch (err) {
    return {
      success: false,
      elapsedMs: Date.now() - start,
      error:
        err instanceof Error ? `DB update failed: ${err.message}` : String(err),
    };
  }

  log(`${tag} STEP 5/5: all done, returning success`);
  return {
    success: true,
    elapsedMs: Date.now() - start,
    regionCount: result.regionsJson.regions.length,
    gzippedBytes: result.regionMapGzipped.byteLength,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  console.log(`[Backfill] Brand: ${BRAND}`);
  console.log(`[Backfill] Dry run: ${args.dryRun}`);
  if (args.id) console.log(`[Backfill] Targeted ID: ${args.id}`);
  if (args.force) console.log(`[Backfill] Force: re-process existing stores`);

  const candidates = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      svgUrl: { not: null },
      ...(args.id ? { id: args.id } : {}),
      ...(args.force || args.id ? {} : { regionMapUrl: null }),
    },
    orderBy: { createdAt: 'desc' },
    take: isFinite(args.limit) ? args.limit : undefined,
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      svgUrl: true,
    },
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

  for (let i = 0; i < candidates.length; i++) {
    const image = candidates[i];
    const label = `[${i + 1}/${candidates.length}] ${image.id}`;
    const result = await processOne({
      id: image.id,
      title: image.title,
      description: image.description,
      tags: image.tags as string[],
      svgUrl: image.svgUrl!,
    });

    if (result.success) {
      okCount++;
      console.log(
        `${label} ✅ ${result.regionCount ?? '?'} regions, ${result.gzippedBytes ?? '?'}B gz, ${(result.elapsedMs / 1000).toFixed(1)}s`,
      );
    } else {
      failCount++;
      failures.push({ id: image.id, error: result.error ?? 'unknown' });
      console.log(
        `${label} ❌ ${result.error ?? 'unknown error'} (${(result.elapsedMs / 1000).toFixed(1)}s)`,
      );
    }

    const done = okCount + failCount;
    if (done % 10 === 0 && done > 0 && done < candidates.length) {
      const elapsedMin = (Date.now() - startedAt) / 60000;
      const rate = done / elapsedMin;
      const remaining = candidates.length - done;
      const etaMin = remaining / rate;
      console.log(
        `  — progress ${done}/${candidates.length} (${okCount} ok, ${failCount} fail), ${rate.toFixed(1)}/min, ETA ${etaMin.toFixed(1)} min`,
      );
    }
  }

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
