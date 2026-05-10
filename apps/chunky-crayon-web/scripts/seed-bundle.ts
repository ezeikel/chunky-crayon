/**
 * Idempotent bundle row seeder. Upserts the Bundle row by slug with
 * the buyer-facing metadata (name, tagline, pageCount, price). Heroes
 * + page prompts live in the HeroBundle profile in coloring-core; this
 * script is purely the DB row that links the static profile to the
 * runtime data the product page reads.
 *
 * Bundle starts as `published: false`. Flip to true via the admin UI
 * (or a hand-written SQL update against prod) only after listings and
 * Stripe product are ready.
 *
 * Usage (CLI):
 *   pnpm tsx -r dotenv/config scripts/seed-bundle.ts \
 *     --slug=unicorn-rainbow-rally \
 *     --name="Unicorn Rainbow Rally" \
 *     --tagline="A wild unicorn race across the sky to bring back the missing rainbow colors" \
 *     dotenv_config_path=.env.local
 *
 *   # Override defaults:
 *   ... --price-pence=799 --page-count=12
 *
 *   # Dry run prints the upsert payload without touching the DB:
 *   ... --dry
 */

import { db } from '@one-colored-pixel/db';
import { getBundleProfile } from '@one-colored-pixel/coloring-core';

export type SeedBundleOptions = {
  slug: string;
  name: string;
  tagline: string;
  pageCount?: number;
  pricePence?: number;
  currency?: string;
  dryRun?: boolean;
};

export type SeedBundleResult = {
  id: string;
  slug: string;
  created: boolean;
};

export async function seedBundle(
  opts: SeedBundleOptions,
): Promise<SeedBundleResult> {
  const profile = getBundleProfile(opts.slug);
  if (!profile) {
    throw new Error(
      `Bundle profile not found in HERO_BUNDLES: ${opts.slug}. Add it to packages/coloring-core/src/bundles/profiles.ts first.`,
    );
  }

  const pageCount = opts.pageCount ?? profile.pagePrompts.length;
  const pricePence = opts.pricePence ?? 499;
  const currency = opts.currency ?? 'gbp';

  if (opts.dryRun) {
    console.log('[seed-bundle] DRY RUN — would upsert:', {
      slug: opts.slug,
      name: opts.name,
      tagline: opts.tagline,
      pageCount,
      pricePence,
      currency,
    });
    return { id: 'dry-run', slug: opts.slug, created: false };
  }

  const existing = await db.bundle.findUnique({
    where: { slug: opts.slug },
    select: { id: true },
  });

  const bundle = await db.bundle.upsert({
    where: { slug: opts.slug },
    create: {
      slug: opts.slug,
      name: opts.name,
      tagline: opts.tagline,
      pageCount,
      pricePence,
      currency,
      brand: 'CHUNKY_CRAYON',
      published: false,
    },
    update: {
      name: opts.name,
      tagline: opts.tagline,
      pageCount,
      pricePence,
      currency,
    },
  });

  const created = !existing;
  console.log(
    `[seed-bundle] ${created ? 'CREATED' : 'UPDATED'} ${bundle.slug} (${bundle.id}) — ${bundle.name}, £${(bundle.pricePence / 100).toFixed(2)}, ${bundle.pageCount} pages, ${bundle.published ? 'PUBLISHED' : 'DRAFT'}`,
  );

  return { id: bundle.id, slug: bundle.slug, created };
}

const isCli = require.main === module;
if (isCli) {
  const args = process.argv.slice(2);
  const get = (flag: string) =>
    args
      .find((a) => a.startsWith(`${flag}=`))
      ?.split('=')
      .slice(1)
      .join('=');

  const slug = get('--slug');
  const name = get('--name');
  const tagline = get('--tagline');
  if (!slug || !name || !tagline) {
    throw new Error(
      '--slug=<slug> --name=<name> --tagline=<tagline> are required',
    );
  }

  const pageCountStr = get('--page-count');
  const pricePenceStr = get('--price-pence');
  const currency = get('--currency');
  const dryRun = args.includes('--dry');

  seedBundle({
    slug,
    name,
    tagline,
    pageCount: pageCountStr ? parseInt(pageCountStr, 10) : undefined,
    pricePence: pricePenceStr ? parseInt(pricePenceStr, 10) : undefined,
    currency,
    dryRun,
  })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
