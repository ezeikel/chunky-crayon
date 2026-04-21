#!/usr/bin/env tsx

/**
 * Generate + review a single Nano Banana Pro still → Seedance 2 i2v clip.
 *
 * Pipeline:
 *   1. Nano Banana Pro generates a photoreal still from a prompt + optional
 *      reference image (one of our coloring pages). Uploads to R2.
 *   2. Seedance 2 image-to-video animates the still with a motion prompt.
 *      `end_image_url` is locked to the same still to bound drift.
 *   3. Downloads the MP4 to test-clips/<name>/clip.mp4.
 *   4. ffmpeg extracts 5 per-second frames + 10 half-second frames so the
 *      clip can be reviewed via `Read` without opening the video.
 *   5. Writes metadata.json with prompts, URLs, and timings.
 *
 * This is a building block for phase 2 — we'll drive it from campaigns.ts
 * video scene definitions once we commit to the aesthetic.
 *
 * Usage:
 *   pnpm tsx scripts/generate-video-clip.ts <config-key>
 *
 *   Configs live in the CLIPS map below — add one entry per experiment.
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '..', '.env.local') });

import { put } from '@one-colored-pixel/storage';
import { fal } from '@fal-ai/client';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

// =============================================================================
// Clip configs — one per experiment
// =============================================================================

type ClipConfig = {
  /** Output folder name under test-clips/ */
  name: string;
  /** Our coloring page URL used as reference for Nano Banana. Empty = none. */
  referenceImageUrl?: string;
  /** Nano Banana prompt for the still frame. */
  stillPrompt: string;
  /** Seedance motion prompt describing what should move. */
  motionPrompt: string;
  /** "auto" | "4" .. "15" seconds. */
  duration?: '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'auto';
  /** "480p" | "720p" | "1080p" */
  resolution?: '480p' | '720p' | '1080p';
  /** Default 9:16 vertical. */
  aspectRatio?: '9:16' | '1:1' | '16:9';
  /**
   * Lock end_image_url to the same still so Seedance interpolates between
   * identical frames. Bounds drift. Default true.
   */
  lockEnd?: boolean;
};

const TREX_ASSET_URL =
  'https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev/uploads/coloring-images/cmo8hw3o40000z36l46efmnwe/image.webp';

const CLIPS: Record<string, ClipConfig> = {
  // Clip 1: the test we already ran — subtle motion, end-locked. Kept for
  // reproducibility.
  'trex-subtle': {
    name: 'trex-subtle',
    referenceImageUrl: TREX_ASSET_URL,
    stillPrompt:
      "Photorealistic overhead shot, 9:16 vertical portrait, shot on a Fujifilm X-T5 with a 35mm lens. A wooden table with a printed black-and-white children's coloring page placed flat in the centre of frame. The page shows the cartoon T-rex illustration provided in the reference image — reproduce it exactly. A small child's hand (age 4-5) holding a single red wax crayon rests on the lower-right corner of the page, mid-colouring, having just added red colour to one of the small stars in the bottom right. Warm natural morning window light from the left, cozy home scene, shallow depth of field with soft bokeh. No text anywhere in the image. No faces visible. Natural, unposed, candid feel.",
    motionPrompt:
      "The child's hand slowly moves the red crayon across the small star, gently colouring it in. Only the hand and the crayon move. The camera stays completely still. The coloring page stays exactly fixed.",
  },

  // Clip 2: same still source, looser motion — tests drift ceiling.
  'trex-colouring-motion': {
    name: 'trex-colouring-motion',
    referenceImageUrl: TREX_ASSET_URL,
    stillPrompt:
      "Photorealistic overhead shot, 9:16 vertical portrait, shot on a Fujifilm X-T5 with a 35mm lens. A wooden table with a printed black-and-white children's coloring page placed flat in the centre of frame. The page shows the cartoon T-rex illustration provided in the reference image — reproduce it exactly. A small child's hand (age 4-5) holding a single red wax crayon hovers above an uncolored star on the page, about to start colouring. Warm natural morning window light from the left, cozy home scene, shallow depth of field with soft bokeh. No text anywhere in the image. No faces visible.",
    motionPrompt:
      "The child's hand firmly colours in the small star with the red crayon, moving the crayon back and forth in short visible strokes. The star visibly fills with red colour across the five seconds. The hand moves naturally. The coloring page stays in place. The camera stays still.",
  },
};

// =============================================================================
// Pipeline
// =============================================================================

