/**
 * Trace approved onboarding welcome-scene line-art PNGs → coloring SVGs.
 *
 * The scene generator (generate-onboarding-scenes.ts) outputs black-outline
 * line-art PNGs. The onboarding canvas (Skia useSVG) needs vector SVGs, so this
 * traces each approved PNG with the project's `traceImage` util (the SAME path
 * every real coloring image uses — sharp preprocess + oslllo-potrace).
 *
 * Usage (from apps/chunky-crayon-web):
 *   npx tsx scripts/trace-onboarding-scenes.ts                 (all scenes)
 *   npx tsx scripts/trace-onboarding-scenes.ts welcome-space   (specific ids)
 *
 * Input:  scripts/out/onboarding-scenes/<id>.png
 * Output: scripts/out/onboarding-scenes/<id>.svg
 *         (copy approved SVGs into apps/chunky-crayon-mobile/assets/onboarding/)
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { traceImage } from '../utils/traceImage';

const DIR = join(process.cwd(), 'scripts/out/onboarding-scenes');

async function traceOne(id: string) {
  const pngPath = join(DIR, `${id}.png`);
  console.log(`[trace] ${id}.png → SVG...`);
  const png = readFileSync(pngPath);
  const svg = await traceImage(png);
  writeFileSync(join(DIR, `${id}.svg`), svg);
  console.log(`[trace] ${id}.svg saved (${svg.length} bytes)`);
}

async function main() {
  const args = process.argv.slice(2);
  const ids = args.length
    ? args
    : readdirSync(DIR)
        .filter((f) => f.endsWith('.png') && f.startsWith('welcome-'))
        .map((f) => f.replace(/\.png$/, ''));
  if (!ids.length) {
    console.error('No welcome-*.png scenes found in', DIR);
    process.exit(1);
  }
  for (const id of ids) await traceOne(id);
  console.log(`[trace] done → ${DIR}`);
}

main().catch((err) => {
  console.error('[trace] failed:', err);
  process.exit(1);
});
