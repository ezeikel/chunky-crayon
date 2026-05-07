/**
 * Spike: re-run page 10 with the full ref set now that we know gpt-image-2
 * accepts up to 16 reference images (we were capping at 4).
 *
 * Hypothesis: page 10's signature-detail loss (Spike's heart plates,
 * Zip's wrist bands) happened because we had to drop the brand style refs
 * to fit all 4 hero refs in the 4-image budget. With 16 slots we can feed
 * all 4 hero refs + the locked group ref + 4 style refs = 9 total.
 *
 * Cost: 1 GPT Image 2 call × $0.08 = $0.08
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { GPT_IMAGE_STYLE_BLOCK, REFERENCE_IMAGES } from '../lib/ai/prompts';

const MODEL = 'gpt-image-2';
const OUT_DIR = join(__dirname, 'out', 'spike-bundle-consistency');
const SIZE = '1024x1024' as const;

const PAGE_10 = `Four friendly cartoon dinosaur characters posing together under a starry prehistoric sky on top of a tall rock, with the T-rex centered as a DJ spinning records on a turntable. The four characters must match their reference images exactly: the T-rex with oversized headphones, the stegosaurus with heart-shaped back plates, the velociraptor with a feather tuft and striped wrist bands, and the ankylosaurus with smooth polka-dot armor. These are the same recurring characters from earlier pages now together for the finale.`;

async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed for ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  const ext = url.endsWith('.webp') ? 'webp' : 'png';
  return new File([buf], `${name}.${ext}`, { type: `image/${ext}` });
}

function localPngAsFile(path: string, name: string): File {
  const buf = readFileSync(path);
  return new File([new Uint8Array(buf)], `${name}.png`, { type: 'image/png' });
}

async function run() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI();

  // Locked hero refs
  const rexRef = localPngAsFile(join(OUT_DIR, 'hero_rex.png'), 'hero-rex');
  const spikeRef = localPngAsFile(
    join(OUT_DIR, 'hero_spike.png'),
    'hero-spike',
  );
  const zipRef = localPngAsFile(join(OUT_DIR, 'hero_zip_v2.png'), 'hero-zip');
  const dotsRef = localPngAsFile(
    join(OUT_DIR, 'hero_dots_v3.png'),
    'hero-dots',
  );
  const groupRef = localPngAsFile(
    join(OUT_DIR, 'hero_group_v2.png'),
    'hero-group',
  );

  // 4 brand style refs (out of 8 available — keep below 16 total)
  const styleRefs = await Promise.all(
    REFERENCE_IMAGES.slice(0, 4).map((url, i) =>
      fetchAsFile(url, `style-ref-${i}`),
    ),
  );

  const allRefs = [rexRef, spikeRef, zipRef, dotsRef, groupRef, ...styleRefs];
  console.log(`[page10-v2] Using ${allRefs.length} refs (max 16)`);

  const styledPrompt = `The provided images are: 4 character reference sheets (Rex, Spike, Zip, Dots — one per hero), 1 group ensemble reference, and 4 brand style references. The four heroes drawn on this page MUST match their individual reference sheets — same body shapes, same signature details (Rex's headphones, Spike's heart-shaped back plates, Zip's feather tuft and striped wrist bands, Dots's smooth polka-dot armor), same friendly faces. Do not invent a fifth character.\n\nScene: ${PAGE_10}\n\n${GPT_IMAGE_STYLE_BLOCK}`;

  console.log('[page10-v2] Generating...');
  const start = Date.now();
  const result = await client.images.edit({
    model: MODEL,
    image: allRefs,
    prompt: styledPrompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[page10-v2] Done in ${elapsed}s`);

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');

  const path = join(OUT_DIR, 'TEST_page10_full_crew_v2.png');
  writeFileSync(path, Buffer.from(b64, 'base64'));
  console.log(`[page10-v2] Wrote ${path}`);
}

run().catch((err) => {
  console.error('[page10-v2] Failed:', err);
  process.exit(1);
});
