import { NitroModules } from "react-native-nitro-modules";
import type { FloodFiller } from "./FloodFiller.nitro";

export type { FloodFiller };

let cached: FloodFiller | null = null;

/**
 * Lazily create the native FloodFiller HybridObject. Returns null if the native
 * module isn't available (e.g. Storybook web, a stale binary) so callers can
 * fall back to a JS-thread fill.
 */
export const getFloodFiller = (): FloodFiller | null => {
  if (cached) return cached;
  try {
    cached = NitroModules.createHybridObject<FloodFiller>("FloodFiller");
    return cached;
  } catch {
    return null;
  }
};
