#!/usr/bin/env tsx

/**
 * Generate b-roll clips for every scene in campaigns.ts that has a
 * BrollSpec. Idempotent: skips any stableId already in broll-assets.json
 * unless --force is passed. Pipeline:
 *
 *   1. Nano Banana Pro: start still from startStillPrompt (+ ad-assets.json
 *      reference image if referenceImageKey set). Uploads to R2.
 *   2. Nano Banana Pro: end still (if endStillPrompt set). Uses the start
 *      still as a second reference image so composition stays consistent.
 *   3. Seedance 2 i2v: interpolates start → end (or start → start if no
 *      end prompt). 720p 9:16 5s, no audio.
 *   4. Downloads MP4 to test-clips/<stableId>/clip.mp4.
 *   5. ffmpeg extracts 1s-per-frame + half-second samples for review.
 *   6. Persists URLs to broll-assets.json keyed by stableId.
 *
 * There is NO hardcoded clip → campaign mapping here or anywhere else.
 * campaigns.ts is the single source of truth. Adding a new b-roll scene
 * means: add a scene with kind:'broll' and a BrollSpec, run this script.
 *
 * Usage:
 *   pnpm tsx scripts/generate-broll.ts
 *   pnpm tsx scripts/generate-broll.ts --only=<stableId>
 *   pnpm tsx scripts/generate-broll.ts --force
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

import { put } from '@one-colored-pixel/storage';
import { fal } from '@fal-ai/client';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { campaigns } from '../lib/ads/campaigns';
import { expandBrollTemplate } from '../lib/ads/prompt-templates';
import { judgeBrollClip, formatJudgementForCli } from '../lib/ads/judge';
import type {
  AdAsset,
  BrollAsset,
  BrollModel,
  BrollSpec,
} from '../lib/ads/schema';
import { ADAPTERS } from './generate-broll-adapters';

const BROLL_ASSETS_PATH = resolve(__dirname, '..', 'broll-assets.json');
const AD_ASSETS_PATH = resolve(__dirname, '..', 'ad-assets.json');
const TEST_CLIPS = resolve(__dirname, '..', 'test-clips');

async function loadAdAssets(): Promise<AdAsset[]> {
  try {
    return JSON.parse(await readFile(AD_ASSETS_PATH, 'utf8')) as AdAsset[];
  } catch {
    return [];
  }
}

async function loadBrollAssets(): Promise<BrollAsset[]> {
  try {
    return JSON.parse(
      await readFile(BROLL_ASSETS_PATH, 'utf8'),
    ) as BrollAsset[];
  } catch {
    return [];
  }
}

async function saveBrollAssets(assets: BrollAsset[]) {
  await writeFile(BROLL_ASSETS_PATH, `${JSON.stringify(assets, null, 2)}\n`);
}

/**
 * Walk every campaign's scenes and collect every BrollSpec with its
 * parent campaign id for debugging/logging. Returns them in campaign +
 * scene order — which is also the rendering order.
 */
function collectBrollSpecs(): Array<{ campaignId: string; spec: BrollSpec }> {
  const out: Array<{ campaignId: string; spec: BrollSpec }> = [];
  for (const campaign of campaigns) {
    if (!campaign.video) continue;
    for (const scene of campaign.video.scenes) {
      if (scene.kind === 'broll' && scene.broll) {
        out.push({ campaignId: campaign.id, spec: scene.broll });
      }
    }
  }
  return out;
}

async function generateStill(
  spec: BrollSpec,
  outDir: string,
  prompt: string,
  label: 'start' | 'end',
  referenceImageUrl?: string,
  startStillUrlForConsistency?: string,
): Promise<string> {
  console.log(`  🖼  Nano Banana: ${label} still…`);
  const started = Date.now();

  const content: Array<
    { type: 'text'; text: string } | { type: 'image'; image: URL }
  > = [{ type: 'text', text: prompt }];

  if (referenceImageUrl) {
    content.push({ type: 'image', image: new URL(referenceImageUrl) });
  }
  // End still gets the start still as a SECOND reference so camera,
  // lighting, table, and background stay consistent across frames.
  if (label === 'end' && startStillUrlForConsistency) {
    content.push({
      type: 'image',
      image: new URL(startStillUrlForConsistency),
    });
  }

  const result = await generateText({
    model: google('gemini-3-pro-image-preview'),
    messages: [{ role: 'user', content }],
    providerOptions: {
      google: { responseModalities: ['TEXT', 'IMAGE'] },
    },
  });

  const file = result.files?.find((f) => f.mediaType?.startsWith('image/'));
  if (!file?.base64) throw new Error(`Nano Banana returned no ${label} image`);

  const buffer = Buffer.from(file.base64, 'base64');
  const key = `uploads/ad-broll/${spec.stableId}-${label}-${Date.now()}.png`;
  const { url } = await put(key, buffer, { contentType: 'image/png' });
  await writeFile(resolve(outDir, `${label}-still.png`), buffer);

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`  ✅ ${label} still in ${seconds}s`);
  return url;
}

