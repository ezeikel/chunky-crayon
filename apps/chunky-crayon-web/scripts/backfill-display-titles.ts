#!/usr/bin/env tsx

/**
 * Backfill ColoringImage.displayTitle — the short, playful, kid-first name the
 * APPS show (web keeps the SEO `title`). New images get displayTitle from the
 * generation pipeline's vision metadata pass; this script fills the existing
 * library.
 *
 * Two derivation paths:
 *   - TEXT (default, cheap/fast): for rows with a usable `title`/`description`,
 *     turn the existing text into a 2-4 word kid name. No image download.
 *   - VISION: for the ~58 combo-backfill rows whose title is a raw prompt
 *     fragment ending in "(seed NNN)" — the text is useless, so we look at the
 *     image (`url`) to name it.
 *
 * Resume-safe: only touches rows where displayTitle IS NULL, so re-running
 * continues where it left off. Concurrency-limited. CC brand + READY only.
 *
 * Which DB it hits is whatever DATABASE_URL the --env-file points at:
 *   DEV:  pnpm tsx --env-file=.env.local            scripts/backfill-display-titles.ts
 *   PROD: pnpm tsx --env-file=.env.production.local  scripts/backfill-display-titles.ts
 * Run DEV first, spot-check, THEN prod.
 *
 * Flags:
 *   --dry-run        generate + log titles, do NOT write
 *   --limit=N        only process the first N rows (sampling / smoke test)
 *   --concurrency=N  parallel AI calls (default 6)
 *   --seed-only      only the "(seed NNN)" rows (the broken 58) — vision path
 *
 * Env: OPENAI_API_KEY (+ whatever getTracedModels needs), DATABASE_URL.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { db, Brand } from '@one-colored-pixel/db';
import { cleanTitle } from '@one-colored-pixel/coloring-core';
import { getTracedModels } from '@/lib/ai';

const SEED_TITLE_RE = /\(seed\s+\d+\)/i;

const DISPLAY_TITLE_SCHEMA = z.object({
  displayTitle: z
    .string()
    .min(1)
    .max(40)
    .describe(
      '2-4 word playful kid-first name, Title Case, no "Coloring Page" suffix, no punctuation. e.g. "Happy Puppy", "Space Rocket", "Sleepy Kitten".',
    ),
});

const TEXT_SYSTEM = `You name a child's coloring page. Given an existing SEO title and description, produce a short 2-4 word playful name a 3-8 year old would call the picture.

Rules:
- Title Case, 2-4 words.
- No "Coloring Page" / "Free Printable" / SEO suffixes.
- No punctuation.
- Concrete and picture-able (the main thing in the picture), not abstract.
Examples: "Spring Wildflower Meadow Coloring Page" -> "Wildflower Meadow"; "Friendly Dinosaur Roaring in Jungle" -> "Happy Dinosaur".`;

const VISION_SYSTEM = `You look at a child's black-and-white coloring page and name it. Produce a short 2-4 word playful name a 3-8 year old would call the picture.

Rules:
- Title Case, 2-4 words.
- No "Coloring Page" suffix, no punctuation.
- Name the most prominent, picture-able subject (e.g. "Happy Puppy", "Space Rocket").`;

type Row = {
  id: string;
  title: string;
  displayTitle: string | null;
  description: string;
  url: string | null;
  svgUrl: string | null;
};

const arg = (name: string): string | undefined => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
};
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

const DRY_RUN = flag('dry-run');
const SEED_ONLY = flag('seed-only');
const LIMIT = arg('limit') ? Number(arg('limit')) : undefined;
const CONCURRENCY = arg('concurrency') ? Number(arg('concurrency')) : 6;

const deriveTextTitle = async (row: Row): Promise<string> => {
  const tracedModels = getTracedModels({
    properties: { action: 'backfill-display-title-text' },
  });
  const { object } = await generateObject({
    model: tracedModels.creative,
    system: TEXT_SYSTEM,
    schema: DISPLAY_TITLE_SCHEMA,
    prompt: `Title: "${row.title}"\nDescription: "${row.description}"`,
  });
  return object.displayTitle.trim();
};

const deriveVisionTitle = async (row: Row): Promise<string> => {
  // The combo rows have a real raster `url`; fall back to svgUrl if needed.
  const imageUrl = row.url || row.svgUrl;
  if (!imageUrl) {
    // No image to look at — best effort from the (useless) text.
    return cleanTitle(row.title);
  }
  const tracedModels = getTracedModels({
    properties: { action: 'backfill-display-title-vision' },
  });
  const { object } = await generateObject({
    model: tracedModels.vision,
    system: VISION_SYSTEM,
    schema: DISPLAY_TITLE_SCHEMA,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Name this coloring page.' },
          { type: 'image', image: new URL(imageUrl) },
        ],
      },
    ],
  });
  return object.displayTitle.trim();
};

const processRow = async (row: Row): Promise<void> => {
  const isSeed = SEED_TITLE_RE.test(row.title);
  let displayTitle: string;
  try {
    displayTitle = isSeed
      ? await deriveVisionTitle(row)
      : await deriveTextTitle(row);
  } catch (err) {
    console.error(`  ✗ ${row.id} (${isSeed ? 'vision' : 'text'}) failed:`, err);
    return;
  }

  console.log(
    `  ${isSeed ? '👁 ' : '📝'} ${row.id}  "${row.title.slice(0, 50)}" -> "${displayTitle}"`,
  );

  if (DRY_RUN) return;
  await db.coloringImage.update({
    where: { id: row.id },
    data: { displayTitle },
  });
};

const main = async () => {
  const where = {
    brand: Brand.CHUNKY_CRAYON,
    status: 'READY' as const,
    displayTitle: null,
    ...(SEED_ONLY ? { title: { contains: '(seed ' } } : {}),
  };

  const total = await db.coloringImage.count({ where });
  console.log(
    `[backfill-display-titles] ${total} rows need displayTitle (CC, READY${SEED_ONLY ? ', seed-only' : ''})${DRY_RUN ? ' — DRY RUN' : ''}`,
  );

  const rows: Row[] = await db.coloringImage.findMany({
    where,
    select: {
      id: true,
      title: true,
      displayTitle: true,
      description: true,
      url: true,
      svgUrl: true,
    },
    orderBy: { createdAt: 'desc' },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  const seedCount = rows.filter((r) => SEED_TITLE_RE.test(r.title)).length;
  console.log(
    `Processing ${rows.length} rows (${seedCount} vision / ${rows.length - seedCount} text), concurrency ${CONCURRENCY}\n`,
  );

  let done = 0;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processRow));
    done += batch.length;
    console.log(`  ... ${done}/${rows.length}`);
  }

  console.log(`\n[backfill-display-titles] done. ${done} processed.`);
  await db.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
