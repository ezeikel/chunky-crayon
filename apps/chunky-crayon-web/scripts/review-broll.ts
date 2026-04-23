#!/usr/bin/env tsx

/**
 * Review every b-roll clip referenced in campaigns.ts. For each:
 *   1. Show the Opus judgement (if any) + campaign context
 *   2. Open the clip in the OS default player
 *   3. Wait for keyboard input:
 *        y — approve (sets reviewStatus: 'approved')
 *        r — regenerate with a new seed (runs generate-broll again)
 *        k — reject (sets reviewStatus: 'rejected'; render refuses this clip)
 *        s — skip for now (leaves reviewStatus unchanged)
 *
 * Only clips with reviewStatus:'approved' are used by render-ad-videos.ts.
 *
 * Usage:
 *   pnpm tsx scripts/review-broll.ts
 *   pnpm tsx scripts/review-broll.ts --only=trex-over-shoulder-colouring
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { execSync, spawn } from 'node:child_process';
import { stdin, stdout } from 'node:process';
import * as readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

import { campaigns } from '../lib/ads/campaigns';
import { formatJudgementForCli } from '../lib/ads/judge';
import type { BrollAsset, BrollSpec } from '../lib/ads/schema';

const BROLL_ASSETS_PATH = resolve(__dirname, '..', 'broll-assets.json');
const TEST_CLIPS = resolve(__dirname, '..', 'test-clips');

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

function openInPlayer(clipPath: string) {
  // macOS-only via `open`. On Linux we'd use xdg-open. Good enough for now.
  spawn('open', [clipPath], { detached: true, stdio: 'ignore' }).unref();
}

async function askKey(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function regenerateOne(stableId: string): Promise<void> {
  // Delegate to generate-broll.ts with --force --only=<id>. A fresh run
  // picks a new Seedance/Kling seed automatically.
  console.log(`\n🔄 regenerating ${stableId}…\n`);
  execSync(`npx tsx scripts/generate-broll.ts --only=${stableId} --force`, {
    stdio: 'inherit',
    cwd: resolve(__dirname, '..'),
  });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const only = [...args].find((a) => a.startsWith('--only='))?.slice(7);

  const specs = collectBrollSpecs();
  const targets = only ? specs.filter((s) => s.spec.stableId === only) : specs;

  if (only && targets.length === 0) {
    console.error(`❌ --only=${only} matched no broll spec in campaigns.ts`);
    process.exit(1);
  }
  if (targets.length === 0) {
    console.log('no broll specs in campaigns.ts');
    return;
  }

  console.log(`🎞  Reviewing ${targets.length} broll clip(s)\n`);

  for (const { campaignId, spec } of targets) {
    // Re-load each iteration so we see any changes made during regen.
    let assets = await loadBrollAssets();
    let asset = assets.find((a) => a.stableId === spec.stableId);

    if (!asset) {
      console.log(
        `⏭️  ${campaignId} · ${spec.stableId}: not yet generated (run generate-broll.ts first)\n`,
      );
      continue;
    }

    console.log('─'.repeat(72));
    console.log(`📹 ${campaignId} · ${spec.stableId}`);
    console.log(`   model:  ${asset.model}`);
    console.log(`   status: ${asset.reviewStatus}`);
    console.log(`   clip:   ${asset.localClipPath}`);
    if (asset.judgement) {
      console.log();
      console.log(
        formatJudgementForCli(asset.judgement)
          .split('\n')
          .map((l) => `   ${l}`)
          .join('\n'),
      );
    } else {
      console.log('   (no Opus judgement on file)');
    }
    console.log();

    openInPlayer(asset.localClipPath);

    // Review loop — allows multiple regens before moving on.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const key = await askKey(
        '   (y)es approve / (r)egenerate / (k)ill reject / (s)kip › ',
      );

      if (key === 'y') {
        assets = await loadBrollAssets();
        const idx = assets.findIndex((a) => a.stableId === spec.stableId);
        if (idx >= 0) {
          assets[idx] = {
            ...assets[idx],
            reviewStatus: 'approved',
            reviewedAt: new Date().toISOString(),
          };
          await saveBrollAssets(assets);
          console.log(`   ✅ approved\n`);
        }
        break;
      }
      if (key === 'k') {
        assets = await loadBrollAssets();
        const idx = assets.findIndex((a) => a.stableId === spec.stableId);
        if (idx >= 0) {
          assets[idx] = {
            ...assets[idx],
            reviewStatus: 'rejected',
            reviewedAt: new Date().toISOString(),
          };
          await saveBrollAssets(assets);
          console.log(
            `   ❌ rejected — render-ad-videos.ts will refuse this clip\n`,
          );
        }
        break;
      }
      if (key === 's') {
        console.log('   ⏭️  skipped\n');
        break;
      }
      if (key === 'r') {
        try {
          await regenerateOne(spec.stableId);
          assets = await loadBrollAssets();
          asset = assets.find((a) => a.stableId === spec.stableId)!;
          console.log();
          if (asset.judgement) {
            console.log(
              formatJudgementForCli(asset.judgement)
                .split('\n')
                .map((l) => `   ${l}`)
                .join('\n'),
            );
          }
          openInPlayer(asset.localClipPath);
          continue; // stay in loop — user reviews the new version
        } catch (err) {
          console.error(`   ❌ regen failed: ${(err as Error).message}`);
          continue;
        }
      }
      console.log('   ? press y / r / k / s');
    }
  }

  console.log('\n📁 broll-assets.json updated.');
}

main().catch((err) => {
  console.error('❌ review-broll failed:', err);
  process.exit(1);
});