async function generateVideo(
  spec: BrollSpec,
  motionPrompt: string,
  startStillUrl: string,
  endStillUrl: string | null,
  seed?: number,
): Promise<{ url: string; model: BrollModel }> {
  const model = spec.model ?? 'seedance-2';
  const adapter = ADAPTERS[model];
  if (!adapter) throw new Error(`Unknown model: ${model}`);

  console.log(`  🎬 ${adapter.label} i2v…`);
  const started = Date.now();
  fal.config({ credentials: process.env.FAL_KEY });

  const url = await adapter.run({
    spec,
    motionPrompt,
    startStillUrl,
    endStillUrl,
    seed,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`  ✅ video in ${seconds}s`);
  return { url, model };
}

async function downloadClip(videoUrl: string, outDir: string): Promise<string> {
  const localPath = resolve(outDir, 'clip.mp4');
  const res = await fetch(videoUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(localPath, buffer);
  console.log(`  💾 saved to ${localPath}`);
  return localPath;
}

function extractFrames(clipPath: string, outDir: string) {
  const framesDir = resolve(outDir, 'frames');
  execSync(`mkdir -p "${framesDir}"`);
  execSync(`find "${framesDir}" -name "*.jpg" -delete`);
  execSync(
    `ffmpeg -loglevel error -i "${clipPath}" -vf "fps=1" -q:v 2 "${framesDir}/f-%02d.jpg"`,
  );
  const halfSelectors = Array.from(
    { length: 10 },
    (_, i) => `eq(n,${(i + 1) * 12})`,
  ).join('+');
  execSync(
    `ffmpeg -loglevel error -i "${clipPath}" -vf "select='${halfSelectors}'" -vsync 0 -q:v 2 "${framesDir}/h-%02d.jpg"`,
  );
  console.log(`  🔍 frames → ${framesDir}`);
}

async function generateOne(
  spec: BrollSpec,
  adAssets: AdAsset[],
  seed?: number,
): Promise<BrollAsset> {
  const outDir = resolve(TEST_CLIPS, spec.stableId);
  await mkdir(outDir, { recursive: true });

  // Expand the template. Fails fast if required variables are missing.
  const { stillPrompt, motionPrompt } = expandBrollTemplate(
    spec.template,
    spec.templateVars,
  );

  const referenceImageUrl = spec.referenceImageKey
    ? adAssets.find((a) => a.key === spec.referenceImageKey)?.url
    : undefined;
  if (spec.referenceImageKey && !referenceImageUrl) {
    throw new Error(
      `[${spec.stableId}] referenceImageKey "${spec.referenceImageKey}" not found in ad-assets.json`,
    );
  }

  const startStillUrl = await generateStill(
    spec,
    outDir,
    stillPrompt,
    'start',
    referenceImageUrl,
  );
  // Templates are single-frame by default. Only regenerate the end still
  // when the spec explicitly opts in (generateEndStill) — currently no
  // template does, but the hook is here for future motion designs.
  const endStillUrl = spec.generateEndStill
    ? await generateStill(
        spec,
        outDir,
        stillPrompt,
        'end',
        referenceImageUrl,
        startStillUrl,
      )
    : null;

  const { url: videoUrl, model } = await generateVideo(
    spec,
    motionPrompt,
    startStillUrl,
    endStillUrl,
    seed,
  );
  const localClipPath = await downloadClip(videoUrl, outDir);
  extractFrames(localClipPath, outDir);

  // Run Opus judgement immediately so the human review step has pre-
  // flagged issues. Judgement failure doesn't block the clip — user can
  // still override via review CLI.
  let judgement: BrollAsset['judgement'];
  const framesDir = resolve(outDir, 'frames');
  try {
    console.log('  🧑‍⚖️  Opus judge (claude-opus-4-7)…');
    const started = Date.now();
    judgement = await judgeBrollClip(framesDir);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`  ✅ judged in ${seconds}s`);
    console.log(
      formatJudgementForCli(judgement)
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n'),
    );
  } catch (err) {
    console.warn(
      `  ⚠️  judgement failed (non-blocking): ${(err as Error).message}`,
    );
  }

  return {
    stableId: spec.stableId,
    model,
    startStillUrl,
    endStillUrl: endStillUrl ?? undefined,
    videoUrl,
    localClipPath: resolve(TEST_CLIPS, spec.stableId, 'clip.mp4'),
    generatedAt: new Date().toISOString(),
    seed,
    judgement,
    reviewStatus: 'pending',
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const only = [...args].find((a) => a.startsWith('--only='))?.slice(7);
  const force = args.has('--force');

  if (!process.env.FAL_KEY) throw new Error('FAL_KEY missing');
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY missing');
  }

  const adAssets = await loadAdAssets();
  const existing = await loadBrollAssets();
  const byId = new Map(existing.map((a) => [a.stableId, a]));

  const specs = collectBrollSpecs();
  const targets = only ? specs.filter((s) => s.spec.stableId === only) : specs;

  if (only && targets.length === 0) {
    console.error(`❌ --only=${only} matched no broll scene`);
    console.error(
      `   Available: ${specs.map((s) => s.spec.stableId).join(', ')}`,
    );
    process.exit(1);
  }

  console.log(`🎞  ${targets.length} broll spec(s) from campaigns.ts\n`);

  for (const { campaignId, spec } of targets) {
    if (!force && byId.has(spec.stableId)) {
      console.log(
        `⏭️  ${campaignId} · ${spec.stableId} — cached (pass --force to regenerate)`,
      );
      continue;
    }
    console.log(`🎬 ${campaignId} · ${spec.stableId}`);
    const asset = await generateOne(spec, adAssets);
    byId.set(spec.stableId, asset);
    await saveBrollAssets([...byId.values()]);
    console.log('');
  }

  console.log(`📝 wrote ${byId.size} asset(s) → ${BROLL_ASSETS_PATH}`);
}

main().catch((err) => {
  console.error('❌ generate-broll failed:', err);
  process.exit(1);
});
