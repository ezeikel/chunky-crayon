import { useEffect, useMemo, useRef, useState } from "react";
import { Skia, SkImage, SkSVG } from "@shopify/react-native-skia";
import { DrawingAction } from "@/stores/canvasStore";
import { floodFill } from "@/utils/floodFill";

/**
 * Hook that watches drawing actions for fill/magic-fill types, rasterizes the
 * SVG offscreen once, then applies flood fills to produce a composite SkImage
 * with all fills baked in. This image replaces the base SVG in the canvas when
 * fills exist so the fill colours are visible.
 *
 * Two performance properties:
 *  - The flood fill itself runs off the JS thread (see utils/floodFillRuntime),
 *    so a tap-to-fill never blocks the UI.
 *  - Compositing is INCREMENTAL. The previous result + the fill-action list it
 *    represents are cached. When a new fill is simply appended (the common
 *    case — the user keeps colouring), only the new action is filled on top of
 *    the cached image. The whole list is only replayed from a fresh SVG raster
 *    when the history is rewound/branched (undo, redo, reset) or on first run.
 *    This avoids the previous O(n^2) "re-fill everything from white" cost.
 */

// A stable key for a single fill/magic-fill action, used to detect whether the
// new action list is a strict append to the cached one.
const fillActionKey = (a: DrawingAction): string => {
  if (a.type === "fill") {
    return `f:${a.fillX},${a.fillY},${a.color}`;
  }
  if (a.type === "magic-fill" && a.magicFills) {
    return `m:${a.magicFills.map((mf) => `${mf.x},${mf.y},${mf.color}`).join("|")}`;
  }
  return `?:${a.type}`;
};

// Apply a single fill/magic-fill action on top of an image, returning the new
// image (or the same image if nothing changed).
const applyFillAction = async (
  image: SkImage,
  action: DrawingAction,
): Promise<SkImage> => {
  let current = image;
  if (action.type === "fill" && action.fillX != null && action.fillY != null) {
    const result = await floodFill(
      current,
      action.fillX,
      action.fillY,
      action.color,
    );
    if (result) current = result.image;
  } else if (action.type === "magic-fill" && action.magicFills) {
    for (const mf of action.magicFills) {
      const result = await floodFill(current, mf.x, mf.y, mf.color);
      if (result) current = result.image;
    }
  }
  return current;
};

export function useFillLayer(
  svg: SkSVG | null,
  svgDimensions: { width: number; height: number } | null,
  visibleActions: DrawingAction[],
): { fillLayerImage: SkImage | null; isComputing: boolean } {
  const [fillLayerImage, setFillLayerImage] = useState<SkImage | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const computeIdRef = useRef(0);

  // The clean white+SVG raster (boundaries only), rebuilt only when svg/dims
  // change — never per fill.
  const baseImageRef = useRef<SkImage | null>(null);
  const baseKeyRef = useRef<string>("");
  // The last composited image and the ordered fill-keys it represents, so an
  // append can build on it instead of replaying from the base.
  const lastImageRef = useRef<SkImage | null>(null);
  const lastKeysRef = useRef<string[]>([]);

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
      lastImageRef.current = null;
      lastKeysRef.current = [];
      setFillLayerImage(null);
      setIsComputing(false);
      return;
    }

    if (!svg || !svgDimensions) {
      return;
    }

    const { width, height } = svgDimensions;
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      console.warn("[useFillLayer] Invalid SVG dimensions:", width, height);
      return;
    }

    const w = Math.round(width);
    const h = Math.round(height);
    const baseKey = `${w}x${h}`;
    const keys = fillActions.map(fillActionKey);

    const computeId = ++computeIdRef.current;
    setIsComputing(true);

    const compute = async () => {
      try {
        // (Re)build the clean base raster only when the svg/dimensions change.
        if (!baseImageRef.current || baseKeyRef.current !== baseKey) {
          const surface = Skia.Surface.MakeOffscreen(w, h);
          if (!surface) {
            console.warn("[useFillLayer] Failed to create offscreen surface");
            setIsComputing(false);
            return;
          }
          const canvas = surface.getCanvas();
          // White first — SVG bg is transparent, and the fill treats
          // transparent/near-black as boundaries.
          canvas.clear(Skia.Color("white"));
          canvas.drawSvg(svg, w, h);
          surface.flush();
          const textureImage = surface.makeImageSnapshot();
          baseImageRef.current =
            textureImage.makeNonTextureImage() ?? textureImage;
          baseKeyRef.current = baseKey;
          // Base changed → any cached composite is stale.
          lastImageRef.current = null;
          lastKeysRef.current = [];
        }

        // Decide between an incremental append and a full rebuild.
        const prevKeys = lastKeysRef.current;
        const isAppend =
          lastImageRef.current != null &&
          keys.length > prevKeys.length &&
          prevKeys.every((k, i) => k === keys[i]);

        let current: SkImage;
        let startIndex: number;
        if (isAppend) {
          current = lastImageRef.current as SkImage;
          startIndex = prevKeys.length;
        } else {
          current = baseImageRef.current as SkImage;
          startIndex = 0;
        }

        for (let i = startIndex; i < fillActions.length; i++) {
          if (computeIdRef.current !== computeId) return;
          current = await applyFillAction(current, fillActions[i]);
        }

        if (computeIdRef.current !== computeId) return;

        lastImageRef.current = current;
        lastKeysRef.current = keys;
        setFillLayerImage(current);
      } catch (err) {
        console.warn("[useFillLayer] Error computing fill layer:", err);
      } finally {
        if (computeIdRef.current === computeId) {
          setIsComputing(false);
        }
      }
    };

    compute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, svgDimensions, fillActions, fillCount]);

  return { fillLayerImage, isComputing };
}
