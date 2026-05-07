/**
 * Render a single BrandCard listing image for a bundle.
 *
 * Standalone CLI for fast iteration on the BrandCard template — no HTTP
 * route involved. Once the layout looks right, the same code is what the
 * `/generate/bundle-listings` worker endpoint will call.
 *
 * Usage:
 *   cd apps/chunky-crayon-worker
 *   npx tsx --env-file=.env src/scripts/build-listing-brand-card.ts \
 *     --slug=dino-dance-party
 */

import { db } from "@one-colored-pixel/db";
import { composeBrandCard } from "../listings/compose";

const args = process.argv.slice(2);
const slug =
  args.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  "dino-dance-party";

async function main() {
  const bundle = await db.bundle.findUnique({
    where: { slug },
    select: { id: true, name: true, tagline: true, brandCharacterUrl: true },
  });
  if (!bundle) throw new Error(`Bundle not found: ${slug}`);

  console.log(`[brand-card] rendering for ${bundle.name} (${bundle.id})`);
  console.log(
    `[brand-card]   character: ${bundle.brandCharacterUrl ?? "(fallback to Colo)"}`,
  );
  const start = Date.now();
  const result = await composeBrandCard({
    bundleSlug: slug,
    bundleId: bundle.id,
    bundleName: bundle.name,
    brandCharacterUrl: bundle.brandCharacterUrl,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(
    `[brand-card] done in ${elapsed}s (${(result.bytes / 1024).toFixed(0)}KB)`,
  );
  console.log(`[brand-card]   ${result.url}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
