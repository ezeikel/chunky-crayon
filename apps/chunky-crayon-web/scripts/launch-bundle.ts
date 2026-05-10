/**
 * Bundle launch orchestrator.
 *
 * Single command that takes a bundle slug + buyer-facing metadata and
 * runs every step needed to take the bundle from "profile defined in
 * coloring-core" to "real product live in Stripe and the DB".
 *
 * Steps (each idempotent — re-running a partial launch picks up where
 * it left off):
 *
 *   1. Verify HeroBundle profile exists + heroes are non-empty
 *   2. Generate hero reference images via gpt-image-2 (white-bg PNGs
 *      uploaded to R2 at bundles/{slug}/hero-refs/{heroId}.png)
 *   3. Bg-remove the hero refs via Replicate
 *      (bundles/{slug}/hero-refs/{heroId}-transparent.png)
 *   4. Generate the polished colored brand character for the BrandCard
 *      listing image (bundles/{slug}/brand-character.png)
 *   5. Bg-remove the brand character (overwrites brand-character.png
 *      with RGBA version)
 *   6. Seed the Bundle row in the DB (published=false)
 *   7. Generate all 10 coloring pages via the worker's
 *      /generate/bundle-all-pages endpoint, then poll for completion
 *      (~30-45 min wall-clock per bundle)
 *   8. Generate the 5 listing images (Hero, BrandCard, PageGrid 1-3)
 *      via the worker's /generate/bundle-listings endpoint
 *   9. Create / update the Stripe Product + Price
 *
 * After this finishes, the bundle is in DRAFT in the DB. Flip
 * `published` to true via SQL or the admin UI when ready to ship.
 *
 * Cost (approximate):
 *   - Hero refs: ~$0.04 × heroes (4 heroes ≈ $0.16)
 *   - Brand character: ~$0.08
 *   - Replicate bg removal: ~$0.0004 × (heroes + 1) ≈ negligible
 *   - Page generation: ~$0.10 × 10 × 1.5 retries ≈ $1.50
 *   - Listing images: free (Satori)
 *   Total: ~$1.75 per bundle
 *
 * Wall-clock: ~35-50 min total (page gen dominates).
 *
 * Usage:
 *   pnpm tsx -r dotenv/config scripts/launch-bundle.ts \
 *     --slug=unicorn-rainbow-rally \
 *     --name="Unicorn Rainbow Rally" \
 *     --tagline="A wild unicorn race across the sky to bring back the missing rainbow colors" \
 *     dotenv_config_path=.env.local
 *
 *   # Dry run — no API calls, no R2 writes, no DB writes:
 *   ... --dry
 *
 *   # Skip the long page-gen step (useful when iterating on listings only):
 *   ... --skip-pages
 *
 *   # Skip the Stripe step (useful when product already exists):
 *   ... --skip-stripe
 */

import { spawn } from 'node:child_process';
import { db } from '@one-colored-pixel/db';
import { getBundleProfile } from '@one-colored-pixel/coloring-core';
import { generateBundleHeroRefs } from './generate-bundle-hero-refs';
import { seedBundle } from './seed-bundle';

type LaunchOptions = {
  slug: string;
  name: string;
  tagline: string;
  pageCount?: number;
  pricePence?: number;
  currency?: string;
  dryRun?: boolean;
  skipPages?: boolean;
  skipStripe?: boolean;
};

/**
 * Spawn an existing CLI script and stream its output to our stdout.
 * Throws if the script exits non-zero.
 */
