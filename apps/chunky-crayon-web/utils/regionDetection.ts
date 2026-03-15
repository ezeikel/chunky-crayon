/**
 * Region Detection Utility for Magic Brush Feature
 *
 * Detects all distinct fillable regions in a coloring page image.
 * Uses scanline flood fill to identify connected white/light areas
 * bounded by dark lines.
 */

export type Region = {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  pixelCount: number;
  /** Sample pixels from this region for verification */
  samplePixels: Array<{ x: number; y: number }>;
};

export type RegionMap = {
  /** All detected regions */
  regions: Region[];
  /** Mapping from pixel index to region ID (0 = unassigned/boundary) */
  pixelToRegion: Uint16Array;
  /** Canvas dimensions */
  width: number;
  height: number;
};

/** Minimum number of pixels for a region to be considered valid */
const MIN_REGION_SIZE = 100;

/** Threshold for detecting dark boundary pixels (0-255, lower = darker) */
const BOUNDARY_LUMINANCE_THRESHOLD = 200;

/**
 * Check if a pixel is a dark boundary line.
 * Uses luminance calculation to detect dark pixels.
 */
function isBoundaryPixel(
  imageData: ImageData,
  x: number,
  y: number,
  threshold: number = BOUNDARY_LUMINANCE_THRESHOLD,
): boolean {
  const index = (y * imageData.width + x) * 4;
  const r = imageData.data[index];
  const g = imageData.data[index + 1];
  const b = imageData.data[index + 2];
  const a = imageData.data[index + 3];

  // Transparent pixels are not boundaries
  if (a < 128) {
    return false;
  }

  // Calculate luminance (perceived brightness)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Pixel is a boundary if it's dark enough
  return luminance < threshold;
}

/**
 * Check if a pixel is already colored (not white/light)
 */
function isColoredPixel(imageData: ImageData, x: number, y: number): boolean {
  const index = (y * imageData.width + x) * 4;
  const r = imageData.data[index];
  const g = imageData.data[index + 1];
  const b = imageData.data[index + 2];
  const a = imageData.data[index + 3];

  // Transparent = not colored
  if (a < 128) return false;

  // Check if it's close to white (fillable area)
  // White areas have high values in all channels
  const isWhitish = r > 240 && g > 240 && b > 240;

  // If it's whitish, it's not colored yet (fillable)
  // If it's not whitish and not a boundary, it's been colored
  return !isWhitish;
}

/**
 * Check if a pixel can be assigned to a region (is fillable).
 * A pixel is fillable if it's:
 * - Within bounds
 * - Not a boundary (dark line)
 * - Not already assigned to a region
 * - Not already colored
 */
function isPixelFillable(
  imageData: ImageData,
  boundaryData: ImageData,
  pixelToRegion: Uint16Array,
  x: number,
  y: number,
): boolean {
  const { width, height } = imageData;

  // Bounds check
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return false;
  }

  const pixelIndex = y * width + x;

  // Already assigned to a region
  if (pixelToRegion[pixelIndex] !== 0) {
    return false;
  }

  // Check boundary image for dark lines
  if (isBoundaryPixel(boundaryData, x, y)) {
    return false;
  }

  // Check if already colored by user
  if (isColoredPixel(imageData, x, y)) {
    return false;
  }

  return true;
}

/**
 * Perform scanline flood fill detection to find all pixels in a region.
 * Uses the efficient scanline algorithm for performance.
 */
