/**
 * Spike: comic strip cast reference sheets.
 *
 * Generates 4 single-character reference images for the comic-strip cast:
 * Colo (regen for parity), Pip the pencil, Smudge the paint blob, Sticky
 * the sticky note. Each is rendered separately on a plain white background,
 * conditioned on the existing Colo SVG (rasterized) so the new characters
 * inherit Colo's chunky-mascot style — thick brown outlines, two-tone flat
 * shading, pink cheeks, bean eyes, mitten hands.
 *
 * Single-character generations (not ensembles) — per the dino-dance-party
 * spike, gpt-image-2 falls apart with 4-character ensemble shots even with
 * 16 refs, so we generate each friend separately and composite at panel
 * time later.
 *
 * Cost: 4 GPT Image 2 calls × ~$0.08 = ~$0.32
 *
 * Usage: pnpm tsx scripts/spike-comic-cast.ts
 * Output: scripts/out/spike-comic-cast/{colo,pip,smudge,sticky}.png
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import OpenAI from 'openai';

const MODEL = 'gpt-image-2';
const OUT_DIR = join(__dirname, 'out', 'spike-comic-cast');
const SIZE = '1024x1024' as const;
const COLO_SVG = join(__dirname, '..', 'public', 'images', 'colo.svg');
const COLO_PNG = join(OUT_DIR, '_colo-style-ref.png');

const STYLE_BLOCK = `Render in the exact style of the provided reference image (Colo the orange crayon character). Match all of these style traits:
- Dark brown outlines (#4A2E1E), uniform thick weight, no thin lines
- Two flat tones per region: one base color + one slightly darker shadow tone, NO gradients, NO rendering, NO shading detail
- Two solid black bean-shaped eyes spaced wide apart, no whites, no pupils
- Two soft pink oval cheeks under the eyes
- Single curved-line smile, no teeth, no tongue
- Mitten/blob style hands, no fingers
- Stubby leg-feet, two-tone, no shoes
- Chunky toddler-like proportions, head and body roughly equal in mass, tiny limbs
- Plain pure white background, no scenery, no shadow under feet
- The character is centered on the canvas, standing in a neutral friendly pose, one hand raised in a small wave
- Children's mascot reference sheet — single character, full body visible, suitable as a canonical character reference`;

type CastMember = {
  id: string;
  prompt: string;
};

const CAST: CastMember[] = [
  {
    id: 'colo',
    prompt: `A friendly cartoon orange crayon character named Colo, standing centered on a plain white background. Cylindrical crayon body. The top is a conical paper-wrapper tip in a slightly lighter peach orange, with the wrapper's flap flowing into the body. Around the middle of the body is a wavy paper-wrapper band in solid orange (#F09A4A) with a darker orange (#D9762C) wavy edge line. Below the wrapper, the exposed wax tip at the bottom is pink (#E89090) with a subtle darker pink band. Two stubby orange mitten arms — one raised in a small friendly wave, the other hanging at his side. Two small orange stubby leg-feet at the bottom. This is the canonical Colo design — match the reference image exactly.

${STYLE_BLOCK}`,
  },
  {
    id: 'pip',
    prompt: `A friendly cartoon wooden pencil character named Pip, standing centered on a plain white background. Tall slim hexagonal-cylindrical body in warm yellow (#F4C84A) with a darker yellow (#D9A82C) shadow tone — the hexagonal facets are suggested by subtle vertical shading bands, not hard edges. The top is a sharpened graphite tip in dark grey (#5A5A5A) with a lighter grey shadow — clearly conical, like a sharp pencil point. Just below the graphite tip is a small ring of exposed pale wood. The bottom of the pencil has a metal ferrule band in cream (#F8E3B8) with crimped ridge lines, and below the ferrule is a pink eraser (#E89090) with a darker pink shadow. Two slim yellow mitten arms — one slightly raised, the other holding the body. Two small stubby leg-feet at the bottom of the eraser. Pip's face is on the body of the pencil, not on the eraser. He has a slightly worried but kind expression: brows raised slightly in concern, a small tense smile. ONE small bead of sweat near his temple.

${STYLE_BLOCK}`,
  },
  {
    id: 'smudge',
    prompt: `A friendly cartoon paint-blob character named Smudge, standing centered on a plain white background. The body is a round irregular blob shape in turquoise (#4ABEC9) with a darker teal (#2E8A95) shadow tone, like a chunky water-balloon-shaped puddle. Sticking up out of the top of the blob (where a head-tip would be) is a wooden paintbrush handle in warm wood (#C09060) with a brown (#8A5A2E) shadow, ending in droopy cream-colored bristles (#F4E0B0) at the very top — the bristles flop to one side. The face is on the front of the blob body. Smudge has a massive joyful grin with eyes squinted shut (two short curved lines for closed-happy eyes), and pink oval cheeks. Two stubby turquoise mitten arms in the air — both raised excitedly. Two small turquoise leg-feet. AT THE BOTTOM of the blob, near the feet, are 2-3 small turquoise paint droplets dripping off — these are mandatory and always present.

${STYLE_BLOCK}`,
  },
  {
    id: 'sticky',
    prompt: `A friendly cartoon sticky-note character named Sticky, standing centered on a plain white background. The body is a square folded sticky note in pale yellow (#F8E89A) with a darker yellow (#D9C04A) shadow tone — the bottom edge of the square is slightly darker to suggest the adhesive band. The TOP RIGHT corner of the square is dog-eared (curled back), showing a slightly lighter underside — this curled corner is mandatory and is Sticky's signature trait. The face is in the center of the square. She wears round black-rimmed glasses (perfectly circular lenses, dark brown thick rim matching the outline color) — the glasses are mandatory and always present. Her expression is calm and earnest: small flat-line mouth, two black bean eyes visible behind the glasses lenses. One small white triangle highlight on each lens. Two small yellow mitten arms emerging from the sides of the square, one holding up a tiny finger as if making a point. Two small stubby leg-feet at the bottom.

${STYLE_BLOCK}`,
  },
];

function rasterizeColo(): void {
  if (existsSync(COLO_PNG)) return;
  console.log(`[spike] Rasterizing Colo SVG -> ${COLO_PNG}`);
  execSync(`rsvg-convert -w 1024 "${COLO_SVG}" -o "${COLO_PNG}"`, {
    stdio: 'inherit',
  });
}

function loadAsFile(path: string, name: string): File {
  const buf = readFileSync(path);
  return new File([buf], `${name}.png`, { type: 'image/png' });
}

async function generate(client: OpenAI, member: CastMember): Promise<void> {
  console.log(`[spike] Generating ${member.id}...`);
  const start = Date.now();
  const styleRef = loadAsFile(COLO_PNG, 'colo-style-ref');
  const result = await client.images.edit({
    model: MODEL,
    image: [styleRef],
    prompt: member.prompt,
    size: SIZE,
    quality: 'high',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image returned for ${member.id}`);
  const path = join(OUT_DIR, `${member.id}.png`);
  writeFileSync(path, Buffer.from(b64, 'base64'));
  console.log(`[spike] ${member.id} done in ${elapsed}s -> ${path}`);
}

async function run() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  mkdirSync(OUT_DIR, { recursive: true });
  rasterizeColo();

  const client = new OpenAI();

  for (const member of CAST) {
    await generate(client, member);
  }
  console.log(`[spike] All 4 done. Open ${OUT_DIR}`);
}

run().catch((err) => {
  console.error('[spike] Failed:', err);
  process.exit(1);
});
