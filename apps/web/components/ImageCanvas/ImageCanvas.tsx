'use client';

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import { ColoringImage } from '@chunky-crayon/db/types';
import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS, BRUSH_SIZES, BrushType } from '@/constants';
import { scanlineFill, hexToRGBA } from '@/utils/floodFill';
import { drawTexturedStroke } from '@/utils/brushTextures';
import { createFillPattern } from '@/utils/fillPatterns';
import { createIconCursor } from '@/utils/iconCursor';
import {
  pointsToSvgPath,
  type SerializableCanvasAction,
} from '@/types/canvasActions';
import {
  faPencil,
  faPaintbrush,
  faEraser,
  faSparkles,
  faWandSparkles,
  faRainbow,
  faSun,
  faBoltLightning,
  faFillDrip,
  faBrush,
  faStar,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// Map brush types to their FontAwesome icons
const BRUSH_ICONS: Record<BrushType, IconDefinition> = {
  crayon: faPencil,
  marker: faPaintbrush,
  eraser: faEraser,
  glitter: faSparkles,
  sparkle: faWandSparkles,
  rainbow: faRainbow,
  glow: faSun,
  neon: faBoltLightning,
};

// Map tool types to their FontAwesome icons
const TOOL_ICONS: Record<string, IconDefinition> = {
  fill: faFillDrip,
  sticker: faStar,
  'magic-reveal': faBrush,
  'magic-auto': faFillDrip,
};

// Cursor sizes based on brush size
const CURSOR_SIZES: Record<string, number> = {
  small: 20,
  medium: 28,
  large: 36,
};

/**
 * Parse SVG path string to array of points.
 * Handles M (moveTo) and L (lineTo) commands from our path format.
 * Supports both space-separated (web format: "M 100 200") and
 * comma-separated (Skia format: "M100,200") coordinates.
 */
function parseSvgPath(pathString: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  if (!pathString) {
    console.warn('[parseSvgPath] Empty or null path string');
    return points;
  }

  console.log(
    `[parseSvgPath] Input path (${pathString.length} chars): "${pathString.substring(0, 150)}${pathString.length > 150 ? '...' : ''}"`,
  );

  // Match M/L commands followed by coordinates
  // Handles both formats:
  // - Web format: "M 100.00 200.00 L 150.00 250.00" (space-separated)
  // - Skia format: "M100,200L150,250" or "M100,200 L150,250" (comma-separated)
  // - Skia with spaces: "M878.98267 256.49323L871.09052 261.42581" (space between coords)
  // The key change: [\s,]+ matches either spaces or commas between x and y
  const regex = /([ML])\s*([\d.-]+)[\s,]+([\d.-]+)/gi;
  let match: RegExpExecArray | null;
  let matchCount = 0;

  while ((match = regex.exec(pathString)) !== null) {
    matchCount++;
    const cmd = match[1];
    const x = parseFloat(match[2]);
    const y = parseFloat(match[3]);

    if (matchCount <= 3) {
      console.log(
        `[parseSvgPath] Match ${matchCount}: cmd=${cmd}, x=${x}, y=${y}, raw="${match[0]}"`,
      );
    }

    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    } else {
      console.warn(
        `[parseSvgPath] Invalid coords at match ${matchCount}: x=${match[2]}, y=${match[3]}`,
      );
    }
  }

  console.log(
    `[parseSvgPath] Result: ${points.length} points from ${matchCount} regex matches`,
  );

  if (points.length === 0 && pathString.length > 0) {
    // Debug: show what characters are in the path
    const charCodes = pathString
      .substring(0, 50)
      .split('')
      .map((c) => `${c}(${c.charCodeAt(0)})`)
      .join(' ');
    console.warn(
      `[parseSvgPath] No points parsed! First 50 char codes: ${charCodes}`,
    );
  }

  return points;
}

type ImageCanvasProps = {
  coloringImage: Partial<ColoringImage>;
  className?: string;
  onCanvasReady?: () => void;
  onFirstInteraction?: () => void;
  /** Magic brush reveal mode: get color at canvas coordinates */
  getRevealColor?: (x: number, y: number) => string | null;
  /** Magic brush reveal mode: get region ID at canvas coordinates */
  getRevealRegionId?: (x: number, y: number) => number;
  /** Magic brush reveal mode: callback when a region is revealed/colored */
  onRegionRevealed?: (regionId: number) => void;
  /** Whether magic brush reveal mode is ready */
  isMagicRevealReady?: boolean;
};

export type ImageCanvasHandle = {
  restoreCanvasState: (imageData: ImageData) => void;
  restoreFromImage: (img: HTMLImageElement) => void;
  captureCanvasState: () => ImageData | null;
  clearCanvas: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  getCompositeCanvas: () => HTMLCanvasElement | null;
  /** Get the boundary canvas (line art) for region detection */
  getBoundaryCanvas: () => HTMLCanvasElement | null;
  /** Fill a region at coordinates with a specific color (for auto-color)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param color - Hex color to fill
   * @param isCanvasPixels - If true, coordinates are already in canvas pixels (DPR-scaled). Default false (CSS pixels).
   */
  fillRegionAtPoint: (
    x: number,
    y: number,
    color: string,
    isCanvasPixels?: boolean,
  ) => boolean;
  /** Replay a saved action (stroke, fill, sticker) on the canvas
   * @param action - The action to replay
   * @param sourceWidth - Optional source canvas width for coordinate scaling
   * @param sourceHeight - Optional source canvas height for coordinate scaling
   */
  replayAction: (
    action: SerializableCanvasAction,
    sourceWidth?: number,
    sourceHeight?: number,
  ) => boolean;
  /** Force canvas repaint by reading/writing a pixel to flush GPU cache */
  forceRepaint: () => void;
  /** Generate a 256×256 preview thumbnail for progress display
   * @returns WebP data URL of the thumbnail or null if canvas not available
   */
  generatePreviewThumbnail: () => string | null;
};

