/**
 * Spike v2 re-spin: targeted corrections for Zip, Dots, and the Group shot.
 *
 * v1 issues being fixed:
 *   - Zip was missing wrist bands (signature breakdancer detail)
 *   - Dots had unprompted spiky scales along the armor edge (should be smooth)
 *   - Group shot had Dots at half-scale and overlapping with Zip
 *
 * Rex and Spike v1 were keepers; not regenerated.
 *
 * Cost: 3 GPT Image 2 calls × $0.08 = $0.24
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/spike-bundle-hero-refs-v2.ts \
 *     dotenv_config_path=.env.local
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { GPT_IMAGE_STYLE_BLOCK, REFERENCE_IMAGES } from '../lib/ai/prompts';

const MODEL = 'gpt-image-2';
const OUT_DIR = join(__dirname, 'out', 'spike-bundle-consistency');
const SIZE = '1024x1024' as const;

const ZIP_REF_V2 = `A friendly cartoon velociraptor character standing centered on a plain white background, facing slightly to the side. Slim two-legged body in a relaxed pose, pointy snout with a cheeky grin showing one small tooth, wide eye with a chunky pupil. A small tuft of three rounded feathers on top of the head, like a punk crest. **Two striped wrist bands are required — one on each arm — drawn as thick wide bands with three or four horizontal stripes, clearly visible at each wrist.** Long whippy tail with a slight curl at the tip. Three-fingered hands, three-toed feet. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`;

const DOTS_REF_V2 = `A friendly cartoon ankylosaurus character standing centered on a plain white background, facing slightly to the side in a calm pose. Low wide body covered in **smooth rounded armor — the armor edge is a smooth curved line all the way around, with no spiky scales, no plates, no triangular bumps along the edge.** Big round polka-dot spots are scattered evenly across the rounded armor on the back. Stubby legs with three round toes each, short tail ending in a soft rounded club ball at the very tip. Big eyes with a small gentle smile. No background, no scenery — just the character on plain white. Children's coloring book reference sheet for a single hero character.`;

const GROUP_REF_V2 = `Four friendly cartoon dinosaur characters standing together on a plain white background. **All four characters are at approximately the same body height — none is significantly smaller than the others — and they are evenly spaced left to right with clear gaps between them so no character is hidden behind, in front of, or overlapping any other.** From left to right: 1) a T-rex with oversized round headphones over the head, big rounded snout, three back-ridge bumps, thick tail with two stripe-bands. 2) a stegosaurus with six heart-shaped back plates, round body, soft rounded tail spikes. 3) a velociraptor with a small three-feather punk tuft on the head, two thick striped wrist bands one on each arm, slim two-legged body. 4) an ankylosaurus low to the ground with smooth rounded armor covered in big round polka-dot spots and a soft rounded tail club. All four have happy expressions. No background, no scenery — just the four characters on plain white. Children's coloring book ensemble reference sheet.`;

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
  const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic. The character on this page must be a clean reference sheet pose — fully visible, plain white background, no scenery, suitable for use as a model sheet in subsequent generations.\n\n${buildPrompt(scene)}`;
  console.log(`[hero-refs-v2] Generating ${label}...`);
  const start = Date.now();
  const result = await client.images.edit({
    model: MODEL,
    image: refFiles,
    prompt: styledPrompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[hero-refs-v2] Done ${label} in ${elapsed}s`);
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

  const respins: Array<{ label: string; prompt: string }> = [
    { label: 'hero_zip_v2', prompt: ZIP_REF_V2 },
    { label: 'hero_dots_v2', prompt: DOTS_REF_V2 },
    { label: 'hero_group_v2', prompt: GROUP_REF_V2 },
  ];

  for (const { label, prompt } of respins) {
    const buf = await generate(client, label, prompt, styleRefs);
    const path = join(OUT_DIR, `${label}.png`);
    writeFileSync(path, buf);
    console.log(`[hero-refs-v2] Wrote ${path}`);
  }

  console.log(`\n[hero-refs-v2] Done. Compare v1 vs v2 in:\n  ${OUT_DIR}`);
}

run().catch((err) => {
  console.error('[hero-refs-v2] Failed:', err);
  process.exit(1);
});
