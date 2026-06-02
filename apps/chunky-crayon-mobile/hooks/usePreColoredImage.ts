import { useCallback, useEffect, useMemo, useRef } from "react";
import { Skia, type SkImage } from "@shopify/react-native-skia";
import type { PaletteVariant } from "@/types";
import { buildPreColoredBytes } from "@/utils/regionStore";
import type { UseRegionStoreReturn } from "./useRegionStore";

/**
 * Builds the "pre-coloured" SkImage for Magic Brush / Auto Color: every pixel
 * painted with its region's colour for a palette variant, at the region map's
 * native resolution (region 0 / uncoloured = transparent). Mirrors web's
 * buildPreColouredCanvas, emitting a Skia image instead of an HTMLCanvas.
 *
 * - Magic Brush reveals it through a dab mask via BlendMode.SrcIn.
 * - Auto Color draws it in one shot.
 *
 * Images are cached per palette variant: a committed reveal/auto stores the
 * variant it was made under, and rendering looks up THAT variant's image — so
 * undo/redo across a variant switch never recolours history. Same SkImage
 * MakeImage-from-RGBA-bytes pattern as utils/floodFill.ts.
 */
export type UsePreColoredImageReturn = {
  /** The image for the currently-active variant (live Magic Brush / new auto). */
  current: SkImage | null;
  /** Image for a specific variant (committed reveals/autos render with theirs). */
  forVariant: (variant: PaletteVariant) => SkImage | null;
};

export const usePreColoredImage = (
  regionStore: UseRegionStoreReturn,
  activeVariant: PaletteVariant,
): UsePreColoredImageReturn => {
  const { state, getColorsForVariant } = regionStore;
  const { isReady, pixelToRegion, width, height } = state;

  // variant → built SkImage, for the current region map. Cleared when the
  // region map identity changes (new image / reload).
  const cacheRef = useRef<Map<PaletteVariant, SkImage>>(new Map());

  // Reset the cache whenever the underlying region map changes.
  useEffect(() => {
    cacheRef.current = new Map();
  }, [pixelToRegion, width, height]);

  const build = useCallback(
    (variant: PaletteVariant): SkImage | null => {
      if (!isReady || !pixelToRegion || !width || !height) return null;
      const cached = cacheRef.current.get(variant);
      if (cached) return cached;

      const colors = getColorsForVariant(variant);
      if (colors.size === 0) return null;

      const rgba = buildPreColoredBytes(pixelToRegion, width, height, colors);
      const data = Skia.Data.fromBytes(rgba);
      const image = Skia.Image.MakeImage(
        {
          width,
          height,
          colorType: 4 /* RGBA_8888 */,
          alphaType: 1 /* Unpremul */,
        },
        data,
        width * 4,
      );
      // CPU-backed snapshot — stable across frames (matches useFillLayer).
      const stable = image?.makeNonTextureImage() ?? image ?? null;
      if (stable) cacheRef.current.set(variant, stable);
      return stable;
    },
    [isReady, pixelToRegion, width, height, getColorsForVariant],
  );

  const current = useMemo(() => build(activeVariant), [build, activeVariant]);

  return { current, forVariant: build };
};
