#!/usr/bin/env tsx

/**
 * Report how many existing images match each COMBO_PAGES entry.
 *
 * Run after the difficulty-grader pass so the difficulty filter is accurate.
 * Tells us which combos already have enough content (≥ threshold) and which
 * need backfilling, plus the total image debt to launch all phase-1 combos.
 *
 * Loads .env.local via tsx --env-file flag (cacheLife() in gallery.ts is
 * Next-runtime-only, so we query Prisma directly here).
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/count-combo-coverage.ts
 *   pnpm tsx --env-file=.env.local scripts/count-combo-coverage.ts --threshold=10
 */

import { db, Prisma } from '@one-colored-pixel/db';
import { COMBO_PAGES, type ComboPage } from '@/lib/seo/combo-pages';
import { getCategoryBySlug } from '@/constants';
import { BRAND } from '@/lib/db';

const DEFAULT_THRESHOLD = 6;

const buildWhere = (combo: ComboPage): Prisma.ColoringImageWhereInput => {
  const andClauses: Prisma.ColoringImageWhereInput[] = [];

  if (combo.categorySlug) {
    const category = getCategoryBySlug(combo.categorySlug);
    if (!category) {
      return { id: '__missing-category__' };
    }
    andClauses.push({
      OR: [
        { tags: { hasSome: category.tags } },
        ...category.tags.map((tag) => ({
          OR: [
            { title: { contains: tag, mode: 'insensitive' as const } },
            { description: { contains: tag, mode: 'insensitive' as const } },
          ],
        })),
      ],
    });
  }

  if (combo.extraTagsAny && combo.extraTagsAny.length > 0) {
    andClauses.push({ tags: { hasSome: combo.extraTagsAny } });
  }

  return {
    brand: BRAND,
    status: 'READY',
    userId: null,
    ...(combo.difficulty ? { difficulty: combo.difficulty } : {}),
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
  };
};

const main = async () => {
  const args = process.argv.slice(2);
  const threshold = Number(
    args
      .find((a) => a.startsWith('--threshold='))
      ?.slice('--threshold='.length) ?? DEFAULT_THRESHOLD,
  );

  console.log(`Threshold: ${threshold} images per combo\n`);

  const rows: { combo: ComboPage; count: number }[] = [];
  for (const combo of COMBO_PAGES) {
    // eslint-disable-next-line no-await-in-loop
    const count = await db.coloringImage.count({ where: buildWhere(combo) });
    rows.push({ combo, count });
  }

  const pad = (s: string, n: number) =>
    s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);

  console.log(
    `${pad('SLUG', 50)} ${pad('GROUP', 9)} ${pad('HAVE', 5)} ${pad('NEED', 5)} STATUS`,
  );
  console.log('-'.repeat(85));

  let totalDebt = 0;
  let readyCount = 0;

  for (const { combo, count } of rows) {
    const need = Math.max(0, threshold - count);
    totalDebt += need;
    if (need === 0) readyCount += 1;
    const status = need === 0 ? '✅ ready' : `⚠️  backfill ${need}`;
    console.log(
      `${pad(combo.slug, 50)} ${pad(combo.group, 9)} ${pad(String(count), 5)} ${pad(String(need), 5)} ${status}`,
    );
  }

  console.log('-'.repeat(85));
  console.log(`\nReady to ship: ${readyCount}/${COMBO_PAGES.length} combos`);
  console.log(`Total images to backfill: ${totalDebt}`);
  if (totalDebt > 0) {
    console.log(
      `\nNext: pnpm tsx --env-file=.env.local scripts/backfill-combo-pages.ts`,
    );
    console.log(
      `(backfill caps at 10 images/combo/run; may need ${Math.ceil(totalDebt / 10)} pass(es))`,
    );
  }

  await db.$disconnect();
};

main().catch(async (err) => {
  console.error('❌ Error:', err);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
