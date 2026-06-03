import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  useWindowDimensions,
  StyleSheet,
  Image as RNImage,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  Canvas,
  ImageSVG,
  Image as SkiaImage,
  useImage,
  useCanvasRef,
  useSVG,
  fitbox,
  rect,
  Group,
  SkPath,
  Skia,
  Path,
  Paint,
  BlurMask,
  Paragraph,
  TextAlign,
  Fill,
  ImageFormat,
  ColorType,
  AlphaType,
  notifyChange,
  type SkImage,
  type SkSize,
} from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
  PointerType,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  ColoringImage,
  Dimension,
  GridColorCell,
  GridColorMap,
  FillPointsData,
  type PaletteVariant,
} from "@/types";
import { useRegionStore } from "@/hooks/useRegionStore";
import { usePreColoredImage } from "@/hooks/usePreColoredImage";
import {
  useCanvasStore,
  DrawingAction,
  getVisibleActions,
  type BrushType,
} from "@/stores/canvasStore";
import { getCanvasSticker, CANVAS_STICKER_IMAGES } from "@/lib/canvasStickers";
import {
  createBrushPaint,
  createSimplePaint,
  getBrushMultiplier,
} from "@/utils/brushShaders";
import {
  BRUSH_TEXTURE_CONFIG,
  createCrayonTextureShader,
  createPaperGrainShader,
  createWatercolorTextureShader,
} from "@/utils/brushTextures";
import { useFeatureStore } from "@/stores/featureStore";
import { getRainbowColor } from "@/utils/colorUtils";
import {
  computePaintableMask,
  countPainted,
  progressPercent,
} from "@/utils/measureProgress";
import {
  saveCanvasState,
  loadCanvasState,
  debugCanvasStorage,
  setMergedActionsHandler,
} from "@/utils/canvasPersistence";
import { primeDeviceId } from "@/stores/canvasStore";
import {
  generateGlitterParticles,
  createSparklePath,
} from "@/utils/glitterUtils";
import {
  parseColorMap,
  parseFillPoints,
  getSuggestedColor,
  isValidColorMap,
} from "@/utils/magicColorUtils";
import {
  PressureSmoother,
  getPressureFromEvent,
  getPressureAdjustedWidth,
  isApplePencil,
  DEFAULT_PRESSURE,
} from "@/utils/pressureUtils";
import {
  simplifyPath,
  shouldSimplify,
  DEFAULT_SIMPLIFICATION_TOLERANCE,
} from "@/utils/pathSimplification";
import MagicColorHint from "@/components/MagicColorHint";
import { perfect } from "@/styles";
import {
  tapHeavy,
  tapMedium,
  notifySuccess,
  brushHaptics,
} from "@/utils/haptics";

import type { LayoutMode } from "@/utils/deviceUtils";
import { getOptimalCanvasDimensions } from "@/hooks/useResponsiveLayout";
import { useFillLayer } from "@/hooks/useFillLayer";

type ImageCanvasProps = {
  coloringImage: ColoringImage;
  setScroll: Dispatch<SetStateAction<boolean>>;
  style?: Record<string, unknown>;
  /** Available canvas area dimensions from responsive layout */
  canvasArea?: { width: number; height: number };
  /** Current layout mode for responsive sizing */
  layoutMode?: LayoutMode;
};

/**
 * One placed canvas sticker, drawn as its bundled transparent PNG. Hooks can't
 * run inside the renderStickers .map, so each sticker is its own component
 * that calls useImage. Resolves the bundled asset by catalog id; falls back to
 * a Skia Paragraph emoji render for legacy emoji-only saves (no catalog id /
 * unknown id). Centred on the tap point, sized by the action's stickerSize.
 */
const StickerActionImage = ({ action }: { action: DrawingAction }) => {
  const catalogId = action.stickerCatalogId;
  // Resolve the bundled asset to a URI string and let useImage load that.
  // (useImage(<require number>) was unreliable for Skia; resolveAssetSource
  // gives the packaged asset:// URI in a release binary and the Metro
  // http://…/assets URI in dev — both of which useImage loads.)
  const assetMod = catalogId ? CANVAS_STICKER_IMAGES[catalogId] : undefined;
  const assetUri = assetMod
    ? RNImage.resolveAssetSource(assetMod)?.uri
    : undefined;
  const skImage = useImage(assetUri ?? null);

  const size = action.stickerSize || 40;
  const x = (action.stickerX || 0) - size / 2;
  const y = (action.stickerY || 0) - size / 2;

  if (skImage) {
    return (
      <SkiaImage
        image={skImage}
        x={x}
        y={y}
        width={size}
        height={size}
        fit="contain"
      />
    );
  }

  // Fallback: legacy emoji glyph via Skia Paragraph (colour-emoji fallback).
  const glyph = action.sticker;
  if (!glyph) return null;
  const para = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center })
    .pushStyle({ fontSize: size })
    .addText(glyph)
    .pop()
    .build();
  para.layout(size);
  return <Paragraph paragraph={para} x={x} y={y} width={size} />;
};

