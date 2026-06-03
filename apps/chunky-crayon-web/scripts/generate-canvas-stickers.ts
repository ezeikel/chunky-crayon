/**
 * One-time asset pipeline: generate the 36 transparent canvas-sticker PNGs
 * for the coloring sticker TOOL (the stamps a kid taps onto the canvas).
 *
 * These are decorative OBJECTS (stars, hearts, shapes, nature, animals, fun)
 * — NOT the Colo character (that's generate-colo-stickers.ts). The shared
 * catalog lives in `@one-colored-pixel/coloring-ui` (`CANVAS_STICKERS`) and is
 * consumed by both web (StickerSelector + ImageCanvas) and mobile (canvasStore
 * + StickerPickerGrid + Skia render). One PNG per sticker id, keyed by id.
 *
 * Same recipe as generate-profile-avatars.ts: gpt-image-2 `high` returns
 * OPAQUE RGB on a solid magenta (#ff00ff) field, then Replicate's
 * 851-labs/background-remover (via lib/replicate-bg-remove.ts) strips the
 * magenta to true alpha. gpt-image-2 rejects `background:'transparent'`, and
 * magenta keys cleanly without eating white/light parts of the subject.
 *
 * Output: R2 `stickers/canvas/<id>.png` + a public mirror at
 * `public/images/stickers/canvas/<id>.png` (the path CANVAS_STICKERS.imageUrl
 * points at). The mobile app bundles the same PNGs under
 * `assets/stickers/canvas/` via copy + a require() registry.
 *
 * Cost (OpenAI Images API): ~$0.21/image at `high` 1024². Full set (36)
 * ≈ $7.5, ~25-30 min including bg-strip.
 *
 * Usage (from apps/chunky-crayon-web):
 *   # dry run — previews to scripts/out/canvas-stickers/ only (no bg-strip)
 *   pnpm tsx -r dotenv/config scripts/generate-canvas-stickers.ts \
 *     dotenv_config_path=.env.local
 *
 *   # generate + bg-strip + upload to R2 + mirror into public/
 *   pnpm tsx -r dotenv/config scripts/generate-canvas-stickers.ts \
 *     --commit dotenv_config_path=.env.local
 *
 *   # regenerate one sticker
 *   pnpm tsx -r dotenv/config scripts/generate-canvas-stickers.ts \
 *     --only=cat --commit --force dotenv_config_path=.env.local
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { put, exists } from '@one-colored-pixel/storage';
import { removeBackground } from '../lib/replicate-bg-remove';

// Sticker ids — must stay in sync with CANVAS_STICKERS in
// `@one-colored-pixel/coloring-ui` (packages/coloring-ui/src/types.ts). Kept
// as a literal list here because the package's export map isn't resolvable
// from a tsx one-off script. The generator writes one PNG per id.
const STICKER_IDS = [
  'star-classic',
  'star-shooting',
  'sparkles',
  'star-burst',
  'moon-crescent',
  'comet',
  'heart-red',
  'heart-double',
  'heart-sparkle',
  'heart-arrow',
  'heart-rainbow',
  'heart-wings',
  'circle',
  'square',
  'triangle',
  'diamond',
  'hexagon',
  'star-outline',
  'flower-daisy',
  'sun-smiley',
  'rainbow',
  'cloud',
  'butterfly',
  'leaf',
  'cat',
  'dog',
  'bunny',
  'bear',
  'fox',
  'fish',
  'crown',
  'rocket',
  'balloon',
  'gift',
  'cupcake',
  'party-popper',
];

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
const R2_PREFIX = 'stickers/canvas';
const OUT_DIR = join(process.cwd(), 'scripts', 'out', 'canvas-stickers');
const PUBLIC_DIR = join(
  process.cwd(),
  'public',
  'images',
  'stickers',
  'canvas',
);

/**
 * Per-sticker subject prompt. Animals (and only animals) get a friendly face;
 * every other sticker is a clean flat object with NO eyes/face (see STYLE).
 */
const STICKER_PROMPTS: Record<string, string> = {
  // stars
  'star-classic': 'a single classic five-pointed star',
  'star-shooting':
    'a shooting star: a five-pointed star with a short curved motion trail behind it',
  sparkles:
    'a small cluster of three four-pointed sparkle shapes of slightly different sizes',
  'star-burst': 'a bright bursting star with short radiating spikes around it',
  'moon-crescent': 'a simple crescent moon',
  comet: 'a comet: a round glowing head with a tapering tail',
  // hearts
  'heart-red': 'a single classic heart',
  'heart-double': 'two overlapping hearts of slightly different sizes',
  'heart-sparkle': 'a heart with a couple of small sparkles beside it',
  'heart-arrow': 'a heart pierced by a simple cupid arrow',
  'heart-rainbow': 'a heart filled with soft rainbow color bands',
  'heart-wings': 'a heart with two small simple wings on either side',
  // shapes
  circle: 'a single solid circle',
  square: 'a single solid square with slightly rounded corners',
  triangle: 'a single solid upward-pointing triangle with rounded corners',
  diamond: 'a single faceted gem diamond',
  hexagon: 'a single solid hexagon',
  'star-outline': 'a single bold five-pointed star outline shape',
  // nature
  'flower-daisy':
    'a simple daisy flower with rounded petals and a round center',
  'sun-smiley': 'a sun with simple triangular rays (NO face)',
  rainbow: 'a rainbow arc with a small cloud at each end',
  cloud: 'a single soft fluffy cloud',
  butterfly: 'a butterfly seen from above with two pairs of patterned wings',
  leaf: 'a single simple leaf with a center vein',
  // animals (these GET a friendly face)
  cat: 'a cute cartoon cat sitting, friendly face with small eyes and a tiny smile',
  dog: 'a cute cartoon puppy sitting, friendly face with small eyes and a tiny smile',
  bunny:
    'a cute cartoon bunny rabbit, friendly face with small eyes and a tiny smile',
  bear: 'a cute cartoon bear cub, friendly face with small eyes and a tiny smile',
  fox: 'a cute cartoon fox sitting, friendly face with small eyes and a tiny smile',
  fish: 'a cute cartoon fish, friendly face with one small eye and a tiny smile',
  // fun
  crown: 'a simple golden crown with a few round jewels (NO face)',
  rocket: 'a small cartoon rocket ship pointing up (NO face)',
  balloon: 'a single round party balloon with a short string (NO face)',
  gift: 'a wrapped gift box with a bow on top (NO face)',
  cupcake: 'a cupcake with a swirl of frosting and a cherry on top (NO face)',
  'party-popper':
    'a party popper cone shooting out confetti and streamers (NO face)',
};

