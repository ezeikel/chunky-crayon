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
  /** Nano Banana prompt for the START frame. */
  stillPrompt: string;
  /**
   * Optional Nano Banana prompt for a separate END frame. When set, Seedance
   * interpolates from the start still TO this end still — so the change
   * (e.g. colour being added) persists across the clip instead of flickering.
   * When unset and lockEnd !== false, end_image_url is locked to the start
   * still (no drift, but transient changes).
   */
  endStillPrompt?: string;
  /** Seedance motion prompt describing what should move. */
  motionPrompt: string;
  /** "auto" | "4" .. "15" seconds. */
  duration?: '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'auto';
  /** "480p" | "720p" | "1080p" */
  resolution?: '480p' | '720p' | '1080p';
  /** Default 9:16 vertical. */
  aspectRatio?: '9:16' | '1:1' | '16:9';
  /**
   * Lock end_image_url to the same start still when endStillPrompt is not
   * set. Default true. Ignored when endStillPrompt is provided.
   */
  lockEnd?: boolean;
};

const TREX_ASSET_URL =
  'https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev/uploads/coloring-images/cmo8hw3o40000z36l46efmnwe/image.webp';
const DRAGON_ASSET_URL =
  'https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev/uploads/coloring-images/cmo8hypn80002z36lrab18enu/image.webp';

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

  // Ad 3 b-roll: kid colours the dragon page with an orange crayon.
  // Same pattern as trex-colouring-motion, different asset + different
  // colour stroke. Dragon body shape is a bigger fill target than a
  // star so motion should be more visible.
  'dragon-colouring-motion': {
    name: 'dragon-colouring-motion',
    referenceImageUrl: DRAGON_ASSET_URL,
    stillPrompt:
      "Photorealistic three-quarter shot, 9:16 vertical portrait, shot on a Fujifilm X-T5 with a 35mm lens. A wooden table with a printed black-and-white children's coloring page placed flat in frame. The page shows the cartoon dragon and bunny tea-party illustration provided in the reference image — reproduce it exactly. A small child's hand (age 4-5) holding a single orange wax crayon rests over the dragon's body, mid-colouring, having just started adding orange colour to the dragon's belly area. A couple of other crayons scattered on the table. Warm natural morning window light, cozy home scene, shallow depth of field with soft bokeh. No text anywhere in the image. No faces visible.",
    motionPrompt:
      "The child's hand colours in part of the dragon's body with the orange crayon, moving the crayon in short visible back-and-forth strokes. The dragon's belly area visibly fills with orange colour across the five seconds. The hand moves naturally. The coloring page stays in place. The camera stays completely still. The dragon illustration does not morph or change.",
  },

  // Ad 1 b-roll (v2): same scene as trex-colouring-motion but with a separate
  // END frame showing the star fully coloured in. Seedance interpolates
  // start → end so the colour persists instead of appearing-and-disappearing.
  'trex-colouring-motion-v2': {
    name: 'trex-colouring-motion-v2',
    referenceImageUrl: TREX_ASSET_URL,
    stillPrompt:
      "Photorealistic overhead shot, 9:16 vertical portrait, shot on a Fujifilm X-T5 with a 35mm lens. A wooden table with a printed black-and-white children's coloring page placed flat in the centre of frame. The page shows the cartoon T-rex illustration provided in the reference image — reproduce it exactly. A small child's hand (age 4-5) holding a single red wax crayon hovers above a small uncoloured star in the bottom-right of the page, about to start colouring. Warm natural morning window light from the left, cozy home scene, shallow depth of field with soft bokeh. No text anywhere in the image. No faces visible.",
    endStillPrompt:
      'The second reference image shows the start frame of a video. Reproduce it EXACTLY — same camera angle, same wooden table, same window light from the left, same page position, same hand pose, same scattered crayons, same background. The ONLY difference: the small uncoloured star in the bottom-right of the T-rex coloring page is now FULLY COLOURED IN with bright red wax crayon — visible crayon strokes, slightly imperfect like a young child did it. Nothing else changes. No additional stars coloured. No new objects. No faces visible.',
    motionPrompt:
      "The child's hand colours in the small star with the red crayon using short visible back-and-forth strokes. Red colour fills the star progressively across the five seconds and remains filled at the end. The hand moves naturally. The page and the T-rex illustration stay fixed. The camera does not move.",
  },

  // Ad 3 b-roll (v2): dragon version with persistent orange fill.
  'dragon-colouring-motion-v2': {
    name: 'dragon-colouring-motion-v2',
    referenceImageUrl: DRAGON_ASSET_URL,
    stillPrompt:
      "Photorealistic three-quarter shot, 9:16 vertical portrait, shot on a Fujifilm X-T5 with a 35mm lens. A wooden table with a printed black-and-white children's coloring page. The page shows the cartoon dragon and bunny tea-party illustration provided in the reference image — reproduce it exactly. A small child's hand (age 4-5) holds an orange wax crayon just above the dragon's belly area, about to start colouring. A couple of other crayons scattered on the table. Warm natural morning window light through a window, cozy home scene, shallow depth of field with soft bokeh. No text anywhere. No faces visible.",
    endStillPrompt:
      "Photorealistic three-quarter shot, 9:16 vertical portrait. The SAME printed dragon coloring page in the SAME position — reproduce the page exactly. The dragon's belly area, previously uncoloured, is now FULLY COLOURED IN with bright orange wax crayon, visible crayon texture, slightly imperfect like a young child did it. The rest of the dragon's body is still uncoloured. The child's hand (age 4-5) now rests near the belly holding the orange crayon, about to lift it away. Warm morning window light, cozy home scene, shallow depth of field. No text. No faces.",
    motionPrompt:
      "The child's hand colours in the dragon's belly with the orange crayon using short visible back-and-forth strokes. Orange colour fills the belly progressively across the five seconds and remains filled at the end. The hand moves naturally. The page and the dragon illustration stay fixed. The camera does not move.",
  },
};

