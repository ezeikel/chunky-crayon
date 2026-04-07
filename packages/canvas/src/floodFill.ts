/**
 * Queue-based flood fill algorithm for canvas
 * Uses a queue instead of recursion to prevent stack overflow on large areas
 *
 * Supports boundary-aware filling where boundaries are detected from a separate
 * reference canvas (e.g., SVG lines) while filling is applied to the drawing canvas.
 */

type RGBAColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type FloodFillOptions = {
  x: number;
  y: number;
  fillColor: RGBAColor;
  tolerance?: number; // 0-255, handles anti-aliased edges
  /**
   * Optional boundary image data from a reference canvas (e.g., SVG lines + current drawing).
   * When provided, the algorithm checks boundaries against this data instead of the fill canvas.
   * This enables filling regions bounded by lines that exist on a separate canvas layer.
   */
  boundaryImageData?: ImageData;
  /**
   * Tolerance for detecting boundary pixels (darker pixels = boundaries).
   * Pixels with luminance below this threshold are treated as boundaries.
   * Default: 200 (treats dark lines as boundaries)
   */
  boundaryThreshold?: number;
  /**
   * Number of pixels to dilate boundary lines before filling.
   * Closes small gaps in SVG line art that cause fill bleeding.
   * 0 = no dilation (default for backwards compatibility).
   * 1-2 = recommended for most coloring pages.
   */
  gapClosingRadius?: number;
};

/**
 * Parse hex color to RGBA
 */
export function hexToRGBA(hex: string): RGBAColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0, a: 255 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: 255,
  };
}

/**
 * Check if two colors match within tolerance
 */
function colorsMatch(c1: RGBAColor, c2: RGBAColor, tolerance: number): boolean {
  return (
    Math.abs(c1.r - c2.r) <= tolerance &&
    Math.abs(c1.g - c2.g) <= tolerance &&
    Math.abs(c1.b - c2.b) <= tolerance &&
    Math.abs(c1.a - c2.a) <= tolerance
  );
}

/**
 * Get color at pixel position
 */
function getPixelColor(imageData: ImageData, x: number, y: number): RGBAColor {
  const index = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[index],
    g: imageData.data[index + 1],
    b: imageData.data[index + 2],
    a: imageData.data[index + 3],
  };
}

/**
 * Set color at pixel position
 */
function setPixelColor(
  imageData: ImageData,
  x: number,
  y: number,
  color: RGBAColor,
): void {
  const index = (y * imageData.width + x) * 4;
  imageData.data[index] = color.r;
  imageData.data[index + 1] = color.g;
  imageData.data[index + 2] = color.b;
  imageData.data[index + 3] = color.a;
}

/**
 * Check if a pixel is a boundary (dark line) in the boundary image data.
 * Uses luminance calculation to detect dark pixels that represent lines.
 */
function isBoundaryPixel(
  boundaryImageData: ImageData,
  x: number,
  y: number,
  threshold: number,
): boolean {
  const index = (y * boundaryImageData.width + x) * 4;
  const r = boundaryImageData.data[index];
  const g = boundaryImageData.data[index + 1];
  const b = boundaryImageData.data[index + 2];
  const a = boundaryImageData.data[index + 3];

  // If pixel is transparent, it's not a boundary
  if (a < 128) {
    return false;
  }

  // Calculate luminance (perceived brightness)
  // Using standard luminance formula: 0.299*R + 0.587*G + 0.114*B
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  // Pixel is a boundary if it's dark enough (below threshold)
  return luminance < threshold;
}

/**
 * Dilate boundary pixels to close small gaps in line art.
 * Uses morphological dilation: for each boundary pixel, mark its neighbors
 * within the given radius as boundaries too. This bridges small gaps where
 * SVG lines don't quite meet, preventing fill bleeding.
 *
 * Mutates the provided ImageData in place.
 */
