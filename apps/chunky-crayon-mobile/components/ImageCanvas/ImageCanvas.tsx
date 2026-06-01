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
import { View, useWindowDimensions, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  Canvas,
  ImageSVG,
  Image as SkiaImage,
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
  BlendMode,
  notifyChange,
} from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
  PointerType,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  ColoringImage,
  Dimension,
  GridColorCell,
  GridColorMap,
  FillPointsData,
} from "@/types";
import {
  useCanvasStore,
  DrawingAction,
  getVisibleActions,
  type BrushType,
} from "@/stores/canvasStore";
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
  saveCanvasState,
  loadCanvasState,
  debugCanvasStorage,
} from "@/utils/canvasPersistence";
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

  // Parse fillPointsJson (preferred) and colorMapJson (fallback) once
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
    rainbowHue,
    history,
    historyIndex,
    scale,
    translateX,
    translateY,
    imageId,
    isMuted,
    addAction,
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

  // Magic tools (auto-color / magic brush) need pre-computed colour data —
  // fill points (preferred) or the legacy grid colour map. The backend
  // writes these async after image creation, so until one is present the
  // toolbars disable + spin the magic buttons. Same condition the magic
  // tap handler guards on (hasFillPoints || hasColorMap).
  useEffect(() => {
    const hasFillPoints = !!fillPoints && fillPoints.points.length > 0;
    const hasColorMap = !!colorMap && isValidColorMap(colorMap);
    setMagicReady(hasFillPoints || hasColorMap);
  }, [fillPoints, colorMap, setMagicReady]);

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
      if (!canvasRef.current) return null;
      const image = canvasRef.current.makeImageSnapshot();
      if (!image) return null;
      const base64 = image.encodeToBase64();
      return `data:image/png;base64,${base64}`;
    };

    setCaptureCanvas(captureCanvas);

    return () => {
      setCaptureCanvas(null);
    };
  }, [setCaptureCanvas]);

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

            if (action.type === "stroke" && action.path) {
              // Transform the path using Skia's matrix transformation
              const scaledPath = action.path.copy();
              scaledPath.transform(Skia.Matrix().scale(scaleX, scaleY));
              return {
                ...action,
                path: scaledPath,
                // Also scale stroke width proportionally
                strokeWidth: action.strokeWidth
                  ? action.strokeWidth * Math.min(scaleX, scaleY)
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
                  ? action.stickerSize * Math.min(scaleX, scaleY)
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
    };

    initializeCanvas();

    // Cleanup function to cancel stale loads
    return () => {
      console.log(
        `[CANVAS_INIT] Cleanup - cancelling effect for image ${currentImageId}`,
      );
      isCancelled = true;
    };
  }, [coloringImage.id, reset, setImageId, addAction, imageId]);

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

        // Get the latest state from the store directly
        const currentState = useCanvasStore.getState();
        const actionsToSave = currentState.history.slice(
          0,
          currentState.historyIndex + 1,
        );
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

          // Generate preview thumbnail for server storage
          // Note: Canvas may be unmounted during cleanup, so wrap in try-catch
          // Use JPEG with 80% quality for smaller file size (PNG is too large)
          let previewDataUrl: string | undefined;
          try {
            if (canvasRef.current) {
              const image = canvasRef.current.makeImageSnapshot();
              if (image) {
                const base64 = image.encodeToBase64(ImageFormat.JPEG, 80);
                previewDataUrl = `data:image/jpeg;base64,${base64}`;
                console.log(
                  `[CANVAS_FOCUS] Generated preview, size: ${previewDataUrl.length} chars`,
                );
              }
            }
          } catch (e) {
            console.log(
              `[CANVAS_FOCUS] Could not capture preview (canvas likely unmounted)`,
            );
          }

          saveCanvasState(
            coloringImage.id,
            actionsToSave,
            saveWidth,
            saveHeight,
            previewDataUrl,
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
      // Get the latest state from the store directly
      const currentState = useCanvasStore.getState();
      const actionsToSave = currentState.history.slice(
        0,
        currentState.historyIndex + 1,
      );
      if (actionsToSave.length > 0) {
        // Pass SVG dimensions (coordinate space) for cross-platform sync
        // Mobile strokes are in SVG viewBox space (typically 1024x1024), not CSS layout space
        const saveWidth = svgDimensions?.width || 1024;
        const saveHeight = svgDimensions?.height || 1024;
        console.log(
          `[AUTO_SAVE] Saving ${actionsToSave.length} actions with SVG dimensions: ${saveWidth}x${saveHeight}`,
        );

        // Generate preview thumbnail for server storage
        // Use JPEG with 80% quality for smaller file size (PNG is too large)
        let previewDataUrl: string | undefined;
        try {
          if (canvasRef.current) {
            const image = canvasRef.current.makeImageSnapshot();
            if (image) {
              const base64 = image.encodeToBase64(ImageFormat.JPEG, 80);
              previewDataUrl = `data:image/jpeg;base64,${base64}`;
              console.log(
                `[AUTO_SAVE] Generated preview, size: ${previewDataUrl.length} chars`,
              );
            }
          }
        } catch (e) {
          console.log(
            `[AUTO_SAVE] Could not capture preview (canvas not ready)`,
          );
        }

        saveCanvasState(
          coloringImage.id,
          actionsToSave,
          saveWidth,
          saveHeight,
          previewDataUrl,
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

      const isErasing = selectedTool === "eraser";
      const effectiveBrushType: BrushType = isErasing ? "eraser" : brushType;

      const strokeColor = isErasing
        ? "#000000"
        : brushType === "rainbow"
          ? getRainbowColor(rainbowHue)
          : selectedColor;

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
      const strokeWidth = isErasing
        ? brushSize * 2
        : getPressureAdjustedWidth(brushSize, brushType, averagePressure);

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
        startHue: effectiveBrushType === "rainbow" ? rainbowHue : undefined,
        sourceWidth: svgDimensions.width,
        sourceHeight: svgDimensions.height,
        pressurePoints,
        isStylus,
        textureSeed,
        liveStrokeId,
      };
      addAction(action);
      pendingLiveStrokeIdRef.current = liveStrokeId;

      if (brushType === "rainbow") {
        advanceRainbowHue(30);
      }
    },
    [
      brushSize,
      brushType,
      selectedTool,
      selectedColor,
      rainbowHue,
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

      // Add sticker action
      const action: DrawingAction = {
        type: "sticker",
        color: selectedColor, // Not used but required by type
        sticker: selectedSticker,
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

      // Check if any color data is available (prefer fill points over grid)
      const hasFillPoints = fillPoints && fillPoints.points.length > 0;
      const hasColorMap = colorMap && isValidColorMap(colorMap);

      if (!hasFillPoints && !hasColorMap) {
        console.warn("No color data available for magic tool");
        return;
      }

      const coords = touchToSvgCoords(x, y);
      if (!coords || !svgDimensions) return;

      tapMedium();

      if (magicMode === "suggest") {
        // Show color suggestion for the tapped area (grid-based only for now)
        if (hasColorMap) {
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
        }
      } else if (magicMode === "auto") {
        notifySuccess();

        const fills: Array<{ x: number; y: number; color: string }> = [];

        if (hasFillPoints) {
          // Use region-aware fill points with coordinate scaling
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
          // Fall back to grid-based cell center approach
          const cellWidth = svgDimensions.width / 5;
          const cellHeight = svgDimensions.height / 5;

          colorMap.gridColors.forEach((cell) => {
            const centerX = (cell.col - 0.5) * cellWidth;
            const centerY = (cell.row - 0.5) * cellHeight;
            fills.push({
              x: centerX,
              y: centerY,
              color: cell.suggestedColor,
            });
          });
        }

        // Add a single magic-fill action that contains all fills
        const action: DrawingAction = {
          type: "magic-fill",
          color: fills[0]?.color || "#FFFFFF",
          magicFills: fills,
          sourceWidth: svgDimensions?.width,
          sourceHeight: svgDimensions?.height,
        };
        addAction(action);
      }
    },
    [
      selectedTool,
      magicMode,
      fillPoints,
      colorMap,
      svgDimensions,
      touchToSvgCoords,
      addAction,
    ],
  );

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
  // brushType "eraser", rendered with a dstOut blend). Anything else pans.
  const isDrawingTool = selectedTool === "brush" || selectedTool === "eraser";
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
    const committed = visibleActions.some(
      (a) => a.type === "stroke" && a.liveStrokeId === pending,
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
  const currentStrokeWidth = useMemo(() => {
    // Eraser uses a flat radius*2 (web parity), ignoring pressure.
    if (selectedTool === "eraser") return brushSize * 2;
    return getPressureAdjustedWidth(brushSize, brushType, DEFAULT_PRESSURE);
  }, [brushSize, brushType, selectedTool]);

  // Render stickers via the Skia Paragraph API. The low-level Skia <Text>
  // primitive uses a single default typeface with NO color-emoji fallback, so
  // emoji rendered as little tofu/□ (or nothing) — that was the bug. The
  // Paragraph API does platform emoji-font fallback (Apple Color Emoji on
  // iOS) by default, so the sticker renders in full colour. Building a
  // paragraph is imperative, so we do it per-sticker inside the memo.
  const renderStickers = useMemo(() => {
    return visibleActions
      .filter((action) => action.type === "sticker" && action.sticker)
      .map((action, index) => {
        const size = action.stickerSize || 40;
        // Lay the emoji out in a box `size` wide, centred on the tap point.
        const para = Skia.ParagraphBuilder.Make({
          textAlign: TextAlign.Center,
        })
          .pushStyle({ fontSize: size })
          .addText(action.sticker || "")
          .pop()
          .build();
        para.layout(size);
        const x = (action.stickerX || 0) - size / 2;
        const y = (action.stickerY || 0) - size / 2;

        return (
          <Paragraph
            key={`sticker-${index}`}
            paragraph={para}
            x={x}
            y={y}
            width={size}
          />
        );
      });
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
                {selectedTool === "eraser" ? (
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
