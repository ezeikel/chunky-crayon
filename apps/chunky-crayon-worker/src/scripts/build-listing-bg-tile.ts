/**
 * Build the listing-image background tile.
 *
 * Generates a 200x200px SVG tile with hand-drawn-feel crayon scribbles
 * (loops, dots, tiny stars) using roughjs. Same lib as the homepage hero
 * underline so the brand voice stays consistent. Fixed seed → reproducible
 * output between runs.
 *
 * Output: public/listings/bg-tile.svg — committed to the repo. We don't
 * regenerate this on every render; it's a one-off asset.
 *
 * Usage:
 *   cd apps/chunky-crayon-worker
 *   npx tsx src/scripts/build-listing-bg-tile.ts
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RoughGenerator } from "roughjs/bin/generator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TILE_SIZE = 200;
const OUT_PATH = join(
  __dirname,
  "..",
  "..",
  "public",
  "listings",
  "bg-tile.svg",
);

// Stable seed → identical tile across runs. Bump this if we want to redesign.
const SEED = 7;

// Crayon-orange (CC primary) at low alpha so the tile reads as ambient
// texture, not foreground noise. HSL value matches global.css crayon-orange
// (12 75% 58%); converted to hex once for SVG portability.
const ORANGE = "#E58163"; // hsl(12, 75%, 58%) ≈ #E58163
const STROKE_OPACITY = 0.22;
const STROKE_WIDTH = 1.6;

const gen = new RoughGenerator();

type RoughOp =
  | { op: "move"; data: [number, number] }
  | { op: "lineTo"; data: [number, number] }
  | { op: "bcurveTo"; data: [number, number, number, number, number, number] };

type RoughOpset = { type: string; ops: RoughOp[] };

/**
 * Convert a roughjs opset to an SVG path `d` attribute. roughjs ships its
 * own opsToPath in the browser bundle but not from "roughjs/bin/generator",
 * so we inline a tiny version. Only handles the three op types rough emits.
 */
function opsToPath(opset: RoughOpset): string {
  return opset.ops
    .map((op) => {
      if (op.op === "move") return `M${op.data[0]} ${op.data[1]}`;
      if (op.op === "lineTo") return `L${op.data[0]} ${op.data[1]}`;
      if (op.op === "bcurveTo")
        return `C${op.data[0]} ${op.data[1]} ${op.data[2]} ${op.data[3]} ${op.data[4]} ${op.data[5]}`;
      return "";
    })
    .join(" ");
}

function pathFromDrawable(drawable: ReturnType<typeof gen.line>): string {
  return drawable.sets
    .filter((s) => s.type === "path")
    .map((s) => opsToPath(s as RoughOpset))
    .join(" ");
}

const baseOpts = {
  bowing: 2.6,
  roughness: 1.8,
  strokeWidth: STROKE_WIDTH,
  seed: SEED,
  stroke: ORANGE,
};

// Compose a small repeatable scatter of strokes positioned within the tile.
// Each entry produces one drawable; we serialize them all into one SVG.
const drawables = [
  // A diagonal squiggle near top-left
  gen.line(15, 30, 65, 22, baseOpts),
  // A small loop (drawn as a tiny ellipse) near top-right
  gen.ellipse(155, 35, 18, 10, { ...baseOpts, seed: SEED + 1 }),
  // A tiny cross near middle-left
  gen.line(35, 100, 55, 110, { ...baseOpts, seed: SEED + 2 }),
  gen.line(55, 100, 35, 110, { ...baseOpts, seed: SEED + 3 }),
  // A short curve at center
  gen.curve(
    [
      [85, 105],
      [105, 95],
      [125, 110],
      [140, 100],
    ],
    { ...baseOpts, seed: SEED + 4 },
  ),
  // A tiny five-point burst (star-ish) bottom-left
  gen.line(50, 165, 60, 175, { ...baseOpts, seed: SEED + 5 }),
  gen.line(60, 165, 50, 175, { ...baseOpts, seed: SEED + 6 }),
  gen.line(45, 170, 65, 170, { ...baseOpts, seed: SEED + 7 }),
  // Another squiggle bottom-right
  gen.line(120, 165, 175, 175, { ...baseOpts, seed: SEED + 8 }),
  // Small dot cluster (filled circles via tiny ellipses)
  gen.ellipse(170, 85, 4, 4, {
    ...baseOpts,
    fill: ORANGE,
    fillStyle: "solid",
    seed: SEED + 9,
  }),
  gen.ellipse(180, 92, 3, 3, {
    ...baseOpts,
    fill: ORANGE,
    fillStyle: "solid",
    seed: SEED + 10,
  }),
  // Fill the remaining negative space so the tile feels evenly speckled
  // when repeated. A wavy short stroke top-mid and a small loop bottom-mid.
  gen.line(95, 45, 130, 50, { ...baseOpts, seed: SEED + 11 }),
  gen.ellipse(85, 145, 14, 8, { ...baseOpts, seed: SEED + 12 }),
  // A tiny dot top-left fringe
  gen.ellipse(15, 85, 3, 3, {
    ...baseOpts,
    fill: ORANGE,
    fillStyle: "solid",
    seed: SEED + 13,
  }),
];

const paths = drawables
  .map((d, i) => {
    const dAttr = pathFromDrawable(d);
    return `  <path d="${dAttr}" fill="none" stroke="${ORANGE}" stroke-width="${STROKE_WIDTH}" stroke-opacity="${STROKE_OPACITY}" stroke-linecap="round" stroke-linejoin="round" data-stroke="${i}" />`;
  })
  .join("\n");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}">
  <title>Chunky Crayon listing background tile</title>
${paths}
</svg>
`;

writeFileSync(OUT_PATH, svg);
console.log(
  `[bg-tile] Wrote ${TILE_SIZE}x${TILE_SIZE} tile to ${OUT_PATH} (${drawables.length} strokes, seed ${SEED})`,
);
