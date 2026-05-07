/**
 * Render a single Hero listing image for a bundle.
 *
 * Standalone CLI for fast iteration on the Hero template — same pattern
 * as build-listing-brand-card.ts.
 *
 * Usage:
 *   cd apps/chunky-crayon-worker
 *   npx tsx --env-file=.env src/scripts/build-listing-hero.ts \
 *     --slug=dino-dance-party
 */

import { db } from "@one-colored-pixel/db";
import { composeHero } from "../listings/compose";

const args = process.argv.slice(2);
const slug =
  args.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  "dino-dance-party";

async function main() {
  const bundle = await db.bundle.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      tagline: true,
      pageCount: true,
    },
  });
  if (!bundle) throw new Error(`Bundle not found: ${slug}`);

  console.log(`[hero] rendering for ${bundle.name} (${bundle.id})`);
  const start = Date.now();
  const result = await composeHero({
    bundleSlug: slug,
    bundleId: bundle.id,
    bundleName: bundle.name,
    bundlePrefix: "Bundle 01:", // TODO: derive from a Bundle.prefix field once we have a 2nd bundle
    tagline: bundle.tagline,
    pageCount: bundle.pageCount,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(
    `[hero] done in ${elapsed}s (${(result.bytes / 1024).toFixed(0)}KB)`,
  );
  console.log(`[hero]   ${result.url}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
