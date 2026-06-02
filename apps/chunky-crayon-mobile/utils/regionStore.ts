import { gunzipSync } from "fflate";
import type { RegionStoreJson, PaletteVariant } from "@/types";

/**
 * Pure helpers for the region store (Magic Brush / Auto Color). Kept free of
 * Skia / React so the coordinate + colour math is unit-testable. The hook
 * (hooks/useRegionStore.ts) wraps these with fetch + state; the pre-coloured
 * SkImage (hooks/usePreColoredImage.ts) feeds buildPreColoredBytes into
 * Skia.Image.MakeImage.
 */

export type Rgb = { r: number; g: number; b: number };

/** Parse a #RRGGBB (or RRGGBB) hex into 0-255 channels. */
export const hexToRgb = (hex: string): Rgb | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
};

/**
 * Decode the gzipped region-map binary into a Uint16Array of region IDs, one
 * per pixel, row-major (index = y * width + x). The server writes a little-
 * endian Uint16Array and gzips it; Hermes is little-endian so the raw bytes
 * map directly. Throws on a size mismatch (truncated / corrupt download) so a
 * bad map fails loudly instead of reading out of bounds.
 */
export const decodeRegionMap = (
  gzipBytes: Uint8Array,
  width: number,
  height: number,
): Uint16Array => {
  const bytes = gunzipSync(gzipBytes);
  const expected = width * height * 2;
  if (bytes.byteLength !== expected) {
    throw new Error(
      `Region map size mismatch: got ${bytes.byteLength}, expected ${expected}`,
    );
  }
  // View the bytes as Uint16. byteOffset may be non-zero if fflate returns a
  // subarray, so pass it through.
  return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
};

/** Parse the regionsJson string into a region-id → region metadata map. */
export const parseRegionsJson = (
  regionsJson: string | null | undefined,
): {
  json: RegionStoreJson;
  byId: Map<number, RegionStoreJson["regions"][0]>;
} | null => {
  if (!regionsJson) return null;
  try {
    const json = JSON.parse(regionsJson) as RegionStoreJson;
    if (!json || !Array.isArray(json.regions)) return null;
    const byId = new Map<number, RegionStoreJson["regions"][0]>();
    for (const r of json.regions) byId.set(r.id, r);
    return { json, byId };
  } catch (err) {
    console.warn("Failed to parse regionsJson:", err);
    return null;
  }
};

/**
 * Region id at region-map pixel (rx, ry). Region 0 = background / no colour.
 * Out-of-bounds returns 0.
 */
export const getRegionIdAt = (
  pixelToRegion: Uint16Array,
  width: number,
  height: number,
  rx: number,
  ry: number,
): number => {
  const px = Math.floor(rx);
  const py = Math.floor(ry);
  if (px < 0 || px >= width || py < 0 || py >= height) return 0;
  return pixelToRegion[py * width + px];
};

/**
 * Build the RGBA byte buffer for the pre-coloured layer: every pixel painted
 * with its region's colour for the given palette variant; region 0 (and any
 * region without a colour) left transparent (alpha 0) so line art / background
 * show through under SrcIn compositing and the one-shot Auto Color draw.
 *
 * The buffer is sized at the region map's native resolution (width × height),
 * so the index is a direct y*width+x with no per-pixel rescale — the Skia
 * transform group scales the resulting image to canvas pixels.
 */
export const buildPreColoredBytes = (
  pixelToRegion: Uint16Array,
  width: number,
  height: number,
  colorByRegionId: Map<number, Rgb>,
): Uint8Array => {
  const n = width * height;
  const rgba = new Uint8Array(n * 4); // zero-filled = transparent
  for (let i = 0; i < n; i++) {
    const rid = pixelToRegion[i];
    if (rid === 0) continue;
    const c = colorByRegionId.get(rid);
    if (!c) continue;
    const o = i * 4;
    rgba[o] = c.r;
    rgba[o + 1] = c.g;
    rgba[o + 2] = c.b;
    rgba[o + 3] = 255;
  }
  return rgba;
};

/**
 * Map a region's per-variant palette hexes into an id → RGB lookup for one
 * palette variant. Regions without a colour for the variant are omitted (so
 * they stay transparent in the pre-coloured layer).
 */
export const colorsForVariant = (
  byId: Map<number, RegionStoreJson["regions"][0]>,
  variant: PaletteVariant,
): Map<number, Rgb> => {
  const map = new Map<number, Rgb>();
  for (const [id, region] of byId) {
    const hex = region.palettes?.[variant]?.hex;
    if (!hex) continue;
    const rgb = hexToRgb(hex);
    if (rgb) map.set(id, rgb);
  }
  return map;
};
