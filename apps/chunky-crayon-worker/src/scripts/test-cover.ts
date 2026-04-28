/**
 * Quick local validator for buildDemoReelCover. Fetches one row from prod
 * Neon, builds the cover, writes to /tmp so we can `open` and eyeball.
 *
 * Run with:
 *   cd apps/chunky-crayon-worker && bun run src/scripts/test-cover.ts <coloringImageId>
 */
import { db } from "@one-colored-pixel/db";
import { writeFile } from "node:fs/promises";
import { buildDemoReelCover } from "../video/v2/cover.js";
import { pickBestPalette } from "../video/v2/palette.js";

const id = process.argv[2];
if (!id) {
  console.error("usage: test-cover.ts <coloringImageId>");
  process.exit(1);
}

const row = await db.coloringImage.findUnique({
  where: { id },
  select: {
    id: true,
    title: true,
    regionMapUrl: true,
    regionMapWidth: true,
    regionMapHeight: true,
    regionsJson: true,
    svgUrl: true,
  },
});

if (!row) {
  console.error(`row ${id} not found`);
  process.exit(1);
}

const { regionMapUrl, svgUrl, regionsJson } = row;
if (!regionMapUrl || !svgUrl || !regionsJson) {
  console.error("row missing required fields", {
    hasRegionMap: !!regionMapUrl,
    hasSvg: !!svgUrl,
    hasRegionsJson: !!regionsJson,
  });
  process.exit(1);
}

const parsed =
  typeof regionsJson === "string" ? JSON.parse(regionsJson) : regionsJson;

const palette = pickBestPalette(parsed, {
  preferred: "realistic",
  minDistinctColors: 3,
});
console.log(
  `[test-cover] building cover for ${id} (${row.title}) — palette=${palette.variant} distinct=${palette.distinctColors} fellBack=${palette.fellBack}`,
);
const buf = await buildDemoReelCover({
  regionMapUrl,
  regionMapWidth: row.regionMapWidth ?? 1024,
  regionMapHeight: row.regionMapHeight ?? 1024,
  regionsJson: parsed,
  svgUrl,
  paletteVariant: palette.variant,
});

const outPath = `/tmp/test-cover-${id}.jpg`;
await writeFile(outPath, buf);
console.log(`[test-cover] wrote ${outPath} (${buf.byteLength} bytes)`);

await db.$disconnect();
