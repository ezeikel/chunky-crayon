#!/usr/bin/env tsx

/**
 * Generate ad-video sound effects via ElevenLabs /v1/sound-generation.
 *
 * Today: one short "soft page turn / crayon tap" whoosh reused for every
 * scene transition, mirroring the PTP pattern (one shared whoosh). The
 * Remotion composition drops this at each scene boundary via `<Sequence
 * from={...}><Audio /></Sequence>`.
 *
 * TODO: once we have an Epidemic Sound subscription, replace this with
 * curated licensed whooshes in R2 at social/sfx/transition/*.mp3, matching
 * parking-ticket-pal/apps/web/lib/music.ts. AI-generated SFX is fine for
 * v1 but library SFX is more consistent.
 *
 * Usage:
 *   pnpm tsx scripts/generate-ad-sfx.ts
 *   pnpm tsx scripts/generate-ad-sfx.ts --force
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir, stat } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

import { generateSoundEffect } from '../lib/elevenlabs';

type SfxSpec = {
  filename: string;
  prompt: string;
  durationSeconds: number;
};

const SFX_SPECS: SfxSpec[] = [
  {
    filename: 'transition-whoosh.mp3',
    prompt:
      'soft paper page turning whoosh, gentle crayon tap on paper, warm short transition swoosh, playful kids book sound, one second',
    durationSeconds: 1,
  },
];

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
  const force = args.has('--force');

  const outDir = resolve(__dirname, '..', 'test-clips', 'sfx');
  await mkdir(outDir, { recursive: true });

  for (const spec of SFX_SPECS) {
    const outPath = resolve(outDir, spec.filename);
    if (!force && (await fileExists(outPath))) {
      console.log(`⏭️  ${spec.filename}: already generated (--force to regen)`);
      continue;
    }
    console.log(`🔊 ${spec.filename}: "${spec.prompt.slice(0, 60)}…"`);
    const started = Date.now();
    const buffer = await generateSoundEffect(spec.prompt, spec.durationSeconds);
    await writeFile(outPath, buffer);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `✅ ${spec.filename}: ${seconds}s (${(buffer.length / 1024).toFixed(0)}KB) → ${outPath}`,
    );
  }
}

main().catch((err) => {
  console.error('❌ generate-ad-sfx failed:', err);
  process.exit(1);
});
