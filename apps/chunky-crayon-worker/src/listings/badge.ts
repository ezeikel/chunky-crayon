/**
 * Scalloped/wavy "N pages" badge SVG generator.
 *
 * Drops the clean-circle badge in favour of a hand-drawn-feel wavy blob
 * — same visual language as Wyo's pink "10 Pages" sticker. Builds the
 * blob as a circular sequence of small bumps using a single SVG path,
 * with brown outline + pink fill.
 *
 * Returns a data URI for direct embedding in Satori as `<img>`.
 */

export type BadgeOptions = {
  size: number; // outer SVG box (px). The blob fills slightly less.
  fill: string; // hex
  stroke: string; // hex
  strokeWidth?: number; // default 5
  bumps?: number; // number of scallop bumps around the perimeter. default 12
  bumpDepth?: number; // 0..1, how deep the scallops cut. default 0.06
};

/**
 * Build a scalloped circle as a closed SVG path centred at (cx, cy) with
 * average radius r. Each bump alternates outer (r * (1+depth)) and inner
 * (r * (1-depth)) radii.
 */
function buildBlobPath(
  cx: number,
  cy: number,
  r: number,
  bumps: number,
  bumpDepth: number,
): string {
  const points: Array<[number, number]> = [];
  const total = bumps * 2; // alternate outer/inner
  for (let i = 0; i < total; i++) {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? r * (1 + bumpDepth) : r * (1 - bumpDepth);
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  // Close the path with smooth quadratic curves between points so the
  // result reads as soft scallops, not a spiky star.
  const cmds: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const next = points[(i + 1) % points.length];
    const midX = (x + next[0]) / 2;
    const midY = (y + next[1]) / 2;
    if (i === 0) {
      cmds.push(`M${midX.toFixed(2)} ${midY.toFixed(2)}`);
    }
    cmds.push(
      `Q${x.toFixed(2)} ${y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`,
    );
  }
  cmds.push("Z");
  return cmds.join(" ");
}

export function buildBadgeDataUri(opts: BadgeOptions): string {
  const {
    size,
    fill,
    stroke,
    strokeWidth = 5,
    bumps = 12,
    bumpDepth = 0.06,
  } = opts;

  const cx = size / 2;
  const cy = size / 2;
  // Inset by enough to keep stroke inside the SVG viewBox.
  const r = size / 2 - strokeWidth - 4;

  const path = buildBlobPath(cx, cy, r, bumps, bumpDepth);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" /></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
