"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  RegionStoreJson,
  RegionStoreRegion,
  PaletteVariant,
} from "./types";

// =============================================================================
// Types
// =============================================================================

export type RegionStoreState = {
  /** Whether the region store is currently loading */
  isLoading: boolean;
  /** Whether the region store is ready for use */
  isReady: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Loading progress message */
  loadingMessage: string | null;
  /** The decompressed pixel→regionId lookup (1024×1024, Uint16Array) */
  pixelToRegion: Uint16Array | null;
  /** Width of the region map */
  width: number;
  /** Height of the region map */
  height: number;
  /** Parsed region metadata with labels and palettes */
  regions: RegionStoreRegion[];
  /** Scene description from the AI labelling pass */
  sceneDescription: string;
};

export type UseRegionStoreReturn = {
  state: RegionStoreState;
  /** Get the region ID at pixel coordinates (O(1) lookup) */
  getRegionIdAt: (x: number, y: number) => number;
  /** Get the colour hex for a region in the given palette variant */
  getColorForRegion: (
    regionId: number,
    variant: PaletteVariant,
  ) => string | null;
  /** Get the region metadata by ID */
  getRegionById: (regionId: number) => RegionStoreRegion | undefined;
  /** Get all region colours for a palette variant (for building pre-coloured canvas) */
  getRegionColorsForVariant: (
    variant: PaletteVariant,
  ) => Map<number, { r: number; g: number; b: number }>;
  /** Get all regions for auto-fill (returns array of { regionId, color, centroid }) */
  getAllColorsForAutoFill: (variant: PaletteVariant) => Array<{
    regionId: number;
    color: string;
    centroid: { x: number; y: number };
  }>;
};

// =============================================================================
// Helpers
// =============================================================================

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
};

/**
 * Decompress a gzipped ArrayBuffer into a Uint8Array using DecompressionStream.
 * Works on modern browsers (Chrome 80+, Safari 16.4+, Firefox 113+).
 */
async function gunzipToBytes(gzipBuffer: ArrayBuffer): Promise<Uint8Array> {
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([gzipBuffer]).stream().pipeThrough(ds);
  const decompressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(decompressed);
}

// =============================================================================
// Initial state
// =============================================================================

const initialState: RegionStoreState = {
  isLoading: false,
  isReady: false,
  error: null,
  loadingMessage: null,
  pixelToRegion: null,
  width: 0,
  height: 0,
  regions: [],
  sceneDescription: "",
};

// =============================================================================
// Hook
// =============================================================================

export type UseRegionStoreOptions = {
  /** R2 URL of the gzipped Uint16Array region map binary */
  regionMapUrl?: string | null;
  /** Width of the region map (in pixels) */
  regionMapWidth?: number | null;
  /** Height of the region map (in pixels) */
  regionMapHeight?: number | null;
  /** Parsed regionsJson from the server */
  regionsJson?: RegionStoreJson | null;
};

/**
 * Hook for loading and querying the pre-computed region store.
 *
 * Replaces useMagicColorMap: no runtime region detection, no AI calls,
 * no createPreColoredCanvas on the main thread. The region map was
 * computed server-side at image generation time and is fetched once as a
 * ~30kB gzipped binary.
 *
 * The pixelToRegion lookup enables O(1) region identification at any
 * canvas coordinate — used by both the reveal-mask magic brush (which
 * region is the dab centre in?) and auto-fill (iterate all regions).
 */
