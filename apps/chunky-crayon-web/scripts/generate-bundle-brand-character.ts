/**
 * Generate the polished colored "face character" for a bundle's BrandCard.
 *
 * Takes the bundle's already-locked hero line-art reference (from R2 at
 * `bundles/<slug>/hero-refs/<heroId>.png`), feeds it to gpt-image-2 in
 * image-to-image mode, and asks for a beautifully colored rendering with
 * a transparent background. NOT a kid-accurate flat fill — this is a
 * polished marketing illustration with shading, gradients, and warm
 * brand-palette fills. The result is the "hello" mascot on the listing
 * image set.
 *
 * Saves the result to R2 at `bundles/<slug>/brand-character.png` and
 * updates `Bundle.brandCharacterUrl`.
 *
 * Cost: 1 GPT Image 2 call ≈ $0.08, ~3.5 min wall-clock.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/generate-bundle-brand-character.ts \
 *     --slug=dino-dance-party --hero=rex \
 *     dotenv_config_path=.env.local
 */

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { db } from '@one-colored-pixel/db';
import { put } from '@one-colored-pixel/storage';

const args = process.argv.slice(2);
const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
const heroId = args.find((a) => a.startsWith('--hero='))?.split('=')[1];
const dry = args.includes('--dry');

if (!slug || !heroId) {
  throw new Error('--slug=<bundle> and --hero=<heroId> are required');
}

const MODEL = 'gpt-image-2';
const SIZE = '1024x1024' as const;

async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  return new File([buf], `${name}.png`, { type: 'image/png' });
}

async function run() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  if (!process.env.R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL not set');

  const bundle = await db.bundle.findUnique({
    where: { slug: slug! },
    select: { id: true, name: true },
  });
  if (!bundle) throw new Error(`Bundle not found: ${slug}`);

  const heroRefUrl = `${process.env.R2_PUBLIC_URL}/bundles/${slug}/hero-refs/${heroId}.png`;
  console.log(`[brand-char] line-art source: ${heroRefUrl}`);

  const client = new OpenAI();
  const refFile = await fetchAsFile(heroRefUrl, `hero-${heroId}`);

  const prompt = `Take the line-art character in the reference image and produce a beautifully colored, polished marketing illustration of the same character.

Goals:
- The COLORED VERSION must be the SAME CHARACTER — same body shape, same proportions, same signature features (e.g. headphones, plates, feathers, polka-dot armor — preserve every distinctive element from the line art).
- Render with warm, kid-friendly cartoon coloring: soft fills with gentle shading, simple highlights, rounded brand-palette tones (warm oranges, soft pinks, soft yellows, soft greens). The line art's black outlines should be preserved as confident, slightly soft brown-black contour lines (NOT the hard mechanical black of the line art — softer and more painterly).
- Background MUST be plain pure white (or transparent if you can render with alpha). NO scenery, NO props, NO additional shapes — just the character on white. This is a marketing-asset character render, not a scene.
- Polished and warm, like a children's picture-book illustration. Suitable as the welcome mascot on a product listing page.

Do NOT add: scenery, accessories not in the reference, secondary characters, text, frames, borders, decorative elements.`;

  console.log('[brand-char] generating colored character...');
  const start = Date.now();
  const result = await client.images.edit({
    model: MODEL,
    image: refFile,
    prompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');
  const buf = Buffer.from(b64, 'base64');
  console.log(
    `[brand-char] done in ${elapsed}s (${(buf.length / 1024).toFixed(0)}KB)`,
  );

  // Local preview
  const previewDir = join(__dirname, 'out', 'brand-character');
  mkdirSync(previewDir, { recursive: true });
  const localPath = join(previewDir, `${slug}-${heroId}.png`);
  writeFileSync(localPath, buf);
  console.log(`[brand-char] preview saved: ${localPath}`);

  if (dry) {
    console.log('[brand-char] DRY RUN — no upload, no DB write.');
    return;
  }

  const r2Path = `bundles/${slug}/brand-character.png`;
  const { url } = await put(r2Path, buf, {
    access: 'public',
    contentType: 'image/png',
    allowOverwrite: true,
  });
  console.log(`[brand-char] uploaded: ${url}`);

  await db.bundle.update({
    where: { id: bundle.id },
    data: { brandCharacterUrl: url },
  });
  console.log(`[brand-char] Bundle.brandCharacterUrl updated`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
