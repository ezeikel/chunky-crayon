'use client';

import { useRef, useEffect, useState } from 'react';
import { ColoringImage } from '@chunky-crayon/db/types';
import { useColoringContext } from '@/contexts/coloring';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

type ImageCanvasProps = {
  coloringImage: Partial<ColoringImage>;
  className?: string;
};

const ImageCanvas = ({ coloringImage, className }: ImageCanvasProps) => {
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offScreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { selectedColor } = useColoringContext();
  const [ratio, setRatio] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [svgImage, setSvgImage] = useState<HTMLImageElement | null>(null);

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

            const dpr = window.devicePixelRatio || 1;
            drawingCanvas.width = newWidth * dpr;
            drawingCanvas.height = newHeight * dpr;
            imageCanvas.width = newWidth * dpr;
            imageCanvas.height = newHeight * dpr;

            drawingCanvas.style.width = `${newWidth}px`;
            drawingCanvas.style.height = `${newHeight}px`;
            imageCanvas.style.width = `${newWidth}px`;
            imageCanvas.style.height = `${newHeight}px`;

            drawingCtx.scale(dpr, dpr);
            imageCtx.scale(dpr, dpr);

            drawImageOnCanvas(img, imageCtx, newWidth, newHeight);

            if (!offScreenCanvasRef.current) {
              offScreenCanvasRef.current = document.createElement('canvas');
              offScreenCanvasRef.current.width = newWidth * dpr;
              offScreenCanvasRef.current.height = newHeight * dpr;
            }

            URL.revokeObjectURL(svgUrl);
          };

          img.src = svgUrl;
        });
    }

    return undefined;
  }, [coloringImage.svgUrl]);

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

        const dpr = window.devicePixelRatio || 1;
        drawingCanvas.width = newWidth * dpr;
        drawingCanvas.height = newHeight * dpr;
        imageCanvas.width = newWidth * dpr;
        imageCanvas.height = newHeight * dpr;

        drawingCanvas.style.width = `${newWidth}px`;
        drawingCanvas.style.height = `${newHeight}px`;
        imageCanvas.style.width = `${newWidth}px`;
        imageCanvas.style.height = `${newHeight}px`;

        drawingCtx.scale(dpr, dpr);
        imageCtx.scale(dpr, dpr);

        drawImageOnCanvas(svgImage, imageCtx, newWidth, newHeight);

        if (offScreenCanvasRef.current) {
          const offScreenCtx = offScreenCanvasRef.current?.getContext('2d');

          if (offScreenCtx) {
            redrawDrawingCanvas(
              drawingCtx,
              offScreenCtx,
              newWidth * dpr,
              newHeight * dpr,
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

  const colorAtPosition = (clientX: number, clientY: number) => {
    const drawingCanvas = drawingCanvasRef.current;
    const drawingCtx = drawingCanvas?.getContext('2d');
    // const imageCanvas = imageCanvasRef.current;
    const rect = drawingCanvas?.getBoundingClientRect();

    if (drawingCanvas && drawingCtx && rect) {
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const radius = 5;

      drawingCtx.beginPath();
      drawingCtx.arc(x, y, radius, 0, 2 * Math.PI);
      drawingCtx.fillStyle = selectedColor;
      drawingCtx.fill();

      if (offScreenCanvasRef.current) {
        const offScreenCtx = offScreenCanvasRef.current.getContext('2d');
        if (offScreenCtx) {
          offScreenCtx.beginPath();
          offScreenCtx.arc(x, y, radius, 0, 2 * Math.PI);
          offScreenCtx.fillStyle = selectedColor;
          offScreenCtx.fill();
        }
      }
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    colorAtPosition(event.clientX, event.clientY);
  };
  const handleMouseUp = () => {
    setIsDrawing(false);
    trackEvent(TRACKING_EVENTS.PAGE_STROKE_MADE, {
      coloringImageId: coloringImage.id,
      color: selectedColor,
    });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    colorAtPosition(event.clientX, event.clientY);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const touch = event.touches[0];
    colorAtPosition(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return;
    }

    const touch = event.touches[0];
    colorAtPosition(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    trackEvent(TRACKING_EVENTS.PAGE_STROKE_MADE, {
      coloringImageId: coloringImage.id,
      color: selectedColor,
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
        className="w-full h-auto"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp} // ensure drawing stops if mouse leaves the canvas
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
};

export default ImageCanvas;