export function useRegionStore(
  options: UseRegionStoreOptions = {},
): UseRegionStoreReturn {
  const { regionMapUrl, regionMapWidth, regionMapHeight, regionsJson } =
    options;
  const [state, setState] = useState<RegionStoreState>(initialState);

  // Region lookup maps (built once from regionsJson)
  const regionByIdRef = useRef<Map<number, RegionStoreRegion>>(new Map());

  // Build region lookup when regionsJson changes
  useEffect(() => {
    const map = new Map<number, RegionStoreRegion>();
    if (regionsJson) {
      for (const r of regionsJson.regions) {
        map.set(r.id, r);
      }
    }
    regionByIdRef.current = map;
  }, [regionsJson]);

  // Fetch and decompress the region map binary
  useEffect(() => {
    if (!regionMapUrl || !regionMapWidth || !regionMapHeight || !regionsJson) {
      // No region store data — stay in initial state (graceful degradation)
      setState(initialState);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState((s) => ({
        ...s,
        isLoading: true,
        isReady: false,
        error: null,
        loadingMessage: "Loading region map…",
      }));

      try {
        // Fetch with cache-busting to avoid stale data after regeneration
        const response = await fetch(`${regionMapUrl}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch region map: ${response.status}`);
        }
        const gzipBuffer = await response.arrayBuffer();

        if (cancelled) return;
        setState((s) => ({
          ...s,
          loadingMessage: `Decompressing ${gzipBuffer.byteLength} bytes…`,
        }));

        const bytes = await gunzipToBytes(gzipBuffer);
        if (cancelled) return;

        const expectedBytes = regionMapWidth * regionMapHeight * 2;
        if (bytes.byteLength !== expectedBytes) {
          throw new Error(
            `Region map size mismatch: got ${bytes.byteLength}, expected ${expectedBytes}`,
          );
        }

        // Wrap the decompressed bytes as a Uint16Array. Both Node and modern
        // browsers are little-endian, so the raw bytes map directly.
        const pixelToRegion = new Uint16Array(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength / 2,
        );

        if (cancelled) return;
        setState({
          isLoading: false,
          isReady: true,
          error: null,
          loadingMessage: null,
          pixelToRegion,
          width: regionMapWidth,
          height: regionMapHeight,
          regions: regionsJson.regions,
          sceneDescription: regionsJson.sceneDescription,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          ...initialState,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error loading region store",
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [regionMapUrl, regionMapWidth, regionMapHeight, regionsJson]);

  // --- Query functions (stable references) ---------------------------------

  const getRegionIdAt = useCallback(
    (x: number, y: number): number => {
      if (!state.pixelToRegion || !state.width || !state.height) return 0;
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || px >= state.width || py < 0 || py >= state.height) return 0;
      return state.pixelToRegion[py * state.width + px];
    },
    [state.pixelToRegion, state.width, state.height],
  );

  const getColorForRegion = useCallback(
    (regionId: number, variant: PaletteVariant): string | null => {
      const region = regionByIdRef.current.get(regionId);
      if (!region) return null;
      return region.palettes[variant]?.hex ?? null;
    },
    [],
  );

  const getRegionById = useCallback(
    (regionId: number): RegionStoreRegion | undefined => {
      return regionByIdRef.current.get(regionId);
    },
    [],
  );

  const getRegionColorsForVariant = useCallback(
    (
      variant: PaletteVariant,
    ): Map<number, { r: number; g: number; b: number }> => {
      const map = new Map<number, { r: number; g: number; b: number }>();
      for (const [id, region] of regionByIdRef.current) {
        const hex = region.palettes[variant]?.hex;
        if (hex) {
          const rgb = hexToRgb(hex);
          if (rgb) map.set(id, rgb);
        }
      }
      return map;
    },
    [],
  );

  const getAllColorsForAutoFill = useCallback(
    (
      variant: PaletteVariant,
    ): Array<{
      regionId: number;
      color: string;
      centroid: { x: number; y: number };
    }> => {
      const result: Array<{
        regionId: number;
        color: string;
        centroid: { x: number; y: number };
      }> = [];
      for (const [id, region] of regionByIdRef.current) {
        const hex = region.palettes[variant]?.hex;
        if (hex) {
          result.push({
            regionId: id,
            color: hex,
            centroid: region.centroid,
          });
        }
      }
      return result;
    },
    [],
  );

  return {
    state,
    getRegionIdAt,
    getColorForRegion,
    getRegionById,
    getRegionColorsForVariant,
    getAllColorsForAutoFill,
  };
}
