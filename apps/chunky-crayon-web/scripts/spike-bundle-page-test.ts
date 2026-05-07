/**
 * Spike: 3-page consistency test using locked Dino Dance Party hero refs.
 *
 * Tests whether GPT Image 2 can preserve hero character identity across
 * pages of a bundle when conditioned on the locked hero refs:
 *   - Rex v1: T-rex with oversized headphones
 *   - Spike v1: stegosaurus with heart-shaped back plates
 *   - Zip v2: velociraptor with feather tuft + striped wrist bands
 *   - Dots v3: ankylosaurus with smooth dome armor + polka dots
 *
 * Three test pages span the difficulty range:
 *   - Page 1: Rex solo (1 hero ref)
 *   - Page 7: Rex + Zip duo (2 hero refs)
 *   - Page 10: Full crew finale (4 hero refs — OpenAI's max)
 *
 * Cost: 3 GPT Image 2 calls × $0.08 = $0.24
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/spike-bundle-page-test.ts \
 *     dotenv_config_path=.env.local
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { GPT_IMAGE_STYLE_BLOCK, REFERENCE_IMAGES } from '../lib/ai/prompts';

const MODEL = 'gpt-image-2';
const OUT_DIR = join(__dirname, 'out', 'spike-bundle-consistency');
const SIZE = '1024x1024' as const;

// Page prompts from launchLineup.bundles[0] (Dino Dance Party). Reused
// verbatim from research-kids-coloring-bestsellers.output.json so the
// test reflects what production would feed in.
const PAGE_1 = `A friendly cartoon T-rex with tiny arms standing in a jungle clearing, wearing oversized headphones, mouth wide open in a happy roar, palm trees behind. The T-rex must match the appearance of the T-rex character in the reference image — same headphones, same body shape, same friendly face — this is the same recurring character.`;

const PAGE_7 = `A dinosaur band playing rock music with instruments made from bones and rocks: a drum-bone kit, a guitar made from a giant rib, a velociraptor on horn. The T-rex on drums must match the T-rex character in the reference image (oversized headphones), and the velociraptor must match the velociraptor character in the reference image (feather tuft on head, striped wrist bands) — these are the same recurring characters from earlier pages.`;

const PAGE_10 = `Four friendly cartoon dinosaur characters posing together under a starry prehistoric sky on top of a tall rock, with the T-rex centered as a DJ spinning records on a turntable. The four characters must match their reference images exactly: the T-rex with oversized headphones, the stegosaurus with heart-shaped back plates, the velociraptor with a feather tuft and striped wrist bands, and the ankylosaurus with smooth polka-dot armor. These are the same recurring characters from earlier pages now together for the finale.`;

function buildPrompt(scene: string): string {
  return `Scene: ${scene}\n\n${GPT_IMAGE_STYLE_BLOCK}`;
}

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

async function generate(
  client: OpenAI,
  label: string,
  scene: string,
  refFiles: File[],
): Promise<Buffer> {
  const styledPrompt = `The provided images are character reference sheets and a brand style reference. The characters drawn on this page MUST match the characters in the reference sheets exactly — same body shapes, same signature details (headphones, heart plates, feather tuft, wrist bands, polka-dot armor), same friendly faces. Treat them as recurring characters in a coloring book series.\n\n${buildPrompt(scene)}`;
  console.log(`[page-test] Generating ${label} (${refFiles.length} refs)...`);
  const start = Date.now();
  const result = await client.images.edit({
    model: MODEL,
    image: refFiles,
    prompt: styledPrompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[page-test] Done ${label} in ${elapsed}s`);
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image for ${label}`);
  return Buffer.from(b64, 'base64');
}

async function run() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI();

  // Locked hero refs from previous spikes
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

  // Single dino-themed style ref to anchor brand line weight
  const dinoStyleRef = await fetchAsFile(
    REFERENCE_IMAGES.find((u) => u.includes('dinosaur'))!,
    'style-dino',
  );

  // -- Page 1: Rex solo --
  await generate(client, 'TEST_page1_rex_solo', PAGE_1, [
    rexRef,
    dinoStyleRef,
  ]).then((buf) =>
    writeFileSync(join(OUT_DIR, 'TEST_page1_rex_solo.png'), buf),
  );

  // -- Page 7: Rex + Zip duo --
  await generate(client, 'TEST_page7_rex_zip', PAGE_7, [
    rexRef,
    zipRef,
    dinoStyleRef,
  ]).then((buf) => writeFileSync(join(OUT_DIR, 'TEST_page7_rex_zip.png'), buf));

  // -- Page 10: Full ensemble (4 refs, OpenAI's max) --
  await generate(client, 'TEST_page10_full_crew', PAGE_10, [
    rexRef,
    spikeRef,
    zipRef,
    dotsRef,
  ]).then((buf) =>
    writeFileSync(join(OUT_DIR, 'TEST_page10_full_crew.png'), buf),
  );

  console.log(`\n[page-test] All 3 test pages written to:\n  ${OUT_DIR}`);
  console.log(`\nFiles:`);
  console.log(`  TEST_page1_rex_solo.png    ← Rex alone (Rex ref)`);
  console.log(`  TEST_page7_rex_zip.png     ← duo (Rex + Zip refs)`);
  console.log(`  TEST_page10_full_crew.png  ← finale (all 4 hero refs)`);
}

run().catch((err) => {
  console.error('[page-test] Failed:', err);
  process.exit(1);
});