async function generateStill(cfg: ClipConfig, outDir: string) {
  console.log('🖼  Nano Banana Pro: generating still…');
  const started = Date.now();

  const messageContent: Array<
    { type: 'text'; text: string } | { type: 'image'; image: URL }
  > = [{ type: 'text', text: cfg.stillPrompt }];

  if (cfg.referenceImageUrl) {
    messageContent.push({
      type: 'image',
      image: new URL(cfg.referenceImageUrl),
    });
  }

  const result = await generateText({
    model: google('gemini-3-pro-image-preview'),
    messages: [{ role: 'user', content: messageContent }],
    providerOptions: {
      google: { responseModalities: ['TEXT', 'IMAGE'] },
    },
  });

  const file = result.files?.find((f) => f.mediaType?.startsWith('image/'));
  if (!file?.base64) throw new Error('Nano Banana returned no image');

  const buffer = Buffer.from(file.base64, 'base64');
  const key = `uploads/ad-video-tests/${cfg.name}-still-${Date.now()}.png`;
  const { url } = await put(key, buffer, { contentType: 'image/png' });

  await writeFile(resolve(outDir, 'still.png'), buffer);

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`✅ still generated in ${seconds}s → ${url}`);
  return { url, generationTimeMs: Date.now() - started };
}

async function generateVideo(cfg: ClipConfig, stillUrl: string) {
  console.log('🎬 Seedance 2 i2v: animating…');
  const started = Date.now();
  fal.config({ credentials: process.env.FAL_KEY });

  const input: Record<string, unknown> = {
    image_url: stillUrl,
    prompt: cfg.motionPrompt,
    resolution: cfg.resolution ?? '720p',
    duration: cfg.duration ?? '5',
    aspect_ratio: cfg.aspectRatio ?? '9:16',
    generate_audio: false,
  };
  if (cfg.lockEnd !== false) {
    input.end_image_url = stillUrl;
  }

  const result = await fal.subscribe('bytedance/seedance-2.0/image-to-video', {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        const lastMsg = update.logs?.[update.logs.length - 1]?.message;
        if (lastMsg) console.log(`   · ${lastMsg}`);
      }
    },
  });

  const videoUrl = (result.data as { video?: { url?: string } })?.video?.url;
  if (!videoUrl) {
    throw new Error(
      `Seedance returned no video — ${JSON.stringify(result.data)}`,
    );
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`✅ video generated in ${seconds}s → ${videoUrl}`);
  return { url: videoUrl, generationTimeMs: Date.now() - started };
}

async function downloadVideo(videoUrl: string, outDir: string) {
  const localPath = resolve(outDir, 'clip.mp4');
  const res = await fetch(videoUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(localPath, buffer);
  console.log(`💾 saved clip to ${localPath}`);
  return localPath;
}

function extractFrames(clipPath: string, outDir: string) {
  const framesDir = resolve(outDir, 'frames');
  execSync(`mkdir -p "${framesDir}"`);
  execSync(`find "${framesDir}" -name "*.jpg" -delete`);

  console.log('🔍 extracting frames via ffmpeg…');

  // 1 frame per second (f-01 … f-05 for a 5s clip)
  execSync(
    `ffmpeg -loglevel error -i "${clipPath}" -vf "fps=1" -q:v 2 "${framesDir}/f-%02d.jpg"`,
  );

  // Half-second frames — assumes 24fps clip, picks frames 12, 24, 36, ...
  // up to 120 (5s). This gives 10 extra samples for finer-grained review.
  const halfSelectors = Array.from(
    { length: 10 },
    (_, i) => `eq(n,${(i + 1) * 12})`,
  ).join('+');
  execSync(
    `ffmpeg -loglevel error -i "${clipPath}" -vf "select='${halfSelectors}'" -vsync 0 -q:v 2 "${framesDir}/h-%02d.jpg"`,
  );

  console.log(`✅ frames extracted to ${framesDir}`);
  return framesDir;
}

async function main() {
  const configKey = process.argv[2];
  if (!configKey) {
    console.error(
      `❌ usage: pnpm tsx scripts/generate-video-clip.ts <config-key>`,
    );
    console.error(`   Available: ${Object.keys(CLIPS).join(', ')}`);
    process.exit(1);
  }
  const cfg = CLIPS[configKey];
  if (!cfg) {
    console.error(`❌ unknown config "${configKey}"`);
    console.error(`   Available: ${Object.keys(CLIPS).join(', ')}`);
    process.exit(1);
  }

  if (!process.env.FAL_KEY) throw new Error('FAL_KEY missing');
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY missing');
  }

  const outDir = resolve(__dirname, '..', 'test-clips', cfg.name);
  await mkdir(outDir, { recursive: true });

  const still = await generateStill(cfg, outDir);
  const video = await generateVideo(cfg, still.url);
  const localPath = await downloadVideo(video.url, outDir);
  const framesDir = extractFrames(localPath, outDir);

  const metadata = {
    config: cfg,
    still: { url: still.url, generationTimeMs: still.generationTimeMs },
    video: { url: video.url, generationTimeMs: video.generationTimeMs },
    local: { clip: localPath, frames: framesDir },
    generatedAt: new Date().toISOString(),
  };

  await writeFile(
    resolve(outDir, 'metadata.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );

  console.log('\n—— DONE ——');
  console.log(`folder: ${outDir}`);
  console.log(`frames: ${framesDir}`);
  console.log(`open clip:  open ${localPath}`);
}

main().catch((err) => {
  console.error('❌ generate-video-clip failed:', err);
  process.exit(1);
});
