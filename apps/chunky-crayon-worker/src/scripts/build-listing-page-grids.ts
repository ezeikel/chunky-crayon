/**
 * Render all 3 PageGrid listing images for a bundle.
 *
 *   Sheet 1 → pages 1-4
 *   Sheet 2 → pages 5-8
 *   Sheet 3 → pages 9-10 + "Happy coloring!" decoration in the empty
 *             slots
 *
 * Usage:
 *   cd apps/chunky-crayon-worker
 *   npx tsx --env-file=.env src/scripts/build-listing-page-grids.ts \
 *     --slug=dino-dance-party
 */

import { db } from "@one-colored-pixel/db";
import { composePageGrid } from "../listings/compose";

const args = process.argv.slice(2);
const slug =
  args.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  "dino-dance-party";

async function main() {
  const bundle = await db.bundle.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!bundle) throw new Error(`Bundle not found: ${slug}`);

  for (const sheetIndex of [1, 2, 3] as const) {
    console.log(`[pageGrid] rendering sheet ${sheetIndex} for ${bundle.name}`);
    const start = Date.now();
    const result = await composePageGrid({
      bundleSlug: slug,
      bundleId: bundle.id,
      bundleName: bundle.name,
      sheetIndex,
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(
      `[pageGrid]   sheet ${sheetIndex} done in ${elapsed}s (${(result.bytes / 1024).toFixed(0)}KB) → ${result.url}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