const ImageCanvas = forwardRef<ImageCanvasHandle, ImageCanvasProps>(
  (
    {
      coloringImage,
      className,
      onCanvasReady,
      onFirstInteraction,
      getRevealColor,
      getRevealRegionId,
      onRegionRevealed,
      isMagicRevealReady,
    },
    ref,
  ) => {
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const offScreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const hasInteractedRef = useRef(false);

    const {
      selectedColor,
      brushSize,
      brushType,
      activeTool,
      selectedPattern,
      selectedSticker,
      pushToHistory,
      addDrawingAction,
      zoom,
      panOffset,
      setZoom,
      setPanOffset,
    } = useColoringContext();
    const {
      playSound,
      initSounds,
      startBrushLoop,
      stopBrushLoop,
      isBrushLoopActive,
    } = useSound();

    const [ratio, setRatio] = useState<number>(1);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [svgImage, setSvgImage] = useState<HTMLImageElement | null>(null);
    const [dpr, setDpr] = useState<number>(1);
    // Ref for synchronous access to DPR (React state updates are async)
    // This solves the stale closure issue when replayAction is called from onCanvasReady
    const dprRef = useRef<number>(1);

    // Store the last position for smooth drawing
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

    // Gesture handling refs
    const isPinchingRef = useRef(false);
    const lastPinchDistanceRef = useRef<number | null>(null);
    const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);
    const gestureStartZoomRef = useRef<number>(1);
    const gestureStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Pan tool state
    const isPanningRef = useRef(false);
    const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);

    // Track current stroke points for serializable actions
    const currentStrokeRef = useRef<{
      points: { x: number; y: number }[];
      color: string;
      brushType: typeof brushType;
      strokeWidth: number;
    } | null>(null);

    // Brush sound debounce - stop sound after no movement for 150ms
    const brushSoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup: ensure brush sound stops when isDrawing becomes false or component unmounts
    useEffect(() => {
      if (!isDrawing) {
        // Clear any pending debounce timer
        if (brushSoundTimeoutRef.current) {
          clearTimeout(brushSoundTimeoutRef.current);
          brushSoundTimeoutRef.current = null;
        }
        // Ensure brush loop is stopped
        stopBrushLoop();
      }
    }, [isDrawing, stopBrushLoop]);

    // Global pointer up handler to catch cases where pointer leaves canvas
    // IMPORTANT: This must NOT depend on isDrawing to avoid stale closure issues
    // Always unconditionally stop the brush loop - it's safe to call when not active
    useEffect(() => {
      const handleGlobalPointerUp = () => {
        console.log('[ImageCanvas] Global pointer up - stopping brush loop');
        if (brushSoundTimeoutRef.current) {
          clearTimeout(brushSoundTimeoutRef.current);
          brushSoundTimeoutRef.current = null;
        }
        stopBrushLoop();
      };

      window.addEventListener('mouseup', handleGlobalPointerUp);
      window.addEventListener('touchend', handleGlobalPointerUp);
      window.addEventListener('touchcancel', handleGlobalPointerUp);
      // Also handle pointer events for better cross-browser support
      window.addEventListener('pointerup', handleGlobalPointerUp);
      window.addEventListener('pointercancel', handleGlobalPointerUp);

      return () => {
        window.removeEventListener('mouseup', handleGlobalPointerUp);
        window.removeEventListener('touchend', handleGlobalPointerUp);
        window.removeEventListener('touchcancel', handleGlobalPointerUp);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);
      };
    }, [stopBrushLoop]);

    // Generate cursor based on active tool and brush type
    const toolCursor = useMemo(() => {
      // Get cursor size based on brush size setting
      const cursorSize = CURSOR_SIZES[brushSize] || 28;

      // Handle brush tool - use brush type icons
      if (activeTool === 'brush') {
        const icon = BRUSH_ICONS[brushType];
        if (!icon) return 'default';

        // Use the selected color for the cursor, gray for eraser
        const cursorColor = brushType === 'eraser' ? '#888888' : selectedColor;
        return createIconCursor(icon, cursorSize, cursorColor);
      }

      // Handle other tools with icons
      if (activeTool === 'fill') {
        return createIconCursor(TOOL_ICONS.fill, cursorSize, selectedColor);
      }

      if (activeTool === 'sticker') {
        return createIconCursor(TOOL_ICONS.sticker, cursorSize, selectedColor);
      }

      if (activeTool === 'magic-reveal') {
        return createIconCursor(
          TOOL_ICONS['magic-reveal'],
          cursorSize,
          selectedColor,
        );
      }

      if (activeTool === 'magic-auto') {
        return createIconCursor(
          TOOL_ICONS['magic-auto'],
          cursorSize,
          selectedColor,
        );
      }

      // Pan tool uses grab cursor (handled separately)
      return undefined;
    }, [activeTool, brushType, brushSize, selectedColor]);

    // Capture canvas state for history
    const captureCanvasState = useCallback((): ImageData | null => {
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return null;
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }, []);

    // Restore canvas state from history
    const restoreCanvasState = useCallback((imageData: ImageData) => {
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.putImageData(imageData, 0, 0);

      // Also update offscreen canvas
      if (offScreenCanvasRef.current) {
        const offCtx = offScreenCanvasRef.current.getContext('2d');
        if (offCtx) {
          offCtx.putImageData(imageData, 0, 0);
        }
      }
    }, []);

    // Restore canvas from a saved image (for localStorage restore)
    const restoreFromImage = useCallback((img: HTMLImageElement) => {
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // The context is scaled by DPR, so we need to draw at CSS dimensions
      // (not the natural image dimensions) to avoid double-scaling
      const cssWidth = parseFloat(canvas.style.width) || canvas.width;
      const cssHeight = parseFloat(canvas.style.height) || canvas.height;

      // Draw the saved image scaled to CSS dimensions
      ctx.drawImage(img, 0, 0, cssWidth, cssHeight);

      // Also update offscreen canvas (uses actual pixel dimensions, not CSS)
      if (offScreenCanvasRef.current) {
        const offCtx = offScreenCanvasRef.current.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(
            img,
            0,
            0,
            offScreenCanvasRef.current.width,
            offScreenCanvasRef.current.height,
          );
        }
      }
    }, []);

    // Clear the drawing canvas completely
    const clearCanvas = useCallback(() => {
      const canvas = drawingCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Also clear offscreen canvas
      if (offScreenCanvasRef.current) {
        const offCtx = offScreenCanvasRef.current.getContext('2d');
        if (offCtx) {
          offCtx.clearRect(
            0,
            0,
            offScreenCanvasRef.current.width,
            offScreenCanvasRef.current.height,
          );
        }
      }
    }, []);

    // Get the drawing canvas element
    const getCanvas = useCallback(() => {
      return drawingCanvasRef.current;
    }, []);

    // Get the boundary (line art) canvas
    const getBoundaryCanvas = useCallback(() => {
      return imageCanvasRef.current;
    }, []);

    // Get a composite canvas with both drawing layer and line art merged
    // This is used for saving artwork to gallery where we need the complete image
    const getCompositeCanvas = useCallback(() => {
      const drawingCanvas = drawingCanvasRef.current;
      const imageCanvas = imageCanvasRef.current;
      if (!drawingCanvas || !imageCanvas) return null;

      // Create a composite canvas with same dimensions
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = drawingCanvas.width;
      compositeCanvas.height = drawingCanvas.height;
      const compositeCtx = compositeCanvas.getContext('2d');
      if (!compositeCtx) return null;

      // First, fill with white background (otherwise transparent areas cause issues)
      compositeCtx.fillStyle = '#FFFFFF';
      compositeCtx.fillRect(
        0,
        0,
        compositeCanvas.width,
        compositeCanvas.height,
      );

      // Draw the user's colors first
      compositeCtx.drawImage(drawingCanvas, 0, 0);

      // Draw the line art on top with multiply blend (same as how it's displayed)
      compositeCtx.globalCompositeOperation = 'multiply';
      compositeCtx.drawImage(imageCanvas, 0, 0);

      // Reset composite operation
      compositeCtx.globalCompositeOperation = 'source-over';

      return compositeCanvas;
    }, []);

    // Generate a preview thumbnail for progress display
    // Used when saving canvas progress to show visual previews in the feed
    const generatePreviewThumbnail = useCallback((): string | null => {
      const compositeCanvas = getCompositeCanvas();
      if (!compositeCanvas) return null;

      // Use 1024×1024 for crisp display on retina screens
      const thumbCanvas = document.createElement('canvas');
      const thumbSize = 1024;
      thumbCanvas.width = thumbSize;
      thumbCanvas.height = thumbSize;
      const thumbCtx = thumbCanvas.getContext('2d');
      if (!thumbCtx) return null;

      // Enable high-quality image smoothing
      thumbCtx.imageSmoothingEnabled = true;
      thumbCtx.imageSmoothingQuality = 'high';

      // Fill with white background
      thumbCtx.fillStyle = '#FFFFFF';
      thumbCtx.fillRect(0, 0, thumbSize, thumbSize);

      // Calculate scaling to fit within thumbnail while maintaining aspect ratio
      const sourceWidth = compositeCanvas.width;
      const sourceHeight = compositeCanvas.height;
      const scale = Math.min(thumbSize / sourceWidth, thumbSize / sourceHeight);
      const scaledWidth = sourceWidth * scale;
      const scaledHeight = sourceHeight * scale;

      // Center the image in the thumbnail
      const offsetX = (thumbSize - scaledWidth) / 2;
      const offsetY = (thumbSize - scaledHeight) / 2;

      // Draw the composite canvas scaled to thumbnail size
      thumbCtx.drawImage(
        compositeCanvas,
        0,
        0,
        sourceWidth,
        sourceHeight,
        offsetX,
        offsetY,
        scaledWidth,
        scaledHeight,
      );

      // Return as WebP data URL with 92% quality
      return thumbCanvas.toDataURL('image/webp', 0.92);
    }, [getCompositeCanvas]);

    // Fill a specific region at given coordinates with a color (for auto-color)
    const fillRegionAtPoint = useCallback(
      (
        x: number,
        y: number,
        color: string,
        isCanvasPixels: boolean = false,
      ): boolean => {
        const drawingCanvas = drawingCanvasRef.current;
        const imageCanvas = imageCanvasRef.current;
        const drawingCtx = drawingCanvas?.getContext('2d');

        if (!drawingCanvas || !drawingCtx || !imageCanvas) {
          return false;
        }

        // Scale coordinates for the actual canvas dimensions
        // If isCanvasPixels is true, coordinates are already in canvas pixels (DPR-scaled)
        const scaledX = isCanvasPixels ? x : x * dpr;
        const scaledY = isCanvasPixels ? y : y * dpr;

        // Create a boundary canvas from SVG outlines ONLY
        // We don't include existing coloring because:
        // 1. Many colors (red, blue, green) have low luminance and would be detected as boundaries
        // 2. This would prevent re-filling already colored regions
        // The targetColor matching already handles not filling over different colors
        const boundaryCanvas = document.createElement('canvas');
        boundaryCanvas.width = drawingCanvas.width;
        boundaryCanvas.height = drawingCanvas.height;
        const boundaryCtx = boundaryCanvas.getContext('2d');

        if (!boundaryCtx) return false;

        // Only use SVG outline layer for boundary detection (black lines)
        boundaryCtx.drawImage(imageCanvas, 0, 0);

        // Get the boundary image data
        const boundaryImageData = boundaryCtx.getImageData(
          0,
          0,
          boundaryCanvas.width,
          boundaryCanvas.height,
        );

        // Perform the fill
        const fillColor = hexToRGBA(color);
        const filled = scanlineFill(drawingCtx, {
          x: scaledX,
          y: scaledY,
          fillColor,
          tolerance: 48,
          boundaryImageData,
          boundaryThreshold: 180,
        });

        if (filled) {
          // Update offscreen canvas
          if (offScreenCanvasRef.current) {
            const offScreenCtx = offScreenCanvasRef.current.getContext('2d');
            if (offScreenCtx) {
              const imageData = drawingCtx.getImageData(
                0,
                0,
                drawingCanvas.width,
                drawingCanvas.height,
              );
              offScreenCtx.putImageData(imageData, 0, 0);
            }
          }
        }

        return filled;
      },
      [dpr],
    );

    /**
     * Force canvas repaint by reading and writing a pixel.
     * This forces GPU→CPU→GPU sync, ensuring browser flushes canvas to screen.
     * Needed after bulk action replays due to GPU compositor caching in CSS-transformed containers.
     */
    const forceRepaint = useCallback(() => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Read and write a single pixel to force GPU sync
      const imageData = ctx.getImageData(0, 0, 1, 1);
      ctx.putImageData(imageData, 0, 0);

      console.log('[ImageCanvas] forceRepaint - flushed canvas to screen');
    }, []);

    /**
     * Replay a saved action (stroke, fill, sticker) on the canvas.
     * Used for restoring progress from server-synced actions.
     * @param action - The action to replay
     * @param sourceWidth - Original canvas width (for coordinate scaling from mobile)
     * @param sourceHeight - Original canvas height (for coordinate scaling from mobile)
     */
    const replayAction = useCallback(
      (
        action: SerializableCanvasAction,
        sourceWidth?: number,
        sourceHeight?: number,
      ): boolean => {
        const drawingCanvas = drawingCanvasRef.current;
        const drawingCtx = drawingCanvas?.getContext('2d');

        if (!drawingCanvas || !drawingCtx) {
          console.warn('[ImageCanvas] Cannot replay action - canvas not ready');
          return false;
        }

        // Get current canvas CSS dimensions (coordinate space, before DPR scaling)
        // Use dprRef.current for synchronous access (dpr state may be stale in closures)
        const currentDpr = dprRef.current;
        console.log(
          `[ImageCanvas] replayAction using DPR=${currentDpr} (ref), state dpr=${dpr}`,
        );
        const currentWidth =
          drawingCanvas.clientWidth || drawingCanvas.width / currentDpr;
        const currentHeight =
          drawingCanvas.clientHeight || drawingCanvas.height / currentDpr;

        // Calculate scale factors based on source dimensions
        // PRIORITY: Use per-action dimensions first (from action itself), fall back to progress-level dimensions
        // This handles mixed actions from different platforms correctly - each action scales based on
        // where it was originally recorded (web CSS pixels vs mobile SVG viewBox)
        let scaleX = 1;
        let scaleY = 1;

        // Check for per-action source dimensions first (not all action types have these)
        const actionSourceWidth =
          'sourceWidth' in action ? action.sourceWidth : undefined;
        const actionSourceHeight =
          'sourceHeight' in action ? action.sourceHeight : undefined;

        // Use action-level dimensions if available, otherwise fall back to progress-level
        const effectiveSourceWidth = actionSourceWidth || sourceWidth;
        const effectiveSourceHeight = actionSourceHeight || sourceHeight;

        if (effectiveSourceWidth && effectiveSourceHeight) {
          scaleX = currentWidth / effectiveSourceWidth;
          scaleY = currentHeight / effectiveSourceHeight;
        }

        console.log(
          `[ImageCanvas] Coordinate scaling: action-level=${actionSourceWidth || 'none'}x${actionSourceHeight || 'none'}, progress-level=${sourceWidth || 'none'}x${sourceHeight || 'none'}, effective=${effectiveSourceWidth || 'unknown'}x${effectiveSourceHeight || 'unknown'} -> current=${currentWidth}x${currentHeight}, scale=${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`,
        );

        console.log(`[ImageCanvas] Replaying action: ${action.type}`);

        switch (action.type) {
          case 'stroke': {
            // Parse path from SVG string or use points array
            const points = action.pathSvg
              ? parseSvgPath(action.pathSvg)
              : action.path;

            if (!points || points.length < 2) {
              console.warn(
                `[ImageCanvas] Stroke has insufficient points (${points?.length || 0}). pathSvg: ${action.pathSvg?.substring(0, 50) || 'none'}`,
              );
              return false;
            }

            // Log first few points for debugging cross-platform sync
            if (points.length > 0) {
              const firstPoints = points
                .slice(0, 3)
                .map((p) => `(${p.x.toFixed(1)},${p.y.toFixed(1)})`)
                .join(' ');
              console.log(
                `[ImageCanvas] Stroke: ${points.length} points, first: ${firstPoints}, color: ${action.color}`,
              );
            }

            // Sanity check: skip corrupted data with extreme coordinates
            const maxCoord = Math.max(
              ...points.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))),
            );
            if (maxCoord > 10000) {
              console.warn(
                `[ImageCanvas] Skipping corrupted stroke with extreme coordinates (max: ${maxCoord})`,
              );
              return false;
            }

            // Get brush radius from strokeWidth, scaled if needed
            const radius =
              ((action.strokeWidth || 10) * Math.max(scaleX, scaleY)) / 2;

            // Draw each segment of the stroke
            for (let i = 1; i < points.length; i++) {
              const lastPoint = points[i - 1];
              const point = points[i];

              // Scale coordinates from source to current canvas
              // NOTE: Do NOT multiply by DPR here - the context is already scaled via ctx.scale(dpr, dpr)
              const scaledX = point.x * scaleX;
              const scaledY = point.y * scaleY;
              const scaledLastX = lastPoint.x * scaleX;
              const scaledLastY = lastPoint.y * scaleY;

              // Draw on visible canvas
              drawTexturedStroke({
                ctx: drawingCtx,
                x: scaledX,
                y: scaledY,
                lastX: scaledLastX,
                lastY: scaledLastY,
                color: action.color || '#000000',
                radius: radius * currentDpr,
                brushType: action.brushType || 'marker',
              });

              // Update offscreen canvas
              if (offScreenCanvasRef.current) {
                const offScreenCtx =
                  offScreenCanvasRef.current.getContext('2d');
                if (offScreenCtx) {
                  drawTexturedStroke({
                    ctx: offScreenCtx,
                    x: scaledX,
                    y: scaledY,
                    lastX: scaledLastX,
                    lastY: scaledLastY,
                    color: action.color || '#000000',
                    radius: radius * currentDpr,
                    brushType: action.brushType || 'marker',
                  });
                }
              }
            }
            return true;
          }

          case 'fill': {
            // Scale fill coordinates from source to current canvas
            const scaledX = action.x * scaleX;
            const scaledY = action.y * scaleY;

            // Sanity check for extreme coordinates
            if (Math.abs(scaledX) > 10000 || Math.abs(scaledY) > 10000) {
              console.warn(
                `[ImageCanvas] Skipping corrupted fill at (${scaledX}, ${scaledY})`,
              );
              return false;
            }

            // Use fillRegionAtPoint which handles DPR scaling
            return fillRegionAtPoint(scaledX, scaledY, action.color, false);
          }

          case 'sticker': {
            // Scale sticker coordinates and size from source to current canvas
            const scaledX = action.x * scaleX * currentDpr;
            const scaledY = action.y * scaleY * currentDpr;
            const scaledSize =
              (action.size || 48) * Math.max(scaleX, scaleY) * currentDpr;

            // Sanity check for extreme coordinates
            if (
              Math.abs(scaledX) > 10000 * currentDpr ||
              Math.abs(scaledY) > 10000 * currentDpr
            ) {
              console.warn(
                `[ImageCanvas] Skipping corrupted sticker at (${scaledX}, ${scaledY})`,
              );
              return false;
            }

            drawingCtx.save();
            drawingCtx.font = `${scaledSize}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
            drawingCtx.textAlign = 'center';
            drawingCtx.textBaseline = 'middle';
            drawingCtx.fillText(action.sticker, scaledX, scaledY);
            drawingCtx.restore();

            // Update offscreen canvas
            if (offScreenCanvasRef.current) {
              const offScreenCtx = offScreenCanvasRef.current.getContext('2d');
              if (offScreenCtx) {
                offScreenCtx.save();
                offScreenCtx.font = `${scaledSize}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
                offScreenCtx.textAlign = 'center';
                offScreenCtx.textBaseline = 'middle';
                offScreenCtx.fillText(action.sticker, scaledX, scaledY);
                offScreenCtx.restore();
              }
            }
            return true;
          }

          case 'clear': {
            // Clear the canvas
            clearCanvas();
            return true;
          }

          default:
            console.warn(
              `[ImageCanvas] Unknown action type: ${(action as SerializableCanvasAction).type}`,
            );
            return false;
        }
      },
      [fillRegionAtPoint, clearCanvas],
    );

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        restoreCanvasState,
        restoreFromImage,
        captureCanvasState,
        clearCanvas,
        getCanvas,
        getCompositeCanvas,
        getBoundaryCanvas,
        fillRegionAtPoint,
        replayAction,
        forceRepaint,
        generatePreviewThumbnail,
      }),
      [
        restoreCanvasState,
        restoreFromImage,
        captureCanvasState,
        clearCanvas,
        getCanvas,
        getCompositeCanvas,
        getBoundaryCanvas,
        fillRegionAtPoint,
        replayAction,
        forceRepaint,
        generatePreviewThumbnail,
      ],
    );

    const drawImageOnCanvas = (
      img: HTMLImageElement,
      imageCtx: CanvasRenderingContext2D,
      newWidth: number,
      newHeight: number,
    ) => {
      imageCtx.clearRect(0, 0, newWidth, newHeight);
      imageCtx.drawImage(img, 0, 0, newWidth, newHeight);
    };

    const redrawDrawingCanvas = (
      drawingCtx: CanvasRenderingContext2D,
      offScreenCtx: CanvasRenderingContext2D,
      newWidth: number,
      newHeight: number,
    ) => {
      drawingCtx.clearRect(
        0,
        0,
        drawingCtx.canvas.width,
        drawingCtx.canvas.height,
      );
      drawingCtx.drawImage(offScreenCtx.canvas, 0, 0, newWidth, newHeight);
    };

    // Initial setup
    useEffect(() => {
      const drawingCanvas = drawingCanvasRef.current;
      const imageCanvas = imageCanvasRef.current;
      const drawingCtx = drawingCanvas?.getContext('2d');
      const imageCtx = imageCanvas?.getContext('2d');
      const container = containerRef.current;

      if (drawingCanvas && imageCanvas && drawingCtx && imageCtx && container) {
        const img = new Image();

        fetch(coloringImage.svgUrl as string)
          .then((response) => response.text())
          .then((svgText) => {
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
            const svgUrl = URL.createObjectURL(svgBlob);

            img.onload = () => {
              setSvgImage(img);

              const imgRatio = img.width / img.height;
              const newWidth = container.clientWidth;
              const newHeight = newWidth / imgRatio;

              setRatio(imgRatio);

              const devicePixelRatio = window.devicePixelRatio || 1;
              dprRef.current = devicePixelRatio; // Update ref synchronously for replayAction
              setDpr(devicePixelRatio);

              drawingCanvas.width = newWidth * devicePixelRatio;
              drawingCanvas.height = newHeight * devicePixelRatio;
              imageCanvas.width = newWidth * devicePixelRatio;
              imageCanvas.height = newHeight * devicePixelRatio;

              drawingCanvas.style.width = `${newWidth}px`;
              drawingCanvas.style.height = `${newHeight}px`;
              imageCanvas.style.width = `${newWidth}px`;
              imageCanvas.style.height = `${newHeight}px`;

              drawingCtx.scale(devicePixelRatio, devicePixelRatio);
              imageCtx.scale(devicePixelRatio, devicePixelRatio);

              drawImageOnCanvas(img, imageCtx, newWidth, newHeight);

              if (!offScreenCanvasRef.current) {
                offScreenCanvasRef.current = document.createElement('canvas');
                offScreenCanvasRef.current.width = newWidth * devicePixelRatio;
                offScreenCanvasRef.current.height =
                  newHeight * devicePixelRatio;
              }

              URL.revokeObjectURL(svgUrl);

              // Notify parent that canvas is ready
              onCanvasReady?.();
            };

            img.src = svgUrl;
          });
      }

      return undefined;
    }, [coloringImage.svgUrl]);

    // Handle resize
    useEffect(() => {
      const drawingCanvas = drawingCanvasRef.current;
      const imageCanvas = imageCanvasRef.current;
      const drawingCtx = drawingCanvas?.getContext('2d');
      const imageCtx = imageCanvas?.getContext('2d');
      const container = containerRef.current;

      if (drawingCanvas && imageCanvas && drawingCtx && imageCtx && container) {
        const handleResize = () => {
          if (!svgImage) return;

          const newWidth = container.clientWidth;
          const newHeight = newWidth / ratio;

          const devicePixelRatio = window.devicePixelRatio || 1;
          dprRef.current = devicePixelRatio; // Update ref synchronously
          setDpr(devicePixelRatio);

          // Capture existing drawing BEFORE resizing canvases
          // We need to save it at the current resolution to scale it properly
          let savedDrawing: ImageData | null = null;
          const oldOffScreen = offScreenCanvasRef.current;
          if (
            oldOffScreen &&
            oldOffScreen.width > 0 &&
            oldOffScreen.height > 0
          ) {
            const oldCtx = oldOffScreen.getContext('2d');
            if (oldCtx) {
              savedDrawing = oldCtx.getImageData(
                0,
                0,
                oldOffScreen.width,
                oldOffScreen.height,
              );
            }
          }
          const oldWidth = oldOffScreen?.width || 0;
          const oldHeight = oldOffScreen?.height || 0;

          // Resize canvases to new dimensions
          const newCanvasWidth = newWidth * devicePixelRatio;
          const newCanvasHeight = newHeight * devicePixelRatio;

          drawingCanvas.width = newCanvasWidth;
          drawingCanvas.height = newCanvasHeight;
          imageCanvas.width = newCanvasWidth;
          imageCanvas.height = newCanvasHeight;

          drawingCanvas.style.width = `${newWidth}px`;
          drawingCanvas.style.height = `${newHeight}px`;
          imageCanvas.style.width = `${newWidth}px`;
          imageCanvas.style.height = `${newHeight}px`;

          // IMPORTANT: Reset transform before applying new scale
          // Setting canvas.width resets the context, but we need explicit scale
          drawingCtx.setTransform(
            devicePixelRatio,
            0,
            0,
            devicePixelRatio,
            0,
            0,
          );
          imageCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

          // Redraw SVG on image canvas
          drawImageOnCanvas(svgImage, imageCtx, newWidth, newHeight);

          // Resize offscreen canvas and restore drawing at new resolution
          if (offScreenCanvasRef.current) {
            // Create temp canvas with old content for scaling
            const tempCanvas = document.createElement('canvas');
            if (savedDrawing && oldWidth > 0 && oldHeight > 0) {
              tempCanvas.width = oldWidth;
              tempCanvas.height = oldHeight;
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCtx.putImageData(savedDrawing, 0, 0);
              }
            }

            // Resize offscreen canvas to new dimensions
            offScreenCanvasRef.current.width = newCanvasWidth;
            offScreenCanvasRef.current.height = newCanvasHeight;
            const offScreenCtx = offScreenCanvasRef.current.getContext('2d');

            if (offScreenCtx && savedDrawing && oldWidth > 0 && oldHeight > 0) {
              // Scale old drawing to new canvas size
              // This preserves the visual appearance across resize
              offScreenCtx.drawImage(
                tempCanvas,
                0,
                0,
                oldWidth,
                oldHeight,
                0,
                0,
                newCanvasWidth,
                newCanvasHeight,
              );

              // Also draw scaled content to visible canvas
              // Use CSS coordinates since context is scaled by DPR
              drawingCtx.drawImage(
                tempCanvas,
                0,
                0,
                oldWidth,
                oldHeight,
                0,
                0,
                newWidth,
                newHeight,
              );
            }
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      }

      return undefined;
    }, [ratio, svgImage]);

    // Prevent scroll on touch for mobile
    useEffect(() => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      const preventScroll = (e: TouchEvent) => {
        if (e.target === canvas) {
          e.preventDefault();
        }
      };

      // Add passive: false to allow preventDefault
      document.addEventListener('touchmove', preventScroll, { passive: false });

      return () => {
        document.removeEventListener('touchmove', preventScroll);
      };
    }, []);

    // Handle first interaction - initialize sounds and notify parent
    const handleFirstInteraction = useCallback(async () => {
      console.log('[ImageCanvas] handleFirstInteraction called', {
        hasInteracted: hasInteractedRef.current,
        hasOnFirstInteraction: !!onFirstInteraction,
      });
      if (hasInteractedRef.current) return;
      hasInteractedRef.current = true;

      // Initialize sounds (required for Web Audio API due to browser autoplay policy)
      console.log('[ImageCanvas] Initializing sounds...');
      await initSounds();
      console.log(
        '[ImageCanvas] Sounds initialized, calling onFirstInteraction',
      );

      // Notify parent so it can start ambient sound
      onFirstInteraction?.();
    }, [initSounds, onFirstInteraction]);

    const getRadius = () => {
      return BRUSH_SIZES[brushSize].radius;
    };

    // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
    const screenToCanvas = useCallback(
      (clientX: number, clientY: number) => {
        const rect = drawingCanvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };

        // Get position relative to the container
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return { x: 0, y: 0 };

        // Calculate the center of the container (transform origin)
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;

        // Get position relative to container
        const relX = clientX - containerRect.left;
        const relY = clientY - containerRect.top;

        // Reverse the transform: first translate, then scale
        // Transform is: translate(panOffset) then scale(zoom) around center
        const x = (relX - centerX - panOffset.x) / zoom + centerX;
        const y = (relY - centerY - panOffset.y) / zoom + centerY;

        return { x, y };
      },
      [zoom, panOffset],
    );

    // Normalize stroke points for cross-platform sync
    // Reverses zoom transformation so coordinates are in CSS canvas space (0 to containerWidth/Height)
    // The actual dimensions are sent alongside, so receiving platform can scale appropriately
    const normalizePointsForSync = useCallback(
      (points: { x: number; y: number }[]): { x: number; y: number }[] => {
        const container = containerRef.current;
        if (!container || zoom === 1) return points;

        const centerX = container.clientWidth / 2;
        const centerY = container.clientHeight / 2;

        // Reverse the screenToCanvas transformation:
        // Original: x = (relX - centerX - panOffset.x) / zoom + centerX
        // To normalize: normalizedX = (x - centerX) * zoom + centerX
        return points.map((point) => ({
          x: (point.x - centerX) * zoom + centerX,
          y: (point.y - centerY) * zoom + centerY,
        }));
      },
      [zoom],
    );

    // Get distance between two touch points
    const getTouchDistance = (touches: React.TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Get center point between two touch points
    const getTouchCenter = (touches: React.TouchList) => {
      if (touches.length < 2) return { x: 0, y: 0 };
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    // Clamp pan offset to keep at least 25% of the image visible
    const clampPanOffset = useCallback(
      (offset: { x: number; y: number }, currentZoom: number) => {
        const container = containerRef.current;
        const canvas = drawingCanvasRef.current;
        if (!container || !canvas) return offset;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const canvasWidth = parseFloat(canvas.style.width) || containerWidth;
        const canvasHeight = parseFloat(canvas.style.height) || containerHeight;

        // At zoom level, the scaled canvas size
        const scaledWidth = canvasWidth * currentZoom;
        const scaledHeight = canvasHeight * currentZoom;

        // Allow panning such that at least 25% of image remains visible
        const minVisible = 0.25;
        const maxPanX = scaledWidth * (1 - minVisible);
        const maxPanY = scaledHeight * (1 - minVisible);

        return {
          x: Math.max(-maxPanX, Math.min(maxPanX, offset.x)),
          y: Math.max(-maxPanY, Math.min(maxPanY, offset.y)),
        };
      },
      [],
    );

    const colorAtPosition = (clientX: number, clientY: number) => {
      const drawingCanvas = drawingCanvasRef.current;
      const drawingCtx = drawingCanvas?.getContext('2d');

      if (drawingCanvas && drawingCtx) {
        // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
        const { x, y } = screenToCanvas(clientX, clientY);
        const radius = getRadius();
        const lastX = lastPosRef.current?.x ?? null;
        const lastY = lastPosRef.current?.y ?? null;

        // For magic-reveal, dynamically look up the color at this position
        let strokeColor = selectedColor;
        let strokeBrushType = brushType;

        if (
          activeTool === 'magic-reveal' &&
          getRevealColor &&
          getRevealRegionId
        ) {
          // Scale coordinates to match regionMap dimensions (which use DPR-scaled pixels)
          // The regionMap was created with canvas.width/height which are DPR-scaled
          // But x,y from screenToCanvas are CSS coordinates (not DPR-scaled)
          const scaledX = Math.floor(x * dpr);
          const scaledY = Math.floor(y * dpr);

          const regionId = getRevealRegionId(scaledX, scaledY);
          const revealColor = getRevealColor(scaledX, scaledY);

          if (revealColor) {
            strokeColor = revealColor;
            // Use marker brush for magic reveal (clean, visible strokes)
            strokeBrushType = 'marker';
            // Track which region is being colored
            if (regionId > 0 && onRegionRevealed) {
              onRegionRevealed(regionId);
            }
          } else {
            // No color available (boundary or already colored area) - don't draw
            // This prevents the palette color from leaking into magic brush strokes
            lastPosRef.current = { x, y };
            return;
          }
        }

        // Track stroke points for serializable actions
        if (currentStrokeRef.current) {
          currentStrokeRef.current.points.push({ x, y });
          // Update color in case it changed (e.g., for magic reveal)
          currentStrokeRef.current.color = strokeColor;
        }

        // Draw textured stroke on visible canvas
        drawTexturedStroke({
          ctx: drawingCtx,
          x,
          y,
          lastX,
          lastY,
          color: strokeColor,
          radius,
          brushType: strokeBrushType,
        });

        // Update offscreen canvas with same stroke
        if (offScreenCanvasRef.current) {
          const offScreenCtx = offScreenCanvasRef.current.getContext('2d');
          if (offScreenCtx) {
            drawTexturedStroke({
              ctx: offScreenCtx,
              x,
              y,
              lastX,
              lastY,
              color: strokeColor,
              radius,
              brushType: strokeBrushType,
            });
          }
        }

        lastPosRef.current = { x, y };
      }
    };

    const handleFill = (clientX: number, clientY: number) => {
      const drawingCanvas = drawingCanvasRef.current;
      const imageCanvas = imageCanvasRef.current;
      const drawingCtx = drawingCanvas?.getContext('2d');
      const imageCtx = imageCanvas?.getContext('2d');

      if (!drawingCanvas || !drawingCtx || !imageCanvas || !imageCtx) {
        return;
      }

      // Capture state before fill for undo
      const beforeState = captureCanvasState();

      // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
      const canvasCoords = screenToCanvas(clientX, clientY);
      const x = canvasCoords.x * dpr;
      const y = canvasCoords.y * dpr;

      // Create a boundary canvas from SVG outlines ONLY
      // We don't include existing coloring because:
      // 1. Many colors (red, blue, green) have low luminance and would be detected as boundaries
      // 2. This would prevent re-filling already colored regions with different colors
      // The scanlineFill's targetColor matching handles filling only matching pixels
      const boundaryCanvas = document.createElement('canvas');
      boundaryCanvas.width = drawingCanvas.width;
      boundaryCanvas.height = drawingCanvas.height;
      const boundaryCtx = boundaryCanvas.getContext('2d');

      if (!boundaryCtx) return;

      // Only use SVG outline layer for boundary detection (black lines)
      boundaryCtx.drawImage(imageCanvas, 0, 0);

      // Get the boundary image data for the flood fill to check against
      const boundaryImageData = boundaryCtx.getImageData(
        0,
        0,
        boundaryCanvas.width,
        boundaryCanvas.height,
      );

      let filled = false;

      if (selectedPattern === 'solid') {
        // Simple solid fill - use direct scanlineFill
        const fillColor = hexToRGBA(selectedColor);
        filled = scanlineFill(drawingCtx, {
          x,
          y,
          fillColor,
          tolerance: 48,
          boundaryImageData,
          boundaryThreshold: 180,
        });
      } else {
        // Pattern fill - use a two-step process:
        // 1. Identify the fill region using a marker color
        // 2. Apply the pattern only to the identified region

        // Create a temporary canvas to identify fill region
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = drawingCanvas.width;
        tempCanvas.height = drawingCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) return;

        // Copy current drawing canvas to temp canvas
        tempCtx.drawImage(drawingCanvas, 0, 0);

        // Use a unique marker color to identify the fill region
        const markerColor = { r: 255, g: 0, b: 255, a: 255 }; // Magenta marker
        filled = scanlineFill(tempCtx, {
          x,
          y,
          fillColor: markerColor,
          tolerance: 48,
          boundaryImageData,
          boundaryThreshold: 180,
        });

        if (filled) {
          // Get the temp canvas with marked region
          const tempImageData = tempCtx.getImageData(
            0,
            0,
            tempCanvas.width,
            tempCanvas.height,
          );
          const tempData = tempImageData.data;

          // Create the pattern - scale tile size based on dpr for consistent visual size
          const tileSize = Math.round(24 * dpr);
          const pattern = createFillPattern(
            drawingCtx,
            selectedPattern,
            selectedColor,
            tileSize,
          );

          // Create a pattern canvas
          const patternCanvas = document.createElement('canvas');
          patternCanvas.width = drawingCanvas.width;
          patternCanvas.height = drawingCanvas.height;
          const patternCtx = patternCanvas.getContext('2d');

          if (!patternCtx) return;

          // Fill pattern canvas with the pattern
          if (typeof pattern === 'string') {
            // Solid color (fallback)
            patternCtx.fillStyle = pattern;
          } else {
            patternCtx.fillStyle = pattern;
          }
          patternCtx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);

          // Get pattern image data
          const patternImageData = patternCtx.getImageData(
            0,
            0,
            patternCanvas.width,
            patternCanvas.height,
          );
          const patternData = patternImageData.data;

          // Get current drawing canvas image data
          const drawingImageData = drawingCtx.getImageData(
            0,
            0,
            drawingCanvas.width,
            drawingCanvas.height,
          );
          const drawingData = drawingImageData.data;

          // Apply pattern pixels only where the marker color exists
          for (let i = 0; i < tempData.length; i += 4) {
            // Check if this pixel is the marker color
            if (
              tempData[i] === markerColor.r &&
              tempData[i + 1] === markerColor.g &&
              tempData[i + 2] === markerColor.b &&
              tempData[i + 3] === markerColor.a
            ) {
              // Copy pattern pixel to drawing canvas
              drawingData[i] = patternData[i];
              drawingData[i + 1] = patternData[i + 1];
              drawingData[i + 2] = patternData[i + 2];
              drawingData[i + 3] = patternData[i + 3];
            }
          }

          // Apply the modified image data to the drawing canvas
          drawingCtx.putImageData(drawingImageData, 0, 0);
        }
      }

      if (filled) {
        // Update offscreen canvas
        if (offScreenCanvasRef.current) {
          const offScreenCtx = offScreenCanvasRef.current.getContext('2d');
          if (offScreenCtx) {
            const imageData = drawingCtx.getImageData(
              0,
              0,
              drawingCanvas.width,
              drawingCanvas.height,
            );
            offScreenCtx.putImageData(imageData, 0, 0);
          }
        }

        // Push to history for undo
        if (beforeState) {
          pushToHistory({
            type: 'fill',
            imageData: beforeState,
            timestamp: Date.now(),
          });
        }

        // Add fill action for server sync (normalize coordinates for cross-platform sync)
        const normalizedFillPoint = normalizePointsForSync([canvasCoords])[0];
        // Include source dimensions for cross-platform scaling
        const container = containerRef.current;
        addDrawingAction({
          type: 'fill',
          x: normalizedFillPoint.x,
          y: normalizedFillPoint.y,
          color: selectedColor,
          fillType: selectedPattern === 'solid' ? 'solid' : 'pattern',
          patternType: selectedPattern,
          timestamp: Date.now(),
          sourceWidth: container?.clientWidth,
          sourceHeight: container?.clientHeight,
        });

        // Play fill sound
        playSound('fill');

        trackEvent(TRACKING_EVENTS.PAGE_COLOR_SELECTED, {
          coloringImageId: coloringImage.id,
          color: selectedColor,
          tool: 'fill',
        });
      }
    };

    const handleStickerPlace = (clientX: number, clientY: number) => {
      if (!selectedSticker) return;

      const drawingCanvas = drawingCanvasRef.current;
      const drawingCtx = drawingCanvas?.getContext('2d');

      if (!drawingCanvas || !drawingCtx) return;

      // Capture state before placing sticker for undo
      const beforeState = captureCanvasState();

      // Convert screen coordinates to canvas coordinates (accounting for zoom/pan)
      const { x, y } = screenToCanvas(clientX, clientY);

      // Calculate sticker size based on brush size for consistency
      const stickerSizes: Record<string, number> = {
        small: 32,
        medium: 48,
        large: 64,
      };
      const stickerSize = stickerSizes[brushSize] || 48;

      // Save current context state
      drawingCtx.save();

      // Set up text properties for emoji drawing
      drawingCtx.font = `${stickerSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      drawingCtx.textAlign = 'center';
      drawingCtx.textBaseline = 'middle';

      // Draw the sticker emoji at the click position
      drawingCtx.fillText(selectedSticker.emoji, x, y);

      // Restore context state
      drawingCtx.restore();

      // Update offscreen canvas with same sticker
      if (offScreenCanvasRef.current) {
        const offScreenCtx = offScreenCanvasRef.current.getContext('2d');
        if (offScreenCtx) {
          offScreenCtx.save();
          offScreenCtx.font = `${stickerSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
          offScreenCtx.textAlign = 'center';
          offScreenCtx.textBaseline = 'middle';
          offScreenCtx.fillText(selectedSticker.emoji, x, y);
          offScreenCtx.restore();
        }
      }

      // Push to history for undo
      if (beforeState) {
        pushToHistory({
          type: 'stroke', // Using 'stroke' type for stickers as they're similar in behavior
          imageData: beforeState,
          timestamp: Date.now(),
        });
      }

      // Add sticker action for server sync (normalize coordinates for cross-platform sync)
      const normalizedStickerPoint = normalizePointsForSync([{ x, y }])[0];
      // Include source dimensions for cross-platform scaling
      const stickerContainer = containerRef.current;
      addDrawingAction({
        type: 'sticker',
        sticker: selectedSticker.emoji,
        x: normalizedStickerPoint.x,
        y: normalizedStickerPoint.y,
        size: stickerSize,
        timestamp: Date.now(),
        sourceWidth: stickerContainer?.clientWidth,
        sourceHeight: stickerContainer?.clientHeight,
      });

      // Play pop sound for sticker placement
      playSound('pop');

      trackEvent(TRACKING_EVENTS.PAGE_STROKE_MADE, {
        coloringImageId: coloringImage.id,
        color: selectedSticker.emoji, // Use emoji as "color" for stickers
        tool: 'sticker',
        stickerId: selectedSticker.id,
        stickerName: selectedSticker.name,
      });
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
      // Initialize sounds on first interaction (required for Web Audio API)
      handleFirstInteraction();

      // Pan tool - single click to start panning
      if (activeTool === 'pan') {
        isPanningRef.current = true;
        lastPanPosRef.current = { x: event.clientX, y: event.clientY };
        return;
      }

      if (activeTool === 'fill') {
        handleFill(event.clientX, event.clientY);
        return;
      }

      // Sticker tool - place sticker on click
      if (activeTool === 'sticker') {
        handleStickerPlace(event.clientX, event.clientY);
        return;
      }

      // Magic brush tool - stroke-based reveal with AI colors
      // Unlike other tools, magic-reveal uses the same drawing flow as brush
      // but dynamically looks up the color for each point from the color map
      if (activeTool === 'magic-reveal') {
        if (!isMagicRevealReady) {
          // Color map not ready yet - don't start drawing
          return;
        }
        // Start drawing session (same as regular brush)
        const beforeState = captureCanvasState();
        if (beforeState) {
          pushToHistory({
            type: 'stroke',
            imageData: beforeState,
            timestamp: Date.now(),
          });
        }
        // Initialize stroke tracking for magic-reveal
        currentStrokeRef.current = {
          points: [],
          color: selectedColor, // Will be overridden per-point for magic reveal
          brushType: 'marker', // Magic reveal uses marker
          strokeWidth: getRadius() * 2,
        };
        setIsDrawing(true);
        lastPosRef.current = null;
        colorAtPosition(event.clientX, event.clientY);
        // Sound will start on first move
        return;
      }

      // Capture state before drawing for undo
      const beforeState = captureCanvasState();
      if (beforeState) {
        pushToHistory({
          type: 'stroke',
          imageData: beforeState,
          timestamp: Date.now(),
        });
      }

      // Initialize stroke tracking for serializable actions
      currentStrokeRef.current = {
        points: [],
        color: selectedColor,
        brushType: brushType,
        strokeWidth: getRadius() * 2, // Diameter
      };

      setIsDrawing(true);
      lastPosRef.current = null;
      colorAtPosition(event.clientX, event.clientY);
      // Sound will start on first move
    };

    const handleMouseUp = () => {
      console.log('[ImageCanvas] handleMouseUp', {
        isDrawing,
        isPanning: isPanningRef.current,
      });

      // Reset pan state
      if (isPanningRef.current) {
        isPanningRef.current = false;
        lastPanPosRef.current = null;
        return;
      }

      // Always try to stop brush sound on mouse up, even if not drawing
      // This handles edge cases where isDrawing state might be stale
      if (brushSoundTimeoutRef.current) {
        clearTimeout(brushSoundTimeoutRef.current);
        brushSoundTimeoutRef.current = null;
      }
      stopBrushLoop();

      if (!isDrawing) return;
      setIsDrawing(false);
      lastPosRef.current = null;

      // Finalize stroke and add to serializable actions
      if (
        currentStrokeRef.current &&
        currentStrokeRef.current.points.length > 0
      ) {
        const stroke = currentStrokeRef.current;
        // Normalize points to CSS canvas space for cross-platform sync
        const normalizedPoints = normalizePointsForSync(stroke.points);
        // Include source dimensions for cross-platform scaling
        const strokeContainer = containerRef.current;
        addDrawingAction({
          type: 'stroke',
          path: normalizedPoints,
          pathSvg: pointsToSvgPath(normalizedPoints),
          color: stroke.color,
          brushType: stroke.brushType,
          strokeWidth: stroke.strokeWidth,
          timestamp: Date.now(),
          sourceWidth: strokeContainer?.clientWidth,
          sourceHeight: strokeContainer?.clientHeight,
        });
        currentStrokeRef.current = null;
      }

      trackEvent(TRACKING_EVENTS.PAGE_STROKE_MADE, {
        coloringImageId: coloringImage.id,
        color: selectedColor,
        brushSize,
        brushType,
      });
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
      // Handle pan tool dragging
      if (isPanningRef.current && lastPanPosRef.current) {
        const deltaX = event.clientX - lastPanPosRef.current.x;
        const deltaY = event.clientY - lastPanPosRef.current.y;
        const newOffset = {
          x: panOffset.x + deltaX,
          y: panOffset.y + deltaY,
        };
        setPanOffset(clampPanOffset(newOffset, zoom));
        lastPanPosRef.current = { x: event.clientX, y: event.clientY };
        return;
      }

      // Allow drawing for brush tools and magic-reveal (stroke-based reveal)
      if (
        !isDrawing ||
        (activeTool !== 'brush' && activeTool !== 'magic-reveal')
      ) {
        return;
      }

      // Start brush sound on move (not on mousedown)
      const soundType =
        activeTool === 'magic-reveal' ? 'magic-reveal' : brushType;
      if (!isBrushLoopActive()) {
        startBrushLoop(soundType);
      }

      // Reset debounce timer - stop sound after 150ms of no movement
      if (brushSoundTimeoutRef.current) {
        clearTimeout(brushSoundTimeoutRef.current);
      }
      brushSoundTimeoutRef.current = setTimeout(() => {
        stopBrushLoop();
      }, 150);

      colorAtPosition(event.clientX, event.clientY);
    };

    const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault(); // Prevent scroll

      // Initialize sounds on first interaction (required for Web Audio API)
      handleFirstInteraction();

      // Two-finger gesture (pinch/pan)
      if (event.touches.length === 2) {
        isPinchingRef.current = true;
        lastPinchDistanceRef.current = getTouchDistance(event.touches);
        lastTouchCenterRef.current = getTouchCenter(event.touches);
        gestureStartZoomRef.current = zoom;
        gestureStartPanRef.current = { ...panOffset };
        return;
      }

      // Single touch - pan tool, sticker, drawing, or fill
      if (event.touches.length === 1) {
        const touch = event.touches[0];

        // Pan tool - single finger panning
        if (activeTool === 'pan') {
          isPanningRef.current = true;
          lastPanPosRef.current = { x: touch.clientX, y: touch.clientY };
          return;
        }

        if (activeTool === 'fill') {
          handleFill(touch.clientX, touch.clientY);
          return;
        }

        // Sticker tool - place sticker on tap
        if (activeTool === 'sticker') {
          handleStickerPlace(touch.clientX, touch.clientY);
          return;
        }

        // Magic brush tool - stroke-based reveal with AI colors
        if (activeTool === 'magic-reveal') {
          if (!isMagicRevealReady) {
            // Color map not ready yet - don't start drawing
            return;
          }
          // Start drawing session (same as regular brush)
          const beforeState = captureCanvasState();
          if (beforeState) {
            pushToHistory({
              type: 'stroke',
              imageData: beforeState,
              timestamp: Date.now(),
            });
          }
          // Initialize stroke tracking for magic-reveal
          currentStrokeRef.current = {
            points: [],
            color: selectedColor, // Will be overridden per-point for magic reveal
            brushType: 'marker', // Magic reveal uses marker
            strokeWidth: getRadius() * 2,
          };
          setIsDrawing(true);
          lastPosRef.current = null;
          colorAtPosition(touch.clientX, touch.clientY);
          // Sound will start on first move
          return;
        }

        // Capture state before drawing for undo
        const beforeState = captureCanvasState();
        if (beforeState) {
          pushToHistory({
            type: 'stroke',
            imageData: beforeState,
            timestamp: Date.now(),
          });
        }

        // Initialize stroke tracking for serializable actions
        currentStrokeRef.current = {
          points: [],
          color: selectedColor,
          brushType: brushType,
          strokeWidth: getRadius() * 2, // Diameter
        };

        setIsDrawing(true);
        lastPosRef.current = null;
        colorAtPosition(touch.clientX, touch.clientY);
        // Sound will start on first move
      }
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault(); // Prevent scroll

      // Handle pinch-to-zoom and two-finger pan
      if (event.touches.length === 2 && isPinchingRef.current) {
        const currentDistance = getTouchDistance(event.touches);
        const currentCenter = getTouchCenter(event.touches);

        // Calculate zoom change
        let currentZoom = zoom;
        if (lastPinchDistanceRef.current !== null) {
          const scale = currentDistance / lastPinchDistanceRef.current;
          currentZoom = Math.min(
            4,
            Math.max(1, gestureStartZoomRef.current * scale),
          );
          setZoom(currentZoom);
        }

        // Calculate pan change
        if (lastTouchCenterRef.current !== null) {
          const deltaX = currentCenter.x - lastTouchCenterRef.current.x;
          const deltaY = currentCenter.y - lastTouchCenterRef.current.y;
          const newOffset = {
            x: gestureStartPanRef.current.x + deltaX,
            y: gestureStartPanRef.current.y + deltaY,
          };
          setPanOffset(clampPanOffset(newOffset, currentZoom));
        }

        return;
      }

      // Handle pan tool single-finger panning
      if (
        isPanningRef.current &&
        lastPanPosRef.current &&
        event.touches.length === 1
      ) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - lastPanPosRef.current.x;
        const deltaY = touch.clientY - lastPanPosRef.current.y;
        const newOffset = {
          x: panOffset.x + deltaX,
          y: panOffset.y + deltaY,
        };
        setPanOffset(clampPanOffset(newOffset, zoom));
        lastPanPosRef.current = { x: touch.clientX, y: touch.clientY };
        return;
      }

      // Single-finger drawing (brush or magic-reveal)
      if (
        !isDrawing ||
        (activeTool !== 'brush' && activeTool !== 'magic-reveal') ||
        isPinchingRef.current
      ) {
        return;
      }

      // Start brush sound on move (not on touchstart)
      const soundType =
        activeTool === 'magic-reveal' ? 'magic-reveal' : brushType;
      if (!isBrushLoopActive()) {
        startBrushLoop(soundType);
      }

      // Reset debounce timer - stop sound after 150ms of no movement
      if (brushSoundTimeoutRef.current) {
        clearTimeout(brushSoundTimeoutRef.current);
      }
      brushSoundTimeoutRef.current = setTimeout(() => {
        stopBrushLoop();
      }, 150);

      const touch = event.touches[0];
      colorAtPosition(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      console.log('[ImageCanvas] handleTouchEnd', {
        isDrawing,
        touchCount: event.touches.length,
      });

      // Reset pinch state when all fingers are lifted or down to one finger
      if (event.touches.length < 2) {
        isPinchingRef.current = false;
        lastPinchDistanceRef.current = null;
        lastTouchCenterRef.current = null;
      }

      // Reset pan state when all fingers are lifted
      if (event.touches.length === 0) {
        isPanningRef.current = false;
        lastPanPosRef.current = null;
      }

      // Always try to stop brush sound on touch end, even if not drawing
      // This handles edge cases where isDrawing state might be stale
      if (brushSoundTimeoutRef.current) {
        clearTimeout(brushSoundTimeoutRef.current);
        brushSoundTimeoutRef.current = null;
      }
      stopBrushLoop();

      if (!isDrawing) return;
      setIsDrawing(false);
      lastPosRef.current = null;

      // Finalize stroke and add to serializable actions
      if (
        currentStrokeRef.current &&
        currentStrokeRef.current.points.length > 0
      ) {
        const stroke = currentStrokeRef.current;
        // Normalize points to CSS canvas space for cross-platform sync
        const normalizedPoints = normalizePointsForSync(stroke.points);
        // Include source dimensions for cross-platform scaling
        const touchContainer = containerRef.current;
        addDrawingAction({
          type: 'stroke',
          path: normalizedPoints,
          pathSvg: pointsToSvgPath(normalizedPoints),
          color: stroke.color,
          brushType: stroke.brushType,
          strokeWidth: stroke.strokeWidth,
          timestamp: Date.now(),
          sourceWidth: touchContainer?.clientWidth,
          sourceHeight: touchContainer?.clientHeight,
        });
        currentStrokeRef.current = null;
      }

      trackEvent(TRACKING_EVENTS.PAGE_STROKE_MADE, {
        coloringImageId: coloringImage.id,
        color: selectedColor,
        brushSize,
        brushType,
      });
    };

    return (
      <div
        ref={containerRef}
        className={cn('w-full h-auto relative overflow-hidden', {
          [className as string]: !!className,
        })}
      >
        {/* Transformable canvas container */}
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPinchingRef.current
              ? 'none'
              : 'transform 0.1s ease-out',
            // Hint to browser not to aggressively cache canvas content
            // Helps ensure canvas repaints after bulk action replays
            willChange: 'contents',
          }}
        >
          <canvas
            className="w-full h-auto touch-none select-none"
            style={{
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              cursor: activeTool === 'pan' ? 'grab' : toolCursor || 'default',
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            ref={drawingCanvasRef}
          />
          <canvas
            className="absolute top-0 left-0 w-full h-auto pointer-events-none mix-blend-multiply"
            ref={imageCanvasRef}
          />
        </div>
      </div>
    );
  },
);

ImageCanvas.displayName = 'ImageCanvas';

export default ImageCanvas;
