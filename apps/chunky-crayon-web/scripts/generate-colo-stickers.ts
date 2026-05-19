/**
 * Generate the missing Colo sticker + Colo growth-stage PNGs.
 *
 * The sticker catalog (`lib/stickers/catalog.ts`) and Colo stage catalog
 * (`lib/colo/catalog.ts`) reference local assets that don't exist yet:
 *   - 24 stickers  → public/images/stickers/<id>.png
 *   - 6  stages    → public/images/colo/stage-{1..6}.png
 *
 * gpt-image-2 cannot read SVG, so we rasterize the master mascot
 * `public/images/colo.svg` to a transparent PNG with sharp, then feed
 * that PNG to `images.edit` as the reference for every asset. Each call
 * asks for the SAME character (flat colo.svg style, brand palette) in a
 * themed pose, on a transparent background, as a PNG — so the result
 * drops onto any background.
 *
 * Cost: ~$0.17 per gpt-image-2 "high" edit. Full set (30) ≈ $5, 15-30 min.
 *
 * Usage (from apps/chunky-crayon-web):
 *   # dry run — writes previews to scripts/out/colo-stickers/ only
 *   pnpm tsx -r dotenv/config scripts/generate-colo-stickers.ts \
 *     dotenv_config_path=.env.local
 *
 *   # write into public/ (committed assets)
 *   pnpm tsx -r dotenv/config scripts/generate-colo-stickers.ts \
 *     --commit dotenv_config_path=.env.local
 *
 *   # regenerate a single asset (sticker id or stage-N)
 *   pnpm tsx -r dotenv/config scripts/generate-colo-stickers.ts \
 *     --only=dino-hunter --commit dotenv_config_path=.env.local
 *
 *   # also emit a neutral placeholder.svg into public/images/stickers/
 *   pnpm tsx -r dotenv/config scripts/generate-colo-stickers.ts \
 *     --placeholder --commit dotenv_config_path=.env.local
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const PLACEHOLDER = args.includes('--placeholder');
const ONLY = args
  .find((a) => a.startsWith('--only='))
  ?.split('=')[1]
  ?.trim();

// NOTE: gpt-image-2 rejects `background: 'transparent'` on the API
// ("Transparent background is not supported for this model"). gpt-image-1
// supports native alpha cutouts on image edits, which we need so stickers
// drop onto any background. Keep this on gpt-image-1 unless gpt-image-2
// gains transparency support.
const MODEL = 'gpt-image-1';
const SIZE = '1024x1024' as const;
const QUALITY = 'high' as const;

const WEB_ROOT = join(__dirname, '..');
const COLO_SVG = join(WEB_ROOT, 'public', 'images', 'colo.svg');
const OUT_DIR = join(__dirname, 'out', 'colo-stickers');
const STICKERS_PUBLIC = join(WEB_ROOT, 'public', 'images', 'stickers');
const COLO_PUBLIC = join(WEB_ROOT, 'public', 'images', 'colo');

/**
 * Shared style contract appended to every prompt. Keeps Colo on-model and
 * flat (matching colo.svg used elsewhere on site), transparent, no scene.
 */
const STYLE = `
STYLE & CONSTRAINTS (apply to ALL of the above):
- SAME CHARACTER as the reference image: identical rounded blob body shape, same proportions, same face, same warm-orange brand palette (oranges #eb810f / #f49640 / #ffaf5f, soft coral accents). Do NOT redesign the character.
- FLAT VECTOR STYLE: solid flat color fills, clean confident dark-brown outline, minimal-to-no shading or gradients. Match the simple flat cartoon look of the reference, NOT a painterly or 3D render.
- Background MUST be fully transparent (alpha). NO background color, NO scenery, NO floor, NO frame, NO border, NO drop shadow on the canvas.
- Single character only, centered, full body visible with comfortable margin. NO text, NO letters, NO numbers, NO labels, NO speech bubbles.
- Only add the props/accessory described above — nothing else. Keep it a clean, joyful kids' sticker of Colo.`;

