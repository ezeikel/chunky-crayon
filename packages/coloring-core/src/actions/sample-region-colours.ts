/**
 * Sample a representative colour per region from a styled coloured render.
 *
 * The region store knows, for every pixel, which region it belongs to
 * (`pixelToRegion`, a Uint16Array at the rasterised line-art resolution). The
 * styled render (from colorizeLineArt) is the SAME scene, coloured. If we
 * align the render to the region-map resolution, every region's pixels in the
 * render tell us what colour a skilled colourist chose for that shape — which
 * is exactly the colour judgement the old blind-AI pass was bad at.
 *
 * "Representative colour" is deliberately the MODAL binned colour, not the
 * mean and not the centroid pixel:
 *   - the centroid pixel often lands on a highlight, shadow, or an internal
 *     line, giving a wildly wrong colour;
 *   - the mean of a multi-tone region (a striped shirt, a shaded ball) is a
 *     muddy average that exists nowhere in the image;
 *   - the modal bin = "the colour this region is mostly filled with", which is
 *     what a human would name it and what we want to snap to the palette.
 *
 * Near-black pixels (line-art bleed at boundaries) and near-white pixels
 * (areas the model left unfilled) are excluded so they don't dominate small
 * or sparsely-coloured regions.
 */
import sharp from "sharp";
import type { Rgb } from "../utils/color";

export type RegionColourSample = {
  regionId: number;
  /** Modal-bin representative colour, or null if the region had no usable pixels */
  rgb: Rgb | null;
  /**
   * Fraction of the region's pixels that were usable (not line-art-black,
   * not unfilled-white). Low coverage ⇒ the render barely coloured this
   * region ⇒ don't trust the sample.
   */
  coverage: number;
  /**
   * Fraction of the *usable* pixels that fell in (or adjacent to) the modal
   * bin. Low confidence ⇒ the region is multi-coloured / noisy ⇒ the single
   * representative colour is shaky.
   */
  confidence: number;
};

// 4 bits per channel ⇒ 16 levels ⇒ 4096 bins. Deliberately coarse: a shaded
// fill (highlight + base + shadow of one colour) must collapse into ONE
// dominant bin rather than splitting three ways and letting a mid-tone win
// (the "muddy patchy body" the review loop caught). Still fine enough that
// genuinely different object colours land in different bins.
const BITS = 4;
const SHIFT = 8 - BITS;
const LEVELS = 1 << BITS;

const binIndex = (r: number, g: number, b: number): number =>
  ((r >> SHIFT) << (BITS * 2)) | ((g >> SHIFT) << BITS) | (b >> SHIFT);

// Pixel-classification thresholds. A pixel is "line art" if very dark, and
// "unfilled" if near-white in all channels — both are excluded from the
// colour histogram.
const LINE_ART_MAX_LUMA = 50;
const UNFILLED_MIN_CHANNEL = 240;

/**
 * Sample every region's representative colour from `renderPng`.
 *
 * @param renderPng     the styled coloured render (any size; will be resized)
 * @param pixelToRegion regionId per pixel, length = width*height
 * @param regionIds     the region IDs to sample (everything else is ignored)
 * @param width         region-map width  (render is resized to this)
 * @param height        region-map height (render is resized to this)
 */
