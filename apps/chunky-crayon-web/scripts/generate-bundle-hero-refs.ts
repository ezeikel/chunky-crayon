/**
 * Generate the locked hero reference image for each character in a
 * bundle. These are the line-art "model sheets" the page generator
 * conditions on so every page draws the same heroes consistently.
 *
 * Source: each Hero's referenceSheetPrompt in
 * packages/coloring-core/src/bundles/profiles.ts
 *
 * Output: R2 at `bundles/{slug}/hero-refs/{heroId}.png`
 *
 * Cost: 1 GPT Image 2 call per hero (~$0.04 each, ~3-4min wall-clock
 * each, sequential). 4 heroes ≈ 15min and ~$0.16.
 *
 * Idempotent: skips heroes whose ref already exists on R2 unless
 * --force is passed.
 *
 * Usage (CLI):
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/generate-bundle-hero-refs.ts \
 *     --slug=unicorn-rainbow-rally \
 *     dotenv_config_path=.env.local
 *
 *   # Dry run — no API calls, no R2 writes:
 *   ... --dry
 *
 *   # Force regenerate even if refs exist:
 *   ... --force
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { put, exists } from '@one-colored-pixel/storage';
import { getBundleProfile } from '@one-colored-pixel/coloring-core';

const MODEL = 'gpt-image-2';
const SIZE = '1024x1024' as const;

export type GenerateHeroRefsOptions = {
  slug: string;
  /** When true, prints what would happen without calling OpenAI or
   *  writing to R2. */
  dryRun?: boolean;
  /** When true, regenerates refs even if they already exist on R2. */
  force?: boolean;
};

export type GenerateHeroRefsResult = {
  generated: number;
  skipped: number;
  failed: number;
  /** R2 paths of the refs (existing or newly written). */
  paths: string[];
};

export async function generateBundleHeroRefs(
  opts: GenerateHeroRefsOptions,
): Promise<GenerateHeroRefsResult> {
  const profile = getBundleProfile(opts.slug);
  if (!profile) {
    throw new Error(`Bundle profile not found: ${opts.slug}`);
  }
  if (profile.heroes.length === 0) {
    throw new Error(
      `Bundle ${opts.slug} has no heroes defined yet. Fill in profile.heroes before running this.`,
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const r2Public = process.env.R2_PUBLIC_URL;
  if (!r2Public) throw new Error('R2_PUBLIC_URL not set');

  const client = new OpenAI();
  const result: GenerateHeroRefsResult = {
    generated: 0,
    skipped: 0,
    failed: 0,
    paths: [],
  };

  for (const hero of profile.heroes) {
    const r2Path = `bundles/${opts.slug}/hero-refs/${hero.id}.png`;
    const fullUrl = `${r2Public}/${r2Path}`;

    // Idempotent: skip if already on R2 (unless --force).
    if (!opts.force) {
      const alreadyExists = await exists(r2Path);
      if (alreadyExists) {
        console.log(`[hero-refs:${hero.id}] already exists, skipping`);
        result.skipped += 1;
        result.paths.push(fullUrl);
        continue;
      }
    }

    console.log(`[hero-refs:${hero.id}] generating (${hero.name})...`);
    if (opts.dryRun) {
      console.log(
        `[hero-refs:${hero.id}] DRY RUN — would call gpt-image-2 with prompt (${hero.referenceSheetPrompt.length} chars)`,
      );
      result.skipped += 1;
      continue;
    }

    const start = Date.now();
    try {
      const response = await client.images.generate({
        model: MODEL,
        prompt: hero.referenceSheetPrompt,
        size: SIZE,
        quality: 'high',
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        console.error(`[hero-refs:${hero.id}] no image in response`);
        result.failed += 1;
        continue;
      }
      const buf = Buffer.from(b64, 'base64');
      console.log(
        `[hero-refs:${hero.id}] done in ${elapsed}s (${(buf.length / 1024).toFixed(0)}KB)`,
      );

      // Save a local preview alongside the actual upload — useful when
      // iterating on the prompt and you don't want to wait for the R2
      // download cycle to inspect the result.
      const previewDir = join(__dirname, 'out', 'hero-refs');
      mkdirSync(previewDir, { recursive: true });
      const localPath = join(previewDir, `${opts.slug}-${hero.id}.png`);
      writeFileSync(localPath, buf);

      const { url } = await put(r2Path, buf, {
        access: 'public',
        contentType: 'image/png',
        allowOverwrite: true,
      });
      console.log(`[hero-refs:${hero.id}] uploaded: ${url}`);
      result.generated += 1;
      result.paths.push(url);
    } catch (err) {
      console.error(`[hero-refs:${hero.id}] failed:`, err);
      result.failed += 1;
    }
  }

  console.log(
    `[hero-refs] done: ${result.generated} generated, ${result.skipped} skipped, ${result.failed} failed`,
  );
  return result;
}

// CLI entry — only runs when invoked directly, not when imported.
const isCli = require.main === module;
if (isCli) {
  const args = process.argv.slice(2);
  const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
  if (!slug) throw new Error('--slug=<bundle> required');
  const dryRun = args.includes('--dry');
  const force = args.includes('--force');

  generateBundleHeroRefs({ slug, dryRun, force })
    .then((r) => {
      if (r.failed > 0) process.exit(1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
