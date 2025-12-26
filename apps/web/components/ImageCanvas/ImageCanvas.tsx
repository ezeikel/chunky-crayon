'use client';

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { ColoringImage } from '@chunky-crayon/db/types';
import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS, BRUSH_SIZES } from '@/constants';
import { scanlineFill, hexToRGBA } from '@/utils/floodFill';
import { drawTexturedStroke } from '@/utils/brushTextures';
import { createFillPattern } from '@/utils/fillPatterns';

type ImageCanvasProps = {
  coloringImage: Partial<ColoringImage>;
  className?: string;
  onCanvasReady?: () => void;
  onFirstInteraction?: () => void;
};

export type ImageCanvasHandle = {
  restoreCanvasState: (imageData: ImageData) => void;
  restoreFromImage: (img: HTMLImageElement) => void;
  captureCanvasState: () => ImageData | null;
  clearCanvas: () => void;
  getCanvas: () => HTMLCanvasElement | null;
};

const ImageCanvas = forwardRef<ImageCanvasHandle, ImageCanvasProps>(
  ({ coloringImage, className, onCanvasReady, onFirstInteraction }, ref) => {
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
      pushToHistory,
      zoom,
      panOffset,
      setZoom,
      setPanOffset,
    } = useColoringContext();
    const { playSound, initSounds } = useSound();

    const [ratio, setRatio] = useState<number>(1);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [svgImage, setSvgImage] = useState<HTMLImageElement | null>(null);
    const [dpr, setDpr] = useState<number>(1);

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

      // Draw the saved image onto the canvas
      ctx.drawImage(img, 0, 0);

      // Also update offscreen canvas
      if (offScreenCanvasRef.current) {
        const offCtx = offScreenCanvasRef.current.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(img, 0, 0);
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

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        restoreCanvasState,
        restoreFromImage,
        captureCanvasState,
        clearCanvas,
        getCanvas,
      }),
      [
        restoreCanvasState,
        restoreFromImage,
        captureCanvasState,
        clearCanvas,
        getCanvas,
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

          drawImageOnCanvas(svgImage, imageCtx, newWidth, newHeight);

          if (offScreenCanvasRef.current) {
            const offScreenCtx = offScreenCanvasRef.current?.getContext('2d');

            if (offScreenCtx) {
              redrawDrawingCanvas(
                drawingCtx,
                offScreenCtx,
                newWidth * devicePixelRatio,
                newHeight * devicePixelRatio,
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
      if (hasInteractedRef.current) return;
      hasInteractedRef.current = true;

      // Initialize sounds (required for Web Audio API due to browser autoplay policy)
      await initSounds();

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

        // Draw textured stroke on visible canvas
        drawTexturedStroke({
          ctx: drawingCtx,
          x,
          y,
          lastX,
          lastY,
          color: selectedColor,
          radius,
          brushType,
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
              color: selectedColor,
              radius,
              brushType,
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

      // Create a composite boundary canvas that combines SVG lines + current drawing
      // This allows the flood fill to "see" the SVG line boundaries
      const boundaryCanvas = document.createElement('canvas');
      boundaryCanvas.width = drawingCanvas.width;
      boundaryCanvas.height = drawingCanvas.height;
      const boundaryCtx = boundaryCanvas.getContext('2d');

      if (!boundaryCtx) return;

      // Draw the SVG outline layer (the lines that define regions)
      boundaryCtx.drawImage(imageCanvas, 0, 0);

      // Also draw any existing coloring (so we respect previously filled regions)
      boundaryCtx.drawImage(drawingCanvas, 0, 0);

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

        // Play fill sound
        playSound('fill');

        trackEvent(TRACKING_EVENTS.PAGE_COLOR_SELECTED, {
          coloringImageId: coloringImage.id,
          color: selectedColor,
          tool: 'fill',
        });
      }
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

      // Capture state before drawing for undo
      const beforeState = captureCanvasState();
      if (beforeState) {
        pushToHistory({
          type: 'stroke',
          imageData: beforeState,
          timestamp: Date.now(),
        });
      }

      setIsDrawing(true);
      lastPosRef.current = null;
      colorAtPosition(event.clientX, event.clientY);
      playSound('draw');
    };

    const handleMouseUp = () => {
      // Reset pan state
      if (isPanningRef.current) {
        isPanningRef.current = false;
        lastPanPosRef.current = null;
        return;
      }

      if (!isDrawing) return;
      setIsDrawing(false);
      lastPosRef.current = null;
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

      if (!isDrawing || activeTool !== 'brush') {
        return;
      }

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

      // Single touch - pan tool, drawing, or fill
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

        // Capture state before drawing for undo
        const beforeState = captureCanvasState();
        if (beforeState) {
          pushToHistory({
            type: 'stroke',
            imageData: beforeState,
            timestamp: Date.now(),
          });
        }

        setIsDrawing(true);
        lastPosRef.current = null;
        colorAtPosition(touch.clientX, touch.clientY);
        playSound('draw');
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

      // Single-finger drawing
      if (!isDrawing || activeTool !== 'brush' || isPinchingRef.current) {
        return;
      }

      const touch = event.touches[0];
      colorAtPosition(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();

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

      if (!isDrawing) return;
      setIsDrawing(false);
      lastPosRef.current = null;
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
          }}
        >
          <canvas
            className="w-full h-auto touch-none select-none"
            style={{
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
              cursor:
                activeTool === 'pan'
                  ? 'grab'
                  : activeTool === 'fill'
                    ? 'crosshair'
                    : 'default',
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