// =============================================================================
// Pipeline
// =============================================================================

async function generateStill(
  cfg: ClipConfig,
  outDir: string,
  prompt: string,
  label: 'start' | 'end',
  startStillUrlForConsistency?: string,
) {
  console.log(`🖼  Nano Banana Pro: generating ${label} still…`);
  const started = Date.now();

  const messageContent: Array<
    { type: 'text'; text: string } | { type: 'image'; image: URL }
  > = [{ type: 'text', text: prompt }];

  if (cfg.referenceImageUrl) {
    messageContent.push({
      type: 'image',
      image: new URL(cfg.referenceImageUrl),
    });
  }

  // For the end still, ALSO pass the start still as a second reference so
  // Nano Banana keeps the same camera angle, lighting, table, hand pose,
  // and background. Without this the two stills drift and Seedance has to
  // interpolate between completely different compositions.
  if (label === 'end' && startStillUrlForConsistency) {
    messageContent.push({
      type: 'image',
      image: new URL(startStillUrlForConsistency),
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
  if (!file?.base64) throw new Error(`Nano Banana returned no ${label} image`);

  const buffer = Buffer.from(file.base64, 'base64');
  const key = `uploads/ad-video-tests/${cfg.name}-${label}-still-${Date.now()}.png`;
  const { url } = await put(key, buffer, { contentType: 'image/png' });

  await writeFile(resolve(outDir, `${label}-still.png`), buffer);

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`✅ ${label} still in ${seconds}s → ${url}`);
  return { url, generationTimeMs: Date.now() - started };
}

async function generateVideo(
  cfg: ClipConfig,
  startUrl: string,
  endUrl: string | null,
) {
  console.log('🎬 Seedance 2 i2v: animating…');
  const started = Date.now();
  fal.config({ credentials: process.env.FAL_KEY });

  const input: Record<string, unknown> = {
    image_url: startUrl,
    prompt: cfg.motionPrompt,
    resolution: cfg.resolution ?? '720p',
    duration: cfg.duration ?? '5',
    aspect_ratio: cfg.aspectRatio ?? '9:16',
    generate_audio: false,
  };
  // Three modes for the end frame:
  //  1. endStillPrompt set → second Nano Banana still showing completion
  //  2. lockEnd !== false (default) → lock to start (stable, but transient)
  //  3. lockEnd === false → no end lock (motion freer, more drift risk)
  if (endUrl) {
    input.end_image_url = endUrl;
  } else if (cfg.lockEnd !== false) {
    input.end_image_url = startUrl;
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

  const startStill = await generateStill(cfg, outDir, cfg.stillPrompt, 'start');
  const endStill = cfg.endStillPrompt
    ? await generateStill(
        cfg,
        outDir,
        cfg.endStillPrompt,
        'end',
        startStill.url,
      )
    : null;

  const video = await generateVideo(cfg, startStill.url, endStill?.url ?? null);
  const localPath = await downloadVideo(video.url, outDir);
  const framesDir = extractFrames(localPath, outDir);

  const metadata = {
    config: cfg,
    startStill: {
      url: startStill.url,
      generationTimeMs: startStill.generationTimeMs,
    },
    endStill: endStill
      ? { url: endStill.url, generationTimeMs: endStill.generationTimeMs }
      : null,
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
