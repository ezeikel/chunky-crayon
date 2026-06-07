/**
 * Generate REGION STORES for the bundled onboarding welcome scenes — the modern
 * Magic Brush / Auto Color data (NOT the legacy fill-points). Mirrors what
 * scripts/backfill-region-stores.ts does for real coloring images, but writes
 * LOCAL bundled assets instead of R2 + DB, since the welcome scenes ship in the
 * app offline.
 *
 * Per scene:
 *   1. read the bundled welcome SVG (apps/chunky-crayon-mobile/assets/onboarding)
 *   2. generateRegionStoreLogic → { regionMapGzipped, regionsJson, width, height }
 *   3. STRIP each region's `palettes` down to just `realistic` (these are fixed
 *      scenes — one natural palette is all we need; keeps the bundle small)
 *   4. write assets/onboarding/regions/<scene>.bin  (gzipped region map)
 *           + assets/onboarding/regions/<scene>.json (regionsJson, realistic-only)
 *
 * Usage (from apps/chunky-crayon-web):
 *   OPENAI_API_KEY=... GOOGLE_GENERATIVE_AI_API_KEY=... \
 *     npx tsx scripts/generate-onboarding-region-stores.ts [scene ids...]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  generateRegionStoreLogic,
  DEFAULT_PALETTE_VARIANT_MODIFIERS,
} from '@one-colored-pixel/coloring-core';
import {
  REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
} from '../lib/ai/prompts';

// Inlined from constants.ts (ALL_COLORING_COLORS_EXTENDED = primary + secondary
// + essentials + extended + skinTones). Inlined so this standalone script does
// NOT import the constants.ts barrel, which re-exports types from coloring-ui
// (source-only package, no built exports → breaks tsx/node resolution).
const ALL_COLORING_COLORS_EXTENDED = [
  { name: 'Cherry Red', hex: '#E53935' },
  { name: 'Sunset Orange', hex: '#FB8C00' },
  { name: 'Sunshine Yellow', hex: '#FDD835' },
  { name: 'Grass Green', hex: '#43A047' },
  { name: 'Sky Blue', hex: '#1E88E5' },
  { name: 'Grape Purple', hex: '#8E24AA' },
  { name: 'Bubblegum Pink', hex: '#EC407A' },
  { name: 'Chocolate Brown', hex: '#6D4C41' },
  { name: 'Coral', hex: '#FF7043' },
  { name: 'Mint', hex: '#26A69A' },
  { name: 'Lavender', hex: '#AB47BC' },
  { name: 'Peach', hex: '#FFAB91' },
  { name: 'Navy', hex: '#3949AB' },
  { name: 'Forest', hex: '#2E7D32' },
  { name: 'Gold', hex: '#FFD54F' },
  { name: 'Rose', hex: '#F48FB1' },
  { name: 'Black', hex: '#212121' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Gray', hex: '#9E9E9E' },
  { name: 'Skin Tone', hex: '#FFCC80' },
  { name: 'Turquoise', hex: '#00ACC1' },
  { name: 'Teal', hex: '#00897B' },
  { name: 'Indigo', hex: '#283593' },
  { name: 'Magenta', hex: '#C2185B' },
  { name: 'Lime', hex: '#7CB342' },
  { name: 'Amber', hex: '#FFB300' },
  { name: 'Crimson', hex: '#B71C1C' },
  { name: 'Olive', hex: '#827717' },
  { name: 'Tan', hex: '#D2B48C' },
  { name: 'Salmon', hex: '#FF8A65' },
  { name: 'Slate', hex: '#546E7A' },
  { name: 'Cream', hex: '#FFF8E1' },
  { name: 'Taupe', hex: '#B59A7C' },
  { name: 'Warm Beige', hex: '#E3C9A6' },
  { name: 'Mushroom', hex: '#A68A6D' },
  { name: 'Sienna', hex: '#B5784B' },
  { name: 'Sage', hex: '#9CAF88' },
  { name: 'Moss', hex: '#6B8E4E' },
  { name: 'Steel Blue', hex: '#5B7B9A' },
  { name: 'Dusty Blue', hex: '#8AA4B8' },
  { name: 'Charcoal', hex: '#3F4448' },
  { name: 'Stone Gray', hex: '#B0AEA6' },
  { name: 'Pale Ice', hex: '#E4EEF2' },
  { name: 'Pale Sky', hex: '#C5DCEA' },
  { name: 'Light', hex: '#FFE0B2' },
  { name: 'Medium Light', hex: '#FFCC80' },
  { name: 'Medium', hex: '#DEB887' },
  { name: 'Medium Dark', hex: '#A0522D' },
  { name: 'Dark', hex: '#8B4513' },
  { name: 'Deep', hex: '#5D4037' },
];

const MOBILE = join(process.cwd(), '../chunky-crayon-mobile');
const SVG_DIR = join(MOBILE, 'assets/onboarding');
const OUT_DIR = join(MOBILE, 'assets/onboarding/regions');

const config = {
  gridColorMapSystem: GRID_COLOR_MAP_SYSTEM,
  createGridColorMapPrompt,
  regionFillPointsSystem: REGION_FILL_POINTS_SYSTEM,
  createRegionFillPointsPrompt,
  allColors: ALL_COLORING_COLORS_EXTENDED.map((c) => ({
    hex: c.hex,
    name: c.name,
  })),
  paletteVariantModifiers: DEFAULT_PALETTE_VARIANT_MODIFIERS,
};

const SCENES = [
  {
    id: 'welcome-party',
    title: 'Welcome Party',
    description: 'Colo at a welcome party with balloons, bunting and confetti',
    tags: ['party', 'welcome'],
  },
  {
    id: 'welcome-space',
    title: 'Welcome Space',
    description: 'Colo welcoming friends aboard a rocket on a small planet',
    tags: ['space', 'welcome'],
  },
  {
    id: 'welcome-underwater',
    title: 'Welcome Underwater',
    description: 'Colo in an underwater reef welcome scene',
    tags: ['underwater', 'sea', 'welcome'],
  },
  {
    id: 'welcome-jungle',
    title: 'Welcome Jungle',
    description: 'Colo at a jungle treehouse welcome scene',
    tags: ['jungle', 'welcome'],
  },
];

async function generateOne(scene: (typeof SCENES)[number]) {
  console.log(`[regions] ${scene.id}: reading SVG...`);
  const svgBuffer = readFileSync(join(SVG_DIR, `${scene.id}.svg`));

  console.log(
    `[regions] ${scene.id}: generateRegionStoreLogic (this is the slow AI step)...`,
  );
  const result = await generateRegionStoreLogic(svgBuffer, config, {
    title: scene.title,
    description: scene.description,
    tags: scene.tags,
  });
  if (!result.success) {
    throw new Error(`${scene.id}: ${result.error}`);
  }

  // Strip every region's palettes down to realistic only (the one natural palette).
  const realisticOnly = {
    ...result.regionsJson,
    regions: result.regionsJson.regions.map((r) => ({
      ...r,
      palettes: { realistic: r.palettes.realistic },
    })),
  };

  writeFileSync(join(OUT_DIR, `${scene.id}.bin`), result.regionMapGzipped);
  writeFileSync(
    join(OUT_DIR, `${scene.id}.json`),
    JSON.stringify({
      regionMapWidth: result.width,
      regionMapHeight: result.height,
      regionsJson: realisticOnly,
    }),
  );
  console.log(
    `[regions] ${scene.id}: done — ${result.regionsJson.regions.length} regions, ${result.width}x${result.height}, map ${result.regionMapGzipped.length}B`,
  );
}

async function main() {
  if (
    !process.env.OPENAI_API_KEY ||
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ) {
    throw new Error('OPENAI_API_KEY + GOOGLE_GENERATIVE_AI_API_KEY required');
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const todo = args.length
    ? SCENES.filter(
        (s) =>
          args.includes(s.id) || args.includes(s.id.replace('welcome-', '')),
      )
    : SCENES;
  for (const scene of todo) await generateOne(scene);
  console.log(`[regions] all done → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[regions] failed:', err);
  process.exit(1);
});
