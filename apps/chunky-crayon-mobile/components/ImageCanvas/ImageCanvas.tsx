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
  InteractionManager,
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
  Picture,
  Paint,
  BlurMask,
  BlendMode,
  BlurStyle,
  createPicture,
  Fill,
  ImageFormat,
  ColorType,
  AlphaType,
  notifyChange,
  type SkImage,
  type SkSize,
  type SkSurface,
  type SkPaint,
  type SkPicture,
  type SkCanvas,
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
import { CANVAS_STICKER_IMAGES } from "@/lib/canvasStickers";
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
  clearMergedActionsHandler,
  unionLocalWithMerged,
  isSyncInFlight,
} from "@/utils/canvasPersistence";
import { queryClient } from "@/providers";
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

// ── Committed strokes as a shared-value SkPicture ────────────────────────────
// All ADDITIVE brushes are baked into a SharedValue<SkPicture> rendered via
// <Picture>. Committing happens in the onFinalize WORKLET (UI thread) so it
// triggers exactly ONE Skia redraw — web's "pointerup redraws nothing" model.
// See docs/mobile/canvas-immediate-mode.md.
//
// v2 baked set = crayon/marker/pencil/paintbrush/rainbow/glow/neon — every brush
// whose paint is color + alpha + optional blur MaskFilter (all worklet-safe).
// EXCLUDED (still React <Path> nodes): "eraser" (dstOut must cut the FILL image
// beneath, which only works as a node sibling in the erasable saveLayer, not in
// the strokes picture); "glitter" (sparkle particle sub-paths via JS utils, not
// trivially worklet-safe). Textured crayon/pencil need the texturedBrushes flag,
// which is OFF by default, so the textured branch is dead here. Keep
// BAKED_BRUSH_TYPES in sync with the renderPaths filter below.
//
// TODO(eraser flash): the eraser still commits via React → still flashes on its
// own commit (the v2 known limitation). The full fix is to bake the FILL layer
// into this picture as its base so the eraser can bake on top with dstOut cutting
// both strokes AND fill in one layer (v3). Deferred — it couples this picture to
// the async flood-fill layer and adds risk to the load-bearing fill/magic/eraser
// path. See docs/mobile/canvas-immediate-mode.md (Status/scope) for the full
// rationale: the problem, what failed, why we landed on the shared-value picture,
// and why the eraser is the one brush left out.
const STROKE_BAKE_LOG = true; // [FLASH_DIAG] trace commit/re-bake while fixing.

const BAKED_BRUSH_TYPES = new Set<BrushType>([
  "crayon",
  "marker",
  "pencil",
  "paintbrush",
  "rainbow",
  "glow",
  "neon",
]);
const isBakedStroke = (action: DrawingAction): boolean =>
  // Textured crayon/pencil render via a shader paint that isn't worklet-safe;
  // when the flag is on, fall back to a React node so they still draw. (Flag is
  // OFF by default, so this is normally a no-op.)
  action.type === "stroke" &&
  !!action.path &&
  BAKED_BRUSH_TYPES.has((action.brushType as BrushType) ?? "crayon");

// Per-brush paint params, matched to the declarative renderPaths inline paints
// EXACTLY (NOT createBrushPaint — different blend modes). blurSigma 0 = no blur.
// blurStyle is the BlurStyle enum (Normal/Outer). Used by the worklet commit (via
// commitStyle) AND the JS rebuild.
const bakedBrushParams = (
  brushType: BrushType | undefined,
): { alpha: number; blurSigma: number; blurStyle: BlurStyle } => {
  "worklet";
  switch (brushType) {
    case "marker":
      return { alpha: 0.75, blurSigma: 0, blurStyle: BlurStyle.Normal };
    case "glow":
      return { alpha: 0.7, blurSigma: 8, blurStyle: BlurStyle.Normal };
    case "neon":
      return { alpha: 1, blurSigma: 12, blurStyle: BlurStyle.Outer };
    case "paintbrush":
      return { alpha: 0.5, blurSigma: 3, blurStyle: BlurStyle.Normal };
    // pencil + rainbow render at full alpha in renderPaths' default branch.
    case "pencil":
    case "rainbow":
      return { alpha: 1, blurSigma: 0, blurStyle: BlurStyle.Normal };
    default: // crayon (and fallback)
      return { alpha: 0.85, blurSigma: 0, blurStyle: BlurStyle.Normal };
  }
};

