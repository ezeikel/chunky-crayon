'use client';

import { ALL_COLORING_COLORS, TRACKING_EVENTS } from '@/constants';
import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';

type ColorStripProps = {
  className?: string;
};

/**
 * Horizontal scrollable color strip for mobile - compact single row of colors
 * Optimized for thumb-friendly selection on smaller screens
 * Features gradient fade indicators to show more colors are available
 */
const ColorStrip = ({ className }: ColorStripProps) => {
  const { selectedColor, setSelectedColor } = useColoringContext();
  const { playSound } = useSound();

  return (
    <div className={cn('relative', className)}>
      {/* Gradient fade on right edge to indicate more colors */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 rounded-r-lg" />

      {/* Scrollable color container */}
      <div
        className={cn(
          'flex gap-2 p-2 overflow-x-auto scrollbar-hide bg-white/95 backdrop-blur-sm rounded-lg',
          // Custom scrollbar hiding for all browsers
          '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        )}
      >
        {ALL_COLORING_COLORS.map((color, index) => {
          const isSelected = selectedColor === color.hex;
          const isWhite = color.hex === '#FFFFFF';

          return (
            <button
              type="button"
              className={cn(
                // Large touch targets for young children - minimum 44px
                'size-11 min-w-11 rounded-full shadow-md transition-all duration-150 ease-out flex-shrink-0',
                'active:scale-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-crayon-orange',
                {
                  'ring-2 ring-offset-1 ring-gray-800 scale-105': isSelected,
                  'border border-gray-300': isWhite,
                },
              )}
              style={{
                backgroundColor: color.hex,
              }}
              onClick={() => {
                trackEvent(TRACKING_EVENTS.PAGE_COLOR_SELECTED, {
                  color: color.hex,
                  colorName: color.name,
                  colorIndex: index,
                });
                setSelectedColor(color.hex);
                playSound('tap');
              }}
              aria-label={`Select ${color.name} color`}
              title={color.name}
              key={color.hex}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ColorStrip;