/** sticker id → pose/costume description (sourced from catalog.ts TODOs). */
const STICKER_PROMPTS: Record<string, string> = {
  'first-steps': 'Colo proudly holding ONE large clearly-drawn crayon high above its head with a raised arm — the crayon is a separate distinct object with its own bold outline and a pointed tip, held away from the body (NOT blended into Colo, NOT a mark on the body). Big joyful smile.',
  'getting-started': 'Colo cheerfully holding three colorful crayons fanned out like a little bouquet.',
  'high-five': 'Colo with one arm raised giving an enthusiastic high five, palm forward, joyful expression.',
  'perfect-ten': 'Colo wearing a shiny gold medal on a ribbon around its neck, proud and happy.',
  'super-artist': 'Colo as a superhero: a bold cape clearly fastened at its neck and flowing dramatically out to one side behind it, hands on hips or one fist raised in a confident dynamic heroic stance. The cape is a distinct strong-outlined shape, obviously a cape.',
  'master-creator': 'Colo wearing a small golden crown, regal and delighted.',
  'century-club': 'Colo proudly holding up a golden paintbrush, sparkly and triumphant.',
  'animal-friend': 'Colo wearing cute round animal ears (like little bear ears), sweet friendly smile.',
  'fantasy-dreamer': 'Colo wearing a pointed wizard hat with stars, whimsical magical vibe.',
  'space-explorer': 'Colo wearing a rounded astronaut helmet with a clear visor, adventurous.',
  'nature-lover': 'Colo wearing a flower crown of simple cartoon flowers, gentle happy expression.',
  'vehicle-driver': 'Colo sitting in a tiny simple cartoon car, both hands on the wheel, gleeful.',
  'dino-hunter': 'Colo standing next to a small friendly cartoon dinosaur companion, excited.',
  'ocean-diver': 'Colo wearing a snorkel mask on its face, ready to dive, bubbly fun expression.',
  'food-lover': 'Colo wearing a tall white chef hat, holding a wooden spoon, delighted.',
  'sports-star': 'Colo holding up a shiny sports trophy with both hands, victorious cheer.',
  'holiday-spirit': 'Colo wearing a colorful cone party hat, festive celebratory expression.',
  'animal-master': 'Colo in the center with exactly THREE small distinct cartoon animals around it, clearly separated with their own bold outlines and gaps between them: a little bird perched near one shoulder, a small cat sitting on the ground to one side, a small rabbit on the other side. Each animal is simple, clearly readable, NOT overlapping or merged into a blob. All cheerful.',
  'fantasy-master': 'Colo as a powerful little wizard: pointed star wizard hat AND a small magic wand with a sparkle, confident.',
  'space-master': 'Colo standing on a small crescent moon among a few simple stars, triumphant explorer pose.',
  'category-explorer': 'Colo holding a large open paper map UP in front of itself with both hands at chest height — the map is a big flat rectangle with a bold dark outline, a wavy dotted trail and a small X on it, clearly a separate held object in front of the body (NOT painted onto the body, NOT a smudge). Curious explorer expression peeking over the top of the map.',
  'world-traveler': 'Colo holding a small travel suitcase, wearing a tiny explorer hat, ready-for-adventure smile.',
};

/** stage number → growth description (sourced from lib/colo/catalog.ts). */
const STAGE_PROMPTS: Record<number, string> = {
  1: 'Baby Colo: the youngest, smallest, roundest version — tiny, extra cute, big curious eyes, gentle newborn-soft pose.',
  2: 'Little Colo: slightly bigger than the baby, a little more upright, bright happy beginner energy.',
  3: 'Growing Colo: a medium-sized, more confident stance, cheerful and noticeably taller than the little stage.',
  4: 'Happy Colo: a well-grown, joyful version with an open arms welcoming pose, radiating happiness.',
  5: 'Artist Colo: a grown, accomplished version wearing a small artist beret and holding a paintbrush, proud creative pose.',
  6: 'Master Colo: the largest, most majestic version wearing a small golden crown, regal master pose, fully grown.',
};

const log = (msg: string) => console.log(`[colo-stickers] ${msg}`);

