/**
 * Runs the flood-fill hot loop OFF the JS thread on a dedicated worklet runtime
 * (a background thread that is neither the JS thread nor the UI thread), so a
 * tap-to-fill on a 1024x1024 buffer never blocks the UI.
 *
 * How the pixel data crosses the thread boundary WITHOUT being copied per fill:
 * react-native-worklets 0.8 has no zero-copy buffer path (args are serialized,
 * Synchronizable copies on every access), so we use a Nitro Module instead. The
 * native `FloodFiller` HybridObject owns the RGBA buffer in C++ — that memory is
 * shared, not serialized. The HybridObject reference is `box`ed to cross into
 * the worklet runtime; inside the worklet it's `unbox`ed and `floodFill()` is
 * called, mutating the owning buffer in place in C++. Back on the JS thread we
 * read the mutated bytes out of `filler.buffer` (zero-copy view).
 *
 * Thread-safety: a Nitro ArrayBuffer is NOT thread-safe. We only read
 * `filler.buffer` AFTER the runOnRuntimeAsync promise resolves — never while the
 * worklet is still writing.
 *
 * Fallback: if the native module or the worklet runtime is unavailable (e.g. a
 * stale binary, Storybook), run the same span-scanline algorithm synchronously
 * on the JS thread via scanlineFillBuffer.
 */
import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  type WorkletRuntime,
} from "react-native-worklets";
import { NitroModules } from "react-native-nitro-modules";
import { getFloodFiller, type FloodFiller } from "@/modules/flood-fill/src";
import { scanlineFillBuffer } from "./floodFillCore";

let runtime: WorkletRuntime | null = null;
let runtimeUnavailable = false;

const getRuntime = (): WorkletRuntime | null => {
  if (runtime) return runtime;
  if (runtimeUnavailable) return null;
  try {
    runtime = createWorkletRuntime({ name: "cc-flood-fill" });
    return runtime;
  } catch {
    runtimeUnavailable = true;
    return null;
  }
};

export type OffThreadFillResult = {
  filled: number;
  /** The filled RGBA bytes (only meaningful when filled > 0). */
  pixels: Uint8Array | null;
};

/**
 * Flood fill `pixels` (RGBA_8888, width*height*4 bytes). Runs off the JS thread
 * via the native FloodFiller when available; otherwise synchronously on the JS
 * thread. Returns the filled-pixel count and (when > 0) the filled byte array.
 */
export const floodFillOffThread = async (
  pixels: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  rgb: [number, number, number],
  tolerance: number,
): Promise<OffThreadFillResult> => {
  const [r, g, b] = rgb;

  const jsFallback = (): OffThreadFillResult => {
    const filled = scanlineFillBuffer(
      pixels,
      width,
      height,
      startX,
      startY,
      r,
      g,
      b,
      tolerance,
    );
    return { filled, pixels: filled > 0 ? pixels : null };
  };

  const filler = getFloodFiller();
  const rt = getRuntime();
  if (!filler || !rt) {
    return jsFallback();
  }

  try {
    // Copy the pixels into the owning native buffer (one copy, JS thread).
    // .buffer can be larger than the view; pass an exact slice.
    const exactBuffer =
      pixels.byteOffset === 0 && pixels.byteLength === pixels.buffer.byteLength
        ? (pixels.buffer as ArrayBuffer)
        : (pixels.slice().buffer as ArrayBuffer);
    filler.load(exactBuffer, width, height);

    // Box the HybridObject so it can cross into the worklet runtime, then run
    // the fill on the background thread. The owning buffer is mutated in C++.
    const boxed = NitroModules.box(filler);
    const filled = await runOnRuntimeAsync(
      rt,
      (
        b2: ReturnType<typeof NitroModules.box<FloodFiller>>,
        sx: number,
        sy: number,
        fr: number,
        fg: number,
        fb: number,
        tol: number,
      ): number => {
        "worklet";
        const f = b2.unbox();
        return f.floodFill(sx, sy, fr, fg, fb, 255, tol);
      },
      boxed,
      startX,
      startY,
      r,
      g,
      b,
      tolerance,
    );

    if (filled === 0) {
      return { filled: 0, pixels: null };
    }

    // The promise resolved → safe to read the owning buffer (zero-copy).
    const out = new Uint8Array(filler.buffer.slice(0));
    return { filled, pixels: out };
  } catch {
    // Any native/worklet failure → JS-thread fallback.
    return jsFallback();
  }
};
