/**
 * Manual-accept a QA-failed bundle page.
 *
 * Sometimes Opus QA over-flags a page that's actually shippable (e.g.
 * page 9 of Dino Dance Party — Dots + Spike side by side, Opus flagged
 * stars + spikes that the prompt itself asked for). Rather than re-running
 * gpt-image-2 hoping for the same image but with QA mood swing, this
 * script grabs a chosen qa-debug attempt URL, runs the standard persist
 * pipeline (metadata + trace + webp + DB row), and bypasses the QA gate.
 *
 * Use only after eyeballing the image. This is the human-in-the-loop
 * escape hatch for false-positive QA failures.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/accept-bundle-page.ts \
 *     --slug=dino-dance-party --page=9 --attempt=5 \
 *     dotenv_config_path=.env.local
 *
 *   --slug=    bundle slug
 *   --page=    1-indexed page number
 *   --attempt= which qa-debug attempt to accept (1-5)
 *   --dry      preview the URL it would persist, don't write
 */

import { db } from '@one-colored-pixel/db';
import { put } from '@one-colored-pixel/storage';
import {
  imageMetadataSchema,
  getTracedModels,
  getBundleProfile,
} from '@one-colored-pixel/coloring-core';
import { generateText, Output } from 'ai';
import sharp from 'sharp';
// @ts-expect-error - oslllo-potrace has no types
import potrace from 'oslllo-potrace';

const args = process.argv.slice(2);
const slug = args.find((a) => a.startsWith('--slug='))?.split('=')[1];
const pageNumber = parseInt(
  args.find((a) => a.startsWith('--page='))?.split('=')[1] ?? '0',
  10,
);
const attempt = parseInt(
  args.find((a) => a.startsWith('--attempt='))?.split('=')[1] ?? '0',
  10,
);
const dry = args.includes('--dry');

if (!slug || !pageNumber || !attempt) {
  throw new Error('--slug --page --attempt are required');
}

const r2PublicUrl = process.env.R2_PUBLIC_URL;
if (!r2PublicUrl) throw new Error('R2_PUBLIC_URL not set');

const debugUrl = `${r2PublicUrl}/bundles/${slug}/qa-debug/page-${pageNumber}-attempt-${attempt}.png`;

const traceImage = async (imageBuffer: Buffer): Promise<string> =>
  new Promise((resolve, reject) => {
    sharp(imageBuffer)
      .flatten({ background: '#ffffff' })
      .resize({ width: 1024 })
      .grayscale()
      .normalize()
      .linear(1.3, -40)
      .threshold(210)
      .toFormat('png')
      .toBuffer(async (err, pngBuffer) => {
        if (err) return reject(err);
        try {
          const traced = await potrace(Buffer.from(pngBuffer), {
            threshold: 200,
            optimizeImage: true,
            turnPolicy: 'majority',
          }).trace();
          resolve(traced);
        } catch (e) {
          reject(e);
        }
      });
  });

async function run() {
  const bundle = getBundleProfile(slug!);
  if (!bundle) throw new Error(`Unknown bundle: ${slug}`);

  const bundleRow = await db.bundle.findUnique({
    where: { slug: slug! },
    select: { id: true },
  });
  if (!bundleRow) throw new Error(`Bundle row not found for ${slug}`);

  console.log(`[accept] page ${pageNumber} of ${slug}, attempt ${attempt}`);
  console.log(`[accept]   source: ${debugUrl}`);
  if (dry) {
    console.log('[accept]   DRY RUN — exiting without persist.');
    return;
  }

  const existing = await db.coloringImage.findFirst({
    where: { bundleId: bundleRow.id, bundleOrder: pageNumber, status: 'READY' },
    select: { id: true },
  });
  if (existing) {
    console.log(
      `[accept] page ${pageNumber} already READY (${existing.id}) — replacing url + svg.`,
    );
  }

  // Fetch the chosen attempt
  const res = await fetch(debugUrl);
  if (!res.ok) throw new Error(`Failed to fetch debug image: ${res.status}`);
  const imageBuffer = Buffer.from(await res.arrayBuffer());

  // Build the same metadata + trace + webp pipeline as persist.ts
  const tracedModels = getTracedModels(null);
  const heroIds = bundle.pageCast[pageNumber] ?? [];
  const heroDescriptions = heroIds
    .map((id) => bundle.heroes.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => h !== undefined)
    .map((h) => `- ${h.name} the ${h.species}`)
    .join('\n');
  const castContext = heroIds.length
    ? `\n\nThis page features:\n${heroDescriptions}\n\nYour title MUST mention the species accurately.`
    : '';

  const [metadataResult, svg, webpBuffer] = await Promise.all([
    generateText({
      model: tracedModels.vision,
      output: Output.object({ schema: imageMetadataSchema }),
      system: `You are an assistant that generates metadata for coloring book pages for SEO. Generate a title, description, and alt text. Concise, child-friendly, ages 3-8.${castContext}`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Generate metadata for this page (page ${pageNumber} of ${slug}):`,
            },
            {
              type: 'image',
              image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
            },
          ],
        },
      ],
    }),
    traceImage(imageBuffer),
    sharp(imageBuffer).webp().toBuffer(),
  ]);

  const m = metadataResult.output;
  if (!m) throw new Error('Metadata pass returned no output');
  console.log(`[accept]   title: ${m.title}`);

  const imagePath = `bundles/${slug}/pages/${pageNumber}/image.webp`;
  const svgPath = `bundles/${slug}/pages/${pageNumber}/image.svg`;
  const [{ url: imageUrl }, { url: svgUrl }] = await Promise.all([
    put(imagePath, webpBuffer, {
      access: 'public',
      contentType: 'image/webp',
      allowOverwrite: true,
    }),
    put(svgPath, Buffer.from(svg), {
      access: 'public',
      contentType: 'image/svg+xml',
      allowOverwrite: true,
    }),
  ]);

  const pagePrompt = bundle.pagePrompts[pageNumber - 1];

  if (existing) {
    await db.coloringImage.update({
      where: { id: existing.id },
      data: {
        title: m.title,
        description: m.description,
        alt: m.alt,
        tags: m.tags,
        url: imageUrl,
        svgUrl,
        status: 'READY',
        sourcePrompt: pagePrompt,
      },
    });
    console.log(`[accept]   updated existing row ${existing.id}`);
  } else {
    const created = await db.coloringImage.create({
      data: {
        title: m.title,
        description: m.description,
        alt: m.alt,
        tags: m.tags,
        url: imageUrl,
        svgUrl,
        sourcePrompt: pagePrompt,
        generationType: 'SYSTEM',
        purposeKey: `bundle:${slug}`,
        bundleId: bundleRow.id,
        bundleOrder: pageNumber,
        showInCommunity: false,
        status: 'READY',
        brand: 'CHUNKY_CRAYON',
      },
    });
    console.log(`[accept]   created row ${created.id}`);
  }
}

run()
  .catch((e) => {
    console.error('[accept]', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