/** Rasterize the master colo.svg to a transparent 1024px PNG for the model. */
const buildReference = async (): Promise<Awaited<ReturnType<typeof toFile>>> => {
  if (!existsSync(COLO_SVG)) throw new Error(`colo.svg not found at ${COLO_SVG}`);
  const png = await sharp(COLO_SVG, { density: 384 })
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  log(`rasterized colo.svg → ${(png.length / 1024).toFixed(0)}KB PNG ref`);
  return toFile(png, 'colo.png', { type: 'image/png' });
};

const generate = async (
  client: OpenAI,
  ref: Awaited<ReturnType<typeof toFile>>,
  name: string,
  subject: string,
  destPublic: string,
  destFile: string,
) => {
  const prompt = `Using the character in the reference image as the exact base, create this themed sticker:

${subject}
${STYLE}`;

  const start = Date.now();
  const result = await client.images.edit({
    model: MODEL,
    image: ref,
    prompt,
    size: SIZE,
    quality: QUALITY,
    background: 'transparent',
    output_format: 'png',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image returned for ${name}`);
  const buf = Buffer.from(b64, 'base64');

  mkdirSync(OUT_DIR, { recursive: true });
  const preview = join(OUT_DIR, destFile);
  writeFileSync(preview, buf);
  log(`${name}: ${elapsed}s, ${(buf.length / 1024).toFixed(0)}KB → ${preview}`);

  if (COMMIT) {
    mkdirSync(destPublic, { recursive: true });
    const finalPath = join(destPublic, destFile);
    writeFileSync(finalPath, buf);
    log(`${name}: committed → ${finalPath}`);
  }
};

const main = async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  log(
    `mode: ${COMMIT ? 'COMMIT (writes public/)' : 'DRY RUN (scripts/out only)'}` +
      (ONLY ? ` | only=${ONLY}` : ''),
  );

  if (PLACEHOLDER) {
    const ph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="#fff4e8"/><circle cx="32" cy="28" r="13" fill="#f49640"/><ellipse cx="32" cy="30" rx="5" ry="7" fill="#fff4e8"/><rect x="20" y="46" width="24" height="6" rx="3" fill="#ffd7ad"/></svg>\n`;
    const phPath = COMMIT
      ? join(STICKERS_PUBLIC, 'placeholder.svg')
      : join(OUT_DIR, 'placeholder.svg');
    mkdirSync(COMMIT ? STICKERS_PUBLIC : OUT_DIR, { recursive: true });
    writeFileSync(phPath, ph);
    log(`placeholder.svg → ${phPath}`);
  }

  const client = new OpenAI();
  const ref = await buildReference();

  const jobs: Array<{
    name: string;
    subject: string;
    destPublic: string;
    destFile: string;
  }> = [];

  for (const [id, subject] of Object.entries(STICKER_PROMPTS)) {
    if (ONLY && ONLY !== id) continue;
    jobs.push({
      name: `sticker:${id}`,
      subject,
      destPublic: STICKERS_PUBLIC,
      destFile: `${id}.png`,
    });
  }
  for (const [stage, subject] of Object.entries(STAGE_PROMPTS)) {
    const key = `stage-${stage}`;
    if (ONLY && ONLY !== key && ONLY !== stage) continue;
    jobs.push({
      name: `colo:${key}`,
      subject,
      destPublic: COLO_PUBLIC,
      destFile: `stage-${stage}.png`,
    });
  }

  if (jobs.length === 0) {
    log(`no jobs matched --only=${ONLY}. Valid sticker ids: ${Object.keys(STICKER_PROMPTS).join(', ')}; stages: stage-1..stage-6`);
    return;
  }

  log(`generating ${jobs.length} asset(s)…`);
  let ok = 0;
  for (const job of jobs) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await generate(client, ref, job.name, job.subject, job.destPublic, job.destFile);
      ok += 1;
    } catch (err) {
      log(`FAILED ${job.name}: ${(err as Error).message}`);
    }
  }
  log(`done: ${ok}/${jobs.length} succeeded.`);
  if (!COMMIT) log('DRY RUN — review scripts/out/colo-stickers/, then re-run with --commit.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
