/**
 * Magic-reveal brush primitives, extracted from `<ImageCanvas>` so the live
 * brush and the Remotion demo-reel renderer share one painting implementation.
 *
 * Two primitives:
 *
 *   1. `buildPreColoredCanvas` — paints every pixel with its region's palette
 *      colour. Built once per (image, palette variant) and reused across all
 *      strokes. Mirrors the loop in ImageCanvas.tsx (was ~1080-1135).
 *
 *   2. `paintMagicRevealStamp` — applies one brush dab (or short segment from
 *      `lastX/lastY` → `x/y`) to a destination canvas, with the dab's pixels
 *      coloured per-region via source-in compositing against the pre-coloured
 *      canvas. Mirrors the source-in flow in ImageCanvas.tsx (was ~1470-1502).
 *
 * The Remotion spike calls these in a loop (one stamp per stroke index up to
 * `frame * speedFactor`), repainting the destination canvas from scratch every
 * frame so seeking backward in the timeline works deterministically.
 *
 * The live `<ImageCanvas>` accumulates stamps directly on the visible canvas
 * via pointer events; same primitives, just driven by a different clock.
 */
import { drawTexturedStroke } from "./brushTextures";

/**
 * Minimal region-store interface this module needs. Defined here (not imported
 * from `@one-colored-pixel/coloring-ui`) so `packages/canvas` stays free of
 * cross-package dependencies. Live `useRegionStore` already implements this
 * shape — its return value can be passed directly.
 */
export type MagicRevealRegionStore = {
  /** O(1) region id at integer (x, y) in region-map space. 0 = boundary. */
  getRegionIdAt: (x: number, y: number) => number;
  /** Hex (e.g. "#ff8855") for a region in a given palette variant, or null. */
  getColorForRegion: (regionId: number, variant: string) => string | null;
  /** Region-map width (typically 1024). */
  width: number;
  /** Region-map height (typically 1024). */
  height: number;
};

/**
 * Build the pre-coloured canvas — every pixel set to its region's palette
 * colour. Boundary pixels (regionId === 0) stay transparent.
 *
 * Returns a fresh OffscreenCanvas / HTMLCanvasElement of size `canvasW`×`canvasH`.
 * In the live app `canvasW`/`canvasH` are DPR-scaled drawing-canvas dimensions;
 * in Remotion they're whatever the comp's drawing canvas uses.
 *
 * Note: this runs ~50-100ms for 1024×1024 on the main thread. The live app
 * comments suggest moving to a worker if it ever causes jank, but for one-time
 * setup per image it's fine. In Remotion it's called once at delayRender time.
 */
