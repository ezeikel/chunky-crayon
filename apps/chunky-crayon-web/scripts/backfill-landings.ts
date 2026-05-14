/**
 * Generate 12 thematically-matched coloring images per /coloring-pages/
 * landing on dev, so the empty galleries fill up before SEO traffic
 * lands on them.
 *
 * Per-image pipeline (the AI + R2 work) lives in
 * `packages/coloring-core/src/backfill/` — shared with
 * `backfill-combo-pages.ts`. This script owns:
 *   - Scene description generation (landing-specific Claude prompt)
 *   - DB row create + update (landing-specific tags + sourcePrompt)
 *   - Coverage counting (by sourcePrompt prefix)
 *
 * Stays "lean" — skips region store, background music, colored
 * reference, fill points to keep cost ~$0.006 per image at low quality.
 *
 * Runs on the dev Neon branch + dev R2 bucket. After it finishes,
 * scripts/sync-dev-to-prod.ts copies rows + R2 objects to production.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-landings.ts --slug calming-coloring-pages-for-kids-with-adhd
 *   pnpm tsx scripts/backfill-landings.ts --slug cute-dinosaur-coloring-pages-for-kids --count 3
 *   pnpm tsx scripts/backfill-landings.ts --all              # all 73 landings × 12 each
 *   pnpm tsx scripts/backfill-landings.ts --all --dry-run
 *   pnpm tsx scripts/backfill-landings.ts --all --skip-existing
 *
 * Env: OPENAI_API_KEY, ANTHROPIC_API_KEY, DATABASE_URL (dev), R2_*
 */

import OpenAI from 'openai';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  db,
  GenerationType,
  Brand,
  Difficulty as PrismaDifficulty,
} from '@one-colored-pixel/db';
import { generateAndStoreColoringImage } from '@one-colored-pixel/coloring-core';
import {
  LANDING_PAGES,
  getLandingPageBySlug,
  type LandingPageConfig,
} from '@/lib/seo/landing-pages';

const QUALITY: 'low' | 'medium' | 'high' = 'low';
const IMAGES_PER_LANDING = 12;
const PURPOSE_KEY_PREFIX = 'landing-backfill';

type Args = {
  slug?: string;
  count: number;
  all: boolean;
  dryRun: boolean;
  skipExisting: boolean;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    count: IMAGES_PER_LANDING,
    all: false,
    dryRun: false,
    skipExisting: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--skip-existing') args.skipExisting = true;
    else if (a === '--slug') args.slug = argv[++i];
    else if (a === '--count') args.count = parseInt(argv[++i], 10);
  }
  return args;
}

/**
 * Map LandingPageConfig.difficulty to the Prisma enum. Falls back to
 * BEGINNER for landings that didn't set one.
 */
function resolveDifficulty(landing: LandingPageConfig): PrismaDifficulty {
  switch (landing.difficulty) {
    case 'intermediate':
      return 'INTERMEDIATE';
    case 'advanced':
      return 'ADVANCED';
    case 'beginner':
    default:
      return 'BEGINNER';
  }
}

/**
 * Synthesise N varied scene descriptions for one landing. Claude reads
 * the landing's title + tags + intro, returns a JSON array of scene
 * descriptions that cover the topic from different angles.
 *
 * Returning fewer than N is fine — the caller skips the missing slots.
 */
async function generateScenes(
  landing: LandingPageConfig,
  count: number,
): Promise<string[]> {
  const claudeModel = anthropic('claude-sonnet-4-5-20250929');
  const prompt = `You are helping fill the gallery of a long-tail SEO landing page on Chunky Crayon (a kids' coloring page site).

Landing page: "${landing.title}"
Tagline: "${landing.tagline}"
Tags: ${landing.tags.join(', ')}
Intent: ${landing.intro}

Generate exactly ${count} distinct, specific coloring page scene descriptions for this landing's gallery. Each description should be a single sentence describing a scene a 3-8 year old would want to color, themed to match this landing exactly. Cover varied subjects within the theme (different animals/objects/scenarios), don't repeat. Output ONE description per line, no numbering, no markdown, no headers, no explanation. Each description should be 8-18 words.`;

  const { text } = await generateText({
    model: claudeModel,
    prompt,
  });

  return text
    .split('\n')
    .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((l) => l.length > 8)
    .slice(0, count);
}

/**
 * Per-image: insert row → call shared AI+R2 pipeline → update row with URLs.
 *
 * Row metadata (tags, sourcePrompt) is landing-specific and stays here;
 * the AI + upload work lives in coloring-core/backfill.
 *
 * Row starts as GENERATING so a mid-run failure (OpenAI billing limit,
 * R2 outage, etc.) leaves the row visibly broken instead of pretending
 * to be a real image — gallery filters exclude non-READY rows.
 */