/**
 * Shared style contract appended to every prompt. Flat brand art, transparent,
 * no scene. CRITICAL: only animals get faces/eyes — every other sticker is a
 * plain object with NO eyes, NO face, NO kawaii expression.
 */
const STYLE = `
STYLE & CONSTRAINTS (apply to ALL of the above):
- FLAT VECTOR STICKER: solid flat color fills, a clean confident dark-brown outline (around #5a3a1f, NOT pure black), minimal-to-no shading or gradients. Bright cheerful kids' palette. Looks like a simple printed sticker, NOT a painterly or 3D render.
- DO NOT add a face, eyes, eyebrows, or a mouth to the sticker UNLESS the subject is explicitly an animal or person. Stars, hearts, shapes, suns, clouds, rainbows, flowers, gifts, balloons, crowns, rockets, cupcakes, etc. are PLAIN OBJECTS with NO face and NO eyes. Only the animals (cat, dog, bunny, bear, fox, fish) have a small friendly face.
- Background MUST be a solid bright magenta (#ff00ff) flat fill — NO scenery, NO floor, NO frame, NO border, NO drop shadow, NO gradient, NO texture.
- A SINGLE centered subject, full shape visible with comfortable padding around all edges so nothing is clipped. NO text, NO letters, NO numbers, NO labels, NO speech bubbles, NO watermark.`;

type Job = { id: string; subject: string };
const jobs: Job[] = STICKER_IDS.map((id) => {
  const subject = STICKER_PROMPTS[id];
  if (!subject) throw new Error(`No STICKER_PROMPTS entry for "${id}"`);
  return { id, subject };
});

const buildPrompt = (subject: string): string =>
  `A simple flat 2D children's sticker of ${subject}.\n${STYLE}`;

const r2Key = (id: string) => `${R2_PREFIX}/${id}.png`;

const log = (msg: string) => console.log(`[canvas-stickers] ${msg}`);

const main = async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  if (COMMIT && !process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not set — needed for bg-strip step');
  }
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
  if (COMMIT && !R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL not set');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  mkdirSync(OUT_DIR, { recursive: true });
  if (COMMIT) mkdirSync(PUBLIC_DIR, { recursive: true });

  const selected = ONLY ? jobs.filter((j) => j.id === ONLY) : jobs;
  if (selected.length === 0) {
    throw new Error(`--only=${ONLY} matched no sticker in CANVAS_STICKERS`);
  }

  let done = 0;
  for (const job of selected) {
    const key = r2Key(job.id);

    if (!FORCE && COMMIT && (await exists(key))) {
      log(`skip ${job.id} (R2 object exists)`);
      done += 1;
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
    if (!b64) throw new Error(`No image returned for ${job.id}`);
    const buf = Buffer.from(b64, 'base64');
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const preview = join(OUT_DIR, `${job.id}.png`);
    writeFileSync(preview, buf);

    if (COMMIT) {
      await put(key, buf, { contentType: 'image/png', allowOverwrite: true });
      const stripStart = Date.now();
      const publicUrl = `${R2_PUBLIC_URL}/${key}?t=${Date.now()}`;
      const rgbaBuf = await removeBackground(publicUrl);
      const stripElapsed = ((Date.now() - stripStart) / 1000).toFixed(1);
      await put(key, rgbaBuf, {
        contentType: 'image/png',
        allowOverwrite: true,
      });
      writeFileSync(join(PUBLIC_DIR, `${job.id}.png`), rgbaBuf);
      done += 1;
      log(
        `${job.id} gen ${elapsed}s + bg-strip ${stripElapsed}s -> ${key} (${(rgbaBuf.length / 1024).toFixed(0)}KB RGBA) [${done}/${selected.length}]`,
      );
    } else {
      done += 1;
      log(
        `${job.id} ${elapsed}s -> ${preview} (dry run, no bg-strip) [${done}/${selected.length}]`,
      );
    }
  }

  log(
    COMMIT
      ? `Done. ${done} sticker(s) → R2 ${R2_PREFIX}/ + public/images/stickers/canvas/`
      : `Dry run complete (${done}). Re-run with --commit to bg-strip + upload.`,
  );
};

main().catch((err) => {
  console.error('[canvas-stickers] FAILED:', err);
  process.exit(1);
});
