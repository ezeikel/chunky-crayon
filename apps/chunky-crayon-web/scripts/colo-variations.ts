/**
 * Colo mascot redesign variations — explore a few directions from the canonical
 * master art, so we can compare against the current Colo before committing.
 *
 * Feeds the master Colo PNG as a reference into gpt-image-2 `high` (images.edit,
 * the same pattern as scripts/spike-comic-cast.ts) and renders 4 directional
 * takes. Full-color, transparent/white background, single character.
 *
 * Usage (from apps/chunky-crayon-web):
 *   OPENAI_API_KEY=... npx tsx scripts/colo-variations.ts
 *   (or pass variation ids: ... colo-variations.ts bluey polish)
 *
 * Output: scripts/out/colo-variations/<id>.png
 */
import OpenAI from 'openai';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const MODEL = 'gpt-image-2';
const SIZE = '1024x1024' as const;
const OUT_DIR = join(process.cwd(), 'scripts/out/colo-variations');

// Master Colo art the user provided (hi-res, transparent).
const MASTER = '/Users/ezeikel/Desktop/Mascot2.png';

// Colo's fixed identity — must survive every variation so it stays recognizably
// the same character (orange crayon, wrapper band, rosy cheeks, mitt hands).
const IDENTITY =
  'The character is Colo: a friendly cartoon orange crayon. Cylindrical crayon body with a conical paper-wrapper tip on top, a wavy paper-wrapper band around the middle, an exposed pink wax section near the bottom, two small black dot eyes, a simple smile, rosy oval cheeks, two stubby orange mitten arms (one waving), and two little orange feet. Keep this exact character identity.';

const COMMON =
  'Single character, full body, centered, plain white background, no text, no extra objects. Friendly childrens mascot for ages 3 to 8.';

const VARIATIONS: { id: string; prompt: string }[] = [
  {
    id: 'bluey',
    prompt: `Redraw the reference character in a Bluey-inspired style: soft hand-painted gouache look, thinner and softer dark outline (not heavy), gentle flat shading with a little warmth, slightly squashier friendly proportions, muted but cheerful palette. ${IDENTITY} ${COMMON}`,
  },
  {
    id: 'polish',
    prompt: `Redraw the reference character as a cleaner, more refined version of the SAME design: keep the bold dark outline but make the linework smoother and more even, tidy the proportions, crisp flat color fills, subtle clean highlights. A polish of the existing mascot, not a redesign. ${IDENTITY} ${COMMON}`,
  },
  {
    id: 'flat',
    prompt: `Redraw the reference character as a simpler, modern flat-vector mascot: minimal clean shapes, even medium-weight outline, two flat tones per region, no gradients, very tidy and contemporary. ${IDENTITY} ${COMMON}`,
  },
  {
    id: 'plush',
    prompt: `Redraw the reference character with a soft, slightly dimensional plush-toy feel: gentle soft shading and rounded volumes so it reads like a cuddly soft toy, while keeping the clean dark outline and the same cheerful face. ${IDENTITY} ${COMMON}`,
  },
];

function loadAsFile(path: string, name: string): File {
  const buf = readFileSync(path);
  return new File([buf], `${name}.png`, { type: 'image/png' });
}

async function generate(client: OpenAI, v: { id: string; prompt: string }) {
  console.log(`[colo] generating ${v.id}...`);
  const ref = loadAsFile(MASTER, 'colo-master');
  const result = await client.images.edit({
    model: MODEL,
    image: [ref],
    prompt: v.prompt,
    size: SIZE,
    quality: 'high',
  });
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`no image for ${v.id}`);
  writeFileSync(join(OUT_DIR, `${v.id}.png`), Buffer.from(b64, 'base64'));
  console.log(`[colo] ${v.id} done`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const todo = args.length
    ? VARIATIONS.filter((v) => args.includes(v.id))
    : VARIATIONS;
  for (const v of todo) await generate(new OpenAI(), v);
  console.log(`[colo] done → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('[colo] failed:', err);
  process.exit(1);
});
