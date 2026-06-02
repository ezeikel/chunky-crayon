/**
 * Coloring-progress measurement for mobile — the Skia/RGBA analogue of web's
 * packages/coloring-ui/src/asyncProgress.ts measureProgress.
 *
 * Web diffs a transparent DRAWING-only canvas against a line-art BOUNDARY canvas
 * (painted = alpha >= 16). Mobile renders ONE composite Skia canvas (white bg +
 * fills/strokes + line art on top), so there is no transparency to key off —
 * instead we discriminate by COLOUR: within the paintable mask (built once from
 * a line-art-only raster), a pixel is "painted" if it is neither near-white
 * (unpainted background) nor near-black (the baked outline).
 *
 * This file is PURE (no Skia / RN imports) so it unit-tests on hand-built RGBA
 * byte buffers. The Skia readback + mask caching live in ImageCanvas.
 *
 * Both buffers (line-art mask source + composite) MUST be the same WxH RGBA_8888
 * (R,G,B,A bytes, row stride = width*4) — the caller renders the line art at the
 * canvas pixel size so the index math lines up.
 */

export type MeasureResult = { painted: number; paintable: number };

// Matches asyncProgress.ts WHITE_RGB. Above this on all channels = still white.
const WHITE_RGB = 240;
// Near-black = the baked SVG outline in the composite. Below this on all
// channels = a line pixel, never counted as "painted".
const BLACK_RGB = 48;

const isWhitePixel = (
  d: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean => {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const i = (y * width + x) * 4;
  return d[i] > WHITE_RGB && d[i + 1] > WHITE_RGB && d[i + 2] > WHITE_RGB;
};

/**
 * Build the paintable mask from a line-art-on-white raster — port of
 * asyncProgress.ts computePaintableMask. A pixel is paintable only if it AND its
 * 4 stride-neighbours are white (one-sample erosion drops anti-aliased line
 * edges so a fully-coloured canvas reads ~100%). Computed ONCE per image
 * (line art is static) and cached by the caller.
 */
export const computePaintableMask = (
  lineArt: Uint8Array,
  width: number,
  height: number,
  stride = 4,
): { mask: Uint8Array; paintable: number } => {
  const mask = new Uint8Array(width * height);
  let paintable = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (!isWhitePixel(lineArt, width, height, x, y)) continue;
      if (
        !isWhitePixel(lineArt, width, height, x - stride, y) ||
        !isWhitePixel(lineArt, width, height, x + stride, y) ||
        !isWhitePixel(lineArt, width, height, x, y - stride) ||
        !isWhitePixel(lineArt, width, height, x, y + stride)
      ) {
        continue;
      }
      mask[y * width + x] = 1;
      paintable++;
    }
  }
  return { mask, paintable };
};

/**
 * Count painted pixels in the composite within the paintable mask: a masked
 * pixel that is neither near-white (unpainted) nor near-black (line art).
 */
export const countPainted = (
  composite: Uint8Array,
  mask: Uint8Array,
  width: number,
  height: number,
  stride = 4,
): number => {
  let painted = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const idx = y * width + x;
      if (mask[idx] === 0) continue;
      const i = idx * 4;
      const r = composite[i];
      const g = composite[i + 1];
      const b = composite[i + 2];
      const isWhite = r > WHITE_RGB && g > WHITE_RGB && b > WHITE_RGB;
      const isLineArt = r < BLACK_RGB && g < BLACK_RGB && b < BLACK_RGB;
      if (!isWhite && !isLineArt) painted += 1;
    }
  }
  return painted;
};

/** Bytes in, {painted, paintable} out. Caller supplies a cached mask normally. */
export const measureProgress = (
  compositeBytes: Uint8Array,
  lineArtBytes: Uint8Array,
  width: number,
  height: number,
  stride = 4,
): MeasureResult => {
  if (width === 0 || height === 0) return { painted: 0, paintable: 0 };
  const { mask, paintable } = computePaintableMask(
    lineArtBytes,
    width,
    height,
    stride,
  );
  const painted = countPainted(compositeBytes, mask, width, height, stride);
  return { painted, paintable };
};

/**
 * painted/paintable → an integer 0-100 percentage, with web's exact rounding
 * (ProgressIndicator.tsx): a near-complete canvas (raw >= 99) snaps to 100 so a
 * few stray anti-aliased pixels don't keep it at 99%.
 */
export const progressPercent = ({
  painted,
  paintable,
}: MeasureResult): number => {
  if (paintable <= 0) return 0;
  const raw = (painted / paintable) * 100;
  return raw >= 99 ? 100 : Math.min(100, Math.round(raw));
};
