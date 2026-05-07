/**
 * Spike v2: Generate hero character reference images for Dino Dance Party.
 *
 * Replaces the cramped group character sheet from spike v1 with FOUR
 * single-character refs + ONE group shot. The single refs become the
 * conditioning anchors for page generation — only feed in the heroes
 * present in each scene.
 *
 * Internal names (not surfaced to users): Rex / Spike / Zip / Dots.
 *
 * Cost: 5 GPT Image 2 calls × $0.08 = $0.40
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/spike-bundle-hero-refs.ts \
 *     dotenv_config_path=.env.local
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { GPT_IMAGE_STYLE_BLOCK, REFERENCE_IMAGES } from '../lib/ai/prompts';

const MODEL = 'gpt-image-2';
const OUT_DIR = join(__dirname, 'out', 'spike-bundle-consistency');
const SIZE = '1024x1024' as const;

const REX_REF = `A friendly cartoon T-rex character standing centered on a plain white background, facing slightly to the side in a relaxed pose. Big rounded snout with a happy half-smile, wide eyes with chunky pupils, three small rounded ridge-bumps along the back. Wearing oversized round headphones with a thick band over the head, like a DJ. Stubby T-rex arms with three rounded fingers, sturdy legs with three toes, thick tail with two stripe-bands near the tip. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`;

const SPIKE_REF = `A friendly cartoon stegosaurus character standing centered on a plain white background, facing slightly to the side. Round body, small round head with a gentle smile, six heart-shaped back plates running down the spine and getting smaller toward the tail. Stubby legs with three rounded toes each, thick tail with two rounded soft-edge spikes near the tip. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`;

const ZIP_REF = `A friendly cartoon velociraptor character standing centered on a plain white background, facing slightly to the side. Slim two-legged body in a relaxed pose, pointy snout with a cheeky grin showing one small tooth, wide eye with a chunky pupil. A small tuft of three rounded feathers on top of the head, like a punk crest. Two thin striped wrist bands, one on each arm. Long whippy tail with a slight curl at the tip. Three-fingered hands, three-toed feet. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`;

const DOTS_REF = `A friendly cartoon ankylosaurus character standing centered on a plain white background, facing slightly to the side in a calm pose. Low wide body covered in rounded armor with big round polka-dot spots across the back. Stubby legs with three round toes each, short tail ending in a soft rounded club. Big eyes with a small gentle smile. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`;

const GROUP_REF = `Four friendly cartoon dinosaur characters standing together on a plain white background, evenly spaced across the page so each is fully visible. From left to right: 1) a T-rex with oversized round headphones, big rounded snout, three back-ridge bumps, thick tail with two stripe-bands. 2) a stegosaurus with six heart-shaped back plates, round body, soft-edge tail spikes. 3) a velociraptor with a small three-feather punk tuft on the head, two thin striped wrist bands, slim two-legged body. 4) an ankylosaurus low to the ground with big round polka-dot spots across rounded armor and a soft rounded tail club. All four have happy expressions, all are facing slightly toward the centre. No background, no scenery — just the four characters on plain white. Children's coloring book ensemble reference sheet.`;

function buildPrompt(scene: string): string {
  return `Scene: ${scene}.\n\n${GPT_IMAGE_STYLE_BLOCK}`;
}

async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  const ext = url.endsWith('.webp') ? 'webp' : 'png';
  return new File([buf], `${name}.${ext}`, { type: `image/${ext}` });
}

async function generate(
  client: OpenAI,
  label: string,
  scene: string,
  refFiles: File[],
): Promise<Buffer> {
  const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic. The character on this page must be a clean reference sheet pose — fully visible, single character, plain white background, no scenery, suitable for use as a model sheet in subsequent generations.\n\n${buildPrompt(scene)}`;
  console.log(`[hero-refs] Generating ${label}...`);
  const start = Date.now();
  const result = await client.images.edit({
    model: MODEL,
    image: refFiles,
    prompt: styledPrompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[hero-refs] Done ${label} in ${elapsed}s`);
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image for ${label}`);
  return Buffer.from(b64, 'base64');
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

  const characters: Array<{ label: string; prompt: string }> = [
    { label: 'hero_rex', prompt: REX_REF },
    { label: 'hero_spike', prompt: SPIKE_REF },
    { label: 'hero_zip', prompt: ZIP_REF },
    { label: 'hero_dots', prompt: DOTS_REF },
    { label: 'hero_group', prompt: GROUP_REF },
  ];

  for (const { label, prompt } of characters) {
    const buf = await generate(client, label, prompt, styleRefs);
    const path = join(OUT_DIR, `${label}.png`);
    writeFileSync(path, buf);
    console.log(`[hero-refs] Wrote ${path}`);
  }

  console.log(`\n[hero-refs] All 5 refs written to:\n  ${OUT_DIR}`);
  console.log(`\n[hero-refs] To preview:\n  open "${OUT_DIR}"`);
}

run().catch((err) => {
  console.error('[hero-refs] Failed:', err);
  process.exit(1);
});
