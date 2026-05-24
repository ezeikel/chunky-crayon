/**
 * One-time asset pipeline: generate the 12 illustrated profile-avatar
 * tiles for `CreateProfileModal` / `ProfileAvatar`.
 *
 * Sibling of `generate-character-thumbnails.ts` — same gpt-image-2
 * `high`, same Chunky Crayon brand recipe (warm-brown outlines, pink
 * cheek blush, flat eyes, white bg). The catalogue (`lib/avatars.ts`)
 * stores an R2 key per avatar; `ProfileAvatar` resolves the full URL
 * at render time via the shared `resolveThumbnailUrl` helper.
 *
 * 12 jobs: 9 animals (cat, dog, bunny, fox, lion, panda, frog,
 * turtle, owl) + 3 mythical (unicorn, dragon, robot). The shape is
 * a head-on round profile-picture portrait — face only, big eyes,
 * the species in the most recognisable single-shape pose so the
 * tile reads at the smallest header chip size (32px).
 *
 * R2 prefix `profile-avatars/`. Idempotent + resumable: skips any
 * avatar whose R2 object already exists. Safe to re-run after a
 * partial failure.
 *
 * Cost (OpenAI Images API): ~$0.21/image at `high` 1024².
 * Full set (12) ≈ $2.50, ~25 min.
 *
 * Usage (from apps/chunky-crayon-web):
 *   # dry run — previews to scripts/out/profile-avatars/ only
 *   pnpm tsx -r dotenv/config scripts/generate-profile-avatars.ts \
 *     dotenv_config_path=.env.local
 *
 *   # generate + upload to R2 (+ copy into public/profile-avatars/
 *   # so dev / Storybook can render before R2 is wired)
 *   pnpm tsx -r dotenv/config scripts/generate-profile-avatars.ts \
 *     --commit dotenv_config_path=.env.local
 *
 *   # regenerate one avatar
 *   pnpm tsx -r dotenv/config scripts/generate-profile-avatars.ts \
 *     --only=dragon --commit --force dotenv_config_path=.env.local
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { put, exists } from '@one-colored-pixel/storage';
import { AVATARS } from '../lib/avatars';

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
const R2_PREFIX = 'profile-avatars';
const OUT_DIR = join(process.cwd(), 'scripts', 'out', 'profile-avatars');
// Public copy so the new catalog renders in dev + Storybook without
// waiting for the R2 CDN. Same pattern the Colo stage assets use
// (public/images/colo/stage-*.png).
const PUBLIC_DIR = join(process.cwd(), 'public', 'profile-avatars');

// Per-avatar subject prompts. Each avatar is a HEAD-only portrait
// rather than a full body — round profile-picture composition reads
// best at the chip sizes. For mythical species we lean into the
// instantly-recognisable signature (unicorn horn, dragon eye-ridge,
// robot antenna) so even a kid who can't read the name knows which
// is which.
const SUBJECTS: Record<string, string> = {
  cat: 'a cute round cartoon kitten head looking forward, big triangular ears, whiskers',
  dog: 'a cute round cartoon puppy head looking forward, floppy ears, little black nose',
  bunny: 'a cute round cartoon bunny head looking forward, tall floppy ears',
  fox: 'a cute round cartoon fox head looking forward, pointed ears, small white snout',
  lion: 'a cute round cartoon lion head looking forward, fluffy mane framing the face',
  panda:
    'a cute round cartoon panda head looking forward, black eye patches, round black ears',
  frog: 'a cute round cartoon frog head looking forward, big round eyes on top, wide smile',
  turtle:
    'a cute round cartoon turtle head looking forward, peeking out of a green shell',
  owl: 'a cute round cartoon owl head looking forward, large eyes, tiny beak',
  unicorn:
    'a cute round cartoon unicorn head looking forward, small rainbow horn on the forehead, pastel mane wisps',
  dragon:
    'a cute round cartoon baby dragon head looking forward, small eye ridges, tiny rounded horns',
  robot:
    'a cute round cartoon robot head looking forward, small antenna on top, two round friendly eyes',
};

type Job = { id: string; subject: string };

const jobs: Job[] = AVATARS.map((a) => ({
  id: a.id,
  subject:
    SUBJECTS[a.id] ??
    `a cute round cartoon ${a.name.toLowerCase()} head looking forward`,
}));

const buildPrompt = (subject: string): string =>
  // Identical brand recipe to generate-character-thumbnails.ts so the
  // avatar picker reads as the same family as the rest of CC.
  `A simple flat 2D illustration of ${subject} in the style of a ` +
  `friendly children's mascot. ` +
  `Thick warm dark-brown outlines (around #5a3a1f), not pure black. ` +
  `Bright flat colour fills, no gradients, no shading. ` +
  `Two simple oval eyes (no highlights, no sparkles inside the ` +
  `eyes), a tiny smiling mouth, and small soft pink circular cheek ` +
  `blushes on either side of the face. ` +
  `Chunky stocky proportions, big head, centered composition, ` +
  `single subject filling the frame from edge to edge, on a pure ` +
  `white background. No text, no words, no letters, no logos.`;

const r2Key = (job: Job) => `${R2_PREFIX}/${job.id}.png`;

const main = async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  mkdirSync(OUT_DIR, { recursive: true });
  if (COMMIT) mkdirSync(PUBLIC_DIR, { recursive: true });

  const selected = ONLY ? jobs.filter((j) => j.id === ONLY) : jobs;
  if (selected.length === 0) {
    throw new Error(`--only=${ONLY} matched no avatar in the catalogue`);
  }

  const keys: Record<string, string> = {};

  for (const job of selected) {
    const key = r2Key(job);

    if (!FORCE && COMMIT && (await exists(key))) {
      console.log(`[profile-avatar] skip ${job.id} (R2 object exists)`);
      keys[job.id] = key;
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

    // Always write the preview locally so a dry run produces
    // something you can eyeball.
    const preview = join(OUT_DIR, `${job.id}.png`);
    writeFileSync(preview, buf);

    if (COMMIT) {
      await put(key, buf, { contentType: 'image/png' });
      // Public dir mirror so dev / Storybook can render before the
      // R2 CDN has propagated. Tracked in git for the dev experience.
      writeFileSync(join(PUBLIC_DIR, `${job.id}.png`), buf);
      keys[job.id] = key;
      console.log(`[profile-avatar] ${job.id} ${elapsed}s -> ${key}`);
    } else {
      console.log(
        `[profile-avatar] ${job.id} ${elapsed}s -> ${preview} (dry run)`,
      );
    }
  }

  if (COMMIT) {
    console.log('\nDone. R2 manifest:');
    for (const [id, key] of Object.entries(keys)) {
      console.log(`  ${id.padEnd(10)} -> ${key}`);
    }
  } else {
    console.log(
      '\nDry run complete. Re-run with --commit to upload to R2 + copy into public/.',
    );
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
