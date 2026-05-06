/**
 * Preview the demo-reel hook cover for all three variants against a
 * known-good ColoringImage row. Writes 3 JPEGs to /tmp so we can eyeball
 * the layouts BEFORE wiring this into the worker's V2 publish flow.
 *
 * Usage: bun run scripts/preview-hook-cover.ts <coloringImageId>
 *
 * The row needs:
 *   - regionMapUrl + regionMapWidth + regionMapHeight + regionsJson
 *   - svgUrl
 * Any READY V2 demo-reel row works. The variant is forced per-render
 * here so we can preview all three without seeding three rows.
 */

import { db } from "@one-colored-pixel/db";
import { writeFile } from "node:fs/promises";

import { buildDemoReelHookCover } from "../src/video/v2/hook-cover.js";

const id = process.argv[2];
if (!id) {
  console.error(
    "usage: bun run scripts/preview-hook-cover.ts <coloringImageId>",
  );
  process.exit(1);
}

const row = await db.coloringImage.findUnique({
  where: { id },
  select: {
    id: true,
    title: true,
    sourcePrompt: true,
    svgUrl: true,
    regionMapUrl: true,
    regionMapWidth: true,
    regionMapHeight: true,
    regionsJson: true,
    demoReelInputPhotoUrl: true,
  },
});

if (!row) {
  console.error(`row not found: ${id}`);
  process.exit(1);
}
if (
  !row.svgUrl ||
  !row.regionMapUrl ||
  !row.regionMapWidth ||
  !row.regionMapHeight ||
  !row.regionsJson
) {
  console.error("row is missing render-store fields:", {
    svgUrl: !!row.svgUrl,
    regionMapUrl: !!row.regionMapUrl,
    regionsJson: !!row.regionsJson,
  });
  process.exit(1);
}

const regionsJson = JSON.parse(row.regionsJson) as {
  regions: Array<{
    id: number;
    palettes: Record<string, { hex: string; colorName: string }>;
  }>;
};

const samplePrompt =
  row.sourcePrompt || row.title || "a happy bunny eating carrots in a meadow";

// Synthetic photo URL for IMAGE preview if the real row doesn't have
// one. The cover renderer uses sharp to fetch + embed; pick something
// likely to be cached at edge (R2 photo lib if available, otherwise a
// branded placeholder).
const samplePhotoUrl =
  row.demoReelInputPhotoUrl ||
  "https://pub-3113b77fbb06419f9c8070eb1f8471cc.r2.dev/public/photo-library/animal/1777284344831-dx5c0v.jpg";

const sampleTranscript =
  "umm can you make a bunny eating a giant carrot please";

const variants = [
  { variant: "TEXT" as const, prompt: samplePrompt },
  { variant: "IMAGE" as const, inputPhotoUrl: samplePhotoUrl },
  { variant: "VOICE" as const, transcript: sampleTranscript },
];

for (const v of variants) {
  console.log(`\n[preview] rendering ${v.variant}…`);
  const t0 = Date.now();
  const buf = await buildDemoReelHookCover({
    variant: v.variant,
    prompt: "prompt" in v ? v.prompt : null,
    inputPhotoUrl: "inputPhotoUrl" in v ? v.inputPhotoUrl : null,
    transcript: "transcript" in v ? v.transcript : null,
    regionMapUrl: row.regionMapUrl,
    regionMapWidth: row.regionMapWidth,
    regionMapHeight: row.regionMapHeight,
    regionsJson,
    svgUrl: row.svgUrl,
    paletteVariant: "cute",
  });
  const out = `/tmp/hook-cover-${v.variant.toLowerCase()}.jpg`;
  await writeFile(out, buf);
  console.log(
    `[preview] wrote ${out} (${buf.byteLength} bytes, ${Date.now() - t0}ms)`,
  );
}

await db.$disconnect();
