/**
 * AI-judge the difficulty of coloring image rows and update the
 * `difficulty` column to match the consensus.
 *
 * Pipeline per row:
 *   1. Fetch the PNG (or convert SVG to PNG via sharp if no PNG URL)
 *   2. Send to the cheap-tier jury panel (Haiku-4.5 + Gemini-3-Flash +
 *      GPT-5.4-mini) with the difficulty rubric
 *   3. If the panel disagrees, escalate to Opus 4.7 with adaptive
 *      thinking
 *   4. Pick the majority class (BEGINNER / INTERMEDIATE / ADVANCED)
 *   5. UPDATE coloring_images SET difficulty = <class> WHERE id = <id>
 *
 * Modes:
 *   - landing-backfill (default): rows whose sourcePrompt starts with
 *     `landing-backfill:`. Originally added to retro-rate the 936
 *     backfill images.
 *   - daily: DAILY generationType rows. New dailies get auto-rated by
 *     the worker now; this is the back-fill for older ones that
 *     defaulted to BEGINNER before the inline judge was wired up.
 *   - id: rate exactly one row by id. Useful for a quick sanity check.
 *
 * Usage:
 *   pnpm tsx scripts/judge-image-difficulty.ts --dry-run
 *   pnpm tsx scripts/judge-image-difficulty.ts --slug calming-coloring-pages-for-kids-with-adhd --dry-run
 *   pnpm tsx scripts/judge-image-difficulty.ts --mode daily --apply
 *   pnpm tsx scripts/judge-image-difficulty.ts --id cmp57r0jh0001lg5vtuoarm55 --apply
 *   pnpm tsx scripts/judge-image-difficulty.ts --apply --limit 50
 *
 * Env: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY,
 *      DATABASE_URL (which DB to read+write — set per env).
 */
import sharp from 'sharp';
import { judgeColoringImageDifficulty } from '@one-colored-pixel/coloring-core';
import {
  db,
  Difficulty as PrismaDifficulty,
  Brand,
  GenerationType,
  Prisma,
} from '@one-colored-pixel/db';

type Mode = 'landing-backfill' | 'daily' | 'id';

type Args = {
  mode: Mode;
  slug?: string;
  id?: string;
  limit?: number;
  apply: boolean;
  dryRun: boolean;
  brand: Brand;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    mode: 'landing-backfill',
    apply: false,
    dryRun: false,
    brand: Brand.CHUNKY_CRAYON,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--slug') args.slug = argv[++i];
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--mode') {
      const next = argv[++i];
      if (next !== 'landing-backfill' && next !== 'daily' && next !== 'id') {
        throw new Error(`unknown --mode: ${next}`);
      }
      args.mode = next;
    } else if (a === '--id') {
      args.mode = 'id';
      args.id = argv[++i];
    }
  }
  if (!args.apply) args.dryRun = true;
  if (args.mode === 'id' && !args.id) {
    throw new Error('--id <rowId> required for id mode');
  }
  return args;
}

/**
 * Pull the image bytes for a row. Prefer the WebP URL; fall back to
 * rasterising the SVG via sharp if WebP isn't there. Returns PNG bytes
 * suitable for the jury (Claude needs PNG specifically).
 */
async function fetchImageBytes(
  url: string | null,
  svgUrl: string | null,
): Promise<Buffer> {
  // WebP path: rasterise to PNG for the judges.
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`webp fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // Convert to PNG, downscale to 768px max edge — judges don't need
    // full resolution for a complexity rating, and we save tokens.
    return sharp(buf)
      .resize({ width: 768, withoutEnlargement: true })
      .png()
      .toBuffer();
  }
  if (svgUrl) {
    const res = await fetch(svgUrl);
    if (!res.ok) throw new Error(`svg fetch failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return sharp(buf)
      .resize({ width: 768, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();
  }
  throw new Error('row has neither url nor svgUrl');
}

async function main() {
  const args = parseArgs();

  let where: Prisma.ColoringImageWhereInput;
  if (args.mode === 'id') {
    where = { id: args.id };
  } else if (args.mode === 'daily') {
    // Daily mode targets the post-migration default-BEGINNER backlog.
    // Already-judged daily rows (INTERMEDIATE / ADVANCED) are skipped so
    // we don't pay to re-flip a verdict that's already correct — the
    // judges aren't deterministic across runs.
    where = {
      brand: args.brand,
      generationType: GenerationType.DAILY,
      difficulty: PrismaDifficulty.BEGINNER,
    };
  } else {
    where = args.slug
      ? {
          brand: args.brand,
          sourcePrompt: { startsWith: `landing-backfill:${args.slug}:` },
        }
      : {
          brand: args.brand,
          sourcePrompt: { startsWith: 'landing-backfill:' },
        };
  }

  const rows = await db.coloringImage.findMany({
    where,
    select: {
      id: true,
      title: true,
      url: true,
      svgUrl: true,
      difficulty: true,
      sourcePrompt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: args.limit,
  });

  console.log(
    `[judge] ${rows.length} candidate row${rows.length === 1 ? '' : 's'} ${args.dryRun ? '(DRY RUN)' : '(APPLY)'}`,
  );
  if (rows.length === 0) {
    await db.$disconnect();
    return;
  }

  // Cost estimate: ~$0.0015 per tier-1 pass + ~$0.005 if escalated.
  // Assuming 15% escalation rate, expected cost ≈ rows × $0.0023.
  console.log(
    `[judge] estimated cost: $${(rows.length * 0.0023).toFixed(2)} (assuming ~15% tier-2 escalation)`,
  );

  const totals = { judged: 0, escalated: 0, unchanged: 0, failed: 0 };
  const tallyByDiff: Record<string, number> = {};

  for (const row of rows) {
    try {
      const start = Date.now();
      const imageBuffer = await fetchImageBytes(row.url, row.svgUrl);
      const judgement = await judgeColoringImageDifficulty(imageBuffer);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      tallyByDiff[judgement.difficulty] =
        (tallyByDiff[judgement.difficulty] ?? 0) + 1;

      const nextDifficulty = judgement.difficulty as PrismaDifficulty;
      const changed = nextDifficulty !== row.difficulty;
      const action = args.dryRun
        ? `would update ${row.difficulty} → ${nextDifficulty}`
        : changed
          ? `updating ${row.difficulty} → ${nextDifficulty}`
          : `keeping ${row.difficulty}`;
      console.log(
        `[${judgement.source}] ${row.id} (${elapsed}s) ${action} — ${judgement.reasoning.slice(0, 80)}${judgement.reasoning.length > 80 ? '…' : ''}`,
      );

      if (!args.dryRun && changed) {
        await db.coloringImage.update({
          where: { id: row.id },
          data: { difficulty: nextDifficulty },
        });
      }
      if (!changed) totals.unchanged += 1;
      if (judgement.source === 'tier2') totals.escalated += 1;
      totals.judged += 1;
    } catch (err) {
      console.error(
        `[fail] ${row.id}:`,
        err instanceof Error ? err.message : err,
      );
      totals.failed += 1;
    }
  }

  console.log(`\n[judge] done.`);
  console.log(
    `  judged=${totals.judged} escalated=${totals.escalated} unchanged=${totals.unchanged} failed=${totals.failed}`,
  );
  console.log(`  distribution:`, tallyByDiff);
  await db.$disconnect();
}

main().catch((err) => {
  console.error('[judge] fatal:', err);
  process.exit(1);
});
