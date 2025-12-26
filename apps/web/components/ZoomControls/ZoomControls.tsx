'use client';

import { useEffect, useRef, useState } from 'react';
import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';

type ZoomControlsProps = {
  className?: string;
};

const ZoomInIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

// Home icon - more intuitive for kids to understand "go back to full picture"
const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

// Visual zoom indicator component - dots that fill based on zoom level with bounce animation
const ZoomIndicator = ({
  zoom,
  maxZoom,
}: {
  zoom: number;
  maxZoom: number;
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevZoomRef = useRef(zoom);

  // Calculate how many dots should be filled (zoom 1 = 0 dots, max = all dots)
  const totalDots = Math.round((maxZoom - 1) / 0.5); // Based on 0.5 step size
  const filledDots = Math.round((zoom - 1) / 0.5);

  // Trigger bounce animation when zoom changes
  useEffect(() => {
    if (prevZoomRef.current !== zoom) {
      setIsAnimating(true);
      prevZoomRef.current = zoom;
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [zoom]);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2',
        isAnimating && 'animate-bounce-subtle',
      )}
      aria-label={`Zoom level: ${Math.round(zoom * 100)}%`}
    >
      {Array.from({ length: totalDots }, (_, i) => (
        <div
          key={i}
          className={cn(
            'size-3 rounded-full transition-all duration-200',
            i < filledDots ? 'bg-crayon-orange scale-125' : 'bg-gray-300',
            // Extra pop for the most recently filled dot
            isAnimating && i === filledDots - 1 && 'scale-150',
          )}
        />
      ))}
    </div>
  );
};

const ZOOM_STEP = 0.5;

const ZoomControls = ({ className }: ZoomControlsProps) => {
  const { zoom, setZoom, resetView, minZoom, maxZoom } = useColoringContext();
  const { playSound } = useSound();

  const handleZoomIn = () => {
    const newZoom = Math.min(maxZoom, zoom + ZOOM_STEP);
    setZoom(newZoom);
    playSound('pop');
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(minZoom, zoom - ZOOM_STEP);
    setZoom(newZoom);
    playSound('pop');
  };

  const handleResetView = () => {
    resetView();
    playSound('pop');
  };

  const isAtMinZoom = zoom <= minZoom;
  const isAtMaxZoom = zoom >= maxZoom;
  const isAtDefaultView = zoom === 1;
  const isZoomed = zoom > 1;

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 rounded-lg bg-white/90 backdrop-blur-sm transition-colors duration-200',
        isZoomed && 'ring-2 ring-crayon-orange/30',
        className,
      )}
    >
      {/* Zoom Out */}
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={isAtMinZoom}
        className={cn(
          'flex items-center justify-center size-10 sm:size-12 rounded-lg transition-all duration-150',
          'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
          {
            'opacity-50 cursor-not-allowed hover:bg-transparent': isAtMinZoom,
          },
        )}
        aria-label="Zoom out (see more)"
        title="Zoom out"
      >
        <ZoomOutIcon className="size-5 sm:size-6" />
      </button>

      {/* Visual Zoom Level Indicator */}
      <ZoomIndicator zoom={zoom} maxZoom={maxZoom} />

      {/* Zoom In */}
      <button
        type="button"
        onClick={handleZoomIn}
        disabled={isAtMaxZoom}
        className={cn(
          'flex items-center justify-center size-10 sm:size-12 rounded-lg transition-all duration-150',
          'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
          {
            'opacity-50 cursor-not-allowed hover:bg-transparent': isAtMaxZoom,
          },
        )}
        aria-label="Zoom in (see closer)"
        title="Zoom in"
      >
        <ZoomInIcon className="size-5 sm:size-6" />
      </button>

      {/* Reset View - only show when zoomed */}
      {isZoomed && (
        <button
          type="button"
          onClick={handleResetView}
          disabled={isAtDefaultView}
          className={cn(
            'flex items-center justify-center size-10 sm:size-12 rounded-lg transition-all duration-150',
            'bg-crayon-orange/10 hover:bg-crayon-orange/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
          )}
          aria-label="Go back to full picture"
          title="See whole picture"
        >
          <HomeIcon className="size-5 sm:size-6 text-crayon-orange" />
        </button>
      )}
    </div>
  );
};

export default ZoomControls;
