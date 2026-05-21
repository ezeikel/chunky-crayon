/**
 * One-time asset pipeline: generate the colourful tile illustrations for
 * the Scene Builder picker.
 *
 * Every catalogue option (subject / location / weather / activity /
 * accent) gets a small bright kid-style illustration. The catalogue
 * stores an R2 key (e.g. `scene-thumbnails/subject/dog.png`); the
 * SceneInput adapter resolves the full URL at render time via
 * `lib/scene/thumbnail-url.ts`. So this script's only job is: generate
 * the image, upload to R2, and write the KEY (not the URL) back into
 * `lib/scene/scene-catalog.ts`. Env-agnostic — same catalogue file
 * works in dev + prod against different R2 buckets.
 *
 * gpt-image-2 (no reference image — these are fresh illustrations, not
 * character edits, so transparency isn't needed and gpt-image-2's lack of
 * alpha doesn't bite here, per feedback_gpt_image_2_no_transparent_bg).
 *
 * Idempotent + resumable: skips any option whose R2 object already exists.
 * Safe to re-run after a partial failure. Six-check rule respected — the
 * catalogue file is the spec, `scene-thumbnails/` is a new R2 prefix only
 * this script + the SceneBuilder tile consume.
 *
 * Cost (per OpenAI Images API, May 2026): roughly $0.053/image at
 * `medium` quality and $0.211/image at `high` quality, both 1024×1024.
 * Full catalog (~41 tiles) at high ≈ $8.65, ~75 min. Numbers are
 * estimates from OpenAI's calculator — token-metered, not flat-fee.
 *
 * Usage (from apps/chunky-crayon-web):
 *   # dry run — previews to scripts/out/scene-thumbnails/ only, no R2,
 *   # no catalogue edit
 *   pnpm tsx -r dotenv/config scripts/generate-scene-thumbnails.ts \
 *     dotenv_config_path=.env.local
 *
 *   # generate + upload to R2 + patch the catalogue
 *   pnpm tsx -r dotenv/config scripts/generate-scene-thumbnails.ts \
 *     --commit dotenv_config_path=.env.local
 *
 *   # regenerate a single option (force, ignores the skip-if-exists guard)
 *   pnpm tsx -r dotenv/config scripts/generate-scene-thumbnails.ts \
 *     --only=subject:dog --commit --force dotenv_config_path=.env.local
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { put, exists } from '@one-colored-pixel/storage';
import {
  SUBJECT_OPTIONS,
  LOCATION_OPTIONS,
  WEATHER_OPTIONS,
  ACTIVITY_OPTIONS,
  ACCENT_OPTIONS,
} from '../lib/scene/scene-catalog';

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
const R2_PREFIX = 'scene-thumbnails';
const OUT_DIR = join(process.cwd(), 'scripts', 'out', 'scene-thumbnails');
const CATALOG_PATH = join(process.cwd(), 'lib', 'scene', 'scene-catalog.ts');

// Each catalogue layer flattened to {layer, key, prompt subject}. The
// prompt phrasing is tuned for an inviting PICKER tile — a vivid little
// illustration of the thing, NOT a line-art coloring page (that's the
// output of the scene, not the picker).
type Job = { layer: string; key: string; subject: string };

const jobs: Job[] = [
  ...SUBJECT_OPTIONS.filter((o) => o.key !== 'your-character').map((o) => ({
    layer: 'subject',
    key: o.key,
    subject: o.promptNoun ?? o.label.toLowerCase(),
  })),
  ...LOCATION_OPTIONS.map((o) => ({
    layer: 'location',
    key: o.key,
    subject: o.promptPhrase.replace(/^(at|in|on|out) (the |a )?/, ''),
  })),
  ...WEATHER_OPTIONS.map((o) => ({
    layer: 'weather',
    key: o.key,
    subject: o.label.toLowerCase(),
  })),
  ...ACTIVITY_OPTIONS.map((o) => ({
    layer: 'activity',
    key: o.key,
    subject: o.label.toLowerCase(),
  })),
  ...ACCENT_OPTIONS.map((o) => ({
    layer: 'accent',
    key: o.key,
    subject: o.label.toLowerCase(),
  })),
];

const buildPrompt = (subject: string): string =>
  // Chunky Crayon brand recipe — matches the existing Colo mascot and
  // sticker set (see public/images/colo*.png + public/images/stickers/*).
  // The earlier version produced generic kid-app illustrations that
  // could pass for any app from Toca Boca to PBS Kids. This tightens
  // to the actual brand: warm-brown outlines (#5a3a1f, not pure black),
  // pink cheek-blush on faces (a Chunky Crayon signature), minimal flat
  // eyes (no kawaii highlights), chunky proportions, white background
  // for tile-cutout flexibility.
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

  // (layer:key) -> public R2 url, accumulated for the catalogue patch.
  const keys: Record<string, string> = {};

  for (const job of selected) {
    const id = `${job.layer}:${job.key}`;
    const key = r2Key(job);

    if (!FORCE && COMMIT && (await exists(key))) {
      console.log(`[scene-thumb] skip ${id} (R2 object exists)`);
      // Still record the key so a resumed run patches the catalogue.
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

    // Always write a local preview so a dry run is reviewable.
    const preview = join(OUT_DIR, `${job.layer}-${job.key}.png`);
    writeFileSync(preview, buf);

    if (COMMIT) {
      await put(key, buf, { contentType: 'image/png' });
      // Record the R2 KEY (not the URL) — catalog stores env-agnostic
      // keys; full URL is resolved at render time via
      // `lib/scene/thumbnail-url.ts` from NEXT_PUBLIC_R2_PUBLIC_URL.
      keys[id] = key;
      console.log(`[scene-thumb] ${id} ${elapsed}s -> ${key}`);
    } else {
      console.log(`[scene-thumb] ${id} ${elapsed}s -> ${preview} (dry run)`);
    }
  }

  if (!COMMIT) {
    console.log(
      `\n[scene-thumb] dry run done (${selected.length}). Re-run with --commit to upload + patch the catalogue.`,
    );
    return;
  }

  // Patch scene-catalog.ts: replace `thumbnailKey: null` with the R2 key
  // for each generated option. We match per-option by the unique `key:
  // '<key>'` line and rewrite the nearest following `thumbnailKey: null`.
  // Conservative: only touches entries we have a key for, leaves the rest.
  let src = readFileSync(CATALOG_PATH, 'utf8');
  let patched = 0;
  for (const job of selected) {
    const k = keys[`${job.layer}:${job.key}`];
    if (!k) continue;
    // Anchor on the option's key line, then the FIRST thumbnailKey after
    // it. Catalogue entries are small literal objects so this is stable.
    const anchor = new RegExp(
      `(key:\\s*'${job.key}'[\\s\\S]*?thumbnailKey:\\s*)null`,
    );
    if (anchor.test(src)) {
      src = src.replace(anchor, `$1'${k}'`);
      patched += 1;
    } else {
      console.warn(
        `[scene-thumb] could not patch catalogue for ${job.layer}:${job.key} (already set?)`,
      );
    }
  }
  if (patched > 0) {
    writeFileSync(CATALOG_PATH, src);
    console.log(
      `\n[scene-thumb] patched ${patched} thumbnailKey entries in scene-catalog.ts`,
    );
  } else {
    console.log('\n[scene-thumb] no catalogue entries needed patching');
  }
};

main().catch((err) => {
  console.error('[scene-thumb] failed:', err);
  process.exit(1);
});
