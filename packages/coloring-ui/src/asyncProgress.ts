/**
 * Coloring progress measurement.
 *
 * Compares the drawing layer against the line-art (boundary) layer to
 * compute `{painted, paintable}` so the UI can show progress = painted /
 * paintable. Runs synchronously on the main thread — the workload is tiny
 * (a few ms on a 1500² canvas at stride 4) and only fires on stroke end, so
 * jank is not a concern. A worker version was tried first but Turbopack
 * HMR + replay tooling on the main thread made reply delivery flaky.
 *
 * The paintable-pixel count is cached by (width, height, stride) since the
 * line art doesn't change during a session.
 */

type MeasureResult = { painted: number; paintable: number };

type MeasureOptions = {
  drawing: HTMLCanvasElement;
  boundary: HTMLCanvasElement;
  /** Sample every Nth pixel (both axes); must stay consistent per session. */
  stride?: number;
};

const WHITE_RGB = 240;
const OPAQUE_ALPHA = 32;
const PAINTED_ALPHA = 16;

let cachedPaintable: number | null = null;
let cachedPaintableMask: Uint8Array | null = null;
let cachedW = 0;
let cachedH = 0;
let cachedStride = 0;

const getImageData = (canvas: HTMLCanvasElement): ImageData | null => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};

const isPaintablePixel = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean => {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const i = (y * width + x) * 4;
  const a = data[i + 3];
  if (a < OPAQUE_ALPHA) return true;
  return (
    data[i] > WHITE_RGB && data[i + 1] > WHITE_RGB && data[i + 2] > WHITE_RGB
  );
};

// A pixel is "paintable" only if it AND its stride-neighbours are all non-line.
// This erodes the mask by one sample so anti-aliased edge pixels (which our
// brush / fill can never fully cover) are excluded from the denominator. The
// goal is that a fully-coloured canvas reads as exactly 100%.
const computePaintableMask = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  stride: number,
): { mask: Uint8Array; count: number } => {
  const mask = new Uint8Array(width * height);
  let count = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (!isPaintablePixel(data, width, height, x, y)) continue;
      if (
        !isPaintablePixel(data, width, height, x - stride, y) ||
        !isPaintablePixel(data, width, height, x + stride, y) ||
        !isPaintablePixel(data, width, height, x, y - stride) ||
        !isPaintablePixel(data, width, height, x, y + stride)
      ) {
        continue;
      }
      mask[y * width + x] = 1;
      count++;
    }
  }
  return { mask, count };
};

export const measureProgress = async (
  options: MeasureOptions,
): Promise<MeasureResult> => {
  const { drawing, boundary, stride = 4 } = options;
  const { width, height } = drawing;
  if (width === 0 || height === 0) return { painted: 0, paintable: 0 };

  const dimsChanged =
    width !== cachedW || height !== cachedH || stride !== cachedStride;

  if (dimsChanged || !cachedPaintableMask || cachedPaintable === null) {
    const b = getImageData(boundary);
    if (!b) return { painted: 0, paintable: 0 };
    const { mask, count } = computePaintableMask(b.data, width, height, stride);
    cachedPaintableMask = mask;
    cachedPaintable = count;
    cachedW = width;
    cachedH = height;
    cachedStride = stride;
  }

  const d = getImageData(drawing);
  if (!d) return { painted: 0, paintable: 0 };

  let painted = 0;
  const mask = cachedPaintableMask;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const idx = y * width + x;
      if (mask[idx] === 0) continue;
      if (d.data[idx * 4 + 3] >= PAINTED_ALPHA) painted++;
    }
  }

  return { painted, paintable: cachedPaintable };
};

export const terminateProgressWorker = (): void => {
  cachedPaintableMask = null;
  cachedPaintable = null;
  cachedW = 0;
  cachedH = 0;
  cachedStride = 0;
};
