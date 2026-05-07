/**
 * Re-run vision metadata for every persisted page of a bundle, conditioned
 * on the hero species/names so titles correctly identify the recurring
 * cast. Original persist pass calls Claude vision with no character
 * context, so dynamic poses get mistitled (e.g. velociraptor rendered
 * "Cute Monkey").
 *
 * Cheap: 1 Claude vision call per page, ~$0.005 each, no image regen.
 *
 * Usage:
 *   cd apps/chunky-crayon-web
 *   pnpm tsx -r dotenv/config scripts/fix-bundle-titles.ts \
 *     --slug=dino-dance-party \
 *     dotenv_config_path=.env.local
 *
 *   Optional flags:
 *     --slug=<bundle-slug>   (default: dino-dance-party)
 *     --dry                   (print proposed titles, don't write)
 *     --pages=1,3,5           (only re-title these page numbers)
 */

import { db } from '@one-colored-pixel/db';
import {
  imageMetadataSchema,
  getTracedModels,
  getBundleProfile,
  type HeroBundle,
} from '@one-colored-pixel/coloring-core';
import { generateText, Output } from 'ai';

const args = process.argv.slice(2);
const slug =
  args.find((a) => a.startsWith('--slug='))?.split('=')[1] ??
  'dino-dance-party';
const dry = args.includes('--dry');
const pagesFilter = args
  .find((a) => a.startsWith('--pages='))
  ?.split('=')[1]
  ?.split(',')
  .map((p) => parseInt(p, 10));

function buildSystemPrompt(
  bundle: HeroBundle,
  heroIds: readonly string[],
): string {
  const heroDescriptions = heroIds
    .map((id) => bundle.heroes.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => h !== undefined)
    .map(
      (h) =>
        `- ${h.name} the ${h.species} (signature: ${h.signatureDetails[0]})`,
    )
    .join('\n');

  const castContext = heroIds.length
    ? `\n\nThis page features the following recurring characters from a children's coloring book series called "${bundle.slug}":\n${heroDescriptions}\n\nYour title MUST mention the species accurately (e.g. say "T-Rex" or "Velociraptor", NOT "monkey" or "lizard"). The image may show them in a dynamic or stylised pose, but the species is fixed.`
    : `\n\nThis page is from a children's coloring book series called "${bundle.slug}". The animals are dinosaurs.`;

  return `You are an assistant that generates metadata for coloring book pages for SEO and accessibility. Generate a title, description, and alt text. The information should be concise, relevant to the image, and suitable for children aged 3-8.${castContext}`;
}

async function fixOne(
  pageRowId: string,
  bundle: HeroBundle,
  pageNumber: number,
  imageUrl: string,
  currentTitle: string,
): Promise<void> {
  const heroIds = bundle.pageCast[pageNumber] ?? [];
  const tracedModels = getTracedModels(null);

  const imageBuffer = Buffer.from(await (await fetch(imageUrl)).arrayBuffer());

  const result = await generateText({
    model: tracedModels.vision,
    output: Output.object({ schema: imageMetadataSchema }),
    system: buildSystemPrompt(bundle, heroIds),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Generate metadata for this page (page ${pageNumber} of ${bundle.slug}):`,
          },
          {
            type: 'image',
            image: `data:image/webp;base64,${imageBuffer.toString('base64')}`,
          },
        ],
      },
    ],
  });

  const m = result.output;
  if (!m) {
    console.log(`  page ${pageNumber}: ❌ no metadata returned`);
    return;
  }

  console.log(`  page ${pageNumber}:`);
  console.log(`    BEFORE: "${currentTitle}"`);
  console.log(`    AFTER:  "${m.title}"`);
  if (dry) return;

  await db.coloringImage.update({
    where: { id: pageRowId },
    data: {
      title: m.title,
      description: m.description,
      alt: m.alt,
      tags: m.tags,
    },
  });
}

async function main() {
  const bundle = getBundleProfile(slug);
  if (!bundle) {
    throw new Error(`Unknown bundle: ${slug}`);
  }

  const rows = await db.coloringImage.findMany({
    where: {
      purposeKey: `bundle:${slug}`,
      status: 'READY',
    },
    select: {
      id: true,
      bundleOrder: true,
      title: true,
      url: true,
    },
    orderBy: { bundleOrder: 'asc' },
  });

  const filtered = pagesFilter
    ? rows.filter((r) => r.bundleOrder && pagesFilter.includes(r.bundleOrder))
    : rows;

  console.log(
    `Re-titling ${filtered.length} page(s) for ${slug}${dry ? ' (DRY RUN)' : ''}`,
  );

  for (const r of filtered) {
    if (!r.bundleOrder || !r.url) continue;
    try {
      await fixOne(r.id, bundle, r.bundleOrder, r.url, r.title ?? '');
    } catch (err) {
      console.log(
        `  page ${r.bundleOrder}: ❌ ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

main()
  .catch((err) => {
    console.error('[fix-titles]', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