const ImageCanvas = ({
  coloringImage,
  setScroll,
  style,
  canvasArea,
  layoutMode,
}: ImageCanvasProps) => {
  const canvasRef = useCanvasRef();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const svg = useSVG(coloringImage.svgUrl);

  // Calculate canvas dimensions based on available area or fallback to legacy calculation
  // Legacy: Account for horizontal padding (16px each side from scrollContent + 12px each side from canvasCard)
  const legacyCanvasSize = screenWidth - 32 - 24;

  const [svgDimensions, setSvgDimensions] = useState<Dimension | null>(null);

  // Calculate optimal canvas dimensions respecting SVG aspect ratio
  const { canvasWidth, canvasHeight } = useMemo(() => {
    if (canvasArea && svgDimensions) {
      // Use optimal dimensions that respect SVG aspect ratio
      const optimal = getOptimalCanvasDimensions(
        svgDimensions.width,
        svgDimensions.height,
        canvasArea.width,
        canvasArea.height,
      );
      return { canvasWidth: optimal.width, canvasHeight: optimal.height };
    }
    // Fallback to legacy square canvas
    return { canvasWidth: legacyCanvasSize, canvasHeight: legacyCanvasSize };
  }, [canvasArea, svgDimensions, legacyCanvasSize]);

  // Latest canvas dims, readable from debounced/async closures (autosave fires
  // in a setTimeout, focus-save on blur) without re-subscribing them.
  const canvasDimsRef = useRef({ width: canvasWidth, height: canvasHeight });
  canvasDimsRef.current = { width: canvasWidth, height: canvasHeight };

  // Snapshot safety gate. `makeImageSnapshot()` builds an offscreen Metal
  // texture from the NATIVE RNSkView backing surface — NOT from our JS-computed
  // canvasWidth/Height. During an orientation change UIKit re-lays-out that
  // surface and for a few frames it is 0-sized, even though our logical dims
  // never drop below 1. A 0-dim Metal texture historically ABORTED the process
  // (uncatchable native SIGABRT). TWO layers now prevent that:
  //   1. Native patch (patches/@shopify__react-native-skia): MetalContext::
  //      MakeOffscreen returns nullptr on <1 dims, so a 0-dim snapshot becomes a
  //      handled JS "couldn't create image" instead of an abort. This is the
  //      real backstop — no timing assumptions.
  //   2. This JS gate (below): avoids even ATTEMPTING a snapshot when the real
  //      native surface isn't at its final size. It reads the actual surface
  //      size from Skia's <Canvas onSize> (the same dimension Metal allocates
  //      from), not a guessed timer — so the decision is principled, not a
  //      "probably settled by now" delay.

  // Sub-pixel slack between Skia's measured surface size (points) and our
  // JS-computed canvas dims.
  const LAYOUT_MATCH_TOLERANCE = 1.5;

  // Real native-surface size, fed by Skia's <Canvas onSize> (a Reanimated frame
  // loop measuring the actual backing view). This is the SAME dimension
  // makeImageSnapshot allocates its offscreen Metal texture from — and the one
  // that transiently goes 0 mid-rotation. (RN onLayout is deprecated/ignored on
  // Fabric for Skia <Canvas>, so onSize is the only reliable native-size signal;
  // our JS canvasWidth/Height never see the transient 0-dim surface.)
  const canvasSize = useSharedValue<SkSize>({ width: 0, height: 0 });
  const measuredBoxRef = useRef<{ width: number; height: number } | null>(null);

  // Layout generation, bumped whenever the measured surface size changes (i.e.
  // a resize is in flight). Timer-scheduled measures capture it at schedule time
  // and skip if it changed by fire time — so a progress/autosave timer queued
  // just before a rotation never fires a wasted snapshot into the mid-relayout
  // surface. (Purely an optimization now that the native patch makes the 0-dim
  // case safe; no arbitrary settle delay.)
  const layoutGenRef = useRef(0);

  // Mirror the native onSize (UI thread) into a JS ref + bump the generation on
  // any change. No debounce timer — the gate reads the live measured size and
  // compares it to the expected dims, which is the actual readiness signal.
  const onCanvasSizeChange = useCallback((width: number, height: number) => {
    const prev = measuredBoxRef.current;
    const changed =
      !prev ||
      Math.abs(prev.width - width) > 0.5 ||
      Math.abs(prev.height - height) > 0.5;
    measuredBoxRef.current = { width, height };
    if (changed) layoutGenRef.current += 1;
  }, []);

  useAnimatedReaction(
    () => canvasSize.value,
    (size) => {
      runOnJS(onCanvasSizeChange)(size.width, size.height);
    },
  );

  // Guarded Skia snapshot. Refuses unless the REAL measured native surface is
  // non-zero AND ≈ the expected JS dims (i.e. the surface has actually settled
  // at its final size — not mid-rotation). makeImageSnapshot allocates the
  // offscreen Metal texture from that native size, so this is the precise
  // readiness check, with no timing guesswork. The native patch is the hard
  // backstop if a snapshot still slips through; this just avoids the wasted
  // attempt. Returns null when unsafe; all callers already handle a null image.
  const safeMakeSnapshot = useCallback(() => {
    const { width, height } = canvasDimsRef.current; // expected (JS-computed)
    const measured = measuredBoxRef.current; // real native surface size
    if (
      !canvasRef.current ||
      !measured ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 1 ||
      height < 1 ||
      measured.width < 1 ||
      measured.height < 1 ||
      Math.abs(measured.width - width) > LAYOUT_MATCH_TOLERANCE ||
      Math.abs(measured.height - height) > LAYOUT_MATCH_TOLERANCE
    ) {
      return null;
    }
    return canvasRef.current.makeImageSnapshot();
  }, []);

  // Snapshot scheduled by a debounce timer. Captures the layout generation now;
  // if a resize happens before the timer fires, the generation changes and we
  // skip the wasted snapshot (the next commit re-measures once stable).
  const scheduleGatedMeasure = useCallback(
    (fn: () => void, delayMs: number) => {
      const genAtSchedule = layoutGenRef.current;
      return setTimeout(() => {
        if (layoutGenRef.current !== genAtSchedule) return; // resized since → skip
        fn();
      }, delayMs);
    },
    [],
  );

  // ── Coloring-progress measure (the mobile analogue of web measureProgress) ──
  // Reads the composite canvas pixels vs a cached line-art mask and feeds the
  // 0-100 percentage to the store (CanvasTopBar renders it). Sampled at a stride
  // (like web), debounced on commit, and gated by safeMakeSnapshot so it never
  // runs mid-rotation. See utils/measureProgress.ts for the pure pixel logic.
  const PROGRESS_STRIDE = 4;
  // Cached paintable mask (line art is static per image). Keyed by image+dims.
  const maskRef = useRef<{
    key: string;
    mask: Uint8Array;
    paintable: number;
  } | null>(null);
  const measuringRef = useRef(false);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Initial-restore progress measure (fired once per init). Was a bare
  // uncancelled setTimeout(…, 300) — the orphan that survived navigation/re-init
  // and fired mid-rotation onto a 0-dim surface (the SIGABRT). Now tracked,
  // generation-gated, cleaned up, and ≥ the settle window.
  const initMeasureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Read an SkImage's pixels as RGBA_8888 (R,G,B,A bytes) — web-identical layout.
  const readRGBA = useCallback((img: SkImage): Uint8Array | null => {
    try {
      const cpu = img.makeNonTextureImage() ?? img; // GPU snapshot → CPU read
      const w = cpu.width();
      const h = cpu.height();
      const bytes = cpu.readPixels(0, 0, {
        width: w,
        height: h,
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Unpremul,
      }) as Uint8Array | null;
      return bytes && bytes.length === w * h * 4 ? bytes : null;
    } catch {
      return null;
    }
  }, []);

  // Build (once, cached) the paintable mask from a line-art-only raster rendered
  // at the SAME pixel size as the composite snapshot so the index math aligns.
  const getPaintableMask = useCallback(
    (
      sampleW: number,
      sampleH: number,
    ): { mask: Uint8Array; paintable: number } | null => {
      if (!svg) return null;
      const key = `${coloringImage.id}:${sampleW}x${sampleH}`;
      if (maskRef.current?.key === key) return maskRef.current;
      try {
        const surface = Skia.Surface.MakeOffscreen(sampleW, sampleH);
        if (!surface) return null;
        const c = surface.getCanvas();
        c.clear(Skia.Color("white"));
        c.drawSvg(svg, sampleW, sampleH); // ONLY the line art — no fills
        surface.flush();
        const lineArt = surface.makeImageSnapshot().makeNonTextureImage();
        if (!lineArt) return null;
        const bytes = readRGBA(lineArt);
        if (!bytes) return null;
        const { mask, paintable } = computePaintableMask(
          bytes,
          sampleW,
          sampleH,
          PROGRESS_STRIDE,
        );
        maskRef.current = { key, mask, paintable };
        return maskRef.current;
      } catch {
        return null;
      }
    },
    [svg, coloringImage.id, readRGBA],
  );

  const runProgressMeasure = useCallback(() => {
    if (measuringRef.current) return;
    // A canvas with no renderable PAINT actions is 0% by definition — short-
    // circuit before the pixel sample. `clear` (Start Over) is a terminal that
    // paints nothing, so a history of only clears still reads blank: otherwise
    // the snapshot of the blank line-art raster samples a few anti-aliased
    // outline pixels and the bar sticks at ~1% after Start Over instead of
    // snapping to empty (web shows no bar at 0; mobile shows an empty pill).
    const { history: h, historyIndex: hi } = useCanvasStore.getState();
    const hasPaint = getVisibleActions(h, hi).some((a) => a.type !== "clear");
    if (!hasPaint) {
      useCanvasStore.getState().setProgress(0);
      return;
    }
    const snap = safeMakeSnapshot(); // null mid-rotation / 0-dim → skip
    if (!snap) return;
    measuringRef.current = true;
    try {
      const w = snap.width();
      const h = snap.height();
      if (w < 1 || h < 1) return;
      const cached = getPaintableMask(w, h);
      if (!cached || cached.paintable <= 0) {
        if (cached) useCanvasStore.getState().setProgress(0);
        return;
      }
      const composite = readRGBA(snap);
      if (!composite) return;
      const painted = countPainted(
        composite,
        cached.mask,
        w,
        h,
        PROGRESS_STRIDE,
      );
      useCanvasStore
        .getState()
        .setProgress(progressPercent({ painted, paintable: cached.paintable }));
    } finally {
      measuringRef.current = false;
    }
  }, [safeMakeSnapshot, getPaintableMask, readRGBA]);

  const isInitializedRef = useRef(false);

  // Apple Pencil pressure smoothing — applied at commit time over the per-point
  // forces captured on the UI thread during the stroke.
  const pressureSmootherRef = useRef(new PressureSmoother(3));

  // Live-stroke commit handoff (fixes the draw→vanish→reappear flash). Each
  // brush/eraser stroke gets a monotonic id when it commits; the live preview
  // is cleared only once the committed <Path> carrying that exact id appears in
  // the render (see the useLayoutEffect below). Identity — not history.length —
  // because addAction truncates the redo tail and MAX_HISTORY shift() pins the
  // length, so a length-keyed clear would silently stop firing and leave the
  // live path permanently double-drawn over the committed one.
  const liveStrokeIdRef = useRef(0);
  const pendingLiveStrokeIdRef = useRef<number | null>(null);

  // Magic color hint state
  const [magicHintCell, setMagicHintCell] = useState<GridColorCell | null>(
    null,
  );
  const [magicHintPosition, setMagicHintPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Server restore snapshot (cross-device fallback for legacy/reference pages
  // whose actions can't be reconstructed here). Painted as a base layer under
  // strokes/reveals/stickers so new edits compose on top + the eraser cuts
  // through it. Cleared when the page changes or Start Over runs.
  const [restoredSnapshot, setRestoredSnapshot] = useState<SkImage | null>(
    null,
  );

  // Region store (modern Magic Brush / Auto Color). Loads + decodes the
  // pixel→region map; usePreColoredImage builds the per-variant SkImage that
  // the reveal/auto layers paint with. Falls back to legacy fillPoints/colorMap
  // below when no region data is present.
  const regionStore = useRegionStore(coloringImage);

  // Parse fillPointsJson (preferred) and colorMapJson (fallback) once — LEGACY
  // fallback for images created before the region-store pipeline.
  const fillPoints = useMemo(() => {
    return parseFillPoints(coloringImage.fillPointsJson);
  }, [coloringImage.fillPointsJson]);

  const colorMap = useMemo(() => {
    return parseColorMap(coloringImage.colorMapJson);
  }, [coloringImage.colorMapJson]);

  // Zustand store
  const {
    selectedTool,
    selectedColor,
    brushType,
    brushSize,
    fillType,
    selectedPattern,
    selectedSticker,
    stickerSize,
    magicMode,
    paletteVariant,
    rainbowHue,
    history,
    historyIndex,
    scale,
    translateX,
    translateY,
    imageId,
    isMuted,
    addAction,
    setHistory,
    undo,
    redo,
    setColor,
    setTool,
    setScale,
    setTranslate,
    setImageId,
    setDirty,
    advanceRainbowHue,
    setCaptureCanvas,
    setMagicReady,
    reset,
  } = useCanvasStore();

  // Feature flags
  const { texturedBrushes, pathSimplification } = useFeatureStore();

  // Pre-coloured SkImage for the active palette variant (Magic Brush reveal +
  // Auto Color). forVariant lets committed reveals/autos render with the exact
  // variant they were made under. Built off the region store.
  const preColored = usePreColoredImage(regionStore, paletteVariant);

  // Magic tools enable as soon as EITHER the region store is ready OR legacy
  // colour data exists. Region store is the modern path; fillPoints/colorMap
  // the fallback for un-backfilled images. Until one is present the toolbars
  // disable + spin the magic buttons (loading={!magicReady}).
  useEffect(() => {
    const hasRegionStore = regionStore.state.isReady;
    const hasFillPoints = !!fillPoints && fillPoints.points.length > 0;
    const hasColorMap = !!colorMap && isValidColorMap(colorMap);
    setMagicReady(hasRegionStore || hasFillPoints || hasColorMap);
  }, [regionStore.state.isReady, fillPoints, colorMap, setMagicReady]);

  // Sync haptics enabled state with mute setting
  useEffect(() => {
    brushHaptics.setEnabled(!isMuted);
  }, [isMuted]);

  // Gesture shared values
  const gestureScale = useSharedValue(1);
  const gestureTranslateX = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Live-stroke shared values. The in-progress path is built on the UI THREAD
  // inside the pan-gesture worklet (no runOnJS / React re-render per touch
  // point — that was the source of drawing lag and dropped points). Only on
  // release do we hop to JS once to commit the finished stroke to the store.
  // Starts as (and resets to) an empty path, which draws nothing — Skia's
  // <Path> requires a non-null path, and an empty one is the "no live stroke"
  // state.
  const livePath = useSharedValue<SkPath>(Skia.Path.Make());
  // Touch→SVG transform constants captured at stroke start (stable mid-stroke,
  // since you can't pan/zoom while drawing): svgScale + centering offsets +
  // committed zoom/pan. Read inside the worklet to map screen → SVG coords.
  const drawXform = useSharedValue({
    svgScale: 1,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    tx: 0,
    ty: 0,
  });
  // Per-stroke point + pressure buffers, filled on the UI thread, handed to the
  // JS commit on release.
  const liveXs = useSharedValue<number[]>([]);
  const liveYs = useSharedValue<number[]>([]);
  const liveForces = useSharedValue<number[]>([]);

  // Auto-save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which image ID we've initialized for (prevents re-init and detects changes)
  const initializedForImageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (svg) {
      setSvgDimensions({ width: svg.width(), height: svg.height() });
    }
  }, [svg]);

  // Register capture function for sharing/saving
  useEffect(() => {
    const captureCanvas = () => {
      const image = safeMakeSnapshot();
      if (!image) return null;
      const base64 = image.encodeToBase64();
      return `data:image/png;base64,${base64}`;
    };

    setCaptureCanvas(captureCanvas);

    return () => {
      setCaptureCanvas(null);
    };
  }, [setCaptureCanvas, safeMakeSnapshot]);

  // Initialize canvas with saved state when image changes
  // This handles both first mount AND navigation between different images
  useEffect(() => {
    const currentImageId = coloringImage.id;
    const previousImageId = imageId; // Get the previous image ID from store

    console.log(
      `[CANVAS_INIT] useEffect triggered - Current: ${currentImageId}, Previous: ${previousImageId}, Initialized for: ${initializedForImageIdRef.current}`,
    );

    // Skip if we've already initialized for this exact image
    if (initializedForImageIdRef.current === currentImageId) {
      console.log(
        `[CANVAS_INIT] Already initialized for image ${currentImageId}, skipping`,
      );
      return;
    }

    // Track if this effect is still valid (not cancelled by navigation)
    let isCancelled = false;

    const initializeCanvas = async () => {
      console.log(
        `[CANVAS_INIT] Starting initialization for image: ${currentImageId}`,
      );
      isInitializedRef.current = false;

      // Debug storage to see what's actually saved
      await debugCanvasStorage();

      // Only reset if we're switching to a different image
      // If it's the same image (e.g., navigating from feed to detail), preserve state
      const isNewImage = previousImageId !== currentImageId;
      console.log(
        `[CANVAS_INIT] Is new image: ${isNewImage} (prev: ${previousImageId}, curr: ${currentImageId})`,
      );

      if (isNewImage) {
        console.log(`[CANVAS_INIT] Loading saved state BEFORE reset...`);
        // Load saved state BEFORE resetting to check if we have data
        const savedData = await loadCanvasState(currentImageId);
        let savedActions = savedData?.actions || [];
        // Progress-level dimensions (fallback for actions without per-action dimensions)
        const progressSourceWidth = savedData?.sourceCanvasWidth;
        const progressSourceHeight = savedData?.sourceCanvasHeight;

        console.log(
          `[CANVAS_INIT] Loaded ${savedActions.length} saved actions, progress-level dimensions: ${progressSourceWidth}x${progressSourceHeight}, svgDimensions: ${svgDimensions?.width}x${svgDimensions?.height}`,
        );

        // Scale each action based on its OWN source dimensions (per-action scaling)
        // This handles mixed actions from different platforms correctly:
        // - Mobile actions have sourceWidth: 1024 (SVG viewBox) → no scaling needed
        // - Web actions have sourceWidth: 880 (CSS pixels) → scale to SVG coords
        if (savedActions.length > 0) {
          // Target is SVG dimensions (what mobile uses for coordinate space)
          // Fall back to 1024 if SVG not loaded yet (common SVG size)
          const targetWidth = svgDimensions?.width || 1024;
          const targetHeight = svgDimensions?.height || 1024;

          savedActions = savedActions.map((action) => {
            // Use per-action source dimensions if available, fall back to progress-level
            const actionSourceWidth =
              action.sourceWidth || progressSourceWidth || targetWidth;
            const actionSourceHeight =
              action.sourceHeight || progressSourceHeight || targetHeight;

            const scaleX = targetWidth / actionSourceWidth;
            const scaleY = targetHeight / actionSourceHeight;

            // Only scale if there's a meaningful difference (action came from different coordinate space)
            const needsScaling =
              Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01;

            if (!needsScaling) {
              return action;
            }

            console.log(
              `[CANVAS_INIT] Scaling action (${action.type}) from ${actionSourceWidth}x${actionSourceHeight} to ${targetWidth}x${targetHeight} (scale: ${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`,
            );

            if (
              (action.type === "stroke" || action.type === "magic-reveal") &&
              action.path
            ) {
              // Transform the path using Skia's matrix transformation. Covers
              // brush strokes AND Magic Brush reveals (both store an SVG path);
              // a web-authored reveal scales into mobile space here too.
              const scaledPath = action.path.copy();
              scaledPath.transform(Skia.Matrix().scale(scaleX, scaleY));
              return {
                ...action,
                path: scaledPath,
                // Scale stroke width by the GEOMETRIC MEAN of scaleX/scaleY so
                // the rule matches web (which uses the same) — min vs max on the
                // two platforms made width drift on every round-trip.
                strokeWidth: action.strokeWidth
                  ? action.strokeWidth * Math.sqrt(scaleX * scaleY)
                  : action.strokeWidth,
                // Update source dimensions to target - coordinates are now in mobile space
                // This prevents double-scaling on next load
                sourceWidth: targetWidth,
                sourceHeight: targetHeight,
              };
            } else if (action.type === "fill") {
              // Scale fill coordinates
              return {
                ...action,
                fillX:
                  action.fillX !== undefined
                    ? action.fillX * scaleX
                    : undefined,
                fillY:
                  action.fillY !== undefined
                    ? action.fillY * scaleY
                    : undefined,
                sourceWidth: targetWidth,
                sourceHeight: targetHeight,
              };
            } else if (action.type === "sticker") {
              // Scale sticker position and size
              return {
                ...action,
                stickerX:
                  action.stickerX !== undefined
                    ? action.stickerX * scaleX
                    : undefined,
                stickerY:
                  action.stickerY !== undefined
                    ? action.stickerY * scaleY
                    : undefined,
                stickerSize: action.stickerSize
                  ? action.stickerSize * Math.sqrt(scaleX * scaleY)
                  : action.stickerSize,
                sourceWidth: targetWidth,
                sourceHeight: targetHeight,
              };
            } else if (action.type === "magic-fill" && action.magicFills) {
              // Scale magic-fill coordinates
              return {
                ...action,
                magicFills: action.magicFills.map((fill) => ({
                  ...fill,
                  x: fill.x * scaleX,
                  y: fill.y * scaleY,
                })),
                sourceWidth: targetWidth,
                sourceHeight: targetHeight,
              };
            }
            return action;
          });

          console.log(
            `[CANVAS_INIT] Processed ${savedActions.length} actions with per-action scaling`,
          );
        }

        // Check if we've navigated away before the load completed
        if (isCancelled) {
          console.log(
            `[CANVAS_INIT] Effect cancelled, aborting initialization`,
          );
          return;
        }

        // Now reset the store to clear previous image's state
        console.log(
          `[CANVAS_INIT] Resetting store and setting imageId to ${currentImageId}`,
        );
        reset();
        setImageId(currentImageId);

        // Restore saved actions if they exist
        if (savedActions.length > 0) {
          console.log(
            `[CANVAS_INIT] Restoring ${savedActions.length} actions to store...`,
          );
          savedActions.forEach((action, idx) => {
            console.log(
              `[CANVAS_INIT] Adding action ${idx + 1}/${savedActions.length}, type: ${action.type}`,
            );
            addAction(action);
          });
          console.log(`[CANVAS_INIT] All actions restored`);
        } else {
          console.log(`[CANVAS_INIT] No saved actions to restore`);
        }

        // Snapshot fallback: when the page has NO replayable actions but the
        // server kept a restore raster (a legacy/reference page coloured on
        // another device), decode + paint it as a base layer. When actions DO
        // reconstruct the page we skip this (double-draw guard) and clear any
        // stale snapshot.
        if (savedActions.length === 0 && savedData?.snapshotUrl) {
          try {
            const data = await Skia.Data.fromURI(savedData.snapshotUrl);
            if (!isCancelled) {
              const img = Skia.Image.MakeImageFromEncoded(data);
              setRestoredSnapshot(img?.makeNonTextureImage() ?? img ?? null);
            }
          } catch (err) {
            console.warn("[CANVAS_INIT] Failed to decode server snapshot", err);
            if (!isCancelled) setRestoredSnapshot(null);
          }
        } else if (!isCancelled) {
          setRestoredSnapshot(null);
        }
      } else {
        // Same image - just update the ID without resetting
        console.log(`[CANVAS_INIT] Same image, updating ID without reset`);
        setImageId(currentImageId);
      }

      // Mark as initialized for this specific image
      console.log(
        `[CANVAS_INIT] Marking as initialized for image ${currentImageId}`,
      );
      initializedForImageIdRef.current = currentImageId;
      isInitializedRef.current = true;
      console.log(`[CANVAS_INIT] Initialization complete`);
      // Initial progress measure once restore completes. Required for the
      // cross-device snapshot-restore path (paints a base layer but adds no
      // history actions, so the history-keyed effect alone wouldn't fire).
      // Short delay so the restored layers have painted; the safeMakeSnapshot
      // gate (real measured surface size) handles readiness, and it's
      // generation-gated + cleaned up so a rotation right after page entry just
      // skips it (was a bare uncancelled setTimeout(…, 300) — the orphan that
      // fired mid-rotation and crashed).
      if (initMeasureTimerRef.current)
        clearTimeout(initMeasureTimerRef.current);
      initMeasureTimerRef.current = scheduleGatedMeasure(
        runProgressMeasure,
        400,
      );
    };

    initializeCanvas();

    // Cleanup function to cancel stale loads
    return () => {
      console.log(
        `[CANVAS_INIT] Cleanup - cancelling effect for image ${currentImageId}`,
      );
      isCancelled = true;
      if (initMeasureTimerRef.current)
        clearTimeout(initMeasureTimerRef.current);
    };
  }, [coloringImage.id, reset, setImageId, addAction, imageId]);

  // Prime the cached device id (async SecureStore read) so actions stamped
  // synchronously in addAction carry the real originDeviceId, and register the
  // 409 append-merge rehydrate: when the sync layer merges this image, replace
  // the store history with the merged union so the next autosave persists it.
  useEffect(() => {
    void primeDeviceId();
    setMergedActionsHandler((mergedImageId, mergedActions) => {
      if (mergedImageId === coloringImage.id) {
        setHistory(mergedActions);
      }
    });
  }, [coloringImage.id, setHistory]);

  // Save immediately when screen loses focus (user navigates away)
  useFocusEffect(
    useCallback(() => {
      console.log(`[CANVAS_FOCUS] Screen focused - Image: ${coloringImage.id}`);

      // Return cleanup function that runs when screen loses focus
      return () => {
        console.log(
          `[CANVAS_FOCUS] Screen losing focus - Image: ${coloringImage.id}`,
        );

        // Clear any pending auto-save timer
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
          console.log(`[CANVAS_FOCUS] Cleared pending auto-save timer`);
        }

        // Get the latest state from the store directly. Full history (not the
        // visible prefix) so undo tombstones persist — see the autosave path.
        const currentState = useCanvasStore.getState();
        const actionsToSave = currentState.history;
        console.log(
          `[CANVAS_FOCUS] Actions to save: ${actionsToSave.length}, isInitialized: ${isInitializedRef.current}`,
        );
        console.log(
          `[CANVAS_FOCUS] History length: ${currentState.history.length}, historyIndex: ${currentState.historyIndex}`,
        );

        if (actionsToSave.length > 0 && isInitializedRef.current) {
          console.log(`[CANVAS_FOCUS] Saving state on focus loss...`);
          // Pass SVG dimensions (coordinate space) for cross-platform sync
          // Mobile strokes are in SVG viewBox space, not CSS layout space
          const saveWidth = svgDimensions?.width || 1024;
          const saveHeight = svgDimensions?.height || 1024;
          console.log(
            `[CANVAS_FOCUS] Saving with SVG dimensions: ${saveWidth}x${saveHeight}`,
          );

          // Feed preview (JPEG) + cross-device restore snapshot (PNG) from one
          // snapshot. Canvas may be unmounted during cleanup → try-catch.
          let previewDataUrl: string | undefined;
          let snapshotDataUrl: string | undefined;
          try {
            const image = safeMakeSnapshot();
            if (image) {
              previewDataUrl = `data:image/jpeg;base64,${image.encodeToBase64(ImageFormat.JPEG, 80)}`;
              snapshotDataUrl = `data:image/png;base64,${image.encodeToBase64()}`;
              console.log(
                `[CANVAS_FOCUS] preview ${previewDataUrl.length}, snapshot ${snapshotDataUrl.length} chars`,
              );
            }
          } catch (e) {
            console.log(
              `[CANVAS_FOCUS] Could not capture preview/snapshot (canvas likely unmounted)`,
            );
          }

          saveCanvasState(
            coloringImage.id,
            actionsToSave,
            saveWidth,
            saveHeight,
            previewDataUrl,
            snapshotDataUrl,
          )
            .then((success) => {
              console.log(
                `[CANVAS_FOCUS] Save completed with result: ${success}`,
              );
            })
            .catch((error) => {
              console.error(`[CANVAS_FOCUS] Save failed with error:`, error);
            });
          currentState.setDirty(false);
        } else {
          console.log(`[CANVAS_FOCUS] No actions to save or not initialized`);
        }
      };
    }, [coloringImage.id, svgDimensions]),
  );

  // Auto-save effect
  useEffect(() => {
    if (!isInitializedRef.current) return;

    // Debounce auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      // Get the latest state from the store directly. Save the FULL history (not
      // the visible prefix) so UNDO TOMBSTONES — which live at/after the cursor
      // — reach the server and make the undo durable across reload/devices. The
      // merge + render filter out `undone` actions; persistence keeps them.
      const currentState = useCanvasStore.getState();
      const actionsToSave = currentState.history;
      if (actionsToSave.length > 0) {
        // Pass SVG dimensions (coordinate space) for cross-platform sync
        // Mobile strokes are in SVG viewBox space (typically 1024x1024), not CSS layout space
        const saveWidth = svgDimensions?.width || 1024;
        const saveHeight = svgDimensions?.height || 1024;
        console.log(
          `[AUTO_SAVE] Saving ${actionsToSave.length} actions with SVG dimensions: ${saveWidth}x${saveHeight}`,
        );

        // Generate the feed preview (JPEG, small) AND the cross-device restore
        // snapshot (PNG, full-fidelity — carries magic/legacy results the
        // action list can't replay on another device) from one snapshot.
        let previewDataUrl: string | undefined;
        let snapshotDataUrl: string | undefined;
        try {
          const image = safeMakeSnapshot();
          if (image) {
            previewDataUrl = `data:image/jpeg;base64,${image.encodeToBase64(ImageFormat.JPEG, 80)}`;
            snapshotDataUrl = `data:image/png;base64,${image.encodeToBase64()}`;
            console.log(
              `[AUTO_SAVE] preview ${previewDataUrl.length}, snapshot ${snapshotDataUrl.length} chars`,
            );
          }
        } catch (e) {
          console.log(
            `[AUTO_SAVE] Could not capture preview/snapshot (canvas not ready)`,
          );
        }

        saveCanvasState(
          coloringImage.id,
          actionsToSave,
          saveWidth,
          saveHeight,
          previewDataUrl,
          snapshotDataUrl,
        )
          .then((success) => {
            console.log(`[AUTO_SAVE] Save completed with result: ${success}`);
          })
          .catch((error) => {
            console.error(`[AUTO_SAVE] Save failed with error:`, error);
          });
        currentState.setDirty(false);
      }
    }, 1000); // Save 1 second after last change (matching web)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [history, historyIndex, coloringImage.id, setDirty, svgDimensions]);

  // Progress-measure trigger. Every committed change (stroke/fill/magic/undo/
  // redo/reset/restore) mutates history|historyIndex, so this one debounced
  // effect covers them all. Shorter than autosave (250ms) so the bar feels
  // responsive; runProgressMeasure bails if a snapshot isn't safe (rotation) or
  // the canvas isn't initialized. Start Over resets progress to 0 via the store;
  // a re-measure on the now-blank canvas confirms it.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    // Keep the 250ms responsiveness for the progress bar in steady state, but
    // generation-gate it: if a rotation/resize lands between schedule and fire,
    // the measured-box gate would already refuse the snapshot — this skips the
    // wasted call (and the next commit re-measures once stable).
    progressTimerRef.current = scheduleGatedMeasure(runProgressMeasure, 250);
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [
    history,
    historyIndex,
    svgDimensions,
    runProgressMeasure,
    scheduleGatedMeasure,
  ]);

  const src = svgDimensions
    ? rect(0, 0, svgDimensions.width, svgDimensions.height)
    : rect(0, 0, 1024, 1024);
  const dst = rect(0, 0, canvasWidth, canvasHeight);

  const transform = useMemo(() => fitbox("contain", src, dst), [src, dst]);

  // Convert touch coordinates to SVG coordinates
  const touchToSvgCoords = useCallback(
    (touchX: number, touchY: number): { x: number; y: number } | null => {
      if (!svgDimensions) return null;

      const scaleX = canvasWidth / svgDimensions.width;
      const scaleY = canvasHeight / svgDimensions.height;
      const svgScale = Math.min(scaleX, scaleY);

      const scaledWidth = svgDimensions.width * svgScale;
      const scaledHeight = svgDimensions.height * svgScale;
      const offsetX = (canvasWidth - scaledWidth) / 2;
      const offsetY = (canvasHeight - scaledHeight) / 2;

      // Account for zoom/pan
      const adjustedX = (touchX - translateX) / scale;
      const adjustedY = (touchY - translateY) / scale;

      const svgX = (adjustedX - offsetX) / svgScale;
      const svgY = (adjustedY - offsetY) / svgScale;

      return { x: svgX, y: svgY };
    },
    [svgDimensions, canvasWidth, canvasHeight, scale, translateX, translateY],
  );

  // Mirror the touch→SVG transform constants into a shared value so the drawing
  // worklet (UI thread) can map screen coords to SVG space without hopping to
  // JS. These are stable during a stroke (you can't pan/zoom while drawing), so
  // capturing the committed scale/translate here is correct.
  useEffect(() => {
    if (!svgDimensions) return;
    const sx = canvasWidth / svgDimensions.width;
    const sy = canvasHeight / svgDimensions.height;
    const svgScale = Math.min(sx, sy);
    const offsetX = (canvasWidth - svgDimensions.width * svgScale) / 2;
    const offsetY = (canvasHeight - svgDimensions.height * svgScale) / 2;
    drawXform.value = {
      svgScale,
      offsetX,
      offsetY,
      scale,
      tx: translateX,
      ty: translateY,
    };
  }, [
    svgDimensions,
    canvasWidth,
    canvasHeight,
    scale,
    translateX,
    translateY,
    drawXform,
  ]);

  // Start/stop the continuous brush haptic — called once per stroke (from the
  // gesture worklet via runOnJS in onStart), never per touch point.
  const startStrokeHaptics = useCallback(() => {
    brushHaptics.start(brushType);
    setScroll(false);
    // Re-arm: a fresh stroke just took over livePath, so any not-yet-fired
    // deferred clear from the PREVIOUS stroke must not run against it (that
    // would wipe this in-progress stroke). Dropping the pending id makes the
    // stale clear a no-op; this stroke parks its own id when it commits.
    pendingLiveStrokeIdRef.current = null;
  }, [brushType, setScroll]);

  // Commit a finished stroke to the store. Receives the raw SVG-space points +
  // per-point pressure captured on the UI thread, rebuilds the SkPath here, and
  // runs the (unchanged) pressure-width / simplify / rainbow / addAction logic.
  // Runs ONCE on release — not per touch point.
  const commitStroke = useCallback(
    (xs: number[], ys: number[], forces: number[], isStylus: boolean) => {
      brushHaptics.stop();
      setScroll(true);

      // Read the tool state FRESH from the store at commit time, not from this
      // callback's closure. The gesture worklet calls commitStroke via runOnJS,
      // and the gesture object doesn't always rebind to a freshly-created
      // callback after a brushSize/brushType/color change — so a closure read
      // could commit the stroke at the PREVIOUS size ("brush size not always
      // respected when changed"). A stroke can't change tools mid-draw (single
      // touch), so the current store value is the correct one for this stroke.
      const {
        brushSize: liveBrushSize,
        brushType: liveBrushType,
        selectedTool: liveSelectedTool,
        selectedColor: liveSelectedColor,
        rainbowHue: liveRainbowHue,
      } = useCanvasStore.getState();

      if (!svgDimensions || xs.length === 0) {
        // Zero-length stroke (a brush/eraser tap with no drag). No action is
        // committed, so the identity-based deferred clear below would never
        // fire — clear the stray live dot here, directly, instead.
        livePath.value = Skia.Path.Make();
        liveXs.value = [];
        liveYs.value = [];
        liveForces.value = [];
        pendingLiveStrokeIdRef.current = null;
        notifyChange(livePath);
        return;
      }

      // Rebuild the path from the captured points.
      const rebuilt = Skia.Path.Make();
      rebuilt.moveTo(xs[0], ys[0]);
      for (let i = 1; i < xs.length; i++) {
        rebuilt.lineTo(xs[i], ys[i]);
      }

      // Magic Brush drag → commit a region-store reveal (the whole stroke as
      // one magic-reveal action = one SrcIn layer, not one per dab). Colour is
      // re-derived per region from the pre-coloured image at render time; we
      // just store the path + the variant it was drawn under. Skip all the
      // brush/pressure/rainbow logic below.
      if (liveSelectedTool === "magic") {
        const { paletteVariant: liveVariant } = useCanvasStore.getState();
        addAction({
          type: "magic-reveal",
          path: rebuilt,
          color: "#REGIONSTORE",
          variant: liveVariant,
          strokeWidth: getPressureAdjustedWidth(
            liveBrushSize,
            "marker",
            DEFAULT_PRESSURE,
          ),
          sourceWidth: svgDimensions.width,
          sourceHeight: svgDimensions.height,
          liveStrokeId: ++liveStrokeIdRef.current,
        });
        pendingLiveStrokeIdRef.current = liveStrokeIdRef.current;
        return;
      }

      const isErasing = liveSelectedTool === "eraser";
      const effectiveBrushType: BrushType = isErasing
        ? "eraser"
        : liveBrushType;

      const strokeColor = isErasing
        ? "#000000"
        : liveBrushType === "rainbow"
          ? getRainbowColor(liveRainbowHue)
          : liveSelectedColor;

      // Smooth the raw forces the same way the old per-move path did.
      const smoother = pressureSmootherRef.current;
      smoother.reset();
      const pressureArr = forces.map((f) =>
        smoother.add(
          getPressureFromEvent({
            force: f,
            pointerType: isStylus ? "stylus" : "touch",
          }),
        ),
      );
      const pressurePoints = pressureArr.length > 0 ? pressureArr : undefined;

      let averagePressure = DEFAULT_PRESSURE;
      if (pressurePoints && pressurePoints.length > 0) {
        averagePressure =
          pressurePoints.reduce((a, b) => a + b, 0) / pressurePoints.length;
      }
      // Commit at the SAME width the live preview showed so the stroke doesn't
      // snap-resize on release ("flash again and settle"). The preview is a
      // constant DEFAULT_PRESSURE width (it can't vary per-point on the single
      // UI-thread path), so a touch stroke must commit at DEFAULT_PRESSURE to
      // match. Stylus (Apple Pencil) strokes still commit at the measured
      // average pressure — pressure variation is the point of a stylus, and the
      // preview is an accepted approximation there.
      const strokeWidth = isErasing
        ? liveBrushSize * 2
        : getPressureAdjustedWidth(
            liveBrushSize,
            liveBrushType,
            isStylus ? averagePressure : DEFAULT_PRESSURE,
          );

      const textureSeed = Math.random() * 1000;

      const finalPath =
        pathSimplification && shouldSimplify(rebuilt)
          ? simplifyPath(rebuilt, DEFAULT_SIMPLIFICATION_TOLERANCE)
          : rebuilt;

      // Stamp a monotonic id so the deferred clear (useLayoutEffect below) can
      // wipe the live preview exactly when THIS committed stroke renders — not
      // before (vanish gap) and not never (permanent double-draw).
      const liveStrokeId = ++liveStrokeIdRef.current;
      const action: DrawingAction = {
        type: "stroke",
        path: finalPath,
        color: strokeColor,
        brushType: effectiveBrushType,
        strokeWidth,
        startHue: effectiveBrushType === "rainbow" ? liveRainbowHue : undefined,
        sourceWidth: svgDimensions.width,
        sourceHeight: svgDimensions.height,
        pressurePoints,
        isStylus,
        textureSeed,
        liveStrokeId,
      };
      addAction(action);
      pendingLiveStrokeIdRef.current = liveStrokeId;

      if (liveBrushType === "rainbow") {
        advanceRainbowHue(30);
      }
    },
    [
      addAction,
      setScroll,
      advanceRainbowHue,
      svgDimensions,
      pathSimplification,
    ],
  );

  // Handle fill tool tap
  const handleFillTap = useCallback(
    (x: number, y: number) => {
      if (selectedTool !== "fill") return;

      const coords = touchToSvgCoords(x, y);
      if (!coords) return;

      // Haptic feedback for fill action
      tapHeavy();

      // Add fill action with type and pattern info
      const action: DrawingAction = {
        type: "fill",
        color: selectedColor,
        fillX: coords.x,
        fillY: coords.y,
        fillType: fillType,
        patternType: fillType === "pattern" ? selectedPattern : undefined,
        // Store source dimensions for cross-platform sync
        sourceWidth: svgDimensions?.width,
        sourceHeight: svgDimensions?.height,
      };
      addAction(action);
    },
    [
      selectedTool,
      selectedColor,
      fillType,
      selectedPattern,
      touchToSvgCoords,
      addAction,
      svgDimensions,
    ],
  );

  // Handle sticker placement
  const handleStickerTap = useCallback(
    (x: number, y: number) => {
      if (selectedTool !== "sticker") return;

      const coords = touchToSvgCoords(x, y);
      if (!coords) return;

      // Haptic feedback for sticker placement
      tapHeavy();

      // `selectedSticker` is a catalog id; record the id + emoji fallback (the
      // PNG itself resolves from the bundled registry at render time, web
      // parity). stickerCatalogId/stickerImageUrl ride to the wire for
      // cross-device replay.
      const sticker = getCanvasSticker(selectedSticker);
      const action: DrawingAction = {
        type: "sticker",
        color: selectedColor, // Not used but required by type
        sticker: sticker?.emoji ?? selectedSticker, // legacy fallback glyph
        stickerCatalogId: selectedSticker,
        stickerImageUrl: `/images/stickers/canvas/${selectedSticker}.png`,
        stickerX: coords.x,
        stickerY: coords.y,
        stickerSize: stickerSize,
        // Store source dimensions for cross-platform sync
        sourceWidth: svgDimensions?.width,
        sourceHeight: svgDimensions?.height,
      };
      addAction(action);
    },
    [
      selectedTool,
      selectedColor,
      selectedSticker,
      stickerSize,
      touchToSvgCoords,
      addAction,
      svgDimensions,
    ],
  );

  // Handle magic tool tap
  const handleMagicTap = useCallback(
    (x: number, y: number) => {
      if (selectedTool !== "magic") return;
      // Auto Color fires instantly on tool-select (applyAutoColor effect), not
      // on tap — a canvas tap in auto mode is a no-op. Only Magic Brush
      // (suggest) reveals where you touch.
      if (magicMode === "auto") return;

      const coords = touchToSvgCoords(x, y);
      if (!coords || !svgDimensions) return;

      // Magic Brush (suggest) reveals where you touch — a dot at the tap point;
      // the drag path is handled in the pan gesture. Colour is re-derived per
      // region from the pre-coloured image at render time. (Auto Color is
      // instant on tool-select and returns above.)
      if (regionStore.state.isReady && preColored.current) {
        tapMedium();
        const dot = Skia.Path.Make();
        dot.moveTo(coords.x, coords.y);
        dot.lineTo(coords.x, coords.y);
        addAction({
          type: "magic-reveal",
          path: dot,
          color: "#REGIONSTORE",
          variant: paletteVariant,
          strokeWidth: getPressureAdjustedWidth(
            brushSize,
            "marker",
            DEFAULT_PRESSURE,
          ),
          sourceWidth: svgDimensions.width,
          sourceHeight: svgDimensions.height,
        });
        return;
      }

      // ── Legacy fallback (colorMap suggestion hint) ──────────────────────
      const hasColorMap = colorMap && isValidColorMap(colorMap);
      if (!hasColorMap) {
        console.warn("No color data available for magic tool");
        return;
      }

      tapMedium();
      // Show a colour suggestion for the tapped area (grid-based).
      const suggestedCell = getSuggestedColor(
        coords.x,
        coords.y,
        svgDimensions,
        colorMap,
      );
      if (suggestedCell) {
        setMagicHintCell(suggestedCell);
        setMagicHintPosition({ x, y });
      }
    },
    [
      selectedTool,
      magicMode,
      colorMap,
      svgDimensions,
      touchToSvgCoords,
      addAction,
      regionStore.state.isReady,
      preColored,
      paletteVariant,
      brushSize,
    ],
  );

  // Auto Color fills the WHOLE picture — there's no spot to aim at, so it
  // should fire the instant the tool is picked (web parity: ColoringArea fires
  // handleRegionStoreAutoColor in a useEffect on activeTool === 'magic-auto').
  // Requiring a canvas tap was confusing ("I pressed it, nothing happened").
  // Magic Brush (suggest mode) stays tap/drag-driven — that one DOES aim.
  const applyAutoColor = useCallback(() => {
    if (!svgDimensions) return false;

    // Region store path (preferred): one magic-auto action paints the whole
    // pre-coloured layer; colour is re-derived per region at render time.
    if (regionStore.state.isReady && preColored.current) {
      notifySuccess();
      addAction({
        type: "magic-auto",
        color: "#REGIONSTORE",
        variant: paletteVariant,
        sourceWidth: svgDimensions.width,
        sourceHeight: svgDimensions.height,
      });
      return true;
    }

    // Legacy fallback (fillPoints / colorMap) — one magic-fill action with all
    // the per-region fills.
    const hasFillPoints = fillPoints && fillPoints.points.length > 0;
    const hasColorMap = colorMap && isValidColorMap(colorMap);
    if (!hasFillPoints && !hasColorMap) return false;

    const fills: Array<{ x: number; y: number; color: string }> = [];
    if (hasFillPoints) {
      const scaleX = svgDimensions.width / fillPoints.sourceWidth;
      const scaleY = svgDimensions.height / fillPoints.sourceHeight;
      for (const point of fillPoints.points) {
        fills.push({
          x: point.x * scaleX,
          y: point.y * scaleY,
          color: point.color,
        });
      }
    } else if (hasColorMap) {
      const cellWidth = svgDimensions.width / 5;
      const cellHeight = svgDimensions.height / 5;
      colorMap.gridColors.forEach((cell) => {
        fills.push({
          x: (cell.col - 0.5) * cellWidth,
          y: (cell.row - 0.5) * cellHeight,
          color: cell.suggestedColor,
        });
      });
    }
    notifySuccess();
    addAction({
      type: "magic-fill",
      color: fills[0]?.color || "#FFFFFF",
      magicFills: fills,
      sourceWidth: svgDimensions.width,
      sourceHeight: svgDimensions.height,
    });
    return true;
  }, [
    svgDimensions,
    regionStore.state.isReady,
    preColored,
    paletteVariant,
    addAction,
    fillPoints,
    colorMap,
  ]);

  // Fire Auto Color instantly when the tool becomes active (web parity). Runs
  // ONCE per activation: re-selecting Auto Color while still active won't
  // re-fire; switching away and back will. applyAutoColor self-gates on data
  // readiness (returns false until the region store / fill points load), so a
  // not-yet-ready selection retries when readiness flips, then marks fired.
  const autoColorFiredRef = useRef(false);
  const isAutoColorActive = selectedTool === "magic" && magicMode === "auto";
  useEffect(() => {
    if (!isAutoColorActive) {
      autoColorFiredRef.current = false;
      return;
    }
    if (autoColorFiredRef.current) return;
    if (!svgDimensions) return;
    const applied = applyAutoColor();
    if (applied) autoColorFiredRef.current = true;
  }, [isAutoColorActive, svgDimensions, applyAutoColor]);

  // Dismiss magic hint
  const handleDismissMagicHint = useCallback(() => {
    setMagicHintCell(null);
    setMagicHintPosition(null);
  }, []);

  // Use color from magic hint
  const handleUseMagicColor = useCallback(
    (color: string) => {
      setColor(color);
      setTool("brush");
    },
    [setColor, setTool],
  );

  // Pan gesture for drawing or panning
  // Note: event.force and event.pointerType provide Apple Pencil pressure data
  // brush AND eraser both draw a path (the eraser commits a stroke with
  // brushType "eraser", rendered with a dstOut blend). Magic Brush (magic tool
  // in suggest mode, with the region store ready) also drags a path — it
  // commits a magic-reveal instead of a stroke. Anything else pans.
  const isMagicBrush =
    selectedTool === "magic" &&
    magicMode === "suggest" &&
    regionStore.state.isReady &&
    !!preColored.current;
  const isDrawingTool =
    selectedTool === "brush" || selectedTool === "eraser" || isMagicBrush;
  const panGesture = Gesture.Pan()
    // Keep tracking when the finger strays outside the canvas mid-stroke. The
    // default cancels the gesture the moment the touch leaves the view bounds,
    // which fired no onEnd → the stroke was left drawn-but-uncommitted and
    // blinked. With this off, the gesture keeps delivering updates and ends
    // (or finalizes) normally when the finger lifts.
    .shouldCancelWhenOutside(false)
    .onStart((event) => {
      "worklet";
      if (isDrawingTool) {
        // Map screen → SVG coords on the UI thread (no JS hop).
        const xf = drawXform.value;
        const ax = (event.x - xf.tx) / xf.scale;
        const ay = (event.y - xf.ty) / xf.scale;
        const sx = (ax - xf.offsetX) / xf.svgScale;
        const sy = (ay - xf.offsetY) / xf.svgScale;

        const p = Skia.Path.Make();
        p.moveTo(sx, sy);
        livePath.value = p;
        liveXs.value = [sx];
        liveYs.value = [sy];
        const force = (event as unknown as { force?: number }).force ?? 0;
        liveForces.value = [force];
        notifyChange(livePath);
        runOnJS(startStrokeHaptics)();
      }
    })
    .onUpdate((event) => {
      "worklet";
      if (isDrawingTool) {
        const p = livePath.value;
        if (p == null) return;
        const xf = drawXform.value;
        const ax = (event.x - xf.tx) / xf.scale;
        const ay = (event.y - xf.ty) / xf.scale;
        const sx = (ax - xf.offsetX) / xf.svgScale;
        const sy = (ay - xf.offsetY) / xf.svgScale;

        // If the buffer is empty the live path has no starting point — either
        // onStart didn't run, or the deferred clear already emptied it after a
        // (possibly premature) commit. A bare lineTo on an empty SkPath implies
        // a segment FROM the origin (0,0) → a stray line shooting to the
        // top-left corner (the "random line flash"). Re-seed with moveTo
        // instead so we never draw that phantom segment.
        if (liveXs.value.length === 0) {
          p.moveTo(sx, sy);
          liveXs.value = [sx];
          liveYs.value = [sy];
          const force0 = (event as unknown as { force?: number }).force ?? 0;
          liveForces.value = [force0];
          notifyChange(livePath);
          return;
        }

        // Skip points that haven't moved (a stationary hold sends ~60 identical
        // touch events/sec). Without this the buffer grows unbounded during a
        // hold — copied in full every frame (jank) — and commitStroke would
        // simplify a degenerate path of thousands of coincident points, which
        // can emit a stray segment (the "random line" flash on a long hold).
        const lastX = liveXs.value[liveXs.value.length - 1];
        const lastY = liveYs.value[liveYs.value.length - 1];
        if (Math.abs(sx - lastX) < 0.5 && Math.abs(sy - lastY) < 0.5) {
          return;
        }

        p.lineTo(sx, sy);
        // Buffer points + force on the UI thread for the single commit on end.
        liveXs.value = [...liveXs.value, sx];
        liveYs.value = [...liveYs.value, sy];
        const force = (event as unknown as { force?: number }).force ?? 0;
        liveForces.value = [...liveForces.value, force];
        notifyChange(livePath);
      } else {
        // Pan mode
        gestureTranslateX.value = savedTranslateX.value + event.translationX;
        gestureTranslateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd((event) => {
      "worklet";
      // Pan/transform end (non-drawing tool). The DRAWING commit is handled in
      // onFinalize, not here, so it runs whether the gesture ends normally OR is
      // cancelled (finger off-canvas, pinch steals it). Committing only in onEnd
      // left a cancelled stroke drawn-but-uncommitted → it blinked.
      if (!isDrawingTool) {
        savedTranslateX.value = gestureTranslateX.value;
        savedTranslateY.value = gestureTranslateY.value;
        runOnJS(setTranslate)(gestureTranslateX.value, gestureTranslateY.value);
      }
    })
    .onFinalize((event) => {
      "worklet";
      // Commit the drawing stroke on ANY termination — normal end OR cancel.
      // onFinalize always fires (unlike onEnd, which is skipped on cancel), so a
      // stroke is never left as a lingering uncommitted live path. commitStroke
      // early-returns for an empty buffer (tap / never-activated), so this is a
      // no-op when there's nothing to commit. The identity-keyed useLayoutEffect
      // then clears the live preview once the committed <Path> has rendered.
      if (isDrawingTool && liveXs.value.length > 0) {
        const isStylus =
          (event as unknown as { pointerType?: string }).pointerType ===
          "stylus";
        runOnJS(commitStroke)(
          liveXs.value,
          liveYs.value,
          liveForces.value,
          isStylus,
        );
      }
    });

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      runOnJS(setScroll)(false);
    })
    .onUpdate((event) => {
      gestureScale.value = Math.max(
        0.5,
        Math.min(4, savedScale.value * event.scale),
      );
    })
    .onEnd(() => {
      savedScale.value = gestureScale.value;
      runOnJS(setScale)(gestureScale.value);
      runOnJS(setScroll)(true);
    });

  // Tap gesture for fill, sticker, and magic tools
  const tapGesture = Gesture.Tap().onEnd((event) => {
    if (selectedTool === "fill") {
      runOnJS(handleFillTap)(event.x, event.y);
    } else if (selectedTool === "sticker") {
      runOnJS(handleStickerTap)(event.x, event.y);
    } else if (selectedTool === "magic") {
      runOnJS(handleMagicTap)(event.x, event.y);
    }
  });

  // Double tap to reset zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      gestureScale.value = withSpring(1);
      gestureTranslateX.value = withSpring(0);
      gestureTranslateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      runOnJS(setScale)(1);
      runOnJS(setTranslate)(0, 0);
    });

  // Two-finger tap for Undo (advanced gesture)
  // Note: minPointers ensures at least 2 fingers; gesture priority handles the rest
  const twoFingerUndoGesture = Gesture.Tap()
    .minPointers(2)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(tapMedium)();
        runOnJS(undo)();
      }
    });

  // Three-finger tap for Redo (advanced gesture)
  const threeFingerRedoGesture = Gesture.Tap()
    .minPointers(3)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(tapMedium)();
        runOnJS(redo)();
      }
    });

  // Combine gestures
  // Priority order: three-finger redo > two-finger undo > double-tap > single-tap
  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(
      threeFingerRedoGesture,
      twoFingerUndoGesture,
      doubleTapGesture,
      tapGesture,
    ),
    Gesture.Simultaneous(panGesture, pinchGesture),
  );

  // Sync the store transform → Reanimated shared values that the canvas
  // transform actually reads. The zoom/fit BUTTONS (in the tools rail) only
  // mutate the store (setScale / resetTransform), while the on-screen
  // transform is driven by the shared values — so without this the buttons
  // moved the % label but never the canvas. Gestures already write BOTH the
  // shared value and the store to the same number, so the equality guards
  // make this a no-op after a pinch/double-tap (no feedback loop); it only
  // fires when the store diverges from the shared value, i.e. a button press.
  useEffect(() => {
    if (gestureScale.value !== scale) {
      gestureScale.value = withSpring(scale);
      savedScale.value = scale;
    }
    if (gestureTranslateX.value !== translateX) {
      gestureTranslateX.value = withSpring(translateX);
      savedTranslateX.value = translateX;
    }
    if (gestureTranslateY.value !== translateY) {
      gestureTranslateY.value = withSpring(translateY);
      savedTranslateY.value = translateY;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, translateX, translateY]);

  // Animated style for zoom/pan
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: gestureTranslateX.value },
      { translateY: gestureTranslateY.value },
      { scale: gestureScale.value },
    ],
  }));

  // Get visible actions based on history index (for undo/redo)
  const visibleActions = useMemo(() => {
    return getVisibleActions(history, historyIndex);
  }, [history, historyIndex]);

  // Clear the UI-thread live preview exactly once the committed stroke it stood
  // in for has rendered — closing the draw→vanish→reappear flash. We gate on the
  // stroke's IDENTITY (the liveStrokeId stamped in commitStroke), NOT on
  // history.length: addAction truncates the redo tail (undo-then-draw can leave
  // the length unchanged) and MAX_HISTORY's shift() pins the length once full,
  // so a length-keyed clear would silently stop firing and leave the live path
  // permanently double-drawn over the committed one (visible darkening for
  // translucent crayon/marker/paintbrush). Reloaded/persisted actions never
  // carry a liveStrokeId (it isn't serialized), so they can't trigger a
  // spurious clear.
  //
  // CRUCIAL: this clear does NOT call notifyChange(livePath). This effect runs
  // inside the SAME React commit that adds the committed <Path> to renderPaths;
  // the <Canvas> subtree re-reads livePath as a prop during that commit, so
  // emptying it here coalesces into the committed render's own repaint — the
  // committed stroke appears and the live preview empties in ONE Skia frame.
  // Calling notifyChange would instead force a SEPARATE, earlier repaint of the
  // emptied live path (before renderPaths has painted), leaving the stroke blank
  // for the frames until the committed paint lands — the draw→vanish→reappear
  // flash. So: empty the shared values, let the committed render carry the paint.
  useLayoutEffect(() => {
    const pending = pendingLiveStrokeIdRef.current;
    if (pending == null) return;
    // Match BOTH committed types by identity: a Magic Brush drag commits a
    // "magic-reveal" (not a "stroke"), so a stroke-only guard never matched it
    // and left the live magic preview drawn forever — stacked on top of the
    // committed reveal (a second SrcIn pass = the reveal "growing"/intensifying
    // the instant you lift). liveStrokeId is monotonic and never serialized
    // (reloaded actions can't spuriously match), so keying on it across both
    // types is safe. handleMagicTap's reveal sets no liveStrokeId / parks no
    // pending id, so a single-tap reveal is correctly unaffected.
    const committed = visibleActions.some(
      (a) =>
        (a.type === "stroke" || a.type === "magic-reveal") &&
        a.liveStrokeId === pending,
    );
    if (!committed) return;
    pendingLiveStrokeIdRef.current = null;
    livePath.value = Skia.Path.Make();
    liveXs.value = [];
    liveYs.value = [];
    liveForces.value = [];
  }, [visibleActions, livePath, liveXs, liveYs, liveForces]);

  // Compute fill layer image (SVG + all fill/magic-fill actions baked in)
  const { fillLayerImage } = useFillLayer(svg, svgDimensions, visibleActions);

  // Live-preview stroke width. The live path is drawn on the UI thread, so the
  // preview uses a stable default-pressure width (the exact pressure-adjusted
  // width is applied when the stroke is committed in commitStroke). Recomputes
  // only when the tool/size/brush changes, not per touch point.
  //
  // The live width MUST equal the committed width for the same gesture, or the
  // stroke visibly snaps to a different size the instant you lift (the "flash
  // again and settle" / "magic stroke grows" report). Two alignment points:
  //   - Magic Brush commits with the "marker" multiplier (commitStroke), NOT
  //     the active brushType — so preview here with "marker" too, else the
  //     preview is the active brush's width and jumps to marker's on commit.
  //   - Touch (non-stylus) regular strokes commit at DEFAULT_PRESSURE width
  //     (see commitStroke), so the default-pressure preview already matches;
  //     stylus strokes commit at the measured average pressure, which the
  //     constant-width preview can only approximate (per-point width can't be
  //     applied to the single UI-thread live path).
  const currentStrokeWidth = useMemo(() => {
    // Eraser uses a flat radius*2 (web parity), ignoring pressure.
    if (selectedTool === "eraser") return brushSize * 2;
    if (selectedTool === "magic") {
      return getPressureAdjustedWidth(brushSize, "marker", DEFAULT_PRESSURE);
    }
    return getPressureAdjustedWidth(brushSize, brushType, DEFAULT_PRESSURE);
  }, [brushSize, brushType, selectedTool]);

  // Render stickers as bundled transparent PNGs (web parity — the canvas
  // tool stamps PNGs, not emoji). Each placed sticker resolves its catalog id
  // to a bundled asset via StickerActionImage (which calls useImage). Legacy
  // emoji-only saves (no stickerCatalogId) fall back to the Skia Paragraph
  // emoji render inside that child.
  const renderStickers = useMemo(() => {
    return visibleActions
      .filter(
        (action) =>
          action.type === "sticker" &&
          (action.stickerCatalogId || action.sticker),
      )
      .map((action, index) => (
        <StickerActionImage key={`sticker-${index}`} action={action} />
      ));
  }, [visibleActions]);

  // Render drawing paths
  const renderPaths = useMemo(() => {
    return visibleActions
      .filter((action) => action.type === "stroke" && action.path)
      .map((action, index) => {
        const strokeWidth =
          action.strokeWidth ||
          brushSize * getBrushMultiplier(action.brushType || "crayon");

        // Apply brush-specific rendering
        let alpha = 1.0;
        if (action.brushType === "crayon") {
          alpha = 0.85;
        } else if (action.brushType === "marker") {
          alpha = 0.75;
        } else if (action.brushType === "glow") {
          alpha = 0.7;
        }

        // Textured crayon rendering (when texture feature is enabled)
        if (
          texturedBrushes &&
          action.brushType === "crayon" &&
          BRUSH_TEXTURE_CONFIG.crayon?.texture
        ) {
          const paint = createBrushPaint(
            action.color,
            action.brushType,
            strokeWidth,
            {
              useTextures: true,
              textureSeed: action.textureSeed ?? 0,
            },
          );

          return (
            <Path
              key={`path-${index}`}
              path={action.path!}
              paint={paint}
              style="stroke"
              strokeCap="round"
              strokeJoin="round"
            />
          );
        }

        // Textured pencil rendering (when texture feature is enabled)
        if (
          texturedBrushes &&
          action.brushType === "pencil" &&
          BRUSH_TEXTURE_CONFIG.pencil?.texture
        ) {
          const paint = createBrushPaint(
            action.color,
            action.brushType,
            strokeWidth,
            {
              useTextures: true,
              textureSeed: action.textureSeed ?? 0,
            },
          );

          return (
            <Path
              key={`path-${index}`}
              path={action.path!}
              paint={paint}
              style="stroke"
              strokeCap="round"
              strokeJoin="round"
            />
          );
        }

        // Eraser: dstOut blend punches the stroke's coverage out of whatever
        // was painted earlier in the enclosing erasable layer group (fills +
        // brush strokes), revealing the white background. Colour is irrelevant
        // under dstOut — only the stroke's alpha coverage matters. The SVG
        // outline + white Fill sit OUTSIDE the layer, so they're never erased.
        if (action.brushType === "eraser") {
          return (
            <Path
              key={`path-${index}`}
              path={action.path!}
              color="black"
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="round"
              strokeJoin="round"
              blendMode="dstOut"
            />
          );
        }

        // Paintbrush ("Paint"): broad, translucent, soft-edged — web draws
        // semi-transparent (~0.5 alpha) strokes with soft radial dabs. A
        // subtle blur mask gives the watery soft edge in Skia without
        // per-dab gradients; the broad width comes from the 1.6 multiplier.
        if (action.brushType === "paintbrush") {
          return (
            <Path
              key={`path-${index}`}
              path={action.path!}
              color={action.color}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="round"
              strokeJoin="round"
              opacity={0.5}
            >
              <BlurMask blur={3} style="normal" />
            </Path>
          );
        }

        // Glow and neon effects need blur
        if (action.brushType === "glow") {
          return (
            <Group key={`path-${index}`}>
              <Path
                path={action.path!}
                color={action.color}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeCap="round"
                strokeJoin="round"
                opacity={alpha}
              >
                <BlurMask blur={8} style="normal" />
              </Path>
            </Group>
          );
        }

        if (action.brushType === "neon") {
          return (
            <Group key={`path-${index}`}>
              <Path
                path={action.path!}
                color={action.color}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeCap="round"
                strokeJoin="round"
                opacity={1}
              >
                <BlurMask blur={12} style="outer" />
              </Path>
            </Group>
          );
        }

        // Glitter effect with sparkle particles
        if (action.brushType === "glitter") {
          const particles = generateGlitterParticles(
            action.path!,
            action.color,
            0.12,
          );
          return (
            <Group key={`path-${index}`}>
              {/* Base stroke with transparency */}
              <Path
                path={action.path!}
                color={action.color}
                style="stroke"
                strokeWidth={strokeWidth}
                strokeCap="round"
                strokeJoin="round"
                opacity={0.6}
              />
              {/* Sparkle particles */}
              {particles.map((particle, pIndex) => {
                const sparklePath = createSparklePath(
                  particle.x,
                  particle.y,
                  particle.size,
                  particle.rotation,
                );
                return (
                  <Path
                    key={`sparkle-${index}-${pIndex}`}
                    path={sparklePath}
                    color={particle.color}
                    style="fill"
                    opacity={particle.opacity}
                  />
                );
              })}
            </Group>
          );
        }

        return (
          <Path
            key={`path-${index}`}
            path={action.path!}
            color={action.color}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            strokeJoin="round"
            opacity={alpha}
          />
        );
      });
  }, [visibleActions, brushSize, texturedBrushes]);

  // Render committed region-store magic actions (Magic Brush reveals +
  // Auto Color). magic-auto draws the whole pre-coloured image; magic-reveal
  // reveals the pre-coloured image only along the stroke via SrcIn (the white
  // stroke is the mask, the image supplies the per-region colour). Each looks
  // up the pre-coloured image for the variant the action was committed under,
  // so undo/redo across a palette switch keeps history's colours.
  // Committed region-store magic, SPLIT by variant so the active-variant
  // reveals can share ONE saveLayer with the live preview (see the live-preview
  // render below).
  //
  // Why the split: each reveal is a white stroke masking the pre-coloured image
  // via SrcIn, wrapped in its own layer={<Paint/>} (a saveLayer). When a Magic
  // Brush stroke commits, the live preview group (its own saveLayer) is swapped
  // for the committed reveal group (another saveLayer) in one frame. SrcIn over
  // SrcIn is non-idempotent at fractional edge coverage (2c - c² > c), so two
  // independently-flattened saveLayers swapping in place make the antialiased
  // stroke EDGE brighten for exactly one frame — the "flash". (Regular brush
  // strokes don't flash: live + committed are bare sibling <Path>s in one
  // layer, so the swap is an in-place body overwrite, not a layer flip.)
  //
  // Fix: collect the active-variant reveal MASKS (just the white <Path>s) and
  // render them as siblings of the live mask inside ONE shared saveLayer with a
  // single SrcIn pass (below). The commit then becomes an in-place
  // re-rasterization of that one layer (committed mask appears, live mask
  // empties) — pixel-identical edges across the transition, no layer swap.
  // Other-variant reveals (undo/redo across a palette switch) and magic-auto
  // keep their own per-node groups so history colours stay correct.
  const activeRevealMaskPaths = useMemo(() => {
    return visibleActions
      .filter(
        (a) =>
          a.type === "magic-reveal" &&
          !!a.path &&
          ((a.variant as PaletteVariant) ?? "realistic") === paletteVariant,
      )
      .map((action, index) => (
        <Path
          key={`active-reveal-mask-${index}`}
          path={action.path!}
          color="white"
          style="stroke"
          strokeWidth={action.strokeWidth ?? brushSize}
          strokeCap="round"
          strokeJoin="round"
        />
      ));
  }, [visibleActions, brushSize, paletteVariant]);

  const renderReveals = useMemo(() => {
    if (!svgDimensions) return null;
    return visibleActions
      .filter((a) => a.type === "magic-auto" || a.type === "magic-reveal")
      .map((action, index) => {
        // Active-variant reveals are rendered in the shared live group below;
        // skip them here so they aren't double-drawn in their own saveLayer.
        if (
          action.type === "magic-reveal" &&
          ((action.variant as PaletteVariant) ?? "realistic") === paletteVariant
        ) {
          return null;
        }

        const image = preColored.forVariant(
          (action.variant as PaletteVariant) ?? "realistic",
        );
        if (!image) return null;

        if (action.type === "magic-auto") {
          return (
            <SkiaImage
              key={`magic-auto-${index}`}
              image={image}
              x={0}
              y={0}
              width={svgDimensions.width}
              height={svgDimensions.height}
              fit="fill"
            />
          );
        }

        // Other-variant magic-reveal — mask the pre-coloured image to the
        // stroke in its own layer (keeps the committed-under variant's colours).
        if (!action.path) return null;
        return (
          <Group key={`magic-reveal-${index}`} layer={<Paint />}>
            <Path
              path={action.path}
              color="white"
              style="stroke"
              strokeWidth={action.strokeWidth ?? brushSize}
              strokeCap="round"
              strokeJoin="round"
            />
            <SkiaImage
              image={image}
              x={0}
              y={0}
              width={svgDimensions.width}
              height={svgDimensions.height}
              fit="fill"
              blendMode="srcIn"
            />
          </Group>
        );
      });
  }, [visibleActions, preColored, svgDimensions, brushSize, paletteVariant]);

  if (!svgDimensions) {
    return null;
  }

  return (
    <View className="relative">
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          className="bg-white rounded-lg overflow-hidden"
          style={[
            {
              height: canvasHeight,
              width: canvasWidth,
              ...perfect.boxShadow,
              ...style,
            },
            animatedStyle,
          ]}
        >
          {svg ? (
            <Canvas
              ref={canvasRef}
              onSize={canvasSize}
              style={{
                height: canvasHeight,
                width: canvasWidth,
              }}
            >
              {/* White background for snapshot capture (JPEG doesn't support transparency) */}
              <Fill color="white" />
              {/* Erasable content group. Everything the eraser can remove —
                  the baked fill image, brush strokes, stickers, and the live
                  stroke — lives inside ONE offscreen layer (layer={<Paint/>}
                  forces a saveLayer). Eraser strokes use blendMode "dstOut",
                  which only composites against siblings painted earlier IN
                  this layer, so they punch holes in the fills/strokes back to
                  the white Fill below — without touching the SVG outline
                  (drawn in a separate group on top). The fill image is now
                  INSIDE the transform group so it shares the strokes'
                  coordinate space and the eraser affects both. */}
              <Group layer={<Paint />} transform={transform}>
                {/* Fill layer image (baked fills/magic-fills). This group is
                    in SVG (viewBox) coordinate space — `transform` does the
                    SVG→canvas fitbox scale — so children must be sized in SVG
                    units, NOT canvas pixels. The fill image is rasterized in
                    useFillLayer at exactly svgDimensions, so drawing it at
                    svgDimensions is 1:1 and the parent transform places/scales
                    it to fill the canvas. (Sizing it at canvasWidth here drew
                    it in SVG space then let the transform scale it AGAIN, which
                    shrank the whole image into a tiny duplicate in the
                    top-left corner — the regression from the eraser-layer
                    refactor that moved this image inside the transform group.) */}
                {fillLayerImage && svgDimensions && (
                  <SkiaImage
                    image={fillLayerImage}
                    x={0}
                    y={0}
                    width={svgDimensions.width}
                    height={svgDimensions.height}
                    fit="fill"
                  />
                )}
                {/* SVG base layer (below drawings) — hidden when fill layer is
                    active. Same coordinate space as above: size in SVG units. */}
                {!fillLayerImage && svgDimensions && (
                  <ImageSVG
                    x={0}
                    y={0}
                    width={svgDimensions.width}
                    height={svgDimensions.height}
                    svg={svg}
                  />
                )}
                {/* Server restore snapshot (cross-device fallback for legacy/
                    reference pages). Base layer above the fill/SVG, below magic
                    + strokes + stickers so new work composes on top and the
                    eraser (same erasable group, dstOut) cuts through it. fit
                    "fill" maps the 1024² raster into the SVG viewBox. */}
                {restoredSnapshot && svgDimensions && (
                  <SkiaImage
                    image={restoredSnapshot}
                    x={0}
                    y={0}
                    width={svgDimensions.width}
                    height={svgDimensions.height}
                    fit="fill"
                  />
                )}
                {/* Region-store magic (Auto Color + Magic Brush reveals) —
                    above the base/fill, below strokes & stickers so brush work
                    sits on top and the eraser punches through both.
                    renderReveals now emits only magic-auto + OTHER-variant
                    reveals; the ACTIVE-variant reveals + the live Magic Brush
                    preview share the one saveLayer below (kept at THIS z-slot,
                    below strokes/stickers, so brush work still sits on top). */}
                {renderReveals}
                {/* Active-variant magic reveals + live Magic Brush preview in
                    ONE saveLayer (single SrcIn). Placed here (below strokes) so
                    z-order is unchanged from when these reveals lived in
                    renderReveals. Merging committed + live into one layer is
                    what removes the one-frame edge flash on commit (see the
                    activeRevealMaskPaths comment). The live mask is only present
                    while Magic Brush is the active drawing tool; otherwise just
                    the committed active masks render. */}
                {(isMagicBrush || activeRevealMaskPaths.length > 0) &&
                preColored.current ? (
                  <Group layer={<Paint />}>
                    {activeRevealMaskPaths}
                    {isMagicBrush && (
                      <Path
                        path={livePath}
                        color="white"
                        style="stroke"
                        strokeWidth={currentStrokeWidth}
                        strokeCap="round"
                        strokeJoin="round"
                      />
                    )}
                    <SkiaImage
                      image={preColored.current}
                      x={0}
                      y={0}
                      width={svgDimensions.width}
                      height={svgDimensions.height}
                      fit="fill"
                      blendMode="srcIn"
                    />
                  </Group>
                ) : null}
                {/* Rendered paths */}
                {renderPaths}
                {/* Rendered stickers */}
                {renderStickers}
                {/* Live drawing path — built on the UI thread (livePath shared
                    value), styled by the active tool/brush (stable mid-stroke).
                    Always mounted; an empty Skia path draws nothing (the "no
                    live stroke" state). It stays drawn from finger-up until the
                    committed <Path> for the stroke has rendered, then the
                    deferred-clear effect resets it to empty — so the stroke is
                    never blank for a frame (no flash). The path geometry updates
                    on the UI thread via the shared value with no per-point
                    re-render. */}
                {/* Magic Brush has NO live branch here — its live preview is
                    merged into the shared active-reveal saveLayer above (below
                    strokes) to avoid the commit-frame edge flash. So when Magic
                    Brush is active this live slot draws nothing. */}
                {isMagicBrush ? null : selectedTool === "eraser" ? (
                  // Live eraser preview — dstOut so it erases as you drag.
                  <Path
                    path={livePath}
                    color="black"
                    style="stroke"
                    strokeWidth={currentStrokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    blendMode="dstOut"
                  />
                ) : brushType === "glow" ? (
                  <Path
                    path={livePath}
                    color={selectedColor}
                    style="stroke"
                    strokeWidth={currentStrokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={0.7}
                  >
                    <BlurMask blur={8} style="normal" />
                  </Path>
                ) : brushType === "neon" ? (
                  <Path
                    path={livePath}
                    color={selectedColor}
                    style="stroke"
                    strokeWidth={currentStrokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={1}
                  >
                    <BlurMask blur={12} style="outer" />
                  </Path>
                ) : brushType === "paintbrush" ? (
                  // Live Paint preview — translucent + soft edge (matches the
                  // committed paintbrush render).
                  <Path
                    path={livePath}
                    color={selectedColor}
                    style="stroke"
                    strokeWidth={currentStrokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={0.5}
                  >
                    <BlurMask blur={3} style="normal" />
                  </Path>
                ) : (
                  <Path
                    path={livePath}
                    color={
                      brushType === "rainbow"
                        ? getRainbowColor(rainbowHue)
                        : selectedColor
                    }
                    style="stroke"
                    strokeWidth={currentStrokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                    opacity={
                      brushType === "crayon"
                        ? 0.85
                        : brushType === "marker"
                          ? 0.75
                          : 1
                    }
                  />
                )}
              </Group>
              {/* SVG outline layer (on top) — OUTSIDE the erasable layer so
                  the eraser never removes the line art. */}
              <Group transform={transform}>
                <ImageSVG
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  svg={svg}
                />
              </Group>
            </Canvas>
          ) : null}
        </Animated.View>
      </GestureDetector>

      {/* Magic Color Hint popup */}
      <MagicColorHint
        colorCell={magicHintCell}
        position={magicHintPosition}
        onDismiss={handleDismissMagicHint}
        onUseColor={handleUseMagicColor}
      />
    </View>
  );
};

export default ImageCanvas;
