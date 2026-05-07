/**
 * Spike: comic-strip 2-character pair test.
 *
 * Validates that gpt-image-2 can hold both character identities in a single
 * scene, conditioned on the 4 cast reference images we generated in the
 * previous spike (spike-comic-cast.ts). This is the precondition for moving
 * to full 4-panel strip generation — per the dino-bundle spike, ≤2 heroes
 * per scene is the safe ceiling.
 *
 * Pairs tested:
 *   1. Colo + Pip — both warm-toned, both cylindrical (hardest)
 *   2. Smudge + Sticky — most visually different (easiest)
 *   3. Colo + Smudge — mixed temperature + silhouette (mid)
 *
 * Cost: 3 GPT Image 2 calls × ~$0.08 = ~$0.24
 *
 * Usage: pnpm tsx scripts/spike-comic-pairs.ts
 * Output: scripts/out/spike-comic-pairs/{pair-1,pair-2,pair-3}.png
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';

const MODEL = 'gpt-image-2';
const CAST_DIR = join(__dirname, 'out', 'spike-comic-cast');
const OUT_DIR = join(__dirname, 'out', 'spike-comic-pairs');
const SIZE = '1024x1024' as const;

const STYLE_TAIL = `Match the exact style of the provided reference images: dark brown outlines uniform thick weight, two flat tones per region (no gradients, no shading detail), solid black bean eyes, pink oval cheeks, mitten hands, chunky toddler proportions. Plain pure white background. Both characters fully visible side by side, no overlap, no scenery.`;

type Pair = {
  id: string;
  refs: string[];
  prompt: string;
};

const PAIRS: Pair[] = [
  {
    id: 'pair-1-colo-pip',
    refs: ['colo.png', 'pip.png'],
    prompt: `Two cartoon character friends standing next to each other on a plain white background, both facing the viewer in a relaxed friendly pose. On the LEFT: Colo, an orange crayon character with a paper-wrapper conical tip on top, wavy paper-wrapper band across the body, pink wax exposed at the bottom, mitten arms — one raised in a small wave. On the RIGHT: Pip, a tall slim wooden pencil character in warm yellow with a sharpened dark grey graphite tip on top, cream metal ferrule band near the bottom, pink eraser below the ferrule, mitten arms, ONE small bead of sweat near his temple, slightly worried but kind smile. Pip is roughly the same height as Colo. Both characters fully visible, side by side, not overlapping.\n\n${STYLE_TAIL}`,
  },
  {
    id: 'pair-2-smudge-sticky',
    refs: ['smudge.png', 'sticky.png'],
    prompt: `Two cartoon character friends standing next to each other on a plain white background, both facing the viewer. On the LEFT: Smudge, a round turquoise paint-blob character with a wooden paintbrush handle sticking up from the top ending in droopy cream bristles, eyes squinted shut from grinning, a massive joyful smile, 2-3 small turquoise paint droplets dripping near the feet (mandatory). On the RIGHT: Sticky, a square folded pale-yellow sticky note character with a dog-eared TOP RIGHT corner curled back (mandatory), round black-rimmed glasses (mandatory), small calm flat-line mouth, one mitten arm raised with a finger up as if making a point. Both characters fully visible, side by side, not overlapping.\n\n${STYLE_TAIL}`,
  },
  {
    id: 'pair-3-colo-smudge',
    refs: ['colo.png', 'smudge.png'],
    prompt: `Two cartoon character friends standing next to each other on a plain white background, both facing the viewer. On the LEFT: Colo, an orange crayon character with a paper-wrapper conical tip on top, wavy paper-wrapper band across the body, pink wax exposed at the bottom, mitten arms — one raised in a small wave, friendly open-eyed smile. On the RIGHT: Smudge, a round turquoise paint-blob character with a wooden paintbrush handle sticking up from the top ending in droopy cream bristles, eyes squinted shut from grinning, a massive joyful smile, 2-3 small turquoise paint droplets dripping near the feet (mandatory). Both characters fully visible, side by side, not overlapping.\n\n${STYLE_TAIL}`,
  },
];

function loadAsFile(path: string, name: string): File {
  const buf = readFileSync(path);
  return new File([buf], `${name}.png`, { type: 'image/png' });
}

async function generate(client: OpenAI, pair: Pair): Promise<void> {
  console.log(`[pairs] Generating ${pair.id}...`);
  const start = Date.now();
  const refs = pair.refs.map((f, i) =>
    loadAsFile(join(CAST_DIR, f), `ref-${i}`),
  );
  const result = await client.images.edit({
    model: MODEL,
    image: refs,
    prompt: pair.prompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image returned for ${pair.id}`);
  const path = join(OUT_DIR, `${pair.id}.png`);
  writeFileSync(path, Buffer.from(b64, 'base64'));
  console.log(`[pairs] ${pair.id} done in ${elapsed}s -> ${path}`);
}

async function run() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  mkdirSync(OUT_DIR, { recursive: true });

  const client = new OpenAI();

  for (const pair of PAIRS) {
    await generate(client, pair);
  }
  console.log(`[pairs] All 3 done. Open ${OUT_DIR}`);
}

run().catch((err) => {
  console.error('[pairs] Failed:', err);
  process.exit(1);
});
