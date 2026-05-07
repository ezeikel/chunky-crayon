/**
 * One-off seed for the Dino Dance Party bundle.
 *
 * Does two things:
 *   1. Uploads the locked hero reference images from the spike output dir to
 *      R2 at `bundles/dino-dance-party/hero-refs/{heroId}.png`.
 *   2. Creates (or upserts) a `Bundle` row in the dev DB using the locked
 *      character cast and the £4.99 / 10-page anchor pricing.
 *
 * Idempotent: re-running overwrites the R2 ref images and updates the
 * Bundle row. No ColoringImage rows are created here — those land later
 * via the worker pipeline.
 *
 * Cost: nothing — pure upload + DB writes.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/seed-dino-dance-party.ts \
 *     dotenv_config_path=.env.local
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '@one-colored-pixel/db';
import { put } from '@one-colored-pixel/storage';
import { DINO_DANCE_PARTY } from '@one-colored-pixel/coloring-core';

const SPIKE_DIR = join(__dirname, 'out', 'spike-bundle-consistency');

// Map locked hero id → spike-output filename. Reflects the v1/v2/v3 picks
// from the character-consistency spike. If we re-spin a hero later, the
// filename changes here and the seed re-uploads.
const HERO_REF_FILES: Record<string, string> = {
  rex: 'hero_rex.png',
  spike: 'hero_spike.png',
  zip: 'hero_zip_v2.png',
  dots: 'hero_dots_v3.png',
  group: 'hero_group_v2.png',
};

async function uploadHeroRefs(slug: string) {
  const uploads: Record<string, string> = {};
  for (const [heroId, filename] of Object.entries(HERO_REF_FILES)) {
    const localPath = join(SPIKE_DIR, filename);
    console.log(`[seed] Uploading ${heroId} (${filename})...`);
    const buf = readFileSync(localPath);
    const { url } = await put(`bundles/${slug}/hero-refs/${heroId}.png`, buf, {
      access: 'public',
      contentType: 'image/png',
      allowOverwrite: true,
    });
    console.log(`[seed]   → ${url}`);
    uploads[heroId] = url;
  }
  return uploads;
}

async function upsertBundle(slug: string) {
  const profile = DINO_DANCE_PARTY;

  // Tagline mirrors the launch lineup JSON. Single source of truth lives
  // in the research output for now; bundle-marketing copy can move into
  // a per-bundle config file later if it gets unwieldy.
  const tagline =
    'Stomping, spinning, roaring dinosaurs throwing the silliest dance party';

  const bundle = await db.bundle.upsert({
    where: { slug },
    create: {
      slug,
      name: 'Dino Dance Party',
      tagline,
      pageCount: 10,
      pricePence: 499,
      currency: 'gbp',
      brand: 'CHUNKY_CRAYON',
      published: false, // flip to true once art + listings + Stripe ready
    },
    update: {
      name: 'Dino Dance Party',
      tagline,
      pageCount: 10,
    },
  });

  console.log(
    `[seed] Bundle ${bundle.published ? 'PUBLISHED' : 'DRAFT'}: ${bundle.id} (${bundle.slug})`,
  );
  return bundle;
}

async function run() {
  if (!process.env.R2_BUCKET || !process.env.R2_ACCESS_KEY_ID) {
    throw new Error('R2 env vars not set — check .env.local');
  }

  const slug = DINO_DANCE_PARTY.slug;

  const bundle = await upsertBundle(slug);
  const refs = await uploadHeroRefs(slug);

  console.log(`\n[seed] Done.`);
  console.log(`Bundle id: ${bundle.id}`);
  console.log(`Hero refs:`);
  for (const [heroId, url] of Object.entries(refs)) {
    console.log(`  ${heroId}: ${url}`);
  }
}

run()
  .catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
