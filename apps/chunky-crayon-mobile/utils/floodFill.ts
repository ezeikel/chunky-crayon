import { SkImage, Skia } from "@shopify/react-native-skia";

type RGBA = [number, number, number, number];

const hexToRgba = (hex: string): RGBA => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, 255];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    255,
  ];
};

const colorsMatch = (a: RGBA, b: RGBA, tolerance: number = 32): boolean => {
  return (
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance
  );
};

const getPixelIndex = (x: number, y: number, width: number): number => {
  return (y * width + x) * 4;
};

const getPixelColor = (
  pixels: Uint8Array,
  x: number,
  y: number,
  width: number,
): RGBA => {
  const idx = getPixelIndex(x, y, width);
  return [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
};

const setPixelColor = (
  pixels: Uint8Array,
  x: number,
  y: number,
  width: number,
  color: RGBA,
): void => {
  const idx = getPixelIndex(x, y, width);
  pixels[idx] = color[0];
  pixels[idx + 1] = color[1];
  pixels[idx + 2] = color[2];
  pixels[idx + 3] = color[3];
};

export type FloodFillResult = {
  image: SkImage;
  filledPixelCount: number;
};

/**
 * Performs a flood fill operation on a Skia image.
 * Uses a scanline algorithm for better performance.
 */
export const floodFill = async (
  image: SkImage,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance: number = 32,
): Promise<FloodFillResult | null> => {
  const width = image.width();
  const height = image.height();

  // Clamp start coordinates
  const x = Math.floor(Math.max(0, Math.min(width - 1, startX)));
  const y = Math.floor(Math.max(0, Math.min(height - 1, startY)));

  // Get pixel data from the image
  const pixelData = image.readPixels(0, 0, {
    width,
    height,
    colorType: 4, // RGBA_8888
    alphaType: 1, // Unpremul
  });

  if (!pixelData) {
    console.warn("Failed to read pixel data from image");
    return null;
  }

  const pixels = new Uint8Array(pixelData);
  const targetColor = getPixelColor(pixels, x, y, width);
  const fillColor = hexToRgba(fillColorHex);

  // Don't fill if target color matches fill color
  if (colorsMatch(targetColor, fillColor, 5)) {
    return null;
  }

  // Don't fill on black lines (stroke boundaries)
  if (targetColor[0] < 30 && targetColor[1] < 30 && targetColor[2] < 30) {
    return null;
  }

  // Scanline flood fill algorithm
  const stack: [number, number][] = [[x, y]];
  const visited = new Set<string>();
  let filledPixelCount = 0;

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    const key = `${cx},${cy}`;

    if (visited.has(key)) continue;
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

    const currentColor = getPixelColor(pixels, cx, cy, width);
    if (!colorsMatch(currentColor, targetColor, tolerance)) continue;

    visited.add(key);

    // Find the leftmost pixel in this row that matches
    let left = cx;
    while (left > 0) {
      const leftColor = getPixelColor(pixels, left - 1, cy, width);
      if (!colorsMatch(leftColor, targetColor, tolerance)) break;
      left--;
    }

    // Find the rightmost pixel in this row that matches
    let right = cx;
    while (right < width - 1) {
      const rightColor = getPixelColor(pixels, right + 1, cy, width);
      if (!colorsMatch(rightColor, targetColor, tolerance)) break;
      right++;
    }

    // Fill the entire span and add neighbors above/below
    for (let i = left; i <= right; i++) {
      const spanKey = `${i},${cy}`;
      if (!visited.has(spanKey)) {
        const spanColor = getPixelColor(pixels, i, cy, width);
        if (colorsMatch(spanColor, targetColor, tolerance)) {
          setPixelColor(pixels, i, cy, width, fillColor);
          visited.add(spanKey);
          filledPixelCount++;

          // Add pixels above and below to check
          if (cy > 0) stack.push([i, cy - 1]);
          if (cy < height - 1) stack.push([i, cy + 1]);
        }
      }
    }
  }

  if (filledPixelCount === 0) {
    return null;
  }

  // Create a new image from the modified pixels
  const data = Skia.Data.fromBytes(pixels);
  const newImage = Skia.Image.MakeImage(
    {
      width,
      height,
      colorType: 4, // RGBA_8888
      alphaType: 1, // Unpremul
    },
    data,
    width * 4,
  );

  if (!newImage) {
    console.warn("Failed to create image from filled pixels");
    return null;
  }

  return { image: newImage, filledPixelCount };
};

/**
 * Creates a snapshot of the canvas as a Skia Image
 */
export const createCanvasSnapshot = async (
  canvasRef: React.RefObject<{ makeImageSnapshot: () => SkImage | null }>,
): Promise<SkImage | null> => {
  if (!canvasRef.current) return null;
  return canvasRef.current.makeImageSnapshot();
};