export async function sampleRegionColoursFromRender(
  renderPng: Buffer,
  pixelToRegion: Uint16Array,
  regionIds: number[],
  width: number,
  height: number,
): Promise<Map<number, RegionColourSample>> {
  // Resize the render to the EXACT region-map raster so render[i] and
  // pixelToRegion[i] refer to the same pixel. fit:'fill' (ignore aspect)
  // is correct here: the region map was rasterised from the same SVG at
  // this w×h, so the geometry matches; we only need pixel alignment.
  const { data } = await sharp(renderPng)
    .resize(width, height, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Per-region histograms. Keyed by region id → Map<bin, {count, rSum, gSum, bSum}>
  const histograms = new Map<
    number,
    Map<number, { count: number; rSum: number; gSum: number; bSum: number }>
  >();
  const usableCount = new Map<number, number>();
  const totalCount = new Map<number, number>();
  const wanted = new Set(regionIds);
  for (const id of regionIds) {
    histograms.set(id, new Map());
    usableCount.set(id, 0);
    totalCount.set(id, 0);
  }

  const pixelCount = width * height;
  for (let i = 0; i < pixelCount; i++) {
    const regionId = pixelToRegion[i];
    if (regionId === 0 || !wanted.has(regionId)) continue;

    totalCount.set(regionId, (totalCount.get(regionId) ?? 0) + 1);

    const p = i * 3;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];

    // Exclude line-art bleed and unfilled white.
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luma <= LINE_ART_MAX_LUMA) continue;
    if (
      r >= UNFILLED_MIN_CHANNEL &&
      g >= UNFILLED_MIN_CHANNEL &&
      b >= UNFILLED_MIN_CHANNEL
    ) {
      continue;
    }

    usableCount.set(regionId, (usableCount.get(regionId) ?? 0) + 1);

    const hist = histograms.get(regionId)!;
    const key = binIndex(r, g, b);
    const cell = hist.get(key);
    if (cell) {
      cell.count++;
      cell.rSum += r;
      cell.gSum += g;
      cell.bSum += b;
    } else {
      hist.set(key, { count: 1, rSum: r, gSum: g, bSum: b });
    }
  }

  const results = new Map<number, RegionColourSample>();
  for (const regionId of regionIds) {
    const total = totalCount.get(regionId) ?? 0;
    const usable = usableCount.get(regionId) ?? 0;
    const hist = histograms.get(regionId)!;

    if (total === 0 || usable === 0 || hist.size === 0) {
      results.set(regionId, {
        regionId,
        rgb: null,
        coverage: 0,
        confidence: 0,
      });
      continue;
    }

    // Modal bin = the most-populated colour bucket.
    let modal: {
      count: number;
      rSum: number;
      gSum: number;
      bSum: number;
    } | null = null;
    let modalKey = -1;
    for (const [key, cell] of hist) {
      if (modal === null || cell.count > modal.count) {
        modal = cell;
        modalKey = key;
      }
    }
    if (!modal) {
      results.set(regionId, {
        regionId,
        rgb: null,
        coverage: 0,
        confidence: 0,
      });
      continue;
    }

    // Pool the modal bin PLUS its 26 immediate neighbours in the 3D bin
    // grid. This both (a) measures confidence — how concentrated the usable
    // pixels are around the dominant colour — and (b) gives the
    // representative colour as the mean of that whole pooled mass, which
    // centres on the true fill instead of one bin's (possibly off-centre)
    // average. Tolerates the spread anti-aliasing + light shading cause
    // within one flat fill.
    const mr = (modalKey >> (BITS * 2)) & (LEVELS - 1);
    const mg = (modalKey >> BITS) & (LEVELS - 1);
    const mb = modalKey & (LEVELS - 1);
    let nearModal = 0;
    let pr = 0;
    let pg = 0;
    let pb = 0;
    for (const [key, cell] of hist) {
      const kr = (key >> (BITS * 2)) & (LEVELS - 1);
      const kg = (key >> BITS) & (LEVELS - 1);
      const kb = key & (LEVELS - 1);
      if (
        Math.abs(kr - mr) <= 1 &&
        Math.abs(kg - mg) <= 1 &&
        Math.abs(kb - mb) <= 1
      ) {
        nearModal += cell.count;
        pr += cell.rSum;
        pg += cell.gSum;
        pb += cell.bSum;
      }
    }

    results.set(regionId, {
      regionId,
      rgb:
        nearModal > 0
          ? { r: pr / nearModal, g: pg / nearModal, b: pb / nearModal }
          : {
              r: modal.rSum / modal.count,
              g: modal.gSum / modal.count,
              b: modal.bSum / modal.count,
            },
      coverage: usable / total,
      confidence: nearModal / usable,
    });
  }

  return results;
}