function floodFillDetect(
  imageData: ImageData,
  boundaryData: ImageData,
  pixelToRegion: Uint16Array,
  startX: number,
  startY: number,
  regionId: number,
): Array<{ x: number; y: number }> {
  const { width, height } = imageData;
  const pixels: Array<{ x: number; y: number }> = [];
  const stack: [number, number][] = [[startX, startY]];

  while (stack.length > 0) {
    let [x, y] = stack.pop()!;

    // Skip if out of bounds or already processed
    if (x < 0 || x >= width || y < 0 || y >= height) {
      continue;
    }

    const startKey = y * width + x;
    if (pixelToRegion[startKey] !== 0) {
      continue;
    }

    // Move left to find start of scanline
    while (
      x > 0 &&
      isPixelFillable(imageData, boundaryData, pixelToRegion, x - 1, y)
    ) {
      x--;
    }

    let spanAbove = false;
    let spanBelow = false;

    // Fill the scanline from left to right
    while (
      x < width &&
      isPixelFillable(imageData, boundaryData, pixelToRegion, x, y)
    ) {
      const pixelKey = y * width + x;
      pixelToRegion[pixelKey] = regionId;
      pixels.push({ x, y });

      // Check pixel above
      if (y > 0) {
        const aboveKey = (y - 1) * width + x;
        const aboveCanFill =
          pixelToRegion[aboveKey] === 0 &&
          isPixelFillable(imageData, boundaryData, pixelToRegion, x, y - 1);

        if (!spanAbove && aboveCanFill) {
          stack.push([x, y - 1]);
          spanAbove = true;
        } else if (spanAbove && !aboveCanFill) {
          spanAbove = false;
        }
      }

      // Check pixel below
      if (y < height - 1) {
        const belowKey = (y + 1) * width + x;
        const belowCanFill =
          pixelToRegion[belowKey] === 0 &&
          isPixelFillable(imageData, boundaryData, pixelToRegion, x, y + 1);

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

  return pixels;
}

/**
 * Calculate bounding box for a set of pixels.
 */
function calculateBounds(
  pixels: Array<{ x: number; y: number }>,
): Region['bounds'] {
  if (pixels.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

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

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Calculate centroid (center of mass) for a set of pixels.
 */
function calculateCentroid(
  pixels: Array<{ x: number; y: number }>,
): Region['centroid'] {
  if (pixels.length === 0) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;

  for (const { x, y } of pixels) {
    sumX += x;
    sumY += y;
  }

  return {
    x: Math.round(sumX / pixels.length),
    y: Math.round(sumY / pixels.length),
  };
}

/**
 * Sample evenly distributed pixels from a region for verification.
 */
function sampleFromPixels(
  pixels: Array<{ x: number; y: number }>,
  count: number,
): Array<{ x: number; y: number }> {
  if (pixels.length <= count) {
    return [...pixels];
  }

  const result: Array<{ x: number; y: number }> = [];
  const step = Math.floor(pixels.length / count);

  for (let i = 0; i < count; i++) {
    result.push(pixels[i * step]);
  }

  return result;
}

/**
 * Detect all distinct fillable regions in a canvas.
 *
 * @param drawingCanvas - The canvas with user's coloring (to detect already colored areas)
 * @param boundaryCanvas - The canvas with line art (to detect boundaries)
 * @param minRegionSize - Minimum pixel count for a region to be valid
 * @returns RegionMap containing all detected regions
 */
export function detectAllRegions(
  drawingCanvas: HTMLCanvasElement,
  boundaryCanvas: HTMLCanvasElement,
  minRegionSize: number = MIN_REGION_SIZE,
): RegionMap {
  const { width, height } = drawingCanvas;

  const drawingCtx = drawingCanvas.getContext('2d');
  const boundaryCtx = boundaryCanvas.getContext('2d');

  if (!drawingCtx || !boundaryCtx) {
    return {
      regions: [],
      pixelToRegion: new Uint16Array(width * height),
      width,
      height,
    };
  }

  const imageData = drawingCtx.getImageData(0, 0, width, height);
  const boundaryData = boundaryCtx.getImageData(0, 0, width, height);
  const pixelToRegion = new Uint16Array(width * height);

  const regions: Region[] = [];
  let currentRegionId = 1;

  // Scan canvas in a grid pattern for efficiency
  const scanStep = 5; // Check every 5 pixels

  for (let y = 0; y < height; y += scanStep) {
    for (let x = 0; x < width; x += scanStep) {
      // Check if this pixel can start a new region
      if (isPixelFillable(imageData, boundaryData, pixelToRegion, x, y)) {
        // Flood fill to find all pixels in this region
        const regionPixels = floodFillDetect(
          imageData,
          boundaryData,
          pixelToRegion,
          x,
          y,
          currentRegionId,
        );

        if (regionPixels.length >= minRegionSize) {
          regions.push({
            id: currentRegionId,
            bounds: calculateBounds(regionPixels),
            centroid: calculateCentroid(regionPixels),
            pixelCount: regionPixels.length,
            samplePixels: sampleFromPixels(regionPixels, 5),
          });
          currentRegionId++;
        }
      }
    }
  }

  return {
    regions,
    pixelToRegion,
    width,
    height,
  };
}

/**
 * Get the region ID at a specific point.
 *
 * @param regionMap - The region map from detectAllRegions
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Region ID or 0 if no region at that point
 */
export function getRegionAtPoint(
  regionMap: RegionMap,
  x: number,
  y: number,
): number {
  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);

  if (
    pixelX < 0 ||
    pixelX >= regionMap.width ||
    pixelY < 0 ||
    pixelY >= regionMap.height
  ) {
    return 0;
  }

  const index = pixelY * regionMap.width + pixelX;
  return regionMap.pixelToRegion[index];
}

/**
 * Get region info by ID.
 */
export function getRegionById(
  regionMap: RegionMap,
  regionId: number,
): Region | undefined {
  return regionMap.regions.find((r) => r.id === regionId);
}

/**
 * Convert canvas coordinates to normalized position descriptor.
 * Used for matching with AI-assigned regions.
 */
export function getPositionDescriptor(
  centroid: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
): string {
  const normX = centroid.x / canvasWidth;
  const normY = centroid.y / canvasHeight;

  let vertical: string;
  let horizontal: string;

  if (normY < 0.33) {
    vertical = 'top';
  } else if (normY > 0.66) {
    vertical = 'bottom';
  } else {
    vertical = 'center';
  }

  if (normX < 0.33) {
    horizontal = 'left';
  } else if (normX > 0.66) {
    horizontal = 'right';
  } else {
    horizontal = 'center';
  }

  if (horizontal === 'center' && vertical === 'center') {
    return 'center';
  }

  if (horizontal === 'center') {
    return vertical;
  }

  if (vertical === 'center') {
    return `center-${horizontal}`;
  }

  return `${vertical}-${horizontal}`;
}

/**
 * Get size descriptor based on pixel count relative to total canvas.
 */
export function getSizeDescriptor(
  pixelCount: number,
  totalPixels: number,
): 'small' | 'medium' | 'large' {
  const percentage = (pixelCount / totalPixels) * 100;

  if (percentage > 10) {
    return 'large';
  } else if (percentage > 2) {
    return 'medium';
  } else {
    return 'small';
  }
}
