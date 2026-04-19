import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import sharp from 'sharp';
import OpenAI from 'openai';

// --- Production prompts (mirrors apps/<app>/lib/ai/prompts.ts) ---
// Kept inline so this script is self-contained. If you iterate on prompts
// in the app, paste the updated version here to re-validate.

const TARGET_AGE = '3-5';
const COPYRIGHTED_CHARACTER_INSTRUCTIONS = `If the input contains a copyrighted character, style it generically so it's inspired by the original but not an exact reproduction.`;

const PHOTO_TO_COLORING_SYSTEM = `Convert the input photograph into a children's coloring book page. The output must be FAITHFUL to the photo — preserve every subject, their exact positions, proportions, and recognizable features. Do NOT add, remove, or reinterpret anything.

Style: clean line art, thick black outlines on a pure white background. Every visible feature — eyes, nose, mouth, clothing folds, fur texture, leaves, architectural lines — appears as an outlined shape with a completely white, unfilled interior. Coloring book aesthetic: printable, simple enough for a child aged ${TARGET_AGE} to color with chunky crayons, but every recognizable detail from the photo is preserved.

${COPYRIGHTED_CHARACTER_INSTRUCTIONS}

Exclude: gradients, shadows, shading, textures, gray tones, fill, color, cartoon reinterpretation, changing the subject's identity, adding new subjects, removing subjects, changing the scene composition.

My prompt has full detail so no need to add more.`;

const createPhotoToColoringPrompt = () =>
  `Trace the uploaded photograph as a coloring book page. Preserve the exact composition, subject positions, and recognizable identity of everything in the photo — a pet stays the same pet, a person stays the same person, a landscape keeps the same layout.

Draw every visible subject and its interior detail as thick black outlines on pure white paper: facial features, hair direction, clothing shapes and folds, fur / feathers / scales as simplified line groups, foliage silhouettes, architectural edges. Keep interiors white and unfilled.

Target audience: ages ${TARGET_AGE}. Line thickness: bold and child-friendly. Complexity: balanced.

Do not cartoonify, reinterpret, simplify away, or add features. The goal is a FAITHFUL line-art version of the input photo — recognizable as the same scene.

My prompt has full detail so no need to add more.`;

const PROMPT = `${PHOTO_TO_COLORING_SYSTEM}\n\n${createPhotoToColoringPrompt()}`;

// --- Driver ---

const INPUT_DIR = process.argv[2];
const CONCURRENCY = 4;

if (!INPUT_DIR) {
  console.error('Usage: pnpm tsx scripts/test-photo-batch.mts <input-dir>');
  process.exit(1);
}

const OUTPUT_DIR = join(INPUT_DIR, 'output');
await mkdir(OUTPUT_DIR, { recursive: true });

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    'OPENAI_API_KEY not set. Run with: set -a && source /path/to/.env.local && set +a && pnpm tsx ...',
  );
  process.exit(1);
}

const client = new OpenAI({ apiKey });

type Job = { inPath: string; outPath: string };
const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);
const files = (await readdir(INPUT_DIR))
  .filter((f) => supported.has(extname(f).toLowerCase()))
  .map((f) => ({
    inPath: join(INPUT_DIR, f),
    outPath: join(OUTPUT_DIR, `${basename(f, extname(f))}.coloring.png`),
  }))
  .filter((job) => job.inPath !== job.outPath);

console.log(
  `[batch] ${files.length} images → ${OUTPUT_DIR} (concurrency=${CONCURRENCY})`,
);
console.log(
  `[batch] est cost: ~$${(files.length * 0.08).toFixed(2)} (GPT Image 1.5 @ $0.08/img)`,
);

async function processOne(job: Job): Promise<void> {
  const name = basename(job.inPath);
  const started = Date.now();

  try {
    // Normalize to 1024x1024 PNG (GPT Image edit requires PNG, max 4 MB)
    const normalized = await sharp(await readFile(job.inPath))
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside' })
      .png()
      .toBuffer();

    const imageFile = new File([normalized], 'photo.png', {
      type: 'image/png',
    });

    const result = await client.images.edit({
      model: 'gpt-image-1.5',
      image: [imageFile],
      prompt: PROMPT,
      size: '1024x1024',
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('no image in response');
    }

    await writeFile(job.outPath, Buffer.from(b64, 'base64'));
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[✓] ${name} → ${basename(job.outPath)} (${elapsed}s)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[✗] ${name} — ${msg}`);
  }
}

// Simple concurrency pool.
const queue = [...files];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (job) await processOne(job);
    }
  }),
);

console.log(`\n[batch] done. outputs in ${OUTPUT_DIR}`);
