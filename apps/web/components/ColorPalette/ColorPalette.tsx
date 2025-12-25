'use client';

import { ALL_COLORING_COLORS, TRACKING_EVENTS } from '@/constants';
import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';

type ColorPaletteProps = {
  className?: string;
};

const ColorPalette = ({ className }: ColorPaletteProps) => {
  const { selectedColor, setSelectedColor } = useColoringContext();
  const { playSound } = useSound();

  return (
    <div
      className={cn(
        'grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-lg bg-white/90 backdrop-blur-sm',
        className,
      )}
    >
      {ALL_COLORING_COLORS.map((color, index) => {
        const isSelected = selectedColor === color.hex;
        const isWhite = color.hex === '#FFFFFF';

        return (
          <button
            type="button"
            className={cn(
              'size-8 sm:size-10 rounded-full shadow-md transition-all duration-150 ease-out',
              'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crayon-orange',
              {
                'ring-2 ring-offset-2 ring-gray-800 scale-110': isSelected,
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
  );
};

export default ColorPalette;
