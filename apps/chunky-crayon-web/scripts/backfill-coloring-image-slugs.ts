/**
 * One-shot backfill: populate `slugBase` for every CC public coloring image
 * (daily/system rows that go in the sitemap). Idempotent — skips rows that
 * already have a slugBase.
 *
 * User-generated rows are intentionally skipped: they're never publicly
 * indexable so they don't need a slug.
 *
 * Run with:
 *   pnpm tsx scripts/backfill-coloring-image-slugs.ts
 *   pnpm tsx scripts/backfill-coloring-image-slugs.ts --dry-run
 */
import { db } from '@one-colored-pixel/db';
import { BRAND } from '../lib/db';
import { slugify } from '../lib/seo/slug';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`[backfill-slugs] starting${dryRun ? ' (dry-run)' : ''}…`);

  const rows = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      userId: null,
      status: 'READY',
      slugBase: null,
    },
    select: { id: true, title: true },
  });

  console.log(`[backfill-slugs] ${rows.length} rows to update`);

  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const title = (row.title ?? '').trim();
    if (!title) {
      console.warn(`[backfill-slugs] skip ${row.id} — empty title`);
      skipped += 1;
      continue;
    }
    const slugBase = slugify(title);
    if (!slugBase) {
      console.warn(
        `[backfill-slugs] skip ${row.id} — slugify produced empty result from title "${title}"`,
      );
      skipped += 1;
      continue;
    }
    if (dryRun) {
      console.log(`[backfill-slugs] would set ${row.id} → ${slugBase}`);
    } else {
      await db.coloringImage.update({
        where: { id: row.id },
        data: { slugBase },
      });
      console.log(`[backfill-slugs] ${row.id} → ${slugBase}`);
    }
    updated += 1;
  }

  console.log(
    `[backfill-slugs] done — ${updated} ${dryRun ? 'would update' : 'updated'}, ${skipped} skipped`,
  );
  await db.$disconnect();
}

main().catch((err) => {
  console.error('[backfill-slugs] failed:', err);
  process.exit(1);
});
