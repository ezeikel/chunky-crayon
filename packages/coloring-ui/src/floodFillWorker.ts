/**
 * Web Worker for off-main-thread flood fill operations.
 *
 * Receives ImageData + fill parameters, runs scanline fill,
 * returns the modified ImageData. This keeps the main thread
 * responsive during large fill operations.
 */

// Inline the fill logic since workers can't import from packages easily.
// This is a self-contained scanline fill optimized for the worker context.

type RGBAColor = { r: number; g: number; b: number; a: number };

type FillMessage = {
  type: "fill";
  imageData: ImageData;
  boundaryData: ImageData | null;
  x: number;
  y: number;
  fillColor: RGBAColor;
  tolerance: number;
  boundaryThreshold: number;
  gapClosingRadius: number;
};

type FillResult = {
  type: "fill-result";
  imageData: ImageData | null;
  filled: boolean;
  pixelsFilled: number;
};

function getPixelColor(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): RGBAColor {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

function setPixelColor(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  color: RGBAColor,
): void {
  const i = (y * width + x) * 4;
  data[i] = color.r;
  data[i + 1] = color.g;
  data[i + 2] = color.b;
  data[i + 3] = color.a;
}

function colorsMatch(c1: RGBAColor, c2: RGBAColor, tolerance: number): boolean {
  return (
    Math.abs(c1.r - c2.r) <= tolerance &&
    Math.abs(c1.g - c2.g) <= tolerance &&
    Math.abs(c1.b - c2.b) <= tolerance &&
    Math.abs(c1.a - c2.a) <= tolerance
  );
}

function isBoundaryPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  threshold: number,
): boolean {
  const i = (y * width + x) * 4;
  const a = data[i + 3];
  if (a < 128) return false;
  const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return luminance < threshold;
}

function dilateBoundaries(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  threshold: number,
): void {
  const isBound = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isBoundaryPixel(data, width, x, y, threshold)) {
        isBound[y * width + x] = 1;
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isBound[y * width + x]) continue;
      let found = false;
      for (let dy = -radius; dy <= radius && !found; dy++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (Math.abs(dx) + Math.abs(dy) > radius) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (isBound[ny * width + nx]) found = true;
        }
      }
      if (found) {
        const i = (y * width + x) * 4;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }
  }
}

function scanlineFillWorker(
  imageData: ImageData,
  boundaryData: Uint8ClampedArray | null,
  boundaryWidth: number,
  x: number,
  y: number,
  fillColor: RGBAColor,
  tolerance: number,
  boundaryThreshold: number,
): { filled: boolean; pixelsFilled: number } {
  const { width, height, data } = imageData;
  const pixelX = Math.floor(x);
  const pixelY = Math.floor(y);

  if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) {
    return { filled: false, pixelsFilled: 0 };
  }

  if (
    boundaryData &&
    isBoundaryPixel(
      boundaryData,
      boundaryWidth,
      pixelX,
      pixelY,
      boundaryThreshold,
    )
  ) {
    return { filled: false, pixelsFilled: 0 };
  }

  const targetColor = getPixelColor(data, width, pixelX, pixelY);
  if (colorsMatch(targetColor, fillColor, tolerance)) {
    return { filled: false, pixelsFilled: 0 };
  }

  const canFill = (px: number, py: number): boolean => {
    if (
      !colorsMatch(getPixelColor(data, width, px, py), targetColor, tolerance)
    )
      return false;
    if (
      boundaryData &&
      isBoundaryPixel(boundaryData, boundaryWidth, px, py, boundaryThreshold)
    )
      return false;
    return true;
  };

  const stack: [number, number][] = [[pixelX, pixelY]];
  const visited = new Set<number>();
  let pixelsFilled = 0;

  while (stack.length > 0) {
    let [cx, cy] = stack.pop()!;
    const startKey = cy * width + cx;
    if (visited.has(startKey)) continue;

    while (cx > 0 && canFill(cx - 1, cy)) cx--;

    let spanAbove = false;
    let spanBelow = false;

    while (cx < width && canFill(cx, cy)) {
      const key = cy * width + cx;
      if (!visited.has(key)) {
        visited.add(key);
        setPixelColor(data, width, cx, cy, fillColor);
        pixelsFilled++;
      }

      if (cy > 0) {
        const aboveKey = (cy - 1) * width + cx;
        const aboveCanFill = !visited.has(aboveKey) && canFill(cx, cy - 1);
        if (!spanAbove && aboveCanFill) {
          stack.push([cx, cy - 1]);
          spanAbove = true;
        } else if (spanAbove && !aboveCanFill) {
          spanAbove = false;
        }
      }

      if (cy < height - 1) {
        const belowKey = (cy + 1) * width + cx;
        const belowCanFill = !visited.has(belowKey) && canFill(cx, cy + 1);
        if (!spanBelow && belowCanFill) {
          stack.push([cx, cy + 1]);
          spanBelow = true;
        } else if (spanBelow && !belowCanFill) {
          spanBelow = false;
        }
      }

      cx++;
    }
  }

  return { filled: pixelsFilled > 0, pixelsFilled };
}

// Worker message handler
self.onmessage = (e: MessageEvent<FillMessage>) => {
  const msg = e.data;

  if (msg.type === "fill") {
    const {
      imageData,
      boundaryData,
      x,
      y,
      fillColor,
      tolerance,
      boundaryThreshold,
      gapClosingRadius,
    } = msg;

    // Apply gap-closing dilation to boundary data
    if (boundaryData && gapClosingRadius > 0) {
      dilateBoundaries(
        boundaryData.data,
        boundaryData.width,
        boundaryData.height,
        gapClosingRadius,
        boundaryThreshold,
      );
    }

    const { filled, pixelsFilled } = scanlineFillWorker(
      imageData,
      boundaryData?.data ?? null,
      boundaryData?.width ?? 0,
      x,
      y,
      fillColor,
      tolerance,
      boundaryThreshold,
    );

    const result: FillResult = {
      type: "fill-result",
      imageData: filled ? imageData : null,
      filled,
      pixelsFilled,
    };

    // Use structured clone transfer for zero-copy ImageData
    const transferables: Transferable[] = filled ? [imageData.data.buffer] : [];
    (self as unknown as Worker).postMessage(result, transferables);
  }
};
