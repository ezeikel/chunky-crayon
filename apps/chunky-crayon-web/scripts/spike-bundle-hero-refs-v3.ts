/**
 * Spike v3: one targeted re-spin for Dots (ankylosaurus).
 *
 * v1 had unprompted spiky scales along the armor edge — close to ankylosaurus
 * but visually noisy. v2 went smooth-edged but lost dinosaur identity (read
 * as a cartoon turtle). v3 threads the needle: smooth armor edge AND
 * preserve dinosaur posture, head, and legs.
 *
 * Cost: 1 GPT Image 2 call × $0.08 = $0.08
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { GPT_IMAGE_STYLE_BLOCK, REFERENCE_IMAGES } from '../lib/ai/prompts';

const MODEL = 'gpt-image-2';
const OUT_DIR = join(__dirname, 'out', 'spike-bundle-consistency');
const SIZE = '1024x1024' as const;

const DOTS_REF_V3 = `A friendly cartoon ankylosaurus dinosaur character standing centered on a plain white background in profile view (side-on), facing slightly toward the viewer. **This is a DINOSAUR, not a turtle and not a tortoise.** Dinosaur head shape clearly visible at the front: a low-slung snout with wide nostrils, big friendly eye, small horn nubs at the back of the head — distinctly dinosaur, not a beak. Body posture is low and wide on FOUR clearly visible stubby legs, each with three round toes — the legs must be drawn fully, not hidden under the body. The back is covered in a smooth dome of armor — **the armor edge is a single smooth curved line all the way around the back, with NO spiky scales, NO triangular plates, NO bumps along the edge — just a clean smooth dome shape.** Big round polka-dot spots are scattered evenly across the armor on the back. The tail extends out behind the body and ends in a soft rounded ball-shaped club at the very tip. Gentle smile. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.\n\n${GPT_IMAGE_STYLE_BLOCK}`;

async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  const ext = url.endsWith('.webp') ? 'webp' : 'png';
  return new File([buf], `${name}.${ext}`, { type: `image/${ext}` });
}

async function run() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  mkdirSync(OUT_DIR, { recursive: true });

  const client = new OpenAI();
  const styleRefs = await Promise.all(
    REFERENCE_IMAGES.slice(0, 4).map((url, i) =>
      fetchAsFile(url, `style-ref-${i}`),
    ),
  );

  const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic. The character on this page must be a clean reference sheet pose — fully visible, plain white background, no scenery.\n\n${DOTS_REF_V3}`;

  console.log(`[hero-refs-v3] Generating hero_dots_v3...`);
  const start = Date.now();
  const result = await client.images.edit({
    model: MODEL,
    image: styleRefs,
    prompt: styledPrompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[hero-refs-v3] Done in ${elapsed}s`);

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');

  const path = join(OUT_DIR, 'hero_dots_v3.png');
  writeFileSync(path, Buffer.from(b64, 'base64'));
  console.log(`[hero-refs-v3] Wrote ${path}`);
}

run().catch((err) => {
  console.error('[hero-refs-v3] Failed:', err);
  process.exit(1);
});