async function backfillOneImage(
  openai: OpenAI,
  landing: LandingPageConfig,
  description: string,
): Promise<string> {
  const difficulty = resolveDifficulty(landing);

  // Insert row first so we get a stable id for the R2 paths + QR URL.
  // No metadata vision pass — we use the landing's tags and a tidied
  // version of the description. Cheaper and reproducible.
  const row = await db.coloringImage.create({
    data: {
      title: description.replace(/^a /i, '').replace(/\.$/, ''),
      description,
      alt: description,
      tags: landing.tags,
      difficulty,
      generationType: GenerationType.SYSTEM,
      sourcePrompt: `${PURPOSE_KEY_PREFIX}:${landing.slug}: ${description}`,
      brand: Brand.CHUNKY_CRAYON,
      showInCommunity: true,
      status: 'GENERATING',
    },
  });

  try {
    const { url, svgUrl, qrCodeUrl } = await generateAndStoreColoringImage(
      openai,
      {
        description,
        difficulty,
        rowId: row.id,
        options: { quality: QUALITY },
      },
    );

    await db.coloringImage.update({
      where: { id: row.id },
      data: { url, svgUrl, qrCodeUrl, status: 'READY' },
    });

    return row.id;
  } catch (err) {
    await db.coloringImage
      .update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          failureReason:
            err instanceof Error ? err.message.slice(0, 500) : 'unknown',
        },
      })
      .catch(() => {});
    throw err;
  }
}

async function countExistingForLanding(slug: string): Promise<number> {
  return db.coloringImage.count({
    where: {
      brand: Brand.CHUNKY_CRAYON,
      sourcePrompt: { startsWith: `${PURPOSE_KEY_PREFIX}:${slug}:` },
    },
  });
}

async function backfillLanding(
  openai: OpenAI,
  landing: LandingPageConfig,
  countWanted: number,
  args: Args,
): Promise<{ created: number; skipped: number; failed: number }> {
  const result = { created: 0, skipped: 0, failed: 0 };

  let toCreate = countWanted;
  if (args.skipExisting) {
    const existing = await countExistingForLanding(landing.slug);
    toCreate = Math.max(0, countWanted - existing);
    if (toCreate === 0) {
      console.log(
        `[${landing.slug}] already has ${existing} backfilled images, skip`,
      );
      result.skipped = countWanted;
      return result;
    }
    if (existing > 0) {
      console.log(
        `[${landing.slug}] already has ${existing}, will top up with ${toCreate}`,
      );
    }
  }

  console.log(
    `\n[${landing.slug}] (${resolveDifficulty(landing)}) generating ${toCreate} scene descriptions…`,
  );
  let scenes: string[];
  try {
    scenes = await generateScenes(landing, toCreate);
  } catch (err) {
    console.error(
      `[${landing.slug}] scene generation failed:`,
      err instanceof Error ? err.message : err,
    );
    result.failed = toCreate;
    return result;
  }

  if (args.dryRun) {
    console.log(`[${landing.slug}] DRY RUN — would generate:`);
    scenes.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    result.skipped = scenes.length;
    return result;
  }

  for (let i = 0; i < scenes.length; i += 1) {
    const scene = scenes[i];
    const start = Date.now();
    try {
      const id = await backfillOneImage(openai, landing, scene);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `[${landing.slug}] ${i + 1}/${scenes.length} ${id} (${elapsed}s) — ${scene.slice(0, 60)}${scene.length > 60 ? '…' : ''}`,
      );
      result.created += 1;
    } catch (err) {
      console.error(
        `[${landing.slug}] ${i + 1}/${scenes.length} FAILED:`,
        err instanceof Error ? err.message : err,
      );
      result.failed += 1;
    }
  }

  return result;
}

async function main() {
  const args = parseArgs();

  let landings: LandingPageConfig[];
  if (args.slug) {
    const found = getLandingPageBySlug(args.slug);
    if (!found) throw new Error(`Unknown slug: ${args.slug}`);
    landings = [found];
  } else if (args.all) {
    landings = [...LANDING_PAGES];
  } else {
    console.error(
      'Usage:\n' +
        '  --slug <slug>          backfill one landing (default 12 images)\n' +
        '  --slug <slug> --count N    backfill one landing with N images\n' +
        '  --all                  backfill every landing (12 each)\n' +
        "  --skip-existing        only fill landings that don't yet have 12\n" +
        '  --dry-run              print the plan, skip API calls',
    );
    process.exit(1);
  }

  const totalPlanned = landings.length * args.count;
  console.log(
    `[backfill] ${landings.length} landings × ${args.count} images = ${totalPlanned} planned generations`,
  );
  console.log(
    `[backfill] estimated cost: $${(totalPlanned * 0.006).toFixed(2)} at ${QUALITY} quality`,
  );

  if (!args.dryRun && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }
  if (!args.dryRun && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const totals = { created: 0, skipped: 0, failed: 0 };
  for (const landing of landings) {
    const r = await backfillLanding(openai, landing, args.count, args);
    totals.created += r.created;
    totals.skipped += r.skipped;
    totals.failed += r.failed;
  }

  console.log(
    `\n[backfill] done. created=${totals.created} skipped=${totals.skipped} failed=${totals.failed}`,
  );
}

main()
  .catch((err) => {
    console.error('[backfill] fatal:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
