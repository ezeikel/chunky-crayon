#!/usr/bin/env tsx

/**
 * Generate 15s instrumental music tracks per ad campaign via ElevenLabs
 * /v1/music. Reads video.music.prompt from campaigns.ts, saves MP3s to
 * test-clips/music/<campaign-id>.mp3.
 *
 * Usage:
 *   pnpm tsx scripts/generate-ad-music.ts
 *   pnpm tsx scripts/generate-ad-music.ts --only=<campaign-id>
 *   pnpm tsx scripts/generate-ad-music.ts --force
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir, stat } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

import { campaigns } from '../lib/ads/campaigns';

async function generateMusic(
  prompt: string,
  durationMs: number,
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not configured');

  const res = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: durationMs,
      force_instrumental: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `ElevenLabs music generation failed (${res.status}): ${err}`,
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const only = [...args].find((a) => a.startsWith('--only='))?.slice(7);
  const force = args.has('--force');

  const outDir = resolve(__dirname, '..', 'test-clips', 'music');
  await mkdir(outDir, { recursive: true });

  const targets = only
    ? campaigns.filter((c) => c.id === only)
    : campaigns.filter((c) => c.video?.music);

  if (only && targets.length === 0) {
    console.error(`❌ --only=${only} matched no campaign`);
    process.exit(1);
  }

  for (const campaign of targets) {
    if (!campaign.video?.music) {
      console.log(`⏭️  ${campaign.id}: no video.music config, skipping`);
      continue;
    }

    const outPath = resolve(outDir, `${campaign.id}.mp3`);

    if (!force && (await fileExists(outPath))) {
      console.log(
        `⏭️  ${campaign.id}: already generated at ${outPath} (--force to regenerate)`,
      );
      continue;
    }

    const { prompt, durationSeconds } = campaign.video.music;
    console.log(`🎵 ${campaign.id}: generating ${durationSeconds}s track…`);
    const started = Date.now();
    const buffer = await generateMusic(prompt, durationSeconds * 1000);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    await writeFile(outPath, buffer);
    console.log(
      `✅ ${campaign.id}: done in ${seconds}s (${(buffer.length / 1024).toFixed(0)}KB) → ${outPath}`,
    );
  }
}

main().catch((err) => {
  console.error('❌ generate-ad-music failed:', err);
  process.exit(1);
});
