#!/usr/bin/env tsx

/**
 * Render all (or one) ad video campaigns via Remotion.
 *
 * Reads FOUR sources — all driven by campaigns.ts:
 *   - ad-assets.json       (coloring pages, from generate-ad-assets.ts)
 *   - broll-assets.json    (Seedance clips,  from generate-broll.ts)
 *   - test-clips/music/    (ElevenLabs mp3s, from generate-ad-music.ts)
 *   - R2 licensed SFX pool (via lib/ads/sfx.ts)
 *
 * NO hardcoded scene → clip mapping. Each scene in campaigns.ts with
 * kind:'broll' carries its own BrollSpec.stableId; we look the clip up
 * by that id in broll-assets.json.
 *
 * Review gate: by default, refuses to render any campaign whose b-roll
 * hasn't been approved via scripts/review-broll.ts. Rejected clips fail
 * hard. Pass --allow-pending to override for dev/debug renders (never
 * for real ads).
 *
 * Usage:
 *   pnpm tsx scripts/render-ad-videos.ts
 *   pnpm tsx scripts/render-ad-videos.ts --only=impossible-request-trex
 *   pnpm tsx scripts/render-ad-videos.ts --allow-pending   # dev only
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
import { getAllTransitionSfx } from '../lib/ads/sfx';
import type { AdAsset, BrollAsset, Campaign } from '../lib/ads/schema';

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
const BROLL_ASSETS_JSON = resolve(__dirname, '..', 'broll-assets.json');
const TEST_CLIPS = resolve(__dirname, '..', 'test-clips');

async function loadAssets(): Promise<AdAsset[]> {
  const raw = await readFile(ASSET_JSON, 'utf8');
  return JSON.parse(raw) as AdAsset[];
}

async function loadBrollAssets(): Promise<BrollAsset[]> {
  try {
    return JSON.parse(
      await readFile(BROLL_ASSETS_JSON, 'utf8'),
    ) as BrollAsset[];
  } catch {
    return [];
  }
}

type ResolvedAssets = {
  logoUrl: string;
  lineArtUrl: string;
  coloredUrl?: string;
  brollUrls: Record<number, string>;
  musicUrl: string;
  /** One URL per scene boundary, randomly picked from the R2 pool. */
  transitionSfxUrls?: string[];
};