// WORKLET-SAFE: draw one baked stroke into a Skia canvas. Used by BOTH the commit
// worklet (UI thread) and the JS-side rebuild-from-actions. Only synchronous Skia
// primitives (Paint/Color/MaskFilter/drawPath) → safe on either runtime.
const drawBakedStroke = (
  canvas: SkCanvas,
  path: SkPath,
  color: string,
  width: number,
  alpha: number,
  blurSigma: number,
  blurStyle: BlurStyle,
): void => {
  "worklet";
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(1); // stroke
  paint.setStrokeWidth(width);
  paint.setStrokeCap(1); // round
  paint.setStrokeJoin(1); // round
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(alpha);
  if (blurSigma > 0) {
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(blurStyle, blurSigma, true));
  }
  canvas.drawPath(path, paint);
};

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
 * that calls useImage. Resolves the bundled asset by catalog id. Centred on the
 * tap point, sized by the action's stickerSize. Stickers are illustrated PNGs;
 * a save without a known catalog id renders nothing (no emoji fallback).
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

  // Either the PNG is still decoding, or this is a legacy save with no known
  // catalog id — render nothing. (Decode is fast, so a blank frame or two is
  // invisible. Stickers are illustrated PNGs; there is no emoji fallback.)
  return null;
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
    if (DIAG_DISABLE_PROGRESS_SNAPSHOT) return; // TEMP flash-bisect
    if (measuringRef.current) return;
    // A canvas with no renderable PAINT actions is 0% by definition — short-
    // circuit before the pixel sample. `clear` (Start Over) is a terminal that
    // paints nothing, so a history of only clears still reads blank: otherwise
    // the snapshot of the blank line-art raster samples a few anti-aliased
    // outline pixels and the bar sticks at ~1% after Start Over instead of
    // snapping to empty (web shows no bar at 0; mobile shows an empty pill).
    // This cheap store read stays synchronous so 0% snaps instantly.
    const { history: h, historyIndex: hi } = useCanvasStore.getState();
    const hasPaint = getVisibleActions(h, hi).some((a) => a.type !== "clear");
    if (!hasPaint) {
      useCanvasStore.getState().setProgress(0);
      return;
    }
    // Defer the snapshot + pixel readback (the hundreds-of-ms synchronous Skia
    // work) off the commit tick. This is the MORE FREQUENT of the two snapshot
    // callers — it fires ~250ms after EVERY committed stroke (autosave is 1s and
    // resets on rapid drawing), so its synchronous makeImageSnapshot + readRGBA
    // colliding with the next stroke's commit → deferred-clear handoff is the
    // leading cause of the residual ~1-frame stroke blink. runAfterInteractions
    // does NOT wait for gestures/animations in this stack (gesture-handler +
    // reanimated register no RN interaction handles) — it fires on the next
    // drained-JS-queue tick (like setTimeout 0). That is sufficient: it makes
    // the snapshot its OWN JS task, never on the handoff tick.
    if (progressTaskRef.current) progressTaskRef.current.cancel();
    progressTaskRef.current = InteractionManager.runAfterInteractions(() => {
      progressTaskRef.current = null;
      if (measuringRef.current) return;
      const snap = safeMakeSnapshot(); // null mid-rotation / 0-dim → skip
      if (!snap) return;
      measuringRef.current = true;
      try {
        const w = snap.width();
        const sh = snap.height();
        if (w < 1 || sh < 1) return;
        const cached = getPaintableMask(w, sh);
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
          sh,
          PROGRESS_STRIDE,
        );
        useCanvasStore
          .getState()
          .setProgress(
            progressPercent({ painted, paintable: cached.paintable }),
          );
      } finally {
        measuringRef.current = false;
      }
    });
  }, [safeMakeSnapshot, getPaintableMask, readRGBA]);

  const isInitializedRef = useRef(false);

  // Apple Pencil pressure smoothing — applied at commit time over the per-point
  // forces captured on the UI thread during the stroke.
  const pressureSmootherRef = useRef(new PressureSmoother(3));

  // Monotonic per-stroke id (render-only, never serialized). The live→committed
  // FROZEN HANDOFF that used to consume this — frozenStrokeId/frozenVisible/
  // committedLivePath + the swap useLayoutEffect — is GONE. Committed strokes now
  // bake into a retained offscreen surface (crayon/marker) or render as a
  // renderPaths node (other brushes), and the re-bake useLayoutEffect clears the
  // live path in the SAME React commit the surface/node gains the stroke — one
  // redraw, no frozen copy, no swap, no 3-redraw burst (the flash root cause).
  const liveStrokeIdRef = useRef(0);

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
    restoreHistory,
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

  // ── Committed crayon/marker strokes as a SHARED-VALUE SkPicture ────────────
  // The committed baked strokes live in a SharedValue<SkPicture>, rendered via
  // <Picture picture={committedPicture}/> — read on the UI thread exactly like
  // the live <Path path={livePath}/>. THE POINT: committing a stroke happens in
  // the onFinalize WORKLET (UI thread) — it builds a new picture (old picture +
  // the just-finished stroke) and assigns it + clears livePath in ONE worklet
  // tick → ONE notifyChange → ONE Skia redraw. addAction still runs (via runOnJS)
  // for undo/persistence but feeds NOTHING in the Canvas tree for baked brushes,
  // so the React commit triggers no canvas redraw. This is web's "pointerup
  // redraws nothing" — the only thing that kills the multi-redraw burst (the
  // previous React-state surface still bursted: addAction render + setState +
  // livePath notify = 3 redraws raced by rn-skia).
  const committedPicture = useSharedValue<SkPicture>(createPicture(() => {}));
  // Paint params for the active baked brush, mirrored into a shared value so the
  // commit worklet can build the stroke paint WITHOUT reading React state (a
  // worklet can't touch the store). Updated by an effect on tool/color/size.
  // crayon/marker touch strokes commit at the live preview width + no rainbow, so
  // these values equal the committed appearance.
  const commitStyle = useSharedValue<{
    color: string;
    width: number;
    alpha: number;
    blurSigma: number;
    blurStyle: BlurStyle;
    baked: boolean;
  }>({
    color: "#000000",
    width: 1,
    alpha: 1,
    blurSigma: 0,
    blurStyle: BlurStyle.Normal,
    baked: false,
  });

  // ── TEMP flash-bisect toggles (revert before commit) ──────────────────────
  // The flash is intermittent on random strokes (NOT post-clear-specific). The
  // prime suspects are the async makeImageSnapshot() readbacks that fire near a
  // commit and force a synchronous GPU flush of the on-screen surface (a textbook
  // intermittent-flash cause). Flip these one at a time to bisect:
  //   DIAG_DISABLE_PROGRESS_SNAPSHOT — the ~250ms-after-every-commit progress
  //     measure snapshot (runProgressMeasure). MOST likely (fires on every stroke).
  //   DIAG_DISABLE_AUTOSAVE_SNAPSHOT — the autosave Phase-2 raster snapshot.
  //   DIAG_DISABLE_SERVER_SYNC — the mid-stroke server sync writeback.
  // Set a flag true to turn that subsystem OFF (non-destructive — only the
  // diagnostic artifact is skipped; the action-list autosave/replay is untouched).
  // BISECT COMPLETE (all back to false = normal behavior restored):
  //   R1 progress snapshot OFF → still flashed.
  //   R2 BOTH snapshots OFF → still flashed → snapshots EXONERATED.
  //   R3 + server sync OFF → STILL flashed → ALL async subsystems EXONERATED.
  // Root cause = the freeze live→committed render handoff (the swap effect's
  // frozen-copy drop racing the bare <Path>'s React paint). Fixed separately;
  // these toggles are kept temporarily for re-bisect and removed before commit.
  const DIAG_DISABLE_PROGRESS_SNAPSHOT = false;
  const DIAG_DISABLE_AUTOSAVE_SNAPSHOT = false;
  const DIAG_DISABLE_SERVER_SYNC = false;
  // TEMP flash-bisect (round 4): remove the offscreen saveLayer (layer={<Paint/>})
  // from the erasable Group. This isolates the ONE suspect the earlier bisect
  // never tested — a non-atomic re-rasterization of that backing texture at the
  // per-stroke commit, which (unlike the handoff) is below the JS layer and would
  // explain an INTERMITTENT flash from an identical clean JS sequence. With the
  // layer off, the eraser composites WRONG (dstOut needs the layer) — that's
  // expected and throwaway; we only check whether the FLASH disappears for a
  // NON-eraser brush. true = layer OFF (test); false = normal.
  // REVERTED to false: device test proved the saveLayer is NOT the cause (blink
  // persisted with it off), and off breaks the eraser. Restore normal compositing.
  const DIAG_DISABLE_ERASABLE_SAVELAYER = false;

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

  // Deferred-snapshot task handles. The autosave raster (Phase 2) and the
  // progress measure both do a SYNCHRONOUS Skia snapshot + pixel readback —
  // hundreds of ms on the JS thread. Run inside InteractionManager.runAfter-
  // Interactions so they land on their OWN drained-queue JS task, never on the
  // same tick as a stroke's commit → deferred-clear handoff (which must coalesce
  // empty-live + paint-committed into one Skia frame). A snapshot on that tick
  // splits the handoff across a frame boundary → the rare ~1-frame stroke blink.
  // Tracked so they can be cancelled on cleanup / image change (preserves the
  // iPad-rotate 0-dim SIGABRT guard — a stale task must not snapshot a torn-down
  // or mid-rotation surface).
  const snapshotTaskRef = useRef<{ cancel: () => void } | null>(null);
  const progressTaskRef = useRef<{ cancel: () => void } | null>(null);

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

      // Cancel any deferred snapshot/progress task left over from the previous
      // image so its safeMakeSnapshot/encode can't run against the new image's
      // canvas (belt-and-suspenders alongside the effect-cleanup cancels).
      if (snapshotTaskRef.current) {
        snapshotTaskRef.current.cancel();
        snapshotTaskRef.current = null;
      }
      if (progressTaskRef.current) {
        progressTaskRef.current.cancel();
        progressTaskRef.current = null;
      }

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

        // Restore saved actions if they exist — in ONE atomic commit. The old
        // path called addAction per action, and each addAction is its own
        // store set() → its own re-render → its own Skia repaint. So an
        // N-action page painted itself blank (after reset) and then rebuilt
        // region-by-region across N frames — the visible "first-open flash" the
        // user reported on every coloring-page open. restoreHistory installs
        // the whole set in a single commit: one paint, the artwork appears at
        // once. (restoreHistory stamps identity exactly like addAction.)
        if (savedActions.length > 0) {
          console.log(
            `[CANVAS_INIT] Restoring ${savedActions.length} actions in one commit...`,
          );
          restoreHistory(savedActions);
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
  }, [coloringImage.id, reset, setImageId, restoreHistory, imageId]);

  // Prime the cached device id (async SecureStore read) so actions stamped
  // synchronously in addAction carry the real originDeviceId, and register the
  // 409 append-merge rehydrate: when the sync layer merges this image, replace
  // the store history with the merged union so the next autosave persists it.
  useEffect(() => {
    void primeDeviceId();
    // Per-image handler (keyed by id in the Map), so a 409 merge for THIS image
    // reconciles this screen even when another coloring-image screen is mounted
    // underneath. The old single-slot handler needed an inner id-guard and let
    // the last-mounted screen win; the Map keys by id, so no guard is needed.
    setMergedActionsHandler(coloringImage.id, (mergedActions) => {
      // Only the ACTIVE image should rehydrate the shared store — a merge for a
      // backgrounded image must not setHistory over the foreground canvas.
      if (useCanvasStore.getState().imageId !== coloringImage.id) return;
      // Re-merge the incoming set against the LIVE store history, not a blind
      // replace. The 409 merge was built from a POST-time snapshot, so a stroke
      // drawn during the ~1s round-trip is absent from it; a blind
      // setHistory(merged) would drop that in-flight stroke permanently (the
      // "stroke vanishes a beat after release and doesn't come back" bug).
      // unionLocalWithMerged keeps local-only actions (live store wins) while
      // still absorbing the server's merged work. Idempotent + id-deduped, so
      // it's a no-op when nothing was drawn mid-flight.
      const liveHistory = useCanvasStore.getState().history;
      const unioned = unionLocalWithMerged(
        liveHistory,
        mergedActions,
        svgDimensions?.width,
        svgDimensions?.height,
      );
      // CRITICAL: only setHistory when the union ACTUALLY differs from current
      // history. setHistory installs a NEW array reference, which re-arms the
      // autosave effect (deps [history, historyIndex]) → another sync → another
      // 409 (the server +1s every accepted write) → another merge → back here.
      // Because the autosave fires TWO writes per cycle (action-list + raster),
      // they leapfrog the version forever: a content-IDENTICAL merge would still
      // setHistory a fresh ref and keep that loop spinning (version climbs with
      // no new strokes — the stroke flash + bouncing progress). Comparing by
      // stable id + undo state, skip the setHistory when nothing changed so the
      // loop terminates once the action set is stable.
      const sameSet =
        unioned.length === liveHistory.length &&
        unioned.every((a, i) => {
          const b = liveHistory[i];
          return (
            !!b &&
            a.id === b.id &&
            (a.undone ?? false) === (b.undone ?? false) &&
            (a.undoneSeq ?? 0) === (b.undoneSeq ?? 0)
          );
        });
      if (!sameSet) setHistory(unioned);
    });
    return () => clearMergedActionsHandler(coloringImage.id);
  }, [coloringImage.id, setHistory, svgDimensions]);

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

        // Refresh the "More Coloring Pages" / feed thumbnails ONCE on leave. This
        // used to live in syncCanvasToServer (fired on every stroke), which
        // invalidated ["feed"] per stroke → the route's feed strip re-rendered
        // the whole screen each stroke (~110ms, the measured flash/jank). Doing
        // it here means the preview is fresh when the user navigates back, with
        // zero per-stroke cost. The focus-loss save above pushes the new preview
        // to the server first, so the refetched feed picks up the latest thumb.
        queryClient.invalidateQueries({ queryKey: ["feed"] });
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
      // ACTIVE-IMAGE GATE. coloring-image/[id] is a native-stack route opened
      // via router.push, so navigating from image A to image B leaves A's
      // ImageCanvas MOUNTED underneath — its autosave effect stays subscribed to
      // the ONE global canvas store. Without this guard A's effect fires, reads
      // useCanvasStore.getState().history (the shared store, now holding B's
      // actions) and saves it under A's id — two screens hammering the sync
      // endpoint under two ids, racing the version into an endless 409 storm.
      // The store's `imageId` is owned by whichever screen last initialized
      // (the active/foreground one), so only that screen autosaves. No
      // navigation hook needed (useIsFocused isn't a resolvable dep here).
      if (useCanvasStore.getState().imageId !== coloringImage.id) return;
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

        // PHASE 1 — persist the action list IMMEDIATELY, with NO snapshot. The
        // action list is the source of truth for replay; this is the prompt
        // save. The expensive raster (a synchronous makeImageSnapshot + two
        // encodeToBase64 passes) is split into Phase 2 below so it never blocks
        // the JS thread on the same tick as a stroke's commit → deferred-clear
        // handoff (the rare ~1-frame stroke blink).
        if (!DIAG_DISABLE_SERVER_SYNC) {
          saveCanvasState(
            coloringImage.id,
            actionsToSave,
            saveWidth,
            saveHeight,
          )
            .then((success) => {
              console.log(`[AUTO_SAVE] action-list save: ${success}`);
            })
            .catch((error) => {
              console.error(`[AUTO_SAVE] action-list save failed:`, error);
            });
        } else {
          console.log(`[FLASH_DIAG] server sync + save SKIPPED (bisect)`);
        }
        currentState.setDirty(false);

        // PHASE 2 — capture the raster (feed-preview JPEG + cross-device restore
        // PNG) on its OWN drained-queue JS task, off the commit tick.
        // runAfterInteractions does NOT wait for gestures/animations in this
        // stack (gesture-handler + reanimated register no RN interaction
        // handles); it fires on the next drained-JS-queue tick (like setTimeout
        // 0). That is sufficient: the snapshot+encode becomes its own task and
        // can never split the live→committed handoff across a frame. Continuous
        // drawing reschedules this each cycle, so the raster only captures once
        // the user pauses — within the few-hundred-ms staleness tolerance for a
        // convenience artifact (the action list is already saved in Phase 1).
        if (snapshotTaskRef.current) snapshotTaskRef.current.cancel();
        snapshotTaskRef.current = InteractionManager.runAfterInteractions(
          () => {
            snapshotTaskRef.current = null;
            if (DIAG_DISABLE_AUTOSAVE_SNAPSHOT) return; // TEMP flash-bisect
            const latest = useCanvasStore.getState();
            // Re-check the active-image gate: the foreground image may have
            // changed between the 1s timer firing and this deferred task running.
            if (latest.imageId !== coloringImage.id) return;
            const acts = latest.history;
            if (acts.length === 0) return;
            // Skip the raster while a sync is already in flight for this image:
            // saveCanvasState's coalescing follow-up re-sends the IN-FLIGHT call's
            // closure URLs (undefined, from the Phase-1 actions-only save), so a
            // second raster-bearing call now would be swallowed and the snapshot
            // silently dropped. The next settled autosave cycle captures it.
            if (isSyncInFlight(coloringImage.id)) return;
            let previewDataUrl: string | undefined;
            let snapshotDataUrl: string | undefined;
            try {
              console.log(
                `[FLASH_DIAG] deferred raster makeImageSnapshot START @ ${Date.now()}`,
              );
              const image = safeMakeSnapshot();
              if (image) {
                previewDataUrl = `data:image/jpeg;base64,${image.encodeToBase64(ImageFormat.JPEG, 80)}`;
                snapshotDataUrl = `data:image/png;base64,${image.encodeToBase64()}`;
                console.log(
                  `[FLASH_DIAG] deferred raster makeImageSnapshot DONE @ ${Date.now()}`,
                );
                console.log(
                  `[AUTO_SAVE] raster preview ${previewDataUrl.length}, snapshot ${snapshotDataUrl.length} chars`,
                );
              }
            } catch (e) {
              // Canvas not ready (mid-rotation / torn down) — the action list is
              // already saved; skip the raster this cycle.
              console.log(
                `[AUTO_SAVE] Could not capture preview/snapshot (canvas not ready)`,
              );
            }
            if (previewDataUrl || snapshotDataUrl) {
              saveCanvasState(
                coloringImage.id,
                acts,
                saveWidth,
                saveHeight,
                previewDataUrl,
                snapshotDataUrl,
              ).catch(() => {});
            }
          },
        );
      }
    }, 1000); // Save 1 second after last change (matching web)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      // Cancel a pending deferred raster so a stale snapshot can't fire against
      // a changed image / torn-down canvas (preserves the SIGABRT guard).
      if (snapshotTaskRef.current) {
        snapshotTaskRef.current.cancel();
        snapshotTaskRef.current = null;
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
      // Cancel a pending deferred progress snapshot so it can't fire against a
      // changed image / torn-down canvas (preserves the SIGABRT guard).
      if (progressTaskRef.current) {
        progressTaskRef.current.cancel();
        progressTaskRef.current = null;
      }
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
    // No frozen-handoff arming anymore — committing draws into the committed
    // surface (or renderPaths node) and the re-bake effect clears livePath in the
    // same commit. There is no stale frozen copy to drop at the next stroke start.
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
        // Zero-length stroke (a brush/eraser tap with no drag). Nothing commits,
        // so the re-bake effect won't fire to clear the live dot — clear it here.
        livePath.value = Skia.Path.Make();
        liveXs.value = [];
        liveYs.value = [];
        liveForces.value = [];
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
        const magicLiveStrokeId = ++liveStrokeIdRef.current;
        // Handoff COLLAPSED (v1): no frozen mask, no pending filter. The committed
        // reveal renders directly in the SHARED SrcIn layer it already lives in
        // (activeRevealMaskPaths), and the re-bake useLayoutEffect clears the live
        // mask (livePath) on this same addAction commit. SrcIn region coverage is
        // IDEMPOTENT, so a 1-frame live+committed overlap can't intensify/darken —
        // magic has no 2a−a² flash class — so removing the frozen node + swap is
        // safe and collapses the magic commit burst.
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
          liveStrokeId: magicLiveStrokeId,
        });
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

      // liveStrokeId kept for cross-device dedup hints (render-only, never
      // serialized). The old freeze handoff that read it is gone: committing a
      // BAKED stroke (crayon/marker) draws it into the committed surface via the
      // re-bake useLayoutEffect, which also clears the live path in the SAME React
      // commit — no frozen copy, no swap, single redraw. Non-baked brushes render
      // their committed <Path> in renderPaths on the same commit the live clears.
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

      // Clear the live preview. Baked brushes (crayon/marker) already emptied
      // livePath in the onFinalize worklet the same tick they drew into the
      // picture — this is a harmless no-op for them. For NON-baked brushes
      // (eraser/pencil/rainbow/glow/neon/glitter) the committed renderPaths <Path>
      // appears on THIS addAction commit, so clearing livePath now hands off in
      // the same React commit (acceptable for v1; they move to the surface in v2).
      if (!isBakedStroke(action)) {
        livePath.value = Skia.Path.Make();
        notifyChange(livePath);
      }

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
      livePath,
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

      // `selectedSticker` is a catalog id; the PNG resolves from the bundled
      // registry at render time (web parity). stickerCatalogId/stickerImageUrl
      // ride to the wire for cross-device replay.
      // The stored stickerSize (20-150 slider, default 80) is in CANVAS-pixel
      // terms, like web's 32/48/64. But placement records the sticker in SVG
      // viewBox space (coords come from touchToSvgCoords, ~1024-wide), where a
      // raw 80 is ~8% of the width. Scale the slider value into SVG space by the
      // same factor that maps a canvas pixel to an SVG unit, so a sticker lands at
      // the SAME visual proportion as web.
      const svgW = svgDimensions?.width ?? 1024;
      const sizeScale = svgW / Math.max(1, canvasWidth);
      const svgStickerSize = stickerSize * sizeScale;
      const action: DrawingAction = {
        type: "sticker",
        color: selectedColor, // Not used but required by type
        sticker: selectedSticker, // catalog id (wire stickerId)
        stickerCatalogId: selectedSticker,
        stickerImageUrl: `/images/stickers/canvas/${selectedSticker}.png`,
        stickerX: coords.x,
        stickerY: coords.y,
        stickerSize: svgStickerSize,
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
      canvasWidth,
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
        // Pan mode — ONLY when zoomed in (scale > 1). At scale 1 the image fills
        // its frame and must stay fixed (was freely draggable off-centre). When
        // zoomed, clamp the translation so the scaled image can't be dragged past
        // its own edges: the content overflows the frame by (scale-1)*dim, split
        // half each side, so the max offset per axis is (scale-1)*dim/2.
        const s = gestureScale.value;
        if (s > 1) {
          const maxX = ((s - 1) * canvasWidth) / 2;
          const maxY = ((s - 1) * canvasHeight) / 2;
          const nextX = savedTranslateX.value + event.translationX;
          const nextY = savedTranslateY.value + event.translationY;
          gestureTranslateX.value = Math.max(-maxX, Math.min(maxX, nextX));
          gestureTranslateY.value = Math.max(-maxY, Math.min(maxY, nextY));
        }
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
      // early-returns for an empty buffer (tap / never-activated).
      if (isDrawingTool && liveXs.value.length > 0) {
        const isStylus =
          (event as unknown as { pointerType?: string }).pointerType ===
          "stylus";

        // ── BAKED brush (crayon/marker): commit ON THE UI THREAD, ZERO React
        // redraw. Build a new picture = old committed picture + this stroke, swap
        // it in, and empty livePath — ALL in this one worklet tick, so it's ONE
        // notifyChange → ONE Skia redraw (web's "pointerup redraws nothing", the
        // burst fix). addAction (runOnJS below) records for undo/persistence but
        // feeds no Canvas node for baked brushes, so its React commit doesn't
        // redraw the canvas. commitStyle mirrors the active crayon/marker paint.
        const style = commitStyle.value;
        if (style.baked) {
          const finished = livePath.value;
          const old = committedPicture.value;
          const w = style.width;
          const color = style.color;
          const alpha = style.alpha;
          const blurSigma = style.blurSigma;
          const blurStyle = style.blurStyle;
          committedPicture.value = createPicture((canvas) => {
            "worklet";
            canvas.drawPicture(old);
            drawBakedStroke(
              canvas,
              finished,
              color,
              w,
              alpha,
              blurSigma,
              blurStyle,
            );
          });
          notifyChange(committedPicture);
          // Empty the live path the SAME tick — the picture already shows the
          // stroke, so no gap and no double-draw. Both writes batch into one
          // reanimated mapper draw → one frame.
          livePath.value = Skia.Path.Make();
          notifyChange(livePath);
          // [FLASH_DIAG] commit anchor (replaces the old "swap effect FIRED").
          // Correlate the next [FLASH_NATIVE] redraw burst against this UI-thread
          // commit: a clean fix shows ONE redraw after this, not the 3-redraw
          // burst. console.log in a worklet routes to the JS console (reanimated).
          if (STROKE_BAKE_LOG) {
            console.log(
              `[FLASH_DIAG] baked stroke committed (UI-thread picture swap) @ ${Date.now()}`,
            );
          }
        }

        // Persist / undo-history (and, for NON-baked brushes, the actual render
        // node + livePath clear) on the JS thread. For baked brushes this only
        // addActions — the visual is already done above.
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
      // Re-clamp the pan after a zoom change. Zooming OUT shrinks the allowed
      // offset, so an existing translation can now exceed the bound and leave
      // the image off-centre; at scale <= 1 it must snap fully back to centre.
      const s = gestureScale.value;
      if (s <= 1) {
        gestureTranslateX.value = withSpring(0);
        gestureTranslateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setTranslate)(0, 0);
      } else {
        const maxX = ((s - 1) * canvasWidth) / 2;
        const maxY = ((s - 1) * canvasHeight) / 2;
        const cx = Math.max(-maxX, Math.min(maxX, gestureTranslateX.value));
        const cy = Math.max(-maxY, Math.min(maxY, gestureTranslateY.value));
        gestureTranslateX.value = cx;
        gestureTranslateY.value = cy;
        savedTranslateX.value = cx;
        savedTranslateY.value = cy;
        runOnJS(setTranslate)(cx, cy);
      }
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
  // shared value and the store to the same number, so the guards make this a
  // no-op after a pinch/double-tap; it should only fire on a button press.
  //
  // The guard MUST use an EPSILON, not strict `!==`. A gesture/spring leaves
  // gestureScale.value a hair off the store value (springs don't land exactly
  // on target; pan/pinch round-trip through JS state isn't bit-identical), so
  // a strict `!==` stays true indefinitely. Then ANY unrelated re-render —
  // notably the autosave's setDirty(false) ~1s after a stroke — re-runs this
  // effect and re-springs the transform from that residual sub-pixel delta,
  // making the whole canvas zoom/pan a touch and snap back: the "stroke
  // shimmers ~1s after I lift" bug. Only a real button press moves these by a
  // meaningful amount, so an epsilon ignores the float noise while still
  // catching button-driven changes.
  const SCALE_EPS = 0.001;
  const TRANSLATE_EPS = 0.5;
  useEffect(() => {
    if (Math.abs(gestureScale.value - scale) > SCALE_EPS) {
      gestureScale.value = withSpring(scale);
      savedScale.value = scale;
    }
    if (Math.abs(gestureTranslateX.value - translateX) > TRANSLATE_EPS) {
      gestureTranslateX.value = withSpring(translateX);
      savedTranslateX.value = translateX;
    }
    if (Math.abs(gestureTranslateY.value - translateY) > TRANSLATE_EPS) {
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

  // The ordered list of baked (crayon/marker) committed strokes the
  // committedPicture currently represents — by stable action.id. The commit
  // worklet appends one stroke to the picture WITHOUT touching React, so after a
  // normal commit visibleActions grows by exactly one baked stroke at the end and
  // the picture is already correct → the rebuild effect below SKIPS (no redraw,
  // the whole point). Any OTHER change (undo, redo, clear, restore, 409-merge,
  // reorder) needs a full rebuild.
  const bakedIdsRef = useRef<string[]>([]);

  // Rebuild committedPicture from scratch by replaying all visible baked strokes
  // in order. Runs on the JS thread (createPicture works on either runtime). Used
  // for undo/redo/clear/restore/merge — NOT the steady-draw commit hot path.
  const rebuildCommittedPicture = useCallback(
    (actions: DrawingAction[]) => {
      const baked = actions.filter(isBakedStroke);
      const pic = createPicture((canvas) => {
        for (const a of baked) {
          const width =
            a.strokeWidth ||
            brushSize *
              getBrushMultiplier((a.brushType as BrushType) ?? "crayon");
          const p = bakedBrushParams(a.brushType as BrushType);
          drawBakedStroke(
            canvas,
            a.path!,
            a.color,
            width,
            p.alpha,
            p.blurSigma,
            p.blurStyle,
          );
        }
      });
      committedPicture.value = pic;
      notifyChange(committedPicture);
      bakedIdsRef.current = baked.map((a) => a.id ?? "");
      if (STROKE_BAKE_LOG) {
        console.log(
          `[FLASH_DIAG] rebuild committedPicture: ${baked.length} strokes @ ${Date.now()}`,
        );
      }
    },
    [brushSize, committedPicture],
  );

  // Reconcile committedPicture to visibleActions. SKIP when the change is exactly
  // "one baked stroke appended" — the commit worklet already put it in the
  // picture, so rebuilding would be a redundant redraw (the burst we are killing).
  // Everything else (undo/redo/clear/restore/merge/non-baked change) rebuilds.
  useLayoutEffect(() => {
    const baked = visibleActions.filter(isBakedStroke);
    const prevIds = bakedIdsRef.current;
    const ids = baked.map((a) => a.id ?? "");
    const isAppendOfOne =
      ids.length === prevIds.length + 1 &&
      prevIds.every((id, i) => id === ids[i]);
    if (isAppendOfOne) {
      // Worklet already drew it; just record the new id set. No redraw.
      bakedIdsRef.current = ids;
      return;
    }
    rebuildCommittedPicture(visibleActions);
  }, [visibleActions, rebuildCommittedPicture]);

  // Remount key for the erasable content saveLayer Group (see its key= below).
  // The erasable Group has layer={<Paint/>} → a Skia offscreen saveLayer texture.
  // Its children (renderPaths, stickers, live preview) are bare nodes inside an
  // ALWAYS-mounted Group with a stable identity. On Start Over the store truly
  // clears (visibleActions → just [clear], renderPaths empties, React removes the
  // <Path> nodes), but in rn-skia 2.6.2 under Fabric removing children from a
  // never-remounted saveLayer Group does NOT re-rasterize its backing texture —
  // the old crayon pixels keep compositing, so cleared strokes ghost on screen
  // (magic reveals vanish correctly because they live in their OWN conditionally-
  // unmounted saveLayer Groups). We remount the Group on each clear to free the
  // stale texture.
  //
  // The key is the stable id of the LATEST `clear` action, NOT a content/empty
  // binary. A binary key flipped TWICE per Start Over — once to "cleared" (frees
  // texture, good), then back to "content" on the very first stroke after the
  // clear — and that SECOND remount, landing mid-first-stroke, blanked the
  // freshly-mounted layer for one frame = a flash on the first post-clear stroke.
  // A clear-COUNT is also wrong: confirmStartOver does reset() (history→[], count
  // 0) THEN addAction(clear) (count 1), so if the page already carried a clear
  // the count nets back to its prior value → no remount → the ghost returns.
  // Keying on the latest clear's id is robust: every Start Over stamps a FRESH
  // clear id (addAction → makeActionId), so the key changes exactly once per
  // Start Over (remount → texture freed), and drawing strokes afterward never
  // changes the latest clear id → no further remount, no first-stroke flash. No
  // clear yet (fresh page) → a constant sentinel, so the Group never remounts.
  const clearGeneration = useMemo(() => {
    let latestClearId = "none";
    for (const a of visibleActions) {
      if (a.type === "clear" && a.id) latestClearId = a.id;
    }
    console.log(
      `[FLASH_DIAG] clearGeneration (Group key) = ${latestClearId} @ ${Date.now()} (actions: ${visibleActions.length})`,
    );
    return latestClearId;
  }, [visibleActions]);

  // The canvas is "empty" (only a clear, no drawable actions) — used to reset the
  // live-stroke shared values on Start Over (see effect below). Distinct from the
  // remount key: this can be true without forcing a remount.
  const isCanvasEmpty = useMemo(
    () => !visibleActions.some((a) => a.type !== "clear"),
    [visibleActions],
  );

  // When the canvas goes empty (Start Over, or erasing the last stroke), empty
  // the live-stroke shared values too. They're component-scoped (survive the
  // erasable Group's remount), and `<Path path={livePath}>` re-subscribes after
  // remount — so without this the LAST stroke's geometry, still parked in
  // livePath, repaints as a stray line on the freshly-cleared canvas. The point
  // buffers are reset for the same reason. Empty path = "no live stroke". (The
  // committed surface is cleared by the re-bake effect, which sees the now-empty
  // visible stroke set and bakes an empty surface.)
  useEffect(() => {
    if (!isCanvasEmpty) return;
    livePath.value = Skia.Path.Make();
    liveXs.value = [];
    liveYs.value = [];
    liveForces.value = [];
  }, [isCanvasEmpty, livePath, liveXs, liveYs, liveForces]);

  // (The frozen→committed swap useLayoutEffect was removed: the live→frozen→
  // committed handoff is gone. Committing draws into the committed surface (or a
  // renderPaths node) and the re-bake useLayoutEffect above clears livePath in
  // the same commit — one redraw, no swap, no burst. See plan.)

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

  // Render the live preview <Path> for the current brush/tool from the live path
  // shared value. The paint here should match the committed rendering (renderPaths
  // for non-baked brushes; drawBakedStroke for baked crayon/marker) so the stroke
  // doesn't visibly change the instant it commits. Magic Brush has no entry here
  // (its preview is the white mask in the SrcIn group).
  const renderLivePreviewPath = useCallback(
    (pathValue: typeof livePath, key: string) => {
      if (selectedTool === "eraser") {
        return (
          <Path
            key={key}
            path={pathValue}
            color="black"
            style="stroke"
            strokeWidth={currentStrokeWidth}
            strokeCap="round"
            strokeJoin="round"
            blendMode="dstOut"
          />
        );
      }
      if (brushType === "glow") {
        return (
          <Path
            key={key}
            path={pathValue}
            color={selectedColor}
            style="stroke"
            strokeWidth={currentStrokeWidth}
            strokeCap="round"
            strokeJoin="round"
            opacity={0.7}
          >
            <BlurMask blur={8} style="normal" />
          </Path>
        );
      }
      if (brushType === "neon") {
        return (
          <Path
            key={key}
            path={pathValue}
            color={selectedColor}
            style="stroke"
            strokeWidth={currentStrokeWidth}
            strokeCap="round"
            strokeJoin="round"
            opacity={1}
          >
            <BlurMask blur={12} style="outer" />
          </Path>
        );
      }
      if (brushType === "paintbrush") {
        return (
          <Path
            key={key}
            path={pathValue}
            color={selectedColor}
            style="stroke"
            strokeWidth={currentStrokeWidth}
            strokeCap="round"
            strokeJoin="round"
            opacity={0.5}
          >
            <BlurMask blur={3} style="normal" />
          </Path>
        );
      }
      return (
        <Path
          key={key}
          path={pathValue}
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
            brushType === "crayon" ? 0.85 : brushType === "marker" ? 0.75 : 1
          }
        />
      );
    },
    [selectedTool, brushType, selectedColor, currentStrokeWidth, rainbowHue],
  );

  // Mirror the active baked-brush paint into commitStyle so the onFinalize WORKLET
  // can build the committed stroke paint without reading React state. `baked` is
  // true only when the active tool is the brush AND the brush is in
  // BAKED_BRUSH_TYPES (crayon/marker/pencil/paintbrush/rainbow/glow/neon). For
  // touch strokes the committed width = currentStrokeWidth (live preview width,
  // DEFAULT_PRESSURE), so it equals the committed appearance; rainbow uses the
  // live hue's colour. Eraser/glitter/magic set baked=false → the worklet skips
  // the picture path and they commit via runOnJS(commitStroke) → renderPaths node.
  useEffect(() => {
    const isBakedActive =
      selectedTool === "brush" && BAKED_BRUSH_TYPES.has(brushType as BrushType);
    const params = bakedBrushParams(brushType);
    commitStyle.value = {
      color:
        brushType === "rainbow" ? getRainbowColor(rainbowHue) : selectedColor,
      width: currentStrokeWidth,
      alpha: params.alpha,
      blurSigma: params.blurSigma,
      blurStyle: params.blurStyle,
      baked: isBakedActive,
    };
  }, [
    selectedTool,
    brushType,
    selectedColor,
    currentStrokeWidth,
    rainbowHue,
    commitStyle,
  ]);

  // Render stickers as bundled transparent PNGs (web parity — the canvas
  // tool stamps illustrated PNGs, not emoji). Each placed sticker resolves its
  // catalog id to a bundled asset via StickerActionImage (which calls useImage).
  // Legacy saves with no known catalog id render nothing (no emoji fallback).
  const renderStickers = useMemo(() => {
    return visibleActions
      .filter(
        (action) =>
          action.type === "sticker" &&
          (action.stickerCatalogId || action.sticker),
      )
      .map((action, index) => (
        <StickerActionImage
          key={action.id ?? `sticker-${index}`}
          action={action}
        />
      ));
  }, [visibleActions]);

  // Render drawing paths — ONLY the brushes NOT baked into committedPicture
  // (eraser + pencil/rainbow/glow/neon/glitter in v1). Crayon + marker are baked
  // (isBakedStroke) and drawn via the <Picture> above, so they're excluded here.
  // No frozen/pending filter anymore: the live→committed handoff is gone — a baked
  // stroke is appended to the picture in the onFinalize worklet (one redraw) and
  // the live path clears the same tick. (Non-baked brushes still render as React
  // <Path> nodes; their commit appears here on the addAction commit while the live
  // path clears the same commit — acceptable for v1, they move to the picture in
  // v2.)
  const renderPaths = useMemo(() => {
    return visibleActions
      .filter(
        (action) =>
          action.type === "stroke" && action.path && !isBakedStroke(action),
      )
      .map((action, index) => {
        // STABLE key per committed stroke. Index keys (`path-${index}`) were the
        // flash suspect: the swap filters/un-filters the pending stroke, shifting
        // array indices, so rn-skia's persistent reconciler could reuse a <Path>
        // Skia node for a DIFFERENT action (feeding it new geometry/paint) — an
        // intermittent below-JS node-identity churn that presents the just-changed
        // stroke a frame late. action.id is unique + stable across reorders, so the
        // reconciler maps each <Path> node to the SAME stroke every commit.
        const stableKey = action.id ?? `path-${index}`;
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
              key={stableKey}
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
              key={stableKey}
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
              key={stableKey}
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
              key={stableKey}
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
            <Group key={stableKey}>
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
            <Group key={stableKey}>
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
            <Group key={stableKey}>
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
            key={stableKey}
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
    // No pending filter anymore (handoff collapsed). The committed reveal renders
    // here the instant it lands in visibleActions; the re-bake effect clears the
    // live mask (livePath) the same commit. SrcIn region coverage is idempotent,
    // so a 1-frame live+committed overlap can't intensify — no flash.
    return visibleActions
      .filter(
        (a) =>
          a.type === "magic-reveal" &&
          !!a.path &&
          ((a.variant as PaletteVariant) ?? "realistic") === paletteVariant,
      )
      .map((action, index) => (
        <Path
          key={action.id ?? `active-reveal-mask-${index}`}
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
        // Stable key (see renderPaths) — index keys churn Skia node identity when
        // the action list reorders/filters.
        const revealKey = action.id ?? `magic-${index}`;
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
              key={revealKey}
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
          <Group key={revealKey} layer={<Paint />}>
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
              <Group
                key={clearGeneration}
                layer={DIAG_DISABLE_ERASABLE_SAVELAYER ? undefined : <Paint />}
                transform={transform}
              >
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
                    {/* Live Magic Brush mask. No frozen-copy sibling anymore: the
                        committed reveal renders in activeRevealMaskPaths the same
                        commit this live mask clears (re-bake effect empties
                        livePath). SrcIn coverage is idempotent so any 1-frame
                        overlap is invisible — no frozen handoff needed. */}
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
                {/* Committed crayon/marker strokes — ONE shared-value SkPicture
                    (web-style immediate mode) instead of per-stroke <Path> nodes.
                    The onFinalize WORKLET appends each finished stroke to this
                    picture on the UI thread (one redraw, no React commit) — the
                    burst fix. Drawn in SVG coords so the parent transform scales
                    it like the fill/SVG siblings. Inside the erasable layer so the
                    eraser (a renderPaths dstOut node rendered AFTER it) cuts
                    through this + the fill below. */}
                <Picture picture={committedPicture} />
                {/* Non-baked committed strokes (eraser + pencil/rainbow/glow/
                    neon/glitter in v1) still render as React <Path> nodes, above
                    the baked crayon/marker surface. Eraser dstOut here cuts the
                    surface AND the fill image (both earlier siblings in this
                    layer). These brushes move to the surface in v2. */}
                {renderPaths}
                {/* Stickers are NOT here anymore — they render in their own group
                    ABOVE the SVG outline (below the </Canvas>), so a placed sticker
                    sits on top of the line art (web parity, natural stamp). That
                    also puts them OUTSIDE this erasable layer, so the eraser no
                    longer rubs stickers out (delete via undo, not the eraser). */}
                {/* Live drawing path — built on the UI thread (livePath shared
                    value), styled by the active tool/brush. Always mounted; an
                    empty Skia path draws nothing ("no live stroke"). On finger-up
                    the committed surface gains the stroke and the re-bake effect
                    empties livePath in the SAME React commit — no gap, no double.
                    Magic Brush has no live branch here (its live mask is in the
                    SrcIn group above). */}
                {isMagicBrush ? null : renderLivePreviewPath(livePath, "live")}
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
              {/* Stickers — TOP-MOST, above the line art, so a placed sticker
                  sits on top of everything (web parity). Sized in SVG units
                  (StickerActionImage reads action.stickerX/Y/Size in SVG space),
                  so this group shares the same fitbox transform. Outside the
                  erasable group → not removable by the eraser (by design). */}
              <Group transform={transform}>{renderStickers}</Group>
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
