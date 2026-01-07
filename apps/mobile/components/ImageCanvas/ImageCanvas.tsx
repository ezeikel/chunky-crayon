import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Canvas,
  ImageSVG,
  useCanvasRef,
  useSVG,
  fitbox,
  rect,
  Group,
  SkPath,
  Skia,
  Path,
  BlurMask,
  Text as SkiaText,
  Fill,
  ImageFormat,
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
import { ColoringImage, Dimension, GridColorCell, GridColorMap } from "@/types";
import { useCanvasStore, DrawingAction } from "@/stores/canvasStore";
import { createSimplePaint, getBrushMultiplier } from "@/utils/brushShaders";
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
import MagicColorHint from "@/components/MagicColorHint";
import { perfect } from "@/styles";
import { tapHeavy, tapMedium, notifySuccess } from "@/utils/haptics";

import type { LayoutMode } from "@/utils/deviceUtils";

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

  // Calculate canvas size based on available area or fallback to legacy calculation
  // Legacy: Account for horizontal padding (16px each side from scrollContent + 12px each side from canvasCard)
  const legacyCanvasSize = screenWidth - 32 - 24;
  const canvasSize = canvasArea
    ? Math.min(canvasArea.width, canvasArea.height)
    : legacyCanvasSize;

  const [svgDimensions, setSvgDimensions] = useState<Dimension | null>(null);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const isInitializedRef = useRef(false);

  // Apple Pencil pressure tracking
  const pressurePointsRef = useRef<number[]>([]);
  const isStylusRef = useRef(false);
  const pressureSmootherRef = useRef(new PressureSmoother(3));

  // Magic color hint state
  const [magicHintCell, setMagicHintCell] = useState<GridColorCell | null>(
    null,
  );
  const [magicHintPosition, setMagicHintPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Parse colorMapJson once
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
    addAction,
    setColor,
    setTool,
    setScale,
    setTranslate,
    setImageId,
    setDirty,
    advanceRainbowHue,
    setCaptureCanvas,
    reset,
  } = useCanvasStore();

  // Gesture shared values
  const gestureScale = useSharedValue(1);
  const gestureTranslateX = useSharedValue(0);
  const gestureTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

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
  const dst = rect(0, 0, canvasSize, canvasSize);

  const transform = useMemo(() => fitbox("contain", src, dst), [src, dst]);

  // Convert touch coordinates to SVG coordinates
  const touchToSvgCoords = useCallback(
    (touchX: number, touchY: number): { x: number; y: number } | null => {
      if (!svgDimensions) return null;

      const scaleX = canvasSize / svgDimensions.width;
      const scaleY = canvasSize / svgDimensions.height;
      const svgScale = Math.min(scaleX, scaleY);

      const scaledWidth = svgDimensions.width * svgScale;
      const scaledHeight = svgDimensions.height * svgScale;
      const offsetX = (canvasSize - scaledWidth) / 2;
      const offsetY = (canvasSize - scaledHeight) / 2;

      // Account for zoom/pan
      const adjustedX = (touchX - translateX) / scale;
      const adjustedY = (touchY - translateY) / scale;

      const svgX = (adjustedX - offsetX) / svgScale;
      const svgY = (adjustedY - offsetY) / svgScale;

      return { x: svgX, y: svgY };
    },
    [svgDimensions, canvasSize, scale, translateX, translateY],
  );

  // Handle drawing stroke
  const handleDrawingStart = useCallback(
    (x: number, y: number, force?: number, pointerType?: PointerType) => {
      if (selectedTool !== "brush") return;

      const coords = touchToSvgCoords(x, y);
      if (!coords) return;

      // Initialize pressure tracking for this stroke
      pressureSmootherRef.current.reset();
      pressurePointsRef.current = [];
      isStylusRef.current = isApplePencil(pointerType);

      // Get smoothed pressure for first point
      const pressure = getPressureFromEvent({ force, pointerType });
      const smoothedPressure = pressureSmootherRef.current.add(pressure);
      pressurePointsRef.current.push(smoothedPressure);

      const newPath = Skia.Path.Make();
      newPath.moveTo(coords.x, coords.y);
      setCurrentPath(newPath);
      setScroll(false);
    },
    [selectedTool, touchToSvgCoords, setScroll],
  );

  const handleDrawingMove = useCallback(
    (x: number, y: number, force?: number, pointerType?: PointerType) => {
      if (selectedTool !== "brush" || !currentPath) return;

      const coords = touchToSvgCoords(x, y);
      if (!coords) return;

      // Capture pressure for this point
      const pressure = getPressureFromEvent({ force, pointerType });
      const smoothedPressure = pressureSmootherRef.current.add(pressure);
      pressurePointsRef.current.push(smoothedPressure);

      currentPath.lineTo(coords.x, coords.y);
      setCurrentPath(currentPath.copy());
    },
    [selectedTool, currentPath, touchToSvgCoords],
  );

  const handleDrawingEnd = useCallback(() => {
    if (currentPath) {
      // Use rainbow color if rainbow brush is selected
      const strokeColor =
        brushType === "rainbow" ? getRainbowColor(rainbowHue) : selectedColor;

      // Capture pressure data from this stroke
      const pressurePoints =
        pressurePointsRef.current.length > 0
          ? [...pressurePointsRef.current]
          : undefined;
      const isStylus = isStylusRef.current;

      // Calculate pressure-adjusted stroke width
      // For stylus input, use average pressure; for finger, use default pressure
      let averagePressure = DEFAULT_PRESSURE;
      if (pressurePoints && pressurePoints.length > 0) {
        averagePressure =
          pressurePoints.reduce((a, b) => a + b, 0) / pressurePoints.length;
      }
      const strokeWidth = getPressureAdjustedWidth(
        brushSize,
        brushType,
        averagePressure,
      );

      const action: DrawingAction = {
        type: "stroke",
        path: currentPath,
        color: strokeColor,
        brushType,
        strokeWidth,
        startHue: brushType === "rainbow" ? rainbowHue : undefined,
        // Store source dimensions for cross-platform sync
        sourceWidth: svgDimensions?.width,
        sourceHeight: svgDimensions?.height,
        // Apple Pencil pressure sensitivity data
        pressurePoints,
        isStylus,
      };
      addAction(action);
      setCurrentPath(null);

      // Reset pressure tracking
      pressurePointsRef.current = [];
      isStylusRef.current = false;

      // Advance rainbow hue for next stroke
      if (brushType === "rainbow") {
        advanceRainbowHue(30);
      }
    }
    setScroll(true);
  }, [
    currentPath,
    brushSize,
    brushType,
    selectedColor,
    rainbowHue,
    addAction,
    setScroll,
    advanceRainbowHue,
    svgDimensions,
  ]);

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

      // Check if color map is available
      if (!colorMap || !isValidColorMap(colorMap)) {
        // No color map available - show message or fallback
        console.warn("No color map available for magic tool");
        return;
      }

      const coords = touchToSvgCoords(x, y);
      if (!coords || !svgDimensions) return;

      tapMedium();

      if (magicMode === "suggest") {
        // Show color suggestion for the tapped area
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
      } else if (magicMode === "auto") {
        // Auto-fill: Apply all colors from the grid
        // This is a simplified version - just sets the first/dominant color for now
        // Full implementation would detect regions and fill them
        notifySuccess();

        // For now, we'll fill regions based on the grid cells
        // This creates fill actions for representative points in each grid cell
        const fills: Array<{ x: number; y: number; color: string }> = [];
        const cellWidth = svgDimensions.width / 5;
        const cellHeight = svgDimensions.height / 5;

        colorMap.gridColors.forEach((cell) => {
          // Calculate center point of each grid cell
          const centerX = (cell.col - 0.5) * cellWidth;
          const centerY = (cell.row - 0.5) * cellHeight;
          fills.push({
            x: centerX,
            y: centerY,
            color: cell.suggestedColor,
          });
        });

        // Add a single magic-fill action that contains all fills
        const action: DrawingAction = {
          type: "magic-fill",
          color: colorMap.gridColors[0]?.suggestedColor || "#FFFFFF",
          magicFills: fills,
          // Store source dimensions for cross-platform sync
          sourceWidth: svgDimensions?.width,
          sourceHeight: svgDimensions?.height,
        };
        addAction(action);
      }
    },
    [
      selectedTool,
      magicMode,
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
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      if (selectedTool === "brush") {
        // Pass force (pressure) and pointerType for Apple Pencil detection
        // force is available on iOS for stylus input
        runOnJS(handleDrawingStart)(
          event.x,
          event.y,
          (event as unknown as { force?: number }).force,
          event.pointerType,
        );
      }
    })
    .onUpdate((event) => {
      if (selectedTool === "brush") {
        // Pass force (pressure) and pointerType for Apple Pencil detection
        runOnJS(handleDrawingMove)(
          event.x,
          event.y,
          (event as unknown as { force?: number }).force,
          event.pointerType,
        );
      } else {
        // Pan mode
        gestureTranslateX.value = savedTranslateX.value + event.translationX;
        gestureTranslateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      if (selectedTool === "brush") {
        runOnJS(handleDrawingEnd)();
      } else {
        savedTranslateX.value = gestureTranslateX.value;
        savedTranslateY.value = gestureTranslateY.value;
        runOnJS(setTranslate)(gestureTranslateX.value, gestureTranslateY.value);
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

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(doubleTapGesture, tapGesture),
    Gesture.Simultaneous(panGesture, pinchGesture),
  );

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
    return history.slice(0, historyIndex + 1);
  }, [history, historyIndex]);

  // Calculate current stroke width with pressure (for live preview while drawing)
  // This recalculates when currentPath changes (which happens on each move)
  const currentStrokeWidth = useMemo(() => {
    const points = pressurePointsRef.current;
    let avgPressure = DEFAULT_PRESSURE;
    if (points.length > 0) {
      avgPressure = points.reduce((a, b) => a + b, 0) / points.length;
    }
    return getPressureAdjustedWidth(brushSize, brushType, avgPressure);
  }, [currentPath, brushSize, brushType]); // currentPath triggers recalculation

  // Render stickers
  const renderStickers = useMemo(() => {
    return visibleActions
      .filter((action) => action.type === "sticker" && action.sticker)
      .map((action, index) => {
        const size = action.stickerSize || 40;
        // Center the sticker on the tap point
        const x = (action.stickerX || 0) - size / 2;
        const y = (action.stickerY || 0) + size / 3; // Adjust for text baseline

        // Use Skia's default font for emoji rendering
        const font = Skia.Font(undefined, size);

        return (
          <SkiaText
            key={`sticker-${index}`}
            x={x}
            y={y}
            text={action.sticker || ""}
            font={font}
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
  }, [visibleActions, brushSize]);

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
              height: canvasSize,
              width: canvasSize,
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
                height: canvasSize,
                width: canvasSize,
              }}
            >
              {/* White background for snapshot capture (JPEG doesn't support transparency) */}
              <Fill color="white" />
              {/* SVG base layer (below drawings) */}
              <Group transform={transform}>
                <ImageSVG
                  x={0}
                  y={0}
                  width={canvasSize}
                  height={canvasSize}
                  svg={svg}
                />
                {/* Rendered paths */}
                {renderPaths}
                {/* Rendered stickers */}
                {renderStickers}
                {/* Current drawing path (with pressure-adjusted stroke width) */}
                {currentPath && brushType === "glow" ? (
                  <Group>
                    <Path
                      path={currentPath}
                      color={selectedColor}
                      style="stroke"
                      strokeWidth={currentStrokeWidth}
                      strokeCap="round"
                      strokeJoin="round"
                      opacity={0.7}
                    >
                      <BlurMask blur={8} style="normal" />
                    </Path>
                  </Group>
                ) : currentPath && brushType === "neon" ? (
                  <Group>
                    <Path
                      path={currentPath}
                      color={selectedColor}
                      style="stroke"
                      strokeWidth={currentStrokeWidth}
                      strokeCap="round"
                      strokeJoin="round"
                      opacity={1}
                    >
                      <BlurMask blur={12} style="outer" />
                    </Path>
                  </Group>
                ) : currentPath ? (
                  <Path
                    path={currentPath}
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
                ) : null}
              </Group>
              {/* SVG outline layer (on top) */}
              <Group transform={transform}>
                <ImageSVG
                  x={0}
                  y={0}
                  width={canvasSize}
                  height={canvasSize}
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
