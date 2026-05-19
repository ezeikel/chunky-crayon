/**
 * generate-sfx.ts — Generate Chunky Crayon sound effects via ElevenLabs
 * Text to Sound Effects API (eleven_text_to_sound_v2).
 *
 * Prompts follow ElevenLabs 2025 best practice: short descriptive prose with
 * concrete physical/contextual cues + explicit kid-friendly tone, NOT vague
 * comma-tag chains. UI sounds use high prompt_influence (tight, repeatable);
 * looping brush textures use lower prompt_influence (organic) + loop:true.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... npx tsx scripts/generate-sfx.ts            # all
 *   ELEVENLABS_API_KEY=... npx tsx scripts/generate-sfx.ts undo redo  # subset
 *   ELEVENLABS_API_KEY=... npx tsx scripts/generate-sfx.ts --brush    # brushes only
 *   ELEVENLABS_API_KEY=... npx tsx scripts/generate-sfx.ts --ui       # UI only
 *
 * Output:
 *   UI sounds   -> public/audio/<name>.mp3
 *   Brush loops -> public/audio/brush/<name>.mp3
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const API_URL = 'https://api.elevenlabs.io/v1/sound-generation';
const MODEL_ID = 'eleven_text_to_sound_v2';
const OUTPUT_FORMAT = 'mp3_44100_128';

const PUBLIC_AUDIO = join(__dirname, '..', 'public', 'audio');
const PUBLIC_BRUSH = join(PUBLIC_AUDIO, 'brush');

type SfxSpec = {
  name: string;
  kind: 'ui' | 'brush';
  prompt: string;
  durationSeconds: number;
  promptInfluence: number;
  loop: boolean;
};

// UI sounds we are (re)generating this round: undo, redo, sparkle, save, error.
// tap/pop/draw/fill are intentionally NOT here — kept as-is per product call.
const UI_SOUNDS: SfxSpec[] = [
  {
    name: 'undo',
    kind: 'ui',
    prompt:
      'Soft kid-friendly UI undo whoosh, a very short gentle swipe of air like a colored line being lifted off the page, playful and light, quick downward motion, no sharp high frequencies, no clicks or pops, clean close-mic foley, high-quality studio recording, neutral background.',
    durationSeconds: 0.5,
    promptInfluence: 0.75,
    loop: false,
  },
  {
    name: 'redo',
    kind: 'ui',
    prompt:
      'Soft kid-friendly UI redo whoosh, a very short gentle upward swipe of air like a colored line returning to the page, playful and bright but not sharp, quick rising motion, no clicks or pops, clean close-mic foley, high-quality studio recording, neutral background.',
    durationSeconds: 0.5,
    promptInfluence: 0.75,
    loop: false,
  },
  {
    name: 'sparkle',
    kind: 'ui',
    prompt:
      'Gentle magical sparkle for a children coloring app, a soft shimmer of tiny twinkling bell-like tones rising upward, warm and delightful like fairy dust, friendly and reassuring, no harsh transients, rounded soft highs, clean studio recording, neutral background.',
    durationSeconds: 1.2,
    promptInfluence: 0.7,
    loop: false,
  },
  {
    name: 'save',
    kind: 'ui',
    prompt:
      'Cheerful success chime for a children coloring app, a soft two-note upward chime in a major key, friendly and rewarding like finishing a drawing, warm and rounded toy-like tone, not loud, no harsh beeps, clean studio recording, neutral background.',
    durationSeconds: 1.0,
    promptInfluence: 0.8,
    loop: false,
  },
  {
    name: 'error',
    kind: 'ui',
    prompt:
      'Gentle non-scary error tone for a children coloring app, a soft two-note downward chime in a major key, friendly and reassuring, not alarming, toy-like as if from a soft plastic kids toy, no buzzer or harsh beeps, rounded warm tone, very short, clean studio recording, no background noise.',
    durationSeconds: 0.7,
    promptInfluence: 0.82,
    loop: false,
  },
];

// 9 brush loop textures. loop:true + lower prompt_influence for organic feel.
const BRUSH_SOUNDS: SfxSpec[] = [
  {
    name: 'crayon',
    kind: 'brush',
    prompt:
      'Seamless looping waxy crayon on paper texture, close-up foley of a small child coloring with a soft wax crayon on slightly rough paper, gentle steady mid-tempo scribbling with subtle natural variation, warm and soft, no squeaks, no taps, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 6,
    promptInfluence: 0.45,
    loop: true,
  },
  {
    name: 'marker',
    kind: 'brush',
    prompt:
      'Seamless looping felt-tip marker on paper texture, close-up foley of a marker gliding smoothly with soft wet ink flow as a child colors, fluid and slightly squeaky but gentle, steady mid-tempo motion, no harsh highs, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 6,
    promptInfluence: 0.45,
    loop: true,
  },
  {
    name: 'eraser',
    kind: 'brush',
    prompt:
      'Seamless looping soft rubber eraser on paper texture, close-up foley of gently rubbing out pencil marks, light friction with subtle paper grain, quiet and soothing, steady slow back-and-forth motion, no squeaks, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 5,
    promptInfluence: 0.45,
    loop: true,
  },
  {
    name: 'glitter',
    kind: 'brush',
    prompt:
      'Seamless looping glitter shimmer texture for a children coloring app, soft continuous twinkling of tiny crystalline sparkle particles being spread, light ethereal and whimsical, gentle steady shimmer, no harsh transients, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 5,
    promptInfluence: 0.4,
    loop: true,
  },
  {
    name: 'sparkle',
    kind: 'brush',
    prompt:
      'Seamless looping magic wand sparkle texture for kids, soft continuous fairy-dust sprinkle with light bell-like chiming tones, enchanting and dreamy, gentle steady twinkle, warm rounded highs, no harsh transients, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 5,
    promptInfluence: 0.4,
    loop: true,
  },
  {
    name: 'rainbow',
    kind: 'brush',
    prompt:
      'Seamless looping whimsical rainbow brush texture for kids, soft continuous sweeping whoosh of colour with subtle magical dreamy undertones, cheerful and gentle, steady flowing motion, warm and soft, no harsh transients, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 5,
    promptInfluence: 0.4,
    loop: true,
  },
  {
    name: 'glow',
    kind: 'brush',
    prompt:
      'Seamless looping soft glowing light texture for kids, warm continuous gentle humming resonance like a comforting nightlight, soothing and magical, steady calm tone, no harsh transients, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 5,
    promptInfluence: 0.42,
    loop: true,
  },
  {
    name: 'neon',
    kind: 'brush',
    prompt:
      'Seamless looping gentle neon light texture for kids, soft continuous electric hum with light playful crackle like a friendly neon sign, vibrant but not harsh, steady mellow buzz, no sharp transients, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 5,
    promptInfluence: 0.42,
    loop: true,
  },
  {
    name: 'magic-reveal',
    kind: 'brush',
    prompt:
      'Seamless looping magical reveal texture for kids, soft continuous enchanting shimmer of wonder like uncovering hidden treasure, gentle chimes and sparkles, exciting but soothing, steady whimsical tone, no harsh transients, no background room noise, loops seamlessly without clicks at the edges.',
    durationSeconds: 5,
    promptInfluence: 0.4,
    loop: true,
  },
];

const ALL = [...UI_SOUNDS, ...BRUSH_SOUNDS];

async function generateOne(spec: SfxSpec, apiKey: string): Promise<void> {
  const res = await fetch(`${API_URL}?output_format=${OUTPUT_FORMAT}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: spec.prompt,
      model_id: MODEL_ID,
      duration_seconds: spec.durationSeconds,
      prompt_influence: spec.promptInfluence,
      loop: spec.loop,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `[${spec.name}] ElevenLabs ${res.status}: ${err.slice(0, 300)}`,
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const dir = spec.kind === 'brush' ? PUBLIC_BRUSH : PUBLIC_AUDIO;
  await mkdir(dir, { recursive: true });
  const out = join(dir, `${spec.name}.mp3`);
  await writeFile(out, buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(
    `✓ ${spec.kind}/${spec.name}.mp3  ${kb}KB  ` +
      `${spec.durationSeconds}s influence=${spec.promptInfluence} loop=${spec.loop}`,
  );
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');

  const args = process.argv.slice(2);
  let targets: SfxSpec[];
  if (args.includes('--brush')) targets = BRUSH_SOUNDS;
  else if (args.includes('--ui')) targets = UI_SOUNDS;
  else if (args.length > 0) targets = ALL.filter((s) => args.includes(s.name));
  else targets = ALL;

  if (targets.length === 0) {
    console.error(
      'No matching sounds. Names:',
      ALL.map((s) => s.name).join(', '),
    );
    process.exit(1);
  }

  console.log(`Generating ${targets.length} sound(s) via ${MODEL_ID}...\n`);

  // Sequential — ElevenLabs rate limits concurrent sound-generation calls.
  for (const spec of targets) {
    try {
      await generateOne(spec, apiKey);
    } catch (e) {
      console.error(`✗ ${(e as Error).message}`);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
