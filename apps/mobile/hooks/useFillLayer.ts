import { useEffect, useMemo, useRef, useState } from "react";
import { Skia, SkImage, SkSVG } from "@shopify/react-native-skia";
import { DrawingAction } from "@/stores/canvasStore";
import { floodFill } from "@/utils/floodFill";

/**
 * Hook that watches drawing actions for fill/magic-fill types,
 * rasterizes the SVG offscreen, then applies flood fills sequentially
 * to produce a composite SkImage with all fills baked in.
 *
 * This image replaces the base SVG in the canvas when fills exist,
 * so that fill colors are actually visible.
 */
export function useFillLayer(
  svg: SkSVG | null,
  svgDimensions: { width: number; height: number } | null,
  visibleActions: DrawingAction[],
): { fillLayerImage: SkImage | null; isComputing: boolean } {
  const [fillLayerImage, setFillLayerImage] = useState<SkImage | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const computeIdRef = useRef(0);

  // Extract only fill/magic-fill actions
  const fillActions = useMemo(
    () =>
      visibleActions.filter(
        (a) => a.type === "fill" || a.type === "magic-fill",
      ),
    [visibleActions],
  );

  const fillCount = fillActions.length;

  useEffect(() => {
    // No fills — no fill layer needed
    if (fillCount === 0) {
      setFillLayerImage(null);
      setIsComputing(false);
      return;
    }

    if (!svg || !svgDimensions) {
      return;
    }

    const { width, height } = svgDimensions;

    // Guard against invalid dimensions
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      console.warn("[useFillLayer] Invalid SVG dimensions:", width, height);
      return;
    }

    // Use integer dimensions for surface creation
    const w = Math.round(width);
    const h = Math.round(height);

    const computeId = ++computeIdRef.current;
    setIsComputing(true);

    const compute = async () => {
      try {
        // Step 1: Rasterize SVG to an offscreen surface with white background
        const surface = Skia.Surface.MakeOffscreen(w, h);
        if (!surface) {
          console.warn("[useFillLayer] Failed to create offscreen surface");
          setIsComputing(false);
          return;
        }

        const canvas = surface.getCanvas();
        // Fill with white first — SVG has transparent background by default,
        // and floodFill treats transparent (R=0,G=0,B=0,A=0) as black boundaries
        canvas.clear(Skia.Color("white"));
        canvas.drawSvg(svg, w, h);
        surface.flush();

        // Snapshot as GPU texture, then convert to CPU image for pixel access
        const textureImage = surface.makeImageSnapshot();
        let currentImage = textureImage.makeNonTextureImage();

        // Step 2: Apply each fill action sequentially
        for (const action of fillActions) {
          if (computeIdRef.current !== computeId) return;

          if (
            action.type === "fill" &&
            action.fillX != null &&
            action.fillY != null
          ) {
            const result = await floodFill(
              currentImage,
              action.fillX,
              action.fillY,
              action.color,
            );
            if (result) {
              currentImage = result.image;
            }
          } else if (action.type === "magic-fill" && action.magicFills) {
            for (let i = 0; i < action.magicFills.length; i++) {
              if (computeIdRef.current !== computeId) return;
              const mf = action.magicFills[i];
              const result = await floodFill(
                currentImage,
                mf.x,
                mf.y,
                mf.color,
              );
              if (result) {
                currentImage = result.image;
              }
            }
          }
        }

        if (computeIdRef.current !== computeId) return;

        setFillLayerImage(currentImage);
      } catch (err) {
        console.warn("[useFillLayer] Error computing fill layer:", err);
      } finally {
        if (computeIdRef.current === computeId) {
          setIsComputing(false);
        }
      }
    };

    compute();
  }, [svg, svgDimensions, fillActions, fillCount]);

  return { fillLayerImage, isComputing };
}
