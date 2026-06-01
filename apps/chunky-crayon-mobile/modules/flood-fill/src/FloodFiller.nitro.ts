import type { HybridObject } from "react-native-nitro-modules";

/**
 * Off-thread scanline flood fill over an owning native RGBA_8888 buffer.
 *
 * - `load` copies the JS pixel bytes into an owning native buffer (one copy).
 * - `floodFill` mutates that owning buffer IN PLACE, in C++ — safe to call from
 *   a worklet runtime (a background thread) because the buffer is native and
 *   shared, not serialized across the boundary.
 * - `buffer` exposes the owning buffer back to JS as a zero-copy view; only
 *   read it AFTER the off-thread floodFill has resolved (ArrayBuffers are not
 *   thread-safe — never read while the worklet is writing).
 */
export interface FloodFiller
  extends HybridObject<{ ios: "c++"; android: "c++" }> {
  /** Copy `pixels` (RGBA_8888, width*height*4 bytes) into the owning buffer. */
  load(pixels: ArrayBuffer, width: number, height: number): void;
  /**
   * Span-scanline flood fill from (x,y) with colour (r,g,b,a), each 0-255.
   * `tolerance` is the per-channel match threshold. Returns the pixel count.
   */
  floodFill(
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    a: number,
    tolerance: number,
  ): number;
  /** The owning RGBA buffer (zero-copy view). */
  readonly buffer: ArrayBuffer;
}
