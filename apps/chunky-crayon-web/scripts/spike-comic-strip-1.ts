/**
 * Spike: Comic Strip 1 — "Outside the Lines"
 *
 * 4-panel strip generation, conditioned on the 4 cast reference sheets from
 * spike-comic-cast.ts. Tests:
 *   - Expression + action range (refs are neutral; can the model do shock,
 *     worry, smug confession?)
 *   - Cross-panel character consistency (does Colo on panel 1 look like
 *     Colo on panel 4?)
 *   - Background scene-building without losing character identity
 *
 * Panel structure (respects ≤2-character ceiling, except panel 4 which
 * pushes to 3 by keeping Pip and Sticky tiny in the foreground):
 *   1. Colo + Sticky — setup. Colo carefully coloring a flower, Sticky
 *      reading a "stay inside the lines" sign
 *   2. Pip alone — worry beat. Sweat bead, hand-wringing, "what if...?"
 *   3. Colo + Sticky — reaction shot looking up at something offscreen,
 *      shock, teal drips coming in from the edge of frame to imply Smudge
 *   4. Smudge front-and-center grinning behind a fully-painted turquoise
 *      sky, Colo+Pip+Sticky tiny in the foreground reacting. The reveal.
 *
 * Each panel is 1024x1024 — assembled into a 2x2 strip after generation.
 *
 * Cost: 4 GPT Image 2 calls × ~$0.08 = ~$0.32
 *
 * Usage: pnpm tsx scripts/spike-comic-strip-1.ts
 * Output: scripts/out/spike-comic-strip-1/{panel-1..4}.png + strip.png
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import sharp from 'sharp';

const MODEL = 'gpt-image-2';
const CAST_DIR = join(__dirname, 'out', 'spike-comic-cast');
const OUT_DIR = join(__dirname, 'out', 'spike-comic-strip-1');
const SIZE = '1024x1024' as const;

const STYLE_TAIL = `Match the EXACT style of the provided reference images: dark brown outlines, uniform thick weight, two flat tones per region (no gradients, no shading detail, no textures), solid black bean eyes, pink oval cheeks, mitten hands, chunky toddler proportions. Comic-strip panel composition with a thin black border. Speech bubbles where indicated must use a clean rounded rectangle with a small pointer toward the speaker, white background, dark brown outline matching the character outline weight.`;

type Panel = {
  id: string;
  refs: string[];
  prompt: string;
};

const PANELS: Panel[] = [
  {
    id: 'panel-1',
    refs: ['colo.png', 'sticky.png'],
    prompt: `Comic strip panel 1 of 4. Setting: a giant sheet of white paper acting as the floor. On the LEFT: Colo, the orange crayon character, leaning forward and carefully coloring a simple cartoon flower drawn on the paper, his tip touching the petal, eyes focused, mouth in a small concentrated half-smile. On the RIGHT: Sticky, the square pale-yellow sticky-note character with round black-rimmed glasses and dog-eared top-right corner, holding up a small white sign with one mitten hand. The sign reads "STAY INSIDE THE LINES" in bold simple sans-serif text. Sticky has a calm earnest expression. Both characters fully visible, no overlap. A thin black panel border frames the scene.\n\n${STYLE_TAIL}`,
  },
  {
    id: 'panel-2',
    refs: ['pip.png'],
    prompt: `Comic strip panel 2 of 4. Setting: same giant white paper floor. CENTER of panel: Pip, the tall slim wooden pencil character in warm yellow with a sharpened dark grey graphite tip, cream metal ferrule and pink eraser at the bottom. Pip is alone in the panel, both mitten hands clasped together at his chest in a worried hand-wringing gesture. His expression is anxious — brows raised high, small tense frown, TWO small beads of sweat near his temple (one is more than the standard one — emphasis on worry). A small speech bubble above him says "...what if we go outside?" in lower-case sans-serif text with a trailing ellipsis. A thin black panel border frames the scene.\n\n${STYLE_TAIL}`,
  },
  {
    id: 'panel-3',
    refs: ['colo.png', 'sticky.png'],
    prompt: `Comic strip panel 3 of 4. Setting: the same white paper floor, but now several large turquoise paint splatter shapes are visible on the right side of the frame, dripping down. On the LEFT: Colo, the orange crayon character, frozen mid-color, his crayon tip raised off the page, mouth open in a tiny "o" of surprise, both eyes wide. On the RIGHT: Sticky, the square sticky-note character with round black-rimmed glasses, mouth open in shock, both mitten hands raised to her cheeks, glasses slightly askew, dog-ear curled. Both characters are looking UP and slightly to the right, off-panel, as if staring at something out of frame. A turquoise mitten arm and drips are visible just barely entering the right edge of the panel — implying another character is doing something off-screen. A thin black panel border frames the scene.\n\n${STYLE_TAIL}`,
  },
  {
    id: 'panel-4',
    refs: ['smudge.png', 'colo.png'],
    prompt: `Comic strip panel 4 of 4. The reveal. The ENTIRE BACKGROUND of the panel is filled with a turquoise (#4ABEC9) painted sky with darker teal cloud shapes — the white paper has been completely painted over. CENTER FOREGROUND, large: Smudge, the round turquoise paint-blob character with a wooden paintbrush handle on top and droopy cream bristles, paint droplets at the feet. Smudge holds the paintbrush handle proudly with one mitten arm, and gives a small smug shrug with the other. His eyes are squinted shut in a content grin. A small speech bubble next to him says "...the lines were boring." in lower-case sans-serif text with a leading ellipsis. To his LEFT, smaller and lower in the frame: Colo, the orange crayon character, head tilted, with a slowly-spreading delighted grin (he secretly approves). Both characters fully visible. A thin black panel border frames the scene.\n\n${STYLE_TAIL}`,
  },
];

function loadAsFile(path: string, name: string): File {
  const buf = readFileSync(path);
  return new File([buf], `${name}.png`, { type: 'image/png' });
}

async function generate(client: OpenAI, panel: Panel): Promise<void> {
  console.log(`[strip-1] Generating ${panel.id}...`);
  const start = Date.now();
  const refs = panel.refs.map((f, i) =>
    loadAsFile(join(CAST_DIR, f), `ref-${i}`),
  );
  const result = await client.images.edit({
    model: MODEL,
    image: refs,
    prompt: panel.prompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image returned for ${panel.id}`);
  const path = join(OUT_DIR, `${panel.id}.png`);
  writeFileSync(path, Buffer.from(b64, 'base64'));
  console.log(`[strip-1] ${panel.id} done in ${elapsed}s -> ${path}`);
}

async function assembleStrip(): Promise<void> {
  console.log(`[strip-1] Assembling 2x2 strip...`);
  const out = join(OUT_DIR, 'strip.png');
  await sharp({
    create: { width: 2048, height: 2048, channels: 3, background: '#ffffff' },
  })
    .composite([
      { input: join(OUT_DIR, 'panel-1.png'), top: 0, left: 0 },
      { input: join(OUT_DIR, 'panel-2.png'), top: 0, left: 1024 },
      { input: join(OUT_DIR, 'panel-3.png'), top: 1024, left: 0 },
      { input: join(OUT_DIR, 'panel-4.png'), top: 1024, left: 1024 },
    ])
    .png()
    .toFile(out);
  console.log(`[strip-1] Strip assembled -> ${out}`);
}

async function run() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  mkdirSync(OUT_DIR, { recursive: true });

  const client = new OpenAI();

  for (const panel of PANELS) {
    await generate(client, panel);
  }
  await assembleStrip();
  console.log(`[strip-1] All done. Open ${OUT_DIR}`);
}

run().catch((err) => {
  console.error('[strip-1] Failed:', err);
  process.exit(1);
});
