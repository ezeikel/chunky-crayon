/**
 * Queue-based flood fill algorithm for canvas
 * Uses a queue instead of recursion to prevent stack overflow on large areas
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
 */
export function scanlineFill(
  ctx: CanvasRenderingContext2D,
  options: FloodFillOptions,
): boolean {
  const { x, y, fillColor, tolerance = 32 } = options;
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;

  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);

  if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
    return false;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const targetColor = getPixelColor(imageData, pixelX, pixelY);

  if (colorsMatch(targetColor, fillColor, tolerance)) {
    return false;
  }

  const stack: [number, number][] = [[pixelX, pixelY]];
  let pixelsFilled = 0;

  while (stack.length > 0) {
    let [currentX, currentY] = stack.pop()!;

    // Move left to find start of scanline
    while (
      currentX > 0 &&
      colorsMatch(
        getPixelColor(imageData, currentX - 1, currentY),
        targetColor,
        tolerance,
      )
    ) {
      currentX--;
    }

    let spanAbove = false;
    let spanBelow = false;

    // Fill the scanline from left to right
    while (
      currentX < width &&
      colorsMatch(
        getPixelColor(imageData, currentX, currentY),
        targetColor,
        tolerance,
      )
    ) {
      setPixelColor(imageData, currentX, currentY, fillColor);
      pixelsFilled++;

      // Check pixel above
      if (currentY > 0) {
        const aboveMatches = colorsMatch(
          getPixelColor(imageData, currentX, currentY - 1),
          targetColor,
          tolerance,
        );
        if (!spanAbove && aboveMatches) {
          stack.push([currentX, currentY - 1]);
          spanAbove = true;
        } else if (spanAbove && !aboveMatches) {
          spanAbove = false;
        }
      }

      // Check pixel below
      if (currentY < height - 1) {
        const belowMatches = colorsMatch(
          getPixelColor(imageData, currentX, currentY + 1),
          targetColor,
          tolerance,
        );
        if (!spanBelow && belowMatches) {
          stack.push([currentX, currentY + 1]);
          spanBelow = true;
        } else if (spanBelow && !belowMatches) {
          spanBelow = false;
        }
      }

      currentX++;
    }
  }

  if (pixelsFilled > 0) {
    ctx.putImageData(imageData, 0, 0);
    return true;
  }

  return false;
}
