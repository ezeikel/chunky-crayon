/**
 * Generate the 10 Colo accessory item PNGs.
 *
 * `lib/colo/catalog.ts` defines `imagePath: /images/colo/accessories/<id>.svg`
 * for 10 accessories, but the files never existed and the UI substitutes
 * FontAwesome icons. This generates the ITEM ALONE (no Colo) as a flat,
 * brand-styled transparent PNG so the icons can be swapped for real art.
 *
 * Unlike stickers (which edit the colo.svg reference), accessories have no
 * base character, so this uses `images.generate` (text-to-image) with
 * `background: 'transparent'` on gpt-image-1.
 *
 * Cost: ~$0.17 per gpt-image-1 "high" image. 10 ≈ $1.70, ~6 min.
 *
 * Usage (from apps/chunky-crayon-web):
 *   # dry run -> scripts/out/colo-accessories/ only
 *   pnpm tsx -r dotenv/config scripts/generate-colo-accessories.ts \
 *     dotenv_config_path=.env.local
 *   # write into public/
 *   pnpm tsx -r dotenv/config scripts/generate-colo-accessories.ts \
 *     --commit dotenv_config_path=.env.local
 *   # one item
 *   pnpm tsx -r dotenv/config scripts/generate-colo-accessories.ts \
 *     --only=crown --commit dotenv_config_path=.env.local
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const ONLY = args
  .find((a) => a.startsWith('--only='))
  ?.split('=')[1]
  ?.trim();

const MODEL = 'gpt-image-1';
const SIZE = '1024x1024' as const;
const QUALITY = 'high' as const;

const WEB_ROOT = join(__dirname, '..');
const OUT_DIR = join(__dirname, 'out', 'colo-accessories');
const PUBLIC_DIR = join(WEB_ROOT, 'public', 'images', 'colo', 'accessories');

/**
 * Shared style contract — keeps every accessory a clean flat icon that
 * matches the Colo mascot palette and reads at small sizes in a list row.
 */
const STYLE = `
STYLE & CONSTRAINTS:
- Draw ONLY the item itself. NO character, NO Colo, NO mascot, NO body, NO head, NO hands wearing it. Just the standalone object floating.
- FLAT VECTOR ICON style: solid flat color fills, a clean confident dark-brown outline, minimal-to-no shading. Like a friendly kids' app sticker icon. NOT 3D, NOT photorealistic, NOT painterly.
- Warm kid-friendly palette in harmony with a warm-orange mascot brand (oranges, soft yellows, soft coral, with the item's own natural colors where it makes sense).
- Background MUST be fully transparent (alpha). NO background color, NO scene, NO frame, NO border, NO drop shadow, NO ground.
- Single centered object, filling most of the canvas with a small even margin, viewed straight-on. NO text, NO letters, NO numbers, NO labels.`;

/** accessory id (from lib/colo/catalog.ts) -> item description. */
const ACCESSORY_PROMPTS: Record<string, string> = {
  'astronaut-helmet':
    'A rounded white space astronaut helmet with a clear curved visor and a soft orange accent trim.',
  crown:
    'A small classic golden royal crown with rounded points and three round gem dots (one coral, one soft yellow, one orange).',
  'rainbow-scarf':
    'A cozy knitted winter scarf with soft rainbow color stripes, gently curved as if mid-wrap, with little fringe at the ends.',
  'party-hat':
    'A festive cone party hat with diagonal orange and yellow stripes, a small pom-pom on top, and a thin chin strap curve.',
  'artist-beret':
    'A soft round artist beret, warm orange-brown, with a tiny stalk nub on top, tilted slightly.',
  'wizard-hat':
    'A tall pointed wizard hat, deep orange, with a soft floppy bent tip and a scattering of small yellow stars and a crescent.',
  'dino-spikes':
    'A single detachable stegosaurus back-crest: a gently curved horizontal strip with a row of about five clearly separated rounded triangular plates standing up along the top, soft green, each plate with its own bold dark outline and a small gap between them so it unmistakably reads as dinosaur back-plates (NOT leaves, NOT a bush, NOT a crown). A simple soft strap/base runs underneath connecting them.',
  'flower-crown':
    'A delicate flower crown headband: a simple ring of small rounded cartoon flowers and tiny leaves in coral, yellow and soft pink.',
  'superhero-cape':
    'A bold superhero cape, warm red-orange, with a high rounded collar and a dramatic flowing wavy lower edge, shown spread out.',
  'sparkle-glasses':
    'A pair of fun rounded cartoon glasses: two clean circular lenses with a simple bold dark frame and a small bridge between them, lenses LIGHT and mostly clear (pale soft tint, NOT dark, NOT busy) with just two or three tiny four-point sparkle stars as glints. Friendly and uncluttered, clearly eyeglasses.',
};

const log = (m: string) => console.log(`[colo-accessories] ${m}`);

const generate = async (client: OpenAI, id: string, subject: string) => {
  const prompt = `Create a single standalone flat icon of this accessory item for a kids' coloring app:

${subject}
${STYLE}`;

  const start = Date.now();
  const result = await client.images.generate({
    model: MODEL,
    prompt,
    size: SIZE,
    quality: QUALITY,
    background: 'transparent',
    output_format: 'png',
    n: 1,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image returned for ${id}`);
  const buf = Buffer.from(b64, 'base64');

  mkdirSync(OUT_DIR, { recursive: true });
  const preview = join(OUT_DIR, `${id}.png`);
  writeFileSync(preview, buf);
  log(`${id}: ${elapsed}s, ${(buf.length / 1024).toFixed(0)}KB -> ${preview}`);

  if (COMMIT) {
    mkdirSync(PUBLIC_DIR, { recursive: true });
    const finalPath = join(PUBLIC_DIR, `${id}.png`);
    writeFileSync(finalPath, buf);
    log(`${id}: committed -> ${finalPath}`);
  }
};

const main = async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  log(
    `mode: ${COMMIT ? 'COMMIT (writes public/)' : 'DRY RUN (scripts/out only)'}` +
      (ONLY ? ` | only=${ONLY}` : ''),
  );

  const client = new OpenAI();
  const entries = Object.entries(ACCESSORY_PROMPTS).filter(
    ([id]) => !ONLY || ONLY === id,
  );

  if (entries.length === 0) {
    log(
      `no match for --only=${ONLY}. Valid ids: ${Object.keys(ACCESSORY_PROMPTS).join(', ')}`,
    );
    return;
  }

  log(`generating ${entries.length} accessory item(s)...`);
  let ok = 0;
  for (const [id, subject] of entries) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await generate(client, id, subject);
      ok += 1;
    } catch (err) {
      log(`FAILED ${id}: ${(err as Error).message}`);
    }
  }
  log(`done: ${ok}/${entries.length} succeeded.`);
  if (!COMMIT) {
    log('DRY RUN — review scripts/out/colo-accessories/, then re-run with --commit.');
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