async function resolveAssets(
  campaign: Campaign,
  assets: AdAsset[],
  brollAssets: BrollAsset[],
  bundleLocation: string,
  allowPending: boolean,
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

  // Resolve each broll scene's clip by its stableId → broll-assets.json
  // entry → local test-clips/<stableId>/clip.mp4. No hardcoded mapping.
  const brollByStableId = new Map(brollAssets.map((b) => [b.stableId, b]));
  const brollUrls: Record<number, string> = {};
  if (campaign.video) {
    for (let i = 0; i < campaign.video.scenes.length; i += 1) {
      const scene = campaign.video.scenes[i];
      if (scene.kind !== 'broll' || !scene.broll) continue;
      const stableId = scene.broll.stableId;
      const brollAsset = brollByStableId.get(stableId);
      if (!brollAsset) {
        throw new Error(
          `[${campaign.id}] scene ${i} requires broll "${stableId}" — run generate-broll.ts --only=${stableId}`,
        );
      }
      if (brollAsset.reviewStatus === 'rejected') {
        throw new Error(
          `[${campaign.id}] broll "${stableId}" was rejected in review — regenerate via review-broll.ts (press r) before rendering`,
        );
      }
      if (brollAsset.reviewStatus !== 'approved' && !allowPending) {
        throw new Error(
          `[${campaign.id}] broll "${stableId}" is ${brollAsset.reviewStatus} — run review-broll.ts to approve, or pass --allow-pending to override (not for real ads)`,
        );
      }
      const src = resolve(TEST_CLIPS, stableId, 'clip.mp4');
      if (!existsSync(src)) {
        throw new Error(
          `[${campaign.id}] broll "${stableId}" is in broll-assets.json but clip.mp4 missing at ${src}`,
        );
      }
      const stagedName = `${campaign.id}--scene-${i}.mp4`;
      await copyFile(src, resolve(bundleStaging, stagedName));
      brollUrls[i] = `/ad-assets/${stagedName}`;
    }
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

  // Transition SFX — pull directly from R2 (public HTTPS), no staging
  // needed. Pick one random URL per scene boundary so back-to-back
  // transitions sound varied.
  const pool = getAllTransitionSfx();
  const numBoundaries = campaign.video ? campaign.video.scenes.length - 1 : 0;
  let transitionSfxUrls: string[] | undefined;
  if (pool.length > 0 && numBoundaries > 0) {
    transitionSfxUrls = Array.from(
      { length: numBoundaries },
      () => pool[Math.floor(Math.random() * pool.length)],
    );
  }

  return {
    logoUrl: '/ad-assets/cc-logo-no-bg.svg',
    lineArtUrl: asset.url,
    coloredUrl: asset.coloredUrl,
    brollUrls,
    musicUrl: `/ad-assets/${musicStaged}`,
    transitionSfxUrls,
  };
}

// Per-platform formats. Same scenes, different canvas dimensions.
//   stories   → 1080x1920 (9:16). Default. Stories, Reels, TikTok, Pinterest video pin.
//   meta-feed → 1080x1350 (4:5). Mandatory for Meta Mobile Feed / IG Feed /
//               Explore / Profile Feed — those placements mask 9:16 video,
//               cropping the top + bottom 12% (kills the headline + URL).
const VIDEO_FORMATS = [
  {
    key: 'stories' as const,
    compositionId: 'AdVideo',
    suffix: '--video.mp4',
    label: 'Stories 9:16',
  },
  {
    key: 'meta-feed' as const,
    compositionId: 'AdVideoMetaFeed',
    suffix: '--video-meta.mp4',
    label: 'Meta Feed 4:5',
  },
];

async function renderOne(
  campaign: Campaign,
  assets: AdAsset[],
  brollAssets: BrollAsset[],
  bundleLocation: string,
  allowPending: boolean,
) {
  if (!campaign.video) {
    console.log(`⏭️  ${campaign.id}: no video config, skipping`);
    return;
  }

  console.log(`\n🎬 ${campaign.id}: staging assets into bundle…`);
  const resolved = await resolveAssets(
    campaign,
    assets,
    brollAssets,
    bundleLocation,
    allowPending,
  );

  console.log(`   assets:`, {
    broll: Object.keys(resolved.brollUrls).length,
    music: !!resolved.musicUrl,
    colored: !!resolved.coloredUrl,
    transitionSfx: resolved.transitionSfxUrls?.length ?? 0,
  });
  if (resolved.transitionSfxUrls?.length) {
    console.log(`   sfx urls:`, resolved.transitionSfxUrls);
  }

  for (const format of VIDEO_FORMATS) {
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
      transitionSfxUrls: resolved.transitionSfxUrls,
      scenes: campaign.video.scenes,
      // Routes scene components to size proportionally for this canvas.
      format: format.key,
    };

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: format.compositionId,
      inputProps,
      timeoutInMilliseconds: 120_000,
    });

    const outputPath = resolve(
      WEB_PUBLIC,
      'ads',
      `${campaign.id}${format.suffix}`,
    );
    console.log(`   📐 ${format.label} → ${outputPath}`);
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
    console.log(`   ✅ ${format.label} rendered in ${seconds}s`);
  }

  console.log(`✅ ${campaign.id}: all formats rendered`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const only = [...args].find((a) => a.startsWith('--only='))?.slice(7);
  const allowPending = args.has('--allow-pending');

  const targets = only ? campaigns.filter((c) => c.id === only) : campaigns;
  if (only && targets.length === 0) {
    console.error(`❌ --only=${only} matched no campaign`);
    process.exit(1);
  }

  await mkdir(resolve(WEB_PUBLIC, 'ads'), { recursive: true });

  const [assets, brollAssets] = await Promise.all([
    loadAssets(),
    loadBrollAssets(),
  ]);

  console.log('📦 bundling Remotion…');
  const bundleStarted = Date.now();
  const bundleLocation = await bundle({
    entryPoint: WORKER_ENTRY,
    publicDir: WORKER_PUBLIC,
    // packages/canvas emits ESM without .js extensions on its internal
    // imports. Node + Next can resolve those, but Remotion's webpack runs
    // with `fullySpecified: true` (strict ESM) and rejects them. Setting
    // resolve.fullySpecified = false on .js files restores the lenient
    // behaviour without needing to rewrite every import in the package.
    webpackOverride: (current) => ({
      ...current,
      module: {
        ...current.module,
        rules: [
          ...(current.module?.rules ?? []),
          {
            test: /\.m?js$/,
            resolve: { fullySpecified: false },
          },
        ],
      },
    }),
  });
  const bundleSeconds = ((Date.now() - bundleStarted) / 1000).toFixed(1);
  console.log(`✅ bundled at ${bundleLocation} in ${bundleSeconds}s`);

  if (allowPending) {
    console.log(
      '⚠️  --allow-pending set: will render with pending/unreviewed broll. Not for real ads.',
    );
  }

  for (const campaign of targets) {
    try {
      await renderOne(
        campaign,
        assets,
        brollAssets,
        bundleLocation,
        allowPending,
      );
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