export function dilateBoundaries(
  imageData: ImageData,
  radius: number,
  threshold: number,
): void {
  const { width, height, data } = imageData;

  // First pass: identify all boundary pixels
  const isBoundary = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 128) continue;
      const luminance =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (luminance < threshold) {
        isBoundary[y * width + x] = 1;
      }
    }
  }

  // Second pass: for each non-boundary pixel, check if any boundary pixel
  // is within `radius` — if so, mark it as a boundary (darken it)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isBoundary[y * width + x]) continue; // Already a boundary

      let foundNearby = false;
      for (let dy = -radius; dy <= radius && !foundNearby; dy++) {
        for (let dx = -radius; dx <= radius && !foundNearby; dx++) {
          if (dx === 0 && dy === 0) continue;
          // Use diamond/Manhattan distance for faster check
          if (Math.abs(dx) + Math.abs(dy) > radius) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (isBoundary[ny * width + nx]) {
            foundNearby = true;
          }
        }
      }

      if (foundNearby) {
        // Darken this pixel to make it a boundary
        const idx = (y * width + x) * 4;
        data[idx] = 0; // R
        data[idx + 1] = 0; // G
        data[idx + 2] = 0; // B
        data[idx + 3] = 255; // A
      }
    }
  }
}

/**
 * Perform flood fill on canvas context
 * Returns true if any pixels were filled
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  options: FloodFillOptions,
): boolean {
  const { x, y, fillColor, tolerance = 32 } = options;
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  // Get pixel coordinates (account for DPR)
  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);

  // Bounds check
  if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
    return false;
  }

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const targetColor = getPixelColor(imageData, pixelX, pixelY);

  // Don't fill if clicking on the same color
  if (colorsMatch(targetColor, fillColor, tolerance)) {
    return false;
  }

  // Queue-based flood fill
  const queue: [number, number][] = [[pixelX, pixelY]];
  const visited = new Set<string>();
  let pixelsFilled = 0;

  while (queue.length > 0) {
    const [currentX, currentY] = queue.shift()!;
    const key = `${currentX},${currentY}`;

    // Skip if already visited or out of bounds
    if (
      visited.has(key) ||
      currentX < 0 ||
      currentX >= width ||
      currentY < 0 ||
      currentY >= height
    ) {
      continue;
    }

    visited.add(key);

    const currentColor = getPixelColor(imageData, currentX, currentY);

    // Check if this pixel matches the target color (within tolerance)
    if (!colorsMatch(currentColor, targetColor, tolerance)) {
      continue;
    }

    // Fill this pixel
    setPixelColor(imageData, currentX, currentY, fillColor);
    pixelsFilled++;

    // Add neighbors to queue (4-connected: up, down, left, right)
    queue.push([currentX + 1, currentY]);
    queue.push([currentX - 1, currentY]);
    queue.push([currentX, currentY + 1]);
    queue.push([currentX, currentY - 1]);
  }

  // Apply changes if any pixels were filled
  if (pixelsFilled > 0) {
    ctx.putImageData(imageData, 0, 0);
    return true;
  }

  return false;
}

/**
 * Optimized scanline flood fill - faster for large areas
 * Uses horizontal scanlines to reduce queue operations
 *
 * When boundaryImageData is provided, the algorithm checks for dark line boundaries
 * in that image data, enabling filling of regions bounded by lines on separate canvas layers.
 */
