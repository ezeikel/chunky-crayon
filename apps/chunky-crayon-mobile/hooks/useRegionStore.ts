import { useCallback, useEffect, useRef, useState } from "react";
import type { ColoringImage, PaletteVariant, RegionStoreRegion } from "@/types";
import {
  colorsForVariant,
  decodeRegionMap,
  getRegionIdAt as getRegionIdAtPure,
  parseRegionsJson,
  type Rgb,
} from "@/utils/regionStore";

/**
 * Mobile mirror of packages/coloring-ui/src/useRegionStore.ts. Loads the
 * pre-computed region store for Magic Brush / Auto Color: fetches the gzipped
 * pixel→regionId binary, decompresses it (fflate — Hermes has no
 * DecompressionStream), and exposes O(1) region lookups + per-variant colours.
 *
 * The region store is read-only AI data, identical for every viewer — there is
 * nothing user-specific to sync. It replaces the legacy fillPoints/colorMap;
 * when no region data is present the hook stays "not ready" and the caller
 * falls back to the legacy path.
 */

export type RegionStoreState = {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  pixelToRegion: Uint16Array | null;
  width: number;
  height: number;
};

export type UseRegionStoreReturn = {
  state: RegionStoreState;
  /** Region id at region-map pixel (rx, ry); 0 = background / out of bounds. */
  getRegionIdAt: (rx: number, ry: number) => number;
  /** Region metadata by id. */
  getRegionById: (regionId: number) => RegionStoreRegion | undefined;
  /** id → RGB lookup for a palette variant (for the pre-coloured layer). */
  getColorsForVariant: (variant: PaletteVariant) => Map<number, Rgb>;
};

const initialState: RegionStoreState = {
  isLoading: false,
  isReady: false,
  error: null,
  pixelToRegion: null,
  width: 0,
  height: 0,
};

export const useRegionStore = (
  coloringImage: Pick<
    ColoringImage,
    "regionMapUrl" | "regionMapWidth" | "regionMapHeight" | "regionsJson"
  >,
): UseRegionStoreReturn => {
  const { regionMapUrl, regionMapWidth, regionMapHeight, regionsJson } =
    coloringImage;

  const [state, setState] = useState<RegionStoreState>(initialState);
  // region-id → metadata, built once from regionsJson.
  const byIdRef = useRef<Map<number, RegionStoreRegion>>(new Map());

  useEffect(() => {
    const parsed = parseRegionsJson(regionsJson);
    byIdRef.current = parsed?.byId ?? new Map();
  }, [regionsJson]);

  useEffect(() => {
    if (!regionMapUrl || !regionMapWidth || !regionMapHeight || !regionsJson) {
      // No region store data — graceful degradation; caller uses legacy path.
      setState(initialState);
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, isLoading: true, isReady: false, error: null }));

    const load = async () => {
      try {
        // R2 URL — no auth header needed. Decode happens once per image load,
        // off the render pass (in this effect), on the JS thread.
        const response = await fetch(regionMapUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch region map: ${response.status}`);
        }
        const gzipBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const pixelToRegion = decodeRegionMap(
          new Uint8Array(gzipBuffer),
          regionMapWidth,
          regionMapHeight,
        );
        if (cancelled) return;

        setState({
          isLoading: false,
          isReady: true,
          error: null,
          pixelToRegion,
          width: regionMapWidth,
          height: regionMapHeight,
        });
      } catch (error) {
        if (cancelled) return;
        console.warn("[useRegionStore] load failed:", error);
        setState({
          ...initialState,
          error:
            error instanceof Error
              ? error.message
              : "Unknown region store error",
        });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [regionMapUrl, regionMapWidth, regionMapHeight, regionsJson]);

  const getRegionIdAt = useCallback(
    (rx: number, ry: number): number => {
      if (!state.pixelToRegion) return 0;
      return getRegionIdAtPure(
        state.pixelToRegion,
        state.width,
        state.height,
        rx,
        ry,
      );
    },
    [state.pixelToRegion, state.width, state.height],
  );

  const getRegionById = useCallback(
    (regionId: number): RegionStoreRegion | undefined =>
      byIdRef.current.get(regionId),
    [],
  );

  const getColorsForVariant = useCallback(
    (variant: PaletteVariant): Map<number, Rgb> =>
      colorsForVariant(byIdRef.current, variant),
    [],
  );

  return { state, getRegionIdAt, getRegionById, getColorsForVariant };
};
