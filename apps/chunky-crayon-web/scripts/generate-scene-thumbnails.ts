/**
 * One-time asset pipeline: generate the colourful tile illustrations for
 * the Scene Builder picker.
 *
 * Every catalogue option (subject / location / weather / activity /
 * accent) gets a small bright kid-style illustration. The SceneBuilder
 * tile prefers `thumbnailUrl` and falls back to the FA duotone icon when
 * it's null — so this script's only job is: generate the image, upload to
 * R2, and write the URL back into `lib/scene/scene-catalog.ts`.
 *
 * gpt-image-2 (no reference image — these are fresh illustrations, not
 * character edits, so transparency isn't needed and gpt-image-2's lack of
 * alpha doesn't bite here, per feedback_gpt_image_2_no_transparent_bg).
 *
 * Idempotent + resumable: skips any option whose R2 object already exists
 * (and, with --commit, whose catalogue entry already has a URL). Safe to
 * re-run after a partial failure. Six-check rule respected — the catalogue
 * file is the spec, `scene-thumbnails/` is a new R2 prefix only this
 * script + the SceneBuilder tile consume.
 *
 * Cost: ~$0.02 per gpt-image-2 "medium" 1024². Full set (~50) ≈ $1.
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
const QUALITY = 'medium' as const;
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
  // Positive framing, ~1 sentence, bright flat kid-app style. No text,
  // single centred subject, soft solid background so it reads on a tile.
  `A cheerful, brightly coloured, simple flat illustration of ${subject} ` +
  `for a young children's app icon. Bold rounded shapes, friendly and ` +
  `playful, thick clean outlines, a soft single-colour pastel background, ` +
  `centred composition, no text, no words, no letters.`;

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
  const urls: Record<string, string> = {};

  for (const job of selected) {
    const id = `${job.layer}:${job.key}`;
    const key = r2Key(job);

    if (!FORCE && COMMIT && (await exists(key))) {
      console.log(`[scene-thumb] skip ${id} (R2 object exists)`);
      // Still record the URL so a resumed run patches the catalogue.
      // Matches the storage client's convention: `${R2_PUBLIC_URL}/${key}`
      // with any trailing slash on the base trimmed.
      const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
      urls[id] = `${base}/${key}`;
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
      const res = await put(key, buf, { contentType: 'image/png' });
      urls[id] = res.url;
      console.log(`[scene-thumb] ${id} ${elapsed}s -> ${res.url}`);
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

  // Patch scene-catalog.ts: replace `thumbnailUrl: null` with the R2 url
  // for each generated option. We match per-option by the unique `key:
  // '<key>'` line and rewrite the nearest following `thumbnailUrl: null`.
  // Conservative: only touches entries we have a URL for, leaves the rest.
  let src = readFileSync(CATALOG_PATH, 'utf8');
  let patched = 0;
  for (const job of selected) {
    const url = urls[`${job.layer}:${job.key}`];
    if (!url) continue;
    // Anchor on the option's key line, then the FIRST thumbnailUrl after
    // it. Catalogue entries are small literal objects so this is stable.
    const anchor = new RegExp(
      `(key:\\s*'${job.key}'[\\s\\S]*?thumbnailUrl:\\s*)null`,
    );
    if (anchor.test(src)) {
      src = src.replace(anchor, `$1'${url}'`);
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
      `\n[scene-thumb] patched ${patched} thumbnailUrl entries in scene-catalog.ts`,
    );
  } else {
    console.log('\n[scene-thumb] no catalogue entries needed patching');
  }
};

main().catch((err) => {
  console.error('[scene-thumb] failed:', err);
  process.exit(1);
});
