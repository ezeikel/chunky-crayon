#!/usr/bin/env tsx

/**
 * Render all (or one) ad video campaigns via Remotion.
 *
 * Pipeline:
 *   1. Resolve assets: line-art URL (ad-assets.json), colored URL,
 *      broll Seedance clips (test-clips/<broll-name>/clip.mp4),
 *      music track (test-clips/music/<campaign-id>.mp3), logo (public).
 *   2. Bundle the Remotion worker entrypoint.
 *   3. Render AdVideo composition to public/ads/<id>--video.mp4.
 *
 * Requires: assets generated (generate-ad-assets.ts, generate-ad-music.ts,
 * generate-video-clip.ts per campaign).
 *
 * Usage:
 *   pnpm tsx scripts/render-ad-videos.ts
 *   pnpm tsx scripts/render-ad-videos.ts --only=impossible-request-trex
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

import { campaigns } from '../lib/ads/campaigns';
import type { AdAsset, Campaign } from '../lib/ads/schema';

const WORKER_ENTRY = resolve(
  __dirname,
  '..',
  '..',
  'chunky-crayon-worker',
  'src',
  'video',
  'index.ts',
);
const WORKER_PUBLIC = resolve(
  __dirname,
  '..',
  '..',
  'chunky-crayon-worker',
  'public',
);
const WEB_PUBLIC = resolve(__dirname, '..', 'public');
const ASSET_JSON = resolve(__dirname, '..', 'ad-assets.json');
const TEST_CLIPS = resolve(__dirname, '..', 'test-clips');

// Map campaign.id → which Seedance test clip to use for each broll scene.
// Scene index → clip folder name under test-clips/.
// v2 clips use a separate end-still (colouring complete) so colour persists
// across the clip instead of appearing-and-disappearing.
const BROLL_CLIP_MAP: Record<string, Record<number, string>> = {
  'impossible-request-trex': { 1: 'trex-colouring-motion-v2' },
  'dream-it-dragon': { 1: 'dragon-colouring-motion-v2' },
  // five-pm-rescue-foxes has no broll scene — uses phone-mockup instead
};

async function loadAssets(): Promise<AdAsset[]> {
  const raw = await readFile(ASSET_JSON, 'utf8');
  return JSON.parse(raw) as AdAsset[];
}

type ResolvedAssets = {
  logoUrl: string;
  lineArtUrl: string;
  coloredUrl?: string;
  brollUrls: Record<number, string>;
  musicUrl: string;
  transitionSfxUrl?: string;
};

async function resolveAssets(
  campaign: Campaign,
  assets: AdAsset[],
  bundleLocation: string,
): Promise<ResolvedAssets> {
  const asset = assets.find((a) => a.key === campaign.asset.key);
  if (!asset) {
    throw new Error(
      `[${campaign.id}] no asset for key "${campaign.asset.key}" in ad-assets.json`,
    );
  }

  // Per Remotion docs: for server-side rendering, copy assets into the
  // bundle directory AFTER bundle(). The renderer's static server serves
  // from the bundle root, so `/ad-assets/foo.mp3` resolves to
  // <bundleDir>/ad-assets/foo.mp3 (NOT <bundleDir>/public/ad-assets/...).
  const bundleStaging = resolve(bundleLocation, 'ad-assets');
  await mkdir(bundleStaging, { recursive: true });

  const brollClips = BROLL_CLIP_MAP[campaign.id] ?? {};
  const brollUrls: Record<number, string> = {};
  for (const [sceneIdx, clipName] of Object.entries(brollClips)) {
    const src = resolve(TEST_CLIPS, clipName, 'clip.mp4');
    if (!existsSync(src)) {
      throw new Error(
        `[${campaign.id}] missing broll clip at ${src} — run generate-video-clip.ts ${clipName}`,
      );
    }
    const stagedName = `${campaign.id}--scene-${sceneIdx}.mp4`;
    await copyFile(src, resolve(bundleStaging, stagedName));
    brollUrls[Number(sceneIdx)] = `/ad-assets/${stagedName}`;
  }

  const musicSrc = resolve(TEST_CLIPS, 'music', `${campaign.id}.mp3`);
  if (!existsSync(musicSrc)) {
    throw new Error(
      `[${campaign.id}] missing music at ${musicSrc} — run generate-ad-music.ts --only=${campaign.id}`,
    );
  }
  const musicStaged = `${campaign.id}--music.mp3`;
  await copyFile(musicSrc, resolve(bundleStaging, musicStaged));

  // Stage the logo too — the no-bg variant may not be deployed to prod yet.
  const logoSrc = resolve(WEB_PUBLIC, 'logos', 'cc-logo-no-bg.svg');
  if (!existsSync(logoSrc)) {
    throw new Error(`missing logo at ${logoSrc}`);
  }
  await copyFile(logoSrc, resolve(bundleStaging, 'cc-logo-no-bg.svg'));

  // Stage the transition whoosh SFX — shared across all campaigns.
  // TODO: swap to curated Epidemic Sound library once we have a subscription.
  const sfxSrc = resolve(TEST_CLIPS, 'sfx', 'transition-whoosh.mp3');
  let transitionSfxUrl: string | undefined;
  if (existsSync(sfxSrc)) {
    await copyFile(sfxSrc, resolve(bundleStaging, 'transition-whoosh.mp3'));
    transitionSfxUrl = '/ad-assets/transition-whoosh.mp3';
  }

  return {
    logoUrl: '/ad-assets/cc-logo-no-bg.svg',
    lineArtUrl: asset.url,
    coloredUrl: asset.coloredUrl,
    brollUrls,
    musicUrl: `/ad-assets/${musicStaged}`,
    transitionSfxUrl,
  };
}

async function renderOne(
  campaign: Campaign,
  assets: AdAsset[],
  bundleLocation: string,
) {
  if (!campaign.video) {
    console.log(`⏭️  ${campaign.id}: no video config, skipping`);
    return;
  }

  console.log(`\n🎬 ${campaign.id}: staging assets into bundle…`);
  const resolved = await resolveAssets(campaign, assets, bundleLocation);

  const inputProps = {
    campaignId: campaign.id,
    headline: campaign.copy.headline,
    subhead: campaign.copy.subhead,
    cta: campaign.copy.cta,
    logoUrl: resolved.logoUrl,
    lineArtUrl: resolved.lineArtUrl,
    coloredUrl: resolved.coloredUrl,
    brollUrls: resolved.brollUrls,
    musicUrl: resolved.musicUrl,
    transitionSfxUrl: resolved.transitionSfxUrl,
    scenes: campaign.video.scenes,
  };

  console.log(`   assets:`, {
    broll: Object.keys(resolved.brollUrls).length,
    music: !!resolved.musicUrl,
    colored: !!resolved.coloredUrl,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'AdVideo',
    inputProps,
    timeoutInMilliseconds: 120_000,
  });

  const outputPath = resolve(WEB_PUBLIC, 'ads', `${campaign.id}--video.mp4`);
  console.log(`   rendering → ${outputPath}`);
  const started = Date.now();

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    timeoutInMilliseconds: 180_000,
    onBrowserLog: ({ type, text }) => {
      if (type === 'error' || type === 'warning') {
        console.log(`   [remotion-browser:${type}] ${text}`);
      }
    },
  });

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`✅ ${campaign.id}: rendered in ${seconds}s`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const only = [...args].find((a) => a.startsWith('--only='))?.slice(7);

  const targets = only ? campaigns.filter((c) => c.id === only) : campaigns;
  if (only && targets.length === 0) {
    console.error(`❌ --only=${only} matched no campaign`);
    process.exit(1);
  }

  await mkdir(resolve(WEB_PUBLIC, 'ads'), { recursive: true });

  const assets = await loadAssets();

  console.log('📦 bundling Remotion…');
  const bundleStarted = Date.now();
  const bundleLocation = await bundle({
    entryPoint: WORKER_ENTRY,
    publicDir: WORKER_PUBLIC,
  });
  const bundleSeconds = ((Date.now() - bundleStarted) / 1000).toFixed(1);
  console.log(`✅ bundled at ${bundleLocation} in ${bundleSeconds}s`);

  for (const campaign of targets) {
    try {
      await renderOne(campaign, assets, bundleLocation);
    } catch (err) {
      console.error(`❌ ${campaign.id}:`, err);
    }
  }

  console.log('\n📁 Output: apps/chunky-crayon-web/public/ads/*--video.mp4');
}

main().catch((err) => {
  console.error('❌ render-ad-videos failed:', err);
  process.exit(1);
});
