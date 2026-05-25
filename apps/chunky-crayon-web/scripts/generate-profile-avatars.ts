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
import { removeBackground } from '../lib/replicate-bg-remove';

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
// (mostly) — round profile-picture composition reads best at the
// chip sizes. Fresh mix of magical / sci-fi / friendly-objects-
// with-faces so the avatar picker feels distinct from the Character
// Builder species picker (no overlap with the everyday-animals set
// the kid uses to fill story scenes).
const SUBJECTS: Record<string, string> = {
  // Magical creatures (4) — distinct from Character Builder species
  // except for dragon + unicorn (intentionally kept; top kid picks).
  dragon:
    'a cute round cartoon baby dragon head, small eye ridges, tiny rounded horns, scaly cheeks',
  unicorn:
    'a cute round cartoon unicorn head, small rainbow horn on the forehead, pastel rainbow mane wisps',
  mermaid:
    'a cute round cartoon mermaid head, sea-green long flowing hair with a tiny seashell hair clip',
  ghost:
    'a cute round cartoon friendly ghost head, soft white blob shape with rounded top, two big oval eyes',
  // Roleplay / costume identities (3) — kid-face-with-iconic-prop.
  superhero:
    'a cute round cartoon superhero kid head, small red domino eye-mask, hair sticking out underneath, top edge of a cape collar visible at the bottom of the face',
  astronaut:
    'a cute round cartoon astronaut kid head inside a clear round space helmet, smiling face visible through the visor, small antenna on top of the helmet',
  wizard:
    'a cute round cartoon wizard kid head, tall pointy purple hat with a small yellow star on the front, hair peeking out underneath',
  // Sci-fi (2)
  alien:
    'a cute round cartoon green alien head, two tall antennae with little orbs on top, three friendly eyes',
  rocket:
    'a cute round cartoon rocket with a friendly face on its nose, small fins, tiny flame puff at the bottom, white-and-red body',
  // Friendly objects + treats (3)
  'ice-cream':
    'a cute round cartoon double-scoop ice cream cone with a friendly face on the top scoop, pink strawberry scoop on top and vanilla scoop below, waffle cone visible at the bottom',
  sun: 'a cute round cartoon yellow sun with a friendly face in the middle, soft rounded sun rays around the edges',
  rainbow:
    'a cute round cartoon rainbow arch with a friendly face on the front, two soft white cloud puffs at the bottom corners',
};

type Job = { id: string; subject: string };

const jobs: Job[] = AVATARS.map((a) => ({
  id: a.id,
  subject:
    SUBJECTS[a.id] ??
    `a cute round cartoon ${a.name.toLowerCase()} head looking forward`,
}));

const buildPrompt = (subject: string): string =>
  // Brand recipe consistent with the rest of CC (warm-brown outlines,
  // flat colours, pink cheek blush). Background is solid bright
  // magenta (#ff00ff) — gpt-image-2 rejects `background:'transparent'`
  // and a plain WHITE bg breaks the post-strip step for subjects with
  // white in them (ghost is a white blob → got bg-stripped through
  // its body; rocket has a white-and-red body → white parts went
  // transparent). Magenta is colour-distinct from any subject in the
  // catalog so the Replicate bg-remover keys it cleanly without
  // eating into the character. See feedback_always_transparent_pngs.md.
  `A simple flat 2D illustration of ${subject} in the style of a ` +
  `friendly children's mascot. ` +
  `Thick warm dark-brown outlines (around #5a3a1f), not pure black. ` +
  `Bright flat colour fills, no gradients, no shading. ` +
  `Two simple oval eyes (no highlights, no sparkles inside the ` +
  `eyes), a tiny smiling mouth, and small soft pink circular cheek ` +
  `blushes on either side of the face. ` +
  `Chunky stocky proportions, big head, centered composition, ` +
  `single subject filling about 70% of the frame with comfortable ` +
  `padding around the edges so nothing gets clipped by a round mask. ` +
  `Plain solid bright magenta (#ff00ff) background, no gradient, ` +
  `no texture. No text, no words, no letters, no logos.`;

const r2Key = (job: Job) => `${R2_PREFIX}/${job.id}.png`;

const main = async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  if (COMMIT && !process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not set — needed for bg-strip step');
  }
  // R2 public host — Replicate needs a publicly fetchable URL to
  // read the just-uploaded opaque PNG. Use the dev bucket's public
  // URL since this script runs with .env.local creds.
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
  if (COMMIT && !R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL not set');
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
      // Two-step upload because gpt-image-2 returns opaque RGB and
      // Replicate's bg-remover needs a public URL to fetch. Upload
      // the opaque version first (overwrite OK — the bg-strip step
      // immediately re-uploads the RGBA on top), then strip + final
      // upload. See lib/replicate-bg-remove.ts + the
      // feedback_always_transparent_pngs.md memory rule.
      await put(key, buf, {
        contentType: 'image/png',
        allowOverwrite: true,
      });

      const stripStart = Date.now();
      const publicUrl = `${R2_PUBLIC_URL}/${key}?t=${Date.now()}`;
      const rgbaBuf = await removeBackground(publicUrl);
      const stripElapsed = ((Date.now() - stripStart) / 1000).toFixed(1);

      await put(key, rgbaBuf, {
        contentType: 'image/png',
        allowOverwrite: true,
      });
      // Public dir mirror so dev / Storybook can render before the
      // R2 CDN has propagated. Tracked in git for the dev experience.
      writeFileSync(join(PUBLIC_DIR, `${job.id}.png`), rgbaBuf);
      keys[job.id] = key;
      console.log(
        `[profile-avatar] ${job.id} gen ${elapsed}s + bg-strip ${stripElapsed}s -> ${key} (${(rgbaBuf.length / 1024).toFixed(0)}KB RGBA)`,
      );
    } else {
      console.log(
        `[profile-avatar] ${job.id} ${elapsed}s -> ${preview} (dry run, no bg-strip)`,
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
