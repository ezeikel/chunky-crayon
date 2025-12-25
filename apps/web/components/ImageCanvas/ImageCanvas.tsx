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

type ImageCanvasProps = {
  coloringImage: Partial<ColoringImage>;
  className?: string;
  onCanvasReady?: () => void;
};

export type ImageCanvasHandle = {
  restoreCanvasState: (imageData: ImageData) => void;
  restoreFromImage: (img: HTMLImageElement) => void;
  captureCanvasState: () => ImageData | null;
  clearCanvas: () => void;
  getCanvas: () => HTMLCanvasElement | null;
};

const ImageCanvas = forwardRef<ImageCanvasHandle, ImageCanvasProps>(
  ({ coloringImage, className, onCanvasReady }, ref) => {
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const offScreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const { selectedColor, brushSize, brushType, activeTool, pushToHistory } =
      useColoringContext();
    const { playSound } = useSound();

    const [ratio, setRatio] = useState<number>(1);
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [svgImage, setSvgImage] = useState<HTMLImageElement | null>(null);
    const [dpr, setDpr] = useState<number>(1);

    // Store the last position for smooth drawing
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

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

    const getRadius = () => {
      return BRUSH_SIZES[brushSize].radius;
    };

    const colorAtPosition = (clientX: number, clientY: number) => {
      const drawingCanvas = drawingCanvasRef.current;
      const drawingCtx = drawingCanvas?.getContext('2d');
      const rect = drawingCanvas?.getBoundingClientRect();

      if (drawingCanvas && drawingCtx && rect) {
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const radius = getRadius();

        // Handle eraser
        if (brushType === 'eraser') {
          drawingCtx.globalCompositeOperation = 'destination-out';
        } else {
          drawingCtx.globalCompositeOperation = 'source-over';
        }

        // Draw smooth line between last position and current
        if (lastPosRef.current) {
          drawingCtx.beginPath();
          drawingCtx.strokeStyle = selectedColor;
          drawingCtx.lineWidth = radius * 2;
          drawingCtx.lineCap = 'round';
          drawingCtx.lineJoin = 'round';
          drawingCtx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
          drawingCtx.lineTo(x, y);
          drawingCtx.stroke();
        }

        // Always draw a circle at current position
        drawingCtx.beginPath();
        drawingCtx.arc(x, y, radius, 0, 2 * Math.PI);
        drawingCtx.fillStyle = selectedColor;
        drawingCtx.fill();

        // Update offscreen canvas
        if (offScreenCanvasRef.current) {
          const offScreenCtx = offScreenCanvasRef.current.getContext('2d');
          if (offScreenCtx) {
            if (brushType === 'eraser') {
              offScreenCtx.globalCompositeOperation = 'destination-out';
            } else {
              offScreenCtx.globalCompositeOperation = 'source-over';
            }

            if (lastPosRef.current) {
              offScreenCtx.beginPath();
              offScreenCtx.strokeStyle = selectedColor;
              offScreenCtx.lineWidth = radius * 2;
              offScreenCtx.lineCap = 'round';
              offScreenCtx.lineJoin = 'round';
              offScreenCtx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
              offScreenCtx.lineTo(x, y);
              offScreenCtx.stroke();
            }

            offScreenCtx.beginPath();
            offScreenCtx.arc(x, y, radius, 0, 2 * Math.PI);
            offScreenCtx.fillStyle = selectedColor;
            offScreenCtx.fill();
          }
        }

        lastPosRef.current = { x, y };

        // Reset composite operation
        drawingCtx.globalCompositeOperation = 'source-over';
        if (offScreenCanvasRef.current) {
          const offScreenCtx = offScreenCanvasRef.current.getContext('2d');
          if (offScreenCtx) {
            offScreenCtx.globalCompositeOperation = 'source-over';
          }
        }
      }
    };

    const handleFill = (clientX: number, clientY: number) => {
      const drawingCanvas = drawingCanvasRef.current;
      const drawingCtx = drawingCanvas?.getContext('2d');
      const rect = drawingCanvas?.getBoundingClientRect();

      if (!drawingCanvas || !drawingCtx || !rect) return;

      // Capture state before fill for undo
      const beforeState = captureCanvasState();

      const x = (clientX - rect.left) * dpr;
      const y = (clientY - rect.top) * dpr;

      const fillColor = hexToRGBA(selectedColor);
      const filled = scanlineFill(drawingCtx, {
        x,
        y,
        fillColor,
        tolerance: 48, // Higher tolerance for anti-aliased SVG edges
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
      if (!isDrawing || activeTool !== 'brush') {
        return;
      }

      colorAtPosition(event.clientX, event.clientY);
    };

    const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault(); // Prevent scroll

      if (activeTool === 'fill') {
        const touch = event.touches[0];
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
      const touch = event.touches[0];
      colorAtPosition(touch.clientX, touch.clientY);
      playSound('draw');
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault(); // Prevent scroll

      if (!isDrawing || activeTool !== 'brush') {
        return;
      }

      const touch = event.touches[0];
      colorAtPosition(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
      event.preventDefault();
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
        className={cn('w-full h-auto relative', {
          [className as string]: !!className,
        })}
      >
        <canvas
          className="w-full h-auto touch-none select-none"
          style={{
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            cursor: activeTool === 'fill' ? 'crosshair' : 'default',
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
    );
  },
);

ImageCanvas.displayName = 'ImageCanvas';

export default ImageCanvas;
