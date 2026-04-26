#!/usr/bin/env tsx

/**
 * One-off: generate high-quality ElevenLabs music prompts for each ad
 * campaign using the existing `createMusicPrompt` pipeline (Claude +
 * MUSIC_PROMPT_SYSTEM). Prints the results — copy into campaigns.ts
 * video.music.prompt fields.
 *
 * Why: hand-written music prompts violate the rules baked into
 * MUSIC_PROMPT_SYSTEM (generic descriptors instead of specific
 * instruments, no BPM, no key signature, etc.). This script reuses the
 * prompt builder you already have so ad music gets the same care as
 * the coloring-page ambient sound.
 *
 * Usage:
 *   pnpm tsx scripts/generate-ad-music-prompts.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env.local') });

import { createMusicPrompt } from '../lib/audio/prompts';

type MusicSource = {
  id: string;
  title: string;
  description: string;
  tags: string[];
};

// Not scene-of-the-coloring-page — scene-of-the-AD. The ad conveys a
// specific emotional moment, not the literal coloring page.
const SOURCES: MusicSource[] = [
  {
    id: 'impossible-request-trex',
    title: "A parent seeing their kid's wild imagination validated",
    description:
      'A cozy afternoon moment. A child has just asked for a T-rex on a skateboard and got it printed. The feeling is warm surprise, unhurried delight, a tiny victory. Like a soft exhale after a long day. Duration: 15 seconds.',
    tags: ['warm', 'cozy', 'afternoon', 'unhurried', 'tender'],
  },
  {
    id: 'five-pm-rescue-foxes',
    title: "The 5pm 'I'm bored' moment, rescued",
    description:
      "The late-afternoon parent moment: dinner in half an hour, kid asking what to do, rain outside. The feeling is relief-with-a-wink, playful competence, 'it's going to be fine.' A little bounce, a little sparkle. Duration: 15 seconds.",
    tags: ['playful', 'bright', 'peppy', 'reassuring', 'mid-tempo'],
  },
  {
    id: 'dream-it-dragon',
    title: "A kid's imagination becoming real on paper",
    description:
      "The quiet wonder of watching your kid's idea appear as a real drawing, ready to colour. A tea party with a dragon and a bunny. The feeling is gentle magic, storybook hush, imagination meeting paper. Duration: 15 seconds.",
    tags: ['wondrous', 'magical', 'storybook', 'gentle', 'imaginative'],
  },
];

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY missing');
  }

  console.log(
    '🎵 Generating scene-tailored ElevenLabs music prompts for 3 ads…\n',
  );

  for (const src of SOURCES) {
    console.log(`── ${src.id} ──`);
    const started = Date.now();
    const prompt = await createMusicPrompt(
      src.title,
      src.description,
      src.tags,
    );
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`  (${seconds}s)`);
    console.log(`  ${prompt}\n`);
  }

  console.log('📋 Copy these into campaigns.ts video.music.prompt fields.');
}

main().catch((err) => {
  console.error('❌ generate-ad-music-prompts failed:', err);
  process.exit(1);
});