export function buildPreColoredCanvas({
  regionStore,
  paletteVariant,
  canvasW,
  canvasH,
  factory,
}: {
  regionStore: MagicRevealRegionStore;
  paletteVariant: string;
  canvasW: number;
  canvasH: number;
  /**
   * Canvas factory. In a browser/Remotion Chromium pass `() =>
   * document.createElement("canvas")`. Allows `packages/canvas` to stay
   * DOM-agnostic at the type level (so node tests can stub).
   */
  factory: () => HTMLCanvasElement;
}): HTMLCanvasElement {
  const canvas = factory();
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("buildPreColoredCanvas: 2D context unavailable");
  }

  const regionW = regionStore.width;
  const regionH = regionStore.height;

  // Hex → RGB cache, keyed by region ID. Avoids reparsing the same hex string
  // up to canvasW×canvasH times.
  const colorCache = new Map<
    number,
    { r: number; g: number; b: number } | null
  >();
  const getRgb = (rid: number) => {
    const cached = colorCache.get(rid);
    if (cached !== undefined) return cached;
    const hex = regionStore.getColorForRegion(rid, paletteVariant);
    if (!hex) {
      colorCache.set(rid, null);
      return null;
    }
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const rgb = m
      ? {
          r: parseInt(m[1], 16),
          g: parseInt(m[2], 16),
          b: parseInt(m[3], 16),
        }
      : null;
    colorCache.set(rid, rgb);
    return rgb;
  };

  const imageData = ctx.createImageData(canvasW, canvasH);
  const data = imageData.data;

  for (let cy = 0; cy < canvasH; cy++) {
    const ry = Math.floor((cy / canvasH) * regionH);
    for (let cx = 0; cx < canvasW; cx++) {
      const rx = Math.floor((cx / canvasW) * regionW);
      const rid = regionStore.getRegionIdAt(rx, ry);
      if (rid === 0) continue; // boundary — leave transparent
      const rgb = getRgb(rid);
      if (!rgb) continue;
      const i = (cy * canvasW + cx) * 4;
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Apply one magic-reveal brush stamp (or short segment) to `destCtx`.
 *
 * Mirrors the source-in flow in `ImageCanvas.tsx`:
 *   1. Clear the temp canvas
 *   2. Draw the textured brush dab onto temp (colour irrelevant — source-in
 *      replaces it)
 *   3. `globalCompositeOperation = 'source-in'` + drawImage(preColored) →
 *      temp's alpha mask now contains preColored's per-pixel colours
 *   4. Composite temp onto `destCtx`
 *
 * Reuse `tempCanvas` across calls — sized at preColoredCanvas dimensions.
 * Accumulating into `destCtx` (no per-frame clear in the live app) is what
 * makes successive stamps build up. In Remotion the caller clears `destCtx`
 * once at the start of each frame and replays all stamps up to the current
 * stroke index, so the result is identical at any frame.
 */
export function paintMagicRevealStamp({
  destCtx,
  tempCanvas,
  preColoredCanvas,
  x,
  y,
  lastX,
  lastY,
  radius,
  pressure = 0.5,
  dpr = 1,
}: {
  destCtx: CanvasRenderingContext2D;
  /**
   * Reusable temp canvas, sized at preColoredCanvas dimensions. The live app
   * reuses one across all strokes; the spike does the same.
   */
  tempCanvas: HTMLCanvasElement;
  /** Pre-coloured canvas built once via `buildPreColoredCanvas`. */
  preColoredCanvas: HTMLCanvasElement;
  /** Stamp centre, in CSS pixels (matching destCtx's transform). */
  x: number;
  y: number;
  /**
   * Previous stamp position. When non-null, drawTexturedStroke draws a
   * connecting segment instead of an isolated dab — gives smooth strokes
   * when the caller stamps frequently.
   */
  lastX: number | null;
  lastY: number | null;
  /** Brush radius in CSS pixels. */
  radius: number;
  /** Stylus pressure 0..1, defaults to 0.5 like the live default. */
  pressure?: number;
  /** Device pixel ratio. 1 in Remotion (no DPR scaling needed). */
  dpr?: number;
}): void {
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  // 1. Clear temp
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

  // 2. Draw textured brush dab onto temp. Colour is a placeholder — step 3
  // overwrites it via source-in.
  tempCtx.save();
  tempCtx.scale(dpr, dpr);
  drawTexturedStroke({
    ctx: tempCtx,
    x,
    y,
    lastX,
    lastY,
    color: "#FFFFFF",
    radius,
    brushType: "marker",
    pressure,
  });
  tempCtx.restore();

  // 3. source-in: keep temp's alpha shape, take preColored's colours
  tempCtx.globalCompositeOperation = "source-in";
  tempCtx.drawImage(preColoredCanvas, 0, 0);
  tempCtx.globalCompositeOperation = "source-over";

  // 4. Composite recoloured dab onto destination. setTransform reset matches
  // the live app — drawImage of a same-sized canvas should be 1:1.
  destCtx.save();
  destCtx.setTransform(1, 0, 0, 1, 0, 0);
  destCtx.drawImage(tempCanvas, 0, 0);
  destCtx.restore();
}
