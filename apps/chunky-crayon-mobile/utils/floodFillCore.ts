/**
 * Pure, allocation-light scanline flood fill over a raw RGBA_8888 byte buffer.
 *
 * This is the hot loop. It is a WORKLET so it can run on a dedicated worklet
 * runtime (a background thread that is neither the JS thread nor the UI thread)
 * via floodFillRuntime — keeping tap-to-fill off the JS thread. It is also
 * callable directly on the JS thread as a synchronous fallback.
 *
 * Ported from web's span-scanline worker (packages/coloring-ui floodFillWorker):
 *   - span scanline: walk to the left edge of a run, sweep right filling it,
 *     and push only ONE seed per contiguous above/below run (not per pixel) —
 *     far fewer stack operations than per-pixel flood fill.
 *   - `visited` is a flat Uint8Array (1 byte/pixel), NOT a Set<string> — no
 *     string keys, no hashing, no GC churn.
 *   - pixel reads are inlined (no per-call RGBA array allocation).
 *
 * Boundary behaviour matches the previous mobile floodFill: never start on a
 * near-black pixel (line art) or on a pixel already at the fill colour; spans
 * stop at any pixel outside the start colour's tolerance.
 *
 * Mutates `pixels` in place. Returns the number of pixels filled.
 */
export function scanlineFillBuffer(
  pixels: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillR: number,
  fillG: number,
  fillB: number,
  tolerance: number,
): number {
  "worklet";

  const x = Math.floor(Math.max(0, Math.min(width - 1, startX)));
  const y = Math.floor(Math.max(0, Math.min(height - 1, startY)));

  const startIdx = (y * width + x) * 4;
  const targetR = pixels[startIdx];
  const targetG = pixels[startIdx + 1];
  const targetB = pixels[startIdx + 2];

  // Don't fill if the seed already matches the fill colour (tight tolerance).
  if (
    Math.abs(targetR - fillR) <= 5 &&
    Math.abs(targetG - fillG) <= 5 &&
    Math.abs(targetB - fillB) <= 5
  ) {
    return 0;
  }

  // Don't start on black lines (stroke boundaries).
  if (targetR < 30 && targetG < 30 && targetB < 30) {
    return 0;
  }

  // A pixel can be filled if it matches the seed colour within tolerance.
  // (Inlined per-call below to avoid a closure allocation in the worklet.)
  const visited = new Uint8Array(width * height);
  // Stack of packed pixel indices (y * width + x). Plain number array — the
  // span algorithm keeps this small (one entry per above/below run).
  const stack: number[] = [y * width + x];
  let filled = 0;

  while (stack.length > 0) {
    const seed = stack.pop() as number;
    let cx = seed % width;
    const cy = (seed - cx) / width;

    if (visited[seed] === 1) continue;

    // Walk left to the start of this run.
    while (cx > 0) {
      const li = (cy * width + (cx - 1)) * 4;
      if (
        Math.abs(pixels[li] - targetR) > tolerance ||
        Math.abs(pixels[li + 1] - targetG) > tolerance ||
        Math.abs(pixels[li + 2] - targetB) > tolerance
      ) {
        break;
      }
      cx--;
    }

    let spanAbove = false;
    let spanBelow = false;

    // Sweep right across the run, filling and seeding above/below runs.
    while (cx < width) {
      const flat = cy * width + cx;
      const pi = flat * 4;

      // Stop the run at a non-matching pixel.
      if (
        Math.abs(pixels[pi] - targetR) > tolerance ||
        Math.abs(pixels[pi + 1] - targetG) > tolerance ||
        Math.abs(pixels[pi + 2] - targetB) > tolerance
      ) {
        break;
      }

      if (visited[flat] === 0) {
        visited[flat] = 1;
        pixels[pi] = fillR;
        pixels[pi + 1] = fillG;
        pixels[pi + 2] = fillB;
        pixels[pi + 3] = 255;
        filled++;
      }

      // Above
      if (cy > 0) {
        const aFlat = (cy - 1) * width + cx;
        const aPi = aFlat * 4;
        const aCanFill =
          visited[aFlat] === 0 &&
          Math.abs(pixels[aPi] - targetR) <= tolerance &&
          Math.abs(pixels[aPi + 1] - targetG) <= tolerance &&
          Math.abs(pixels[aPi + 2] - targetB) <= tolerance;
        if (!spanAbove && aCanFill) {
          stack.push(aFlat);
          spanAbove = true;
        } else if (spanAbove && !aCanFill) {
          spanAbove = false;
        }
      }

      // Below
      if (cy < height - 1) {
        const bFlat = (cy + 1) * width + cx;
        const bPi = bFlat * 4;
        const bCanFill =
          visited[bFlat] === 0 &&
          Math.abs(pixels[bPi] - targetR) <= tolerance &&
          Math.abs(pixels[bPi + 1] - targetG) <= tolerance &&
          Math.abs(pixels[bPi + 2] - targetB) <= tolerance;
        if (!spanBelow && bCanFill) {
          stack.push(bFlat);
          spanBelow = true;
        } else if (spanBelow && !bCanFill) {
          spanBelow = false;
        }
      }

      cx++;
    }
  }

  return filled;
}

/** Parse a #rrggbb hex string to an [r,g,b] tuple (0-255). */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}
