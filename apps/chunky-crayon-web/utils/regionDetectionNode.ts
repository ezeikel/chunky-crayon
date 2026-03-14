/**
 * Region Detection Utility — Node.js version
 *
 * Detects all distinct fillable regions in a coloring page image by
 * operating on raw RGBA pixel buffers (Uint8Array) rather than
 * HTMLCanvasElement, making it suitable for server-side / script use.
 *
 * Algorithm is a direct port of the browser-side regionDetection.ts.
 */

export type Region = {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  pixelCount: number;
};

export type RegionMap = {
  regions: Region[];
  pixelToRegion: Uint16Array;
  width: number;
  height: number;
};

/** Minimum number of pixels for a region to be considered valid */
const DEFAULT_MIN_REGION_SIZE = 100;

/** Threshold for detecting dark boundary pixels (0-255, lower = darker) */
const BOUNDARY_LUMINANCE_THRESHOLD = 200;

/**
 * Check if a pixel is a dark boundary line.
 */
function isBoundaryPixel(
  pixels: Uint8Array,
  x: number,
  y: number,
  width: number,
): boolean {
  const index = (y * width + x) * 4;
  const r = pixels[index];
  const g = pixels[index + 1];
  const b = pixels[index + 2];
  const a = pixels[index + 3];

  // Transparent pixels are not boundaries
  if (a < 128) return false;

  // Perceived luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < BOUNDARY_LUMINANCE_THRESHOLD;
}

/**
 * Check if a pixel can be assigned to a region.
 * A pixel is fillable if it's within bounds, not a boundary,
 * and not already assigned to a region.
 */
function isPixelFillable(
  pixels: Uint8Array,
  pixelToRegion: Uint16Array,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  if (x < 0 || x >= width || y < 0 || y >= height) return false;

  const pixelIndex = y * width + x;
  if (pixelToRegion[pixelIndex] !== 0) return false;
  if (isBoundaryPixel(pixels, x, y, width)) return false;

  return true;
}

/**
 * Scanline flood fill to detect all pixels in a connected region.
 */
function floodFillDetect(
  pixels: Uint8Array,
  pixelToRegion: Uint16Array,
  startX: number,
  startY: number,
  regionId: number,
  width: number,
  height: number,
): Array<{ x: number; y: number }> {
  const regionPixels: Array<{ x: number; y: number }> = [];
  const stack: [number, number][] = [[startX, startY]];

  while (stack.length > 0) {
    let [x, y] = stack.pop()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (pixelToRegion[y * width + x] !== 0) continue;

    // Move left to find start of scanline
    while (
      x > 0 &&
      isPixelFillable(pixels, pixelToRegion, x - 1, y, width, height)
    ) {
      x--;
    }

    let spanAbove = false;
    let spanBelow = false;

    // Fill the scanline left to right
    while (
      x < width &&
      isPixelFillable(pixels, pixelToRegion, x, y, width, height)
    ) {
      const pixelKey = y * width + x;
      pixelToRegion[pixelKey] = regionId;
      regionPixels.push({ x, y });

      // Check pixel above
      if (y > 0) {
        const aboveCanFill =
          pixelToRegion[(y - 1) * width + x] === 0 &&
          isPixelFillable(pixels, pixelToRegion, x, y - 1, width, height);

        if (!spanAbove && aboveCanFill) {
          stack.push([x, y - 1]);
          spanAbove = true;
        } else if (spanAbove && !aboveCanFill) {
          spanAbove = false;
        }
      }

      // Check pixel below
      if (y < height - 1) {
        const belowCanFill =
          pixelToRegion[(y + 1) * width + x] === 0 &&
          isPixelFillable(pixels, pixelToRegion, x, y + 1, width, height);

        if (!spanBelow && belowCanFill) {
          stack.push([x, y + 1]);
          spanBelow = true;
        } else if (spanBelow && !belowCanFill) {
          spanBelow = false;
        }
      }

      x++;
    }
  }

  return regionPixels;
}

/**
 * Calculate bounding box for a set of pixels.
 */
function calculateBounds(
  pixels: Array<{ x: number; y: number }>,
): Region['bounds'] {
  if (pixels.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { x, y } of pixels) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Calculate centroid (center of mass) for a set of pixels.
 * If the raw centroid falls outside the region (common for concave/wrapping
 * regions like sky-behind-character), find the closest region pixel instead.
 */
function calculateCentroid(
  pixels: Array<{ x: number; y: number }>,
  pixelToRegion: Uint16Array,
  regionId: number,
  width: number,
): Region['centroid'] {
  if (pixels.length === 0) return { x: 0, y: 0 };

  let sumX = 0;
  let sumY = 0;

  for (const { x, y } of pixels) {
    sumX += x;
    sumY += y;
  }

  const cx = Math.round(sumX / pixels.length);
  const cy = Math.round(sumY / pixels.length);

  // Check if the centroid actually falls inside this region
  const idx = cy * width + cx;
  if (
    idx >= 0 &&
    idx < pixelToRegion.length &&
    pixelToRegion[idx] === regionId
  ) {
    return { x: cx, y: cy };
  }

  // Centroid is outside the region — find the closest region pixel.
  // For large regions sample every Nth pixel to keep this fast.
  const step = pixels.length > 10000 ? Math.floor(pixels.length / 5000) : 1;
  let bestDist = Infinity;
  let bestX = pixels[0].x;
  let bestY = pixels[0].y;

  for (let i = 0; i < pixels.length; i += step) {
    const dx = pixels[i].x - cx;
    const dy = pixels[i].y - cy;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestX = pixels[i].x;
      bestY = pixels[i].y;
    }
  }

  return { x: bestX, y: bestY };
}

/**
 * Detect all distinct fillable regions from raw RGBA pixel data.
 *
 * @param pixels - Raw RGBA pixel data (4 bytes per pixel)
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param minRegionSize - Minimum pixel count for a region to be valid (default 100)
 * @returns RegionMap containing all detected regions
 */
export function detectAllRegionsFromPixels(
  pixels: Uint8Array,
  width: number,
  height: number,
  minRegionSize: number = DEFAULT_MIN_REGION_SIZE,
): RegionMap {
  const pixelToRegion = new Uint16Array(width * height);
  const regions: Region[] = [];
  let currentRegionId = 1;

  // Scan every 5th pixel for efficiency (flood fill expands to cover missed pixels)
  const scanStep = 5;

  for (let y = 0; y < height; y += scanStep) {
    for (let x = 0; x < width; x += scanStep) {
      if (isPixelFillable(pixels, pixelToRegion, x, y, width, height)) {
        const regionPixels = floodFillDetect(
          pixels,
          pixelToRegion,
          x,
          y,
          currentRegionId,
          width,
          height,
        );

        if (regionPixels.length >= minRegionSize) {
          regions.push({
            id: currentRegionId,
            bounds: calculateBounds(regionPixels),
            centroid: calculateCentroid(
              regionPixels,
              pixelToRegion,
              currentRegionId,
              width,
            ),
            pixelCount: regionPixels.length,
          });
          currentRegionId++;
        }
      }
    }
  }

  return { regions, pixelToRegion, width, height };
}
