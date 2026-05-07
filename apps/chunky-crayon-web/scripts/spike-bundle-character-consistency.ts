/**
 * Spike: GPT Image 2 character consistency for bundle pages.
 *
 * Goal: figure out the best reference-image setup for generating 10 cohesive
 * pages of a bundle (consistent characters, same world, recurring cast)
 * BEFORE we commit a generation pipeline for all 5 launch bundles.
 *
 * What it does:
 *   1. Generates page 1 of "Dino Dance Party" using current production
 *      style references only (4 brand-style refs).
 *   2. Optionally generates a separate "character sheet" page (T-rex,
 *      stegosaurus, velociraptor reference poses on a single page).
 *   3. Generates pages 2 and 3 under FOUR conditions:
 *        A. Baseline: 4 style refs only (what we do today)
 *        B. 3 style refs + page 1 of bundle as 4th
 *        C. Character sheet ONLY (no style refs)
 *        D. Character sheet + 1 dino-themed style ref
 *   4. Saves all generated images locally to scripts/out/spike-bundle-consistency/
 *      so we can eyeball them side-by-side.
 *
 * We deliberately bypass the production createImageGenerationPipeline because
 * we need to vary the reference-image set per call. The spike calls OpenAI
 * directly so production code stays untouched.
 *
 * Cost: 8 GPT Image 2 generations at $0.08 each = ~$0.64.
 *   - 1x page 1 baseline
 *   - 1x character sheet
 *   - 2x condition A (pages 2, 3)
 *   - 2x condition B
 *   - 2x condition C / D combined (we share the page 2 + page 3 prompts across C and D)
 *
 * Actually 8 vs the planned 10 because we generate page 1 once, character
 * sheet once, then 2 pages per condition × 4 conditions = 8 → 10 total.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/spike-bundle-character-consistency.ts \
 *     dotenv_config_path=.env.local
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { GPT_IMAGE_STYLE_BLOCK, REFERENCE_IMAGES } from '../lib/ai/prompts';

const MODEL = 'gpt-image-2';
const OUT_DIR = join(__dirname, 'out', 'spike-bundle-consistency');
const SIZE = '1024x1024' as const;

// Pull these from scripts/research-kids-coloring-bestsellers.output.json
// (launchLineup.bundles[0]). Hardcoding here so the spike doesn't need
// the full JSON loaded — easier to read and tweak.
const DINO_PAGE_1 =
  'A friendly cartoon T-rex with tiny arms standing in a jungle clearing, wearing oversized headphones, mouth wide open in a happy roar, palm trees behind';
const DINO_PAGE_2 =
  'A stegosaurus shaking its tail-spikes to the beat on a flat rock stage, plates wiggling, baby pterodactyls clapping in the sky';
const DINO_PAGE_3 =
  'A cheeky velociraptor breakdancing on its claws, one foot spinning, palm leaves and bananas flying around it';

// A "character sheet" reference: all the recurring dinos in one frame, neutral
// poses, white background. Used for character-consistency conditioning.
const DINO_CHARACTER_SHEET = `Character reference sheet. Five friendly cartoon dinosaurs lined up across a single page on plain white background, each in a simple standing or seated pose facing slightly forward. From left to right: a happy T-rex with tiny arms and oversized headphones, a stegosaurus with rounded back-plates, a cheerful velociraptor on its hind legs, a long-necked brachiosaurus, an armored ankylosaurus with a club tail. All friendly cartoon expressions. No background scenery. This is a model sheet showing the cast of a coloring book.`;

// Pick one of the 8 refs that's actually a dinosaur reference for condition D
const DINO_STYLE_REF = REFERENCE_IMAGES.find((u) => u.includes('dinosaur'))!;

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

function bufferToFile(
  buf: Buffer,
  name: string,
  ext: 'png' | 'webp' = 'png',
): File {
  return new File([new Uint8Array(buf)], `${name}.${ext}`, {
    type: `image/${ext}`,
  });
}

async function generate(
  client: OpenAI,
  label: string,
  scene: string,
  refFiles: File[],
): Promise<{ buffer: Buffer; latencyMs: number }> {
  const styledPrompt = `The provided images show the target coloring book style and recurring characters. Match their line weight, simplicity, outline-only aesthetic, and character designs.\n\n${buildPrompt(scene)}`;

  console.log(`[spike] Generating ${label} (${refFiles.length} refs)...`);
  const start = Date.now();
  const result = await client.images.edit({
    model: MODEL,
    image: refFiles,
    prompt: styledPrompt,
    size: SIZE,
    quality: 'high',
  });
  const latencyMs = Date.now() - start;

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image returned for ${label}`);
  console.log(`[spike] Done ${label} in ${(latencyMs / 1000).toFixed(1)}s`);
  return { buffer: Buffer.from(b64, 'base64'), latencyMs };
}

function save(label: string, buffer: Buffer): string {
  const filename = `${label}.png`;
  const path = join(OUT_DIR, filename);
  writeFileSync(path, buffer);
  return path;
}

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[spike] Output dir: ${OUT_DIR}`);

  const client = new OpenAI();

  // Pre-fetch all 8 brand style refs once.
  const allStyleRefs = await Promise.all(
    REFERENCE_IMAGES.map((url, i) => fetchAsFile(url, `style-ref-${i}`)),
  );
  const dinoStyleRef = await fetchAsFile(DINO_STYLE_REF, 'style-dino');

  // ---------------------------------------------------------------------------
  // Step 1: Generate baseline page 1 with current production style refs (top 4).
  // ---------------------------------------------------------------------------
  const page1 = await generate(
    client,
    '01_page1_baseline',
    DINO_PAGE_1,
    allStyleRefs.slice(0, 4),
  );
  save('01_page1_baseline', page1.buffer);
  const page1File = bufferToFile(page1.buffer, 'page-1');

  // ---------------------------------------------------------------------------
  // Step 2: Generate character sheet (no character ref needed; just style refs).
  // ---------------------------------------------------------------------------
  const charSheet = await generate(
    client,
    '02_character_sheet',
    DINO_CHARACTER_SHEET,
    allStyleRefs.slice(0, 4),
  );
  save('02_character_sheet', charSheet.buffer);
  const charSheetFile = bufferToFile(charSheet.buffer, 'character-sheet');

  // ---------------------------------------------------------------------------
  // Step 3: Four conditions for page 2 + page 3.
  // ---------------------------------------------------------------------------

  // Condition A: 4 style refs only (current production behaviour).
  await generate(
    client,
    'A_page2_baseline',
    DINO_PAGE_2,
    allStyleRefs.slice(0, 4),
  ).then(({ buffer }) => save('A_page2_baseline', buffer));
  await generate(
    client,
    'A_page3_baseline',
    DINO_PAGE_3,
    allStyleRefs.slice(0, 4),
  ).then(({ buffer }) => save('A_page3_baseline', buffer));

  // Condition B: 3 style refs + page 1 as 4th reference.
  const refsB = [...allStyleRefs.slice(0, 3), page1File];
  await generate(client, 'B_page2_with_page1', DINO_PAGE_2, refsB).then(
    ({ buffer }) => save('B_page2_with_page1', buffer),
  );
  await generate(client, 'B_page3_with_page1', DINO_PAGE_3, refsB).then(
    ({ buffer }) => save('B_page3_with_page1', buffer),
  );

  // Condition C: Character sheet ONLY (1 ref).
  const refsC = [charSheetFile];
  await generate(client, 'C_page2_charsheet_only', DINO_PAGE_2, refsC).then(
    ({ buffer }) => save('C_page2_charsheet_only', buffer),
  );
  await generate(client, 'C_page3_charsheet_only', DINO_PAGE_3, refsC).then(
    ({ buffer }) => save('C_page3_charsheet_only', buffer),
  );

  // Condition D: Character sheet + 1 dino-themed style ref.
  const refsD = [charSheetFile, dinoStyleRef];
  await generate(
    client,
    'D_page2_charsheet_plus_style',
    DINO_PAGE_2,
    refsD,
  ).then(({ buffer }) => save('D_page2_charsheet_plus_style', buffer));
  await generate(
    client,
    'D_page3_charsheet_plus_style',
    DINO_PAGE_3,
    refsD,
  ).then(({ buffer }) => save('D_page3_charsheet_plus_style', buffer));

  console.log(`\n[spike] All 10 images saved to:\n  ${OUT_DIR}`);
  console.log(`\n[spike] To compare visually:`);
  console.log(`  open "${OUT_DIR}"`);
  console.log(`\nFiles:`);
  console.log(`  01_page1_baseline.png             ← reference for evaluation`);
  console.log(`  02_character_sheet.png            ← character reference`);
  console.log(`  A_page2_baseline / A_page3_baseline   ← current behaviour`);
  console.log(`  B_page2_with_page1 / B_page3_with_page1   ← page 1 as ref`);
  console.log(
    `  C_page2_charsheet_only / C_page3_charsheet_only   ← sheet only`,
  );
  console.log(
    `  D_page2_charsheet_plus_style / D_page3_charsheet_plus_style   ← sheet + style`,
  );
}

run().catch((err) => {
  console.error('[spike] Failed:', err);
  process.exit(1);
});
