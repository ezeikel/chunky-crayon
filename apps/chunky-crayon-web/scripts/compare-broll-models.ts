#!/usr/bin/env tsx

/**
 * One-off: run the same b-roll spec through multiple models for
 * side-by-side comparison. Reuses stills already on R2 (zero new Nano
 * Banana spend) so we're comparing MODEL quality only.
 *
 * Clips land under test-clips/comparisons/<stableId>--<model>/.
 *
 * Usage:
 *   pnpm tsx scripts/compare-broll-models.ts <source-stableId> <model1> <model2> ...
 *
 * Example:
 *   pnpm tsx scripts/compare-broll-models.ts dragon-page-placed kling-v3-pro veo-3.1
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

import { campaigns } from '../lib/ads/campaigns';
import { expandBrollTemplate } from '../lib/ads/prompt-templates';
import type { BrollAsset, BrollModel, BrollSpec } from '../lib/ads/schema';

const BROLL_ASSETS_PATH = resolve(__dirname, '..', 'broll-assets.json');
const TEST_CLIPS = resolve(__dirname, '..', 'test-clips');

async function loadBrollAssets(): Promise<BrollAsset[]> {
  try {
    return JSON.parse(await readFile(BROLL_ASSETS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function findSpec(stableId: string): BrollSpec {
  for (const campaign of campaigns) {
    if (!campaign.video) continue;
    for (const scene of campaign.video.scenes) {
      if (scene.kind === 'broll' && scene.broll?.stableId === stableId) {
        return scene.broll;
      }
    }
  }
  throw new Error(
    `No BrollSpec with stableId "${stableId}" found in campaigns.ts`,
  );
}

function extractFrames(clipPath: string, outDir: string) {
  const framesDir = resolve(outDir, 'frames');
  execSync(`mkdir -p "${framesDir}"`);
  execSync(`find "${framesDir}" -name "*.jpg" -delete`);
  execSync(
    `ffmpeg -loglevel error -i "${clipPath}" -vf "fps=1" -q:v 2 "${framesDir}/f-%02d.jpg"`,
  );
}

async function main() {
  const [sourceStableId, ...modelsArg] = process.argv.slice(2);
  if (!sourceStableId || modelsArg.length === 0) {
    console.error(
      '❌ usage: pnpm tsx scripts/compare-broll-models.ts <source-stableId> <model1> [model2 ...]',
    );
    process.exit(1);
  }

  const validModels: BrollModel[] = ['seedance-2', 'kling-v3-pro', 'veo-3.1'];
  const models = modelsArg as BrollModel[];
  for (const m of models) {
    if (!validModels.includes(m)) {
      console.error(
        `❌ invalid model "${m}", must be one of ${validModels.join(', ')}`,
      );
      process.exit(1);
    }
  }

  if (!process.env.FAL_KEY) throw new Error('FAL_KEY missing');

  const sourceSpec = findSpec(sourceStableId);
  const brollAssets = await loadBrollAssets();
  const sourceAsset = brollAssets.find((a) => a.stableId === sourceStableId);
  if (!sourceAsset) {
    throw new Error(
      `No generated broll asset for "${sourceStableId}" yet — run generate-broll.ts first`,
    );
  }
  console.log(
    `📸 Reusing stills from ${sourceStableId} (model: ${sourceAsset.model})`,
  );
  console.log(`   start: ${sourceAsset.startStillUrl}`);
  console.log(`   end:   ${sourceAsset.endStillUrl ?? '(same as start)'}\n`);

  // Import adapters from generate-broll by importing the map directly.
  // To keep adapters co-located with the pipeline, we dynamically import.
  const { ADAPTERS } = await import('./generate-broll-adapters');

  for (const model of models) {
    const adapter = ADAPTERS[model];
    const outDir = resolve(
      TEST_CLIPS,
      'comparisons',
      `${sourceStableId}--${model}`,
    );
    await mkdir(outDir, { recursive: true });

    console.log(`🎬 ${model}: ${adapter.label}…`);
    const started = Date.now();
    const { motionPrompt } = expandBrollTemplate(
      sourceSpec.template,
      sourceSpec.templateVars,
    );
    const videoUrl = await adapter.run({
      spec: { ...sourceSpec, model },
      motionPrompt,
      startStillUrl: sourceAsset.startStillUrl,
      endStillUrl: sourceAsset.endStillUrl ?? null,
    });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    const localPath = resolve(outDir, 'clip.mp4');
    const res = await fetch(videoUrl);
    await writeFile(localPath, Buffer.from(await res.arrayBuffer()));
    extractFrames(localPath, outDir);

    console.log(`✅ ${model} in ${seconds}s → ${localPath}\n`);
  }

  console.log('📁 All comparisons under test-clips/comparisons/');
}

main().catch((err) => {
  console.error('❌ compare-broll-models failed:', err);
  process.exit(1);
});