export function scanlineFill(
  ctx: CanvasRenderingContext2D,
  options: FloodFillOptions,
): boolean {
  const {
    x,
    y,
    fillColor,
    tolerance = 32,
    boundaryImageData,
    boundaryThreshold = 200,
    gapClosingRadius = 0,
  } = options;
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);

  console.log("[FloodFill] Starting fill at:", {
    pixelX,
    pixelY,
    fillColor,
    tolerance,
    boundaryThreshold,
    gapClosingRadius,
  });

  if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
    console.log("[FloodFill] Out of bounds");
    return false;
  }

  // Apply gap-closing dilation to boundary data if requested
  if (boundaryImageData && gapClosingRadius > 0) {
    dilateBoundaries(boundaryImageData, gapClosingRadius, boundaryThreshold);
    console.log(
      `[FloodFill] Applied gap-closing dilation with radius ${gapClosingRadius}`,
    );
  }

  // If we have boundary data, check if we clicked on a boundary line
  if (boundaryImageData) {
    const isBoundary = isBoundaryPixel(
      boundaryImageData,
      pixelX,
      pixelY,
      boundaryThreshold,
    );
    console.log("[FloodFill] Boundary check at click point:", { isBoundary });
    if (isBoundary) {
      // Clicked on a line, don't fill
      console.log("[FloodFill] Clicked on boundary line, not filling");
      return false;
    }
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const targetColor = getPixelColor(imageData, pixelX, pixelY);

  console.log("[FloodFill] Target color (color being replaced):", targetColor);
  console.log("[FloodFill] Fill color (new color):", fillColor);
  console.log(
    "[FloodFill] Colors match?:",
    colorsMatch(targetColor, fillColor, tolerance),
  );

  if (colorsMatch(targetColor, fillColor, tolerance)) {
    console.log("[FloodFill] Target and fill colors match - nothing to do");
    return false;
  }

  // Helper to check if a pixel can be filled
  // Must match target color AND not be a boundary in the boundary image
  const canFillPixel = (px: number, py: number): boolean => {
    // First check if it matches the target color in the drawing canvas
    if (
      !colorsMatch(getPixelColor(imageData, px, py), targetColor, tolerance)
    ) {
      return false;
    }
    // If we have boundary data, also check it's not a boundary pixel
    if (boundaryImageData) {
      if (isBoundaryPixel(boundaryImageData, px, py, boundaryThreshold)) {
        return false;
      }
    }
    return true;
  };

  const stack: [number, number][] = [[pixelX, pixelY]];
  // Use a Set for visited pixels to prevent re-processing
  const visited = new Set<number>();
  let pixelsFilled = 0;

  while (stack.length > 0) {
    let [currentX, currentY] = stack.pop()!;

    // Skip if already visited
    const startKey = currentY * width + currentX;
    if (visited.has(startKey)) {
      continue;
    }

    // Move left to find start of scanline, checking boundaries
    while (currentX > 0 && canFillPixel(currentX - 1, currentY)) {
      currentX--;
    }

    let spanAbove = false;
    let spanBelow = false;

    // Fill the scanline from left to right
    while (currentX < width && canFillPixel(currentX, currentY)) {
      const pixelKey = currentY * width + currentX;
      if (!visited.has(pixelKey)) {
        visited.add(pixelKey);
        setPixelColor(imageData, currentX, currentY, fillColor);
        pixelsFilled++;
      }

      // Check pixel above
      if (currentY > 0) {
        const aboveKey = (currentY - 1) * width + currentX;
        const aboveCanFill =
          !visited.has(aboveKey) && canFillPixel(currentX, currentY - 1);
        if (!spanAbove && aboveCanFill) {
          stack.push([currentX, currentY - 1]);
          spanAbove = true;
        } else if (spanAbove && !aboveCanFill) {
          spanAbove = false;
        }
      }

      // Check pixel below
      if (currentY < height - 1) {
        const belowKey = (currentY + 1) * width + currentX;
        const belowCanFill =
          !visited.has(belowKey) && canFillPixel(currentX, currentY + 1);
        if (!spanBelow && belowCanFill) {
          stack.push([currentX, currentY + 1]);
          spanBelow = true;
        } else if (spanBelow && !belowCanFill) {
          spanBelow = false;
        }
      }

      currentX++;
    }
  }

  if (pixelsFilled > 0) {
    console.log("[FloodFill] Filled", pixelsFilled, "pixels");
    ctx.putImageData(imageData, 0, 0);
    return true;
  }

  console.log("[FloodFill] No pixels filled");
  return false;
}
