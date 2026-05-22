/**
 * One-time asset pipeline: generate the colourful tile illustrations for
 * the Character Builder picker (species / traits / voice).
 *
 * Sibling of `generate-scene-thumbnails.ts` — same gpt-image-2 `high`,
 * same Chunky Crayon brand recipe (warm-brown outlines, pink cheek
 * blush, flat eyes, white bg). The catalogue (`lib/characters/
 * picker-catalog.ts`) stores an R2 key per option; the SceneTile
 * resolves the full URL at render time and falls back to the FA icon
 * while the key is null.
 *
 * 24 jobs: 8 species, 8 traits, 8 voice personas. Traits are abstract,
 * so each is prompted as a concrete little OBJECT that reads as the
 * idea (brave → a shield with a star; sleepy → a cosy crescent moon).
 * Voice personas are little round expressive faces conveying the tone.
 *
 * R2 prefix `character-thumbnails/`. Idempotent + resumable: skips any
 * option whose R2 object already exists. Safe to re-run after a partial
 * failure.
 *
 * Cost (OpenAI Images API, May 2026): ~$0.211/image at `high` 1024².
 * Full set (24) ≈ $5, ~45 min.
 *
 * Usage (from apps/chunky-crayon-web):
 *   # dry run — previews to scripts/out/character-thumbnails/ only
 *   pnpm tsx -r dotenv/config scripts/generate-character-thumbnails.ts \
 *     dotenv_config_path=.env.local
 *
 *   # generate + upload to R2 + patch the catalogue
 *   pnpm tsx -r dotenv/config scripts/generate-character-thumbnails.ts \
 *     --commit dotenv_config_path=.env.local
 *
 *   # regenerate one option
 *   pnpm tsx -r dotenv/config scripts/generate-character-thumbnails.ts \
 *     --only=species:dragon --commit --force dotenv_config_path=.env.local
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { put, exists } from '@one-colored-pixel/storage';
import {
  SPECIES_OPTIONS,
  TRAIT_OPTIONS,
  VOICE_TILES,
} from '../lib/characters/picker-catalog';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const FORCE = args.includes('--force');
const ONLY = args
  .find((a) => a.startsWith('--only='))
  ?.split('=')[1]
  ?.trim();

const MODEL = 'gpt-image-2';
const SIZE = '1024x1024' as const;
const QUALITY = 'high' as const;
const R2_PREFIX = 'character-thumbnails';
const OUT_DIR = join(process.cwd(), 'scripts', 'out', 'character-thumbnails');
const CATALOG_PATH = join(
  process.cwd(),
  'lib',
  'characters',
  'picker-catalog.ts',
);

type Job = { layer: string; key: string; subject: string };

// Traits are abstract — a flat icon-idea doesn't illustrate well, so
// each maps to a concrete little OBJECT that reads as the trait at a
// glance. Keyed by TraitKey.
const TRAIT_SUBJECTS: Record<string, string> = {
  brave: 'a small round shield with a star on it',
  sleepy: 'a cosy crescent moon with a sleepy smiling face',
  silly: 'a googly-eyed jester hat',
  shy: 'a small soft heart peeking out from behind a leaf',
  'loves-snacks': 'a happy cookie with a bite taken out',
  bouncy: 'a bouncy rubber ball with motion lines',
  curious: 'a magnifying glass with a friendly face',
  sparkly: 'a cluster of bright sparkles and a star',
};

// Voice personas → a little round face conveying the tone.
const VOICE_SUBJECTS: Record<string, string> = {
  'warm-girl-7yo': 'a warm gently smiling round face',
  'warm-boy-7yo': 'a cosy contented round face with soft eyes',
  'playful-girl-5yo': 'a bouncy excited round face with star-bright eyes',
  'playful-boy-5yo': 'a playful cheeky round face with its tongue out',
  'sleepy-neutral': 'a sleepy round face with droopy happy eyes',
  'brave-neutral': 'a brave confident round face with a big grin',
  'silly-neutral': 'a silly laughing round face with a wide open smile',
  'gentle-neutral': 'a gentle calm round face with a soft relaxed smile',
};

const jobs: Job[] = [
  ...SPECIES_OPTIONS.map((o) => ({
    layer: 'species',
    key: o.key,
    subject: `a friendly little ${o.noun}`,
  })),
  ...TRAIT_OPTIONS.map((o) => ({
    layer: 'trait',
    key: o.key,
    subject: TRAIT_SUBJECTS[o.key] ?? o.label.toLowerCase(),
  })),
  ...VOICE_TILES.map((o) => ({
    layer: 'voice',
    key: o.key,
    subject: VOICE_SUBJECTS[o.key] ?? `a ${o.label.toLowerCase()} round face`,
  })),
];

const buildPrompt = (subject: string): string =>
  // Identical brand recipe to generate-scene-thumbnails.ts so the
  // Character Builder tiles read as the same family as the Scene
  // Builder tiles. See that script for the full reasoning.
  `A simple flat 2D illustration of ${subject} in the style of a ` +
  `friendly children's mascot. ` +
  `Thick warm dark-brown outlines (around #5a3a1f), not pure black. ` +
  `Bright flat colour fills, no gradients, no shading. ` +
  `If the subject has a face: two simple oval eyes (no highlights, no ` +
  `sparkles inside the eyes), a tiny smiling mouth, and small soft ` +
  `pink circular cheek blushes on either side of the face. ` +
  `Chunky stocky proportions, short limbs, big head if it has one. ` +
  `Centred composition, single subject, on a pure white background. ` +
  `No text, no words, no letters, no logos.`;

const r2Key = (job: Job) => `${R2_PREFIX}/${job.layer}/${job.key}.png`;

const main = async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  mkdirSync(OUT_DIR, { recursive: true });

  const selected = ONLY
    ? jobs.filter((j) => `${j.layer}:${j.key}` === ONLY)
    : jobs;
  if (selected.length === 0) {
    throw new Error(`--only=${ONLY} matched no catalogue option`);
  }

  // (layer:key) -> R2 key, accumulated for the catalogue patch.
  const keys: Record<string, string> = {};

  for (const job of selected) {
    const id = `${job.layer}:${job.key}`;
    const key = r2Key(job);

    if (!FORCE && COMMIT && (await exists(key))) {
      console.log(`[char-thumb] skip ${id} (R2 object exists)`);
      keys[id] = key;
      continue;
    }

    const start = Date.now();
    const result = await client.images.generate({
      model: MODEL,
      prompt: buildPrompt(job.subject),
      size: SIZE,
      quality: QUALITY,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error(`No image returned for ${id}`);
    const buf = Buffer.from(b64, 'base64');
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const preview = join(OUT_DIR, `${job.layer}-${job.key}.png`);
    writeFileSync(preview, buf);

    if (COMMIT) {
      await put(key, buf, { contentType: 'image/png' });
      keys[id] = key;
      console.log(`[char-thumb] ${id} ${elapsed}s -> ${key}`);
    } else {
      console.log(`[char-thumb] ${id} ${elapsed}s -> ${preview} (dry run)`);
    }
  }

  if (!COMMIT) {
    console.log(
      `\n[char-thumb] dry run done (${selected.length}). Re-run with --commit to upload + patch the catalogue.`,
    );
    return;
  }

  // Patch picker-catalog.ts: replace `thumbnailKey: null` with the R2
  // key for each generated option. Match per-option by the unique
  // `key: '<key>'` line, rewrite the nearest following
  // `thumbnailKey: null`. Conservative — only touches entries we have a
  // key for.
  let src = readFileSync(CATALOG_PATH, 'utf8');
  let patched = 0;
  for (const job of selected) {
    const k = keys[`${job.layer}:${job.key}`];
    if (!k) continue;
    const anchor = new RegExp(
      `(key:\\s*'${job.key}'[\\s\\S]*?thumbnailKey:\\s*)null`,
    );
    if (anchor.test(src)) {
      src = src.replace(anchor, `$1'${k}'`);
      patched += 1;
    } else {
      console.warn(
        `[char-thumb] could not patch catalogue for ${job.layer}:${job.key} (already set?)`,
      );
    }
  }
  if (patched > 0) {
    writeFileSync(CATALOG_PATH, src);
    console.log(
      `\n[char-thumb] patched ${patched} thumbnailKey entries in picker-catalog.ts`,
    );
  } else {
    console.log('\n[char-thumb] no catalogue entries needed patching');
  }
};

main().catch((err) => {
  console.error('[char-thumb] failed:', err);
  process.exit(1);
});
