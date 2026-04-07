/**
 * Async flood fill that runs in a Web Worker when available.
 * Falls back to synchronous scanlineFill on the main thread.
 */

import {
  scanlineFill,
  hexToRGBA,
  dilateBoundaries,
} from "@one-colored-pixel/canvas";

type AsyncFillOptions = {
  drawingCtx: CanvasRenderingContext2D;
  boundaryImageData: ImageData;
  x: number;
  y: number;
  color: string;
  tolerance?: number;
  boundaryThreshold?: number;
  gapClosingRadius?: number;
};

type AsyncFillResult = {
  filled: boolean;
  imageData: ImageData | null;
};

let worker: Worker | null = null;
let workerSupported: boolean | null = null;

/** Check if Web Workers are available in this environment */
function isWorkerSupported(): boolean {
  if (workerSupported !== null) return workerSupported;
  workerSupported =
    typeof Worker !== "undefined" && typeof window !== "undefined";
  return workerSupported;
}

/** Get or create the fill worker */
function getWorker(): Worker | null {
  if (!isWorkerSupported()) return null;

  if (!worker) {
    try {
      worker = new Worker(new URL("./floodFillWorker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      // Worker creation failed (e.g., CSP, bundler issue)
      workerSupported = false;
      return null;
    }
  }

  return worker;
}

/**
 * Perform flood fill asynchronously via Web Worker.
 * Falls back to synchronous fill on the main thread if workers aren't available.
 *
 * @returns Promise resolving to whether fill was performed
 */
export async function asyncFloodFill(
  options: AsyncFillOptions,
): Promise<boolean> {
  const {
    drawingCtx,
    boundaryImageData,
    x,
    y,
    color,
    tolerance = 48,
    boundaryThreshold = 180,
    gapClosingRadius = 2,
  } = options;

  const canvas = drawingCtx.canvas;
  const fillWorker = getWorker();

  if (fillWorker) {
    // Worker path: send ImageData to worker, get back filled ImageData
    const imageData = drawingCtx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const fillColor = hexToRGBA(color);

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        // Worker took too long — fallback to sync
        console.warn("[asyncFill] Worker timeout, falling back to sync");
        resolve(syncFill(options));
      }, 3000);

      fillWorker.onmessage = (e) => {
        clearTimeout(timeout);
        const result = e.data as AsyncFillResult;
        if (result.filled && result.imageData) {
          drawingCtx.putImageData(result.imageData, 0, 0);
        }
        resolve(result.filled);
      };

      fillWorker.onerror = () => {
        clearTimeout(timeout);
        console.warn("[asyncFill] Worker error, falling back to sync");
        resolve(syncFill(options));
      };

      // Transfer ImageData buffers to worker (zero-copy)
      fillWorker.postMessage(
        {
          type: "fill",
          imageData,
          boundaryData: boundaryImageData,
          x,
          y,
          fillColor,
          tolerance,
          boundaryThreshold,
          gapClosingRadius,
        },
        [imageData.data.buffer, boundaryImageData.data.buffer],
      );
    });
  }

  // Fallback: synchronous fill on main thread
  return syncFill(options);
}

/** Synchronous fallback fill (current behavior) */
function syncFill(options: AsyncFillOptions): boolean {
  const {
    drawingCtx,
    boundaryImageData,
    x,
    y,
    color,
    tolerance = 48,
    boundaryThreshold = 180,
    gapClosingRadius = 2,
  } = options;

  const fillColor = hexToRGBA(color);
  return scanlineFill(drawingCtx, {
    x,
    y,
    fillColor,
    tolerance,
    boundaryImageData,
    boundaryThreshold,
    gapClosingRadius,
  });
}

/** Terminate the worker (e.g., on unmount) */
export function terminateFillWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}
