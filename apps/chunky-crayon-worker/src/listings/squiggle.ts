/**
 * Hand-drawn squiggle underline generator using roughjs.
 *
 * Returns a data URI of an SVG containing one or more rough-rendered
 * paths — drop directly into Satori as `<img src={...}>`. Same underlying
 * lib as the homepage hero squiggle (CrayonScribble.tsx) and the bg tile
 * generator, so brand voice is consistent.
 */

import { RoughGenerator } from "roughjs/bin/generator";

type RoughOp =
  | { op: "move"; data: [number, number] }
  | { op: "lineTo"; data: [number, number] }
  | { op: "bcurveTo"; data: [number, number, number, number, number, number] };

type RoughOpset = { type: string; ops: RoughOp[] };

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

const gen = new RoughGenerator();

export type SquiggleOptions = {
  width: number; // SVG width in px
  height: number; // SVG height in px (typically 30-60 for an underline)
  color: string; // hex stroke colour
  strokeWidth?: number; // default 6
  seed?: number; // stable seed → reproducible output. default 11
  bowing?: number; // default 3 (more = more curvy)
  roughness?: number; // default 2.4 (more = more sketchy)
};

/**
 * Build a hand-drawn squiggle underline as a data-URI SVG. The line is
 * rendered horizontally, slightly bowed, with multiple roughjs passes for
 * a crayon-overlap feel.
 */
export function buildSquiggleDataUri(opts: SquiggleOptions): string {
  const {
    width,
    height,
    color,
    strokeWidth = 6,
    seed = 11,
    bowing = 3,
    roughness = 2.4,
  } = opts;

  const yMid = height / 2;
  const drawable = gen.line(8, yMid, width - 8, yMid, {
    bowing,
    roughness,
    strokeWidth,
    seed,
    stroke: color,
  });

  const paths = drawable.sets
    .filter((s) => s.type === "path")
    .map(
      (s) =>
        `<path d="${opsToPath(s as RoughOpset)}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`,
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