async function runScript(
  scriptPath: string,
  args: string[],
  label: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'tsx',
        '-r',
        'dotenv/config',
        scriptPath,
        ...args,
        'dotenv_config_path=.env.local',
      ],
      { stdio: 'inherit', cwd: process.cwd() },
    );
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`[${label}] exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

/**
 * Trigger the worker's bundle-all-pages endpoint and poll the DB for
 * completion. The endpoint returns 202 immediately — wall-clock is on
 * the worker side. We watch coloring_images.count(bundleId) for the
 * expected page count.
 */
async function generatePagesViaWorker(slug: string): Promise<void> {
  const workerBaseUrl = process.env.WORKER_BASE_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerBaseUrl || !workerSecret) {
    throw new Error(
      'WORKER_BASE_URL + WORKER_SECRET required to call worker. Set in .env.local.',
    );
  }

  const profile = getBundleProfile(slug);
  if (!profile) throw new Error(`No profile for ${slug}`);

  const bundle = await db.bundle.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!bundle) throw new Error(`Bundle row not seeded: ${slug}`);

  // Skip the worker call if we already have all pages.
  const existingCount = await db.coloringImage.count({
    where: {
      bundleId: bundle.id,
      svgUrl: { not: null },
      status: 'READY',
    },
  });
  if (existingCount >= profile.pagePrompts.length) {
    console.log(
      `[pages] ${existingCount} READY pages already exist (>= ${profile.pagePrompts.length} required) — skipping worker call`,
    );
    return;
  }

  console.log(
    `[pages] kicking off worker (${existingCount}/${profile.pagePrompts.length} ready, ~${(profile.pagePrompts.length - existingCount) * 4} min wall-clock)...`,
  );
  const res = await fetch(`${workerBaseUrl}/generate/bundle-all-pages`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${workerSecret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ bundleSlug: slug }),
  });
  if (!res.ok) {
    throw new Error(
      `[pages] worker rejected request: ${res.status} ${await res.text()}`,
    );
  }

  // Poll DB for completion. Worker logs progress to its own stdout;
  // here we just watch for the row count to settle.
  const startTime = Date.now();
  const pollIntervalMs = 30_000;
  const maxWaitMs = 60 * 60 * 1000; // 60 min ceiling

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const count = await db.coloringImage.count({
      where: {
        bundleId: bundle.id,
        svgUrl: { not: null },
        status: 'READY',
      },
    });
    const elapsedMin = ((Date.now() - startTime) / 60_000).toFixed(1);
    console.log(
      `[pages]   ${count}/${profile.pagePrompts.length} READY at ${elapsedMin}min`,
    );

    if (count >= profile.pagePrompts.length) {
      console.log(`[pages] all pages ready in ${elapsedMin}min`);
      return;
    }
  }

  throw new Error(
    `[pages] timed out after ${(maxWaitMs / 60_000).toFixed(0)}min waiting for all pages`,
  );
}

/**
 * Trigger the worker to render all 5 listing images. The worker's
 * scripts/build-listing-* CLIs each take a slug; we call them via
 * child_process from the web app's working dir.
 *
 * (The worker also exposes /generate/bundle-listings — using that is
 * a future cleanup. For now, child_process the existing scripts since
 * they're already proven.)
 */
async function generateListings(slug: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(
      `[listings] DRY RUN — would render Hero + BrandCard + 3 PageGrids for ${slug}`,
    );
    return;
  }

  const workerCwd = '../chunky-crayon-worker';
  const cmds: Array<[string, string]> = [
    ['build-listing-hero.ts', 'hero'],
    ['build-listing-brand-card.ts', 'brand-card'],
    ['build-listing-page-grids.ts', 'page-grids'],
  ];

  for (const [scriptName, label] of cmds) {
    console.log(`[listings:${label}] rendering...`);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'npx',
        [
          'tsx',
          '--env-file=.env',
          `src/scripts/${scriptName}`,
          `--slug=${slug}`,
        ],
        { stdio: 'inherit', cwd: workerCwd },
      );
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`[listings:${label}] exited with code ${code}`));
      });
      child.on('error', reject);
    });
  }
}

async function launch(opts: LaunchOptions): Promise<void> {
  console.log(`\n=== Launching bundle: ${opts.slug} ===\n`);

  // Step 1: verify profile.
  const profile = getBundleProfile(opts.slug);
  if (!profile) {
    throw new Error(
      `No HeroBundle profile for ${opts.slug}. Add it to packages/coloring-core/src/bundles/profiles.ts.`,
    );
  }
  if (profile.heroes.length === 0) {
    throw new Error(
      `Bundle ${opts.slug} has empty heroes[]. Fill in 3-4 heroes with signatureDetails + referenceSheetPrompt + funFact before launching.`,
    );
  }
  console.log(
    `[1/9] profile OK — ${profile.heroes.length} heroes, ${profile.pagePrompts.length} pages`,
  );

  // Step 2: hero refs.
  console.log(`\n[2/9] generating hero reference images...`);
  await generateBundleHeroRefs({ slug: opts.slug, dryRun: opts.dryRun });

  // Step 3: bg-remove hero refs.
  console.log(`\n[3/9] removing backgrounds from hero refs...`);
  if (opts.dryRun) {
    console.log('[3/9] DRY RUN — would call Replicate bg-remover per hero');
  } else {
    await runScript(
      'scripts/remove-bundle-hero-backgrounds.ts',
      [`--slug=${opts.slug}`],
      'hero-bg-rm',
    );
  }

  // Step 4: brand character. Use the first hero as the source line-art.
  const brandHeroId = profile.heroes[0]!.id;
  console.log(
    `\n[4/9] generating brand character (using ${brandHeroId} as source)...`,
  );
  if (opts.dryRun) {
    console.log('[4/9] DRY RUN — would call gpt-image-2');
  } else {
    await runScript(
      'scripts/generate-bundle-brand-character.ts',
      [`--slug=${opts.slug}`, `--hero=${brandHeroId}`],
      'brand-character',
    );
  }

  // Step 5: bg-remove brand character.
  console.log(`\n[5/9] removing background from brand character...`);
  if (opts.dryRun) {
    console.log('[5/9] DRY RUN — would call Replicate bg-remover');
  } else {
    await runScript(
      'scripts/remove-bundle-character-background.ts',
      [`--slug=${opts.slug}`],
      'character-bg-rm',
    );
  }

  // Step 6: seed Bundle row.
  console.log(`\n[6/9] seeding Bundle row...`);
  await seedBundle({
    slug: opts.slug,
    name: opts.name,
    tagline: opts.tagline,
    pageCount: opts.pageCount,
    pricePence: opts.pricePence,
    currency: opts.currency,
    dryRun: opts.dryRun,
  });

  // Step 7: page generation (the long one).
  if (opts.skipPages) {
    console.log(`\n[7/9] page generation SKIPPED (--skip-pages)`);
  } else if (opts.dryRun) {
    console.log(
      `\n[7/9] DRY RUN — would POST to worker /generate/bundle-all-pages and poll for ${profile.pagePrompts.length} pages`,
    );
  } else {
    console.log(`\n[7/9] generating ${profile.pagePrompts.length} pages...`);
    await generatePagesViaWorker(opts.slug);
  }

  // Step 8: listing images.
  console.log(`\n[8/9] generating listing images...`);
  await generateListings(opts.slug, !!opts.dryRun);

  // Step 9: Stripe.
  if (opts.skipStripe) {
    console.log(`\n[9/9] Stripe SKIPPED (--skip-stripe)`);
  } else if (opts.dryRun) {
    console.log(`\n[9/9] DRY RUN — would create Stripe Product + Price`);
  } else {
    console.log(`\n[9/9] creating Stripe product...`);
    await runScript(
      'scripts/create-stripe-bundle-product.ts',
      [`--slug=${opts.slug}`, '--no-checkout'],
      'stripe-product',
    );
  }

  console.log(`\n=== Done. Bundle ${opts.slug} is in DRAFT. ===`);
  console.log(
    `Flip published=true via SQL or admin UI when listings + Stripe verified.`,
  );
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
    throw new Error('--slug, --name, --tagline are all required');
  }

  const pageCountStr = get('--page-count');
  const pricePenceStr = get('--price-pence');
  const currency = get('--currency');
  const dryRun = args.includes('--dry');
  const skipPages = args.includes('--skip-pages');
  const skipStripe = args.includes('--skip-stripe');

  launch({
    slug,
    name,
    tagline,
    pageCount: pageCountStr ? parseInt(pageCountStr, 10) : undefined,
    pricePence: pricePenceStr ? parseInt(pricePenceStr, 10) : undefined,
    currency,
    dryRun,
    skipPages,
    skipStripe,
  })
    .catch((e) => {
      console.error('[launch]', e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
