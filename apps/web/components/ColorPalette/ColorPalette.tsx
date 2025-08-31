'use client';

import { COLORS, ANALYTICS_EVENTS } from '@/constants';
import { useColoringContext } from '@/contexts/coloring';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics';

type ColorPaletteProps = {
  className?: string;
};

const ColorPalette = ({ className }: ColorPaletteProps) => {
  const { selectedColor, setSelectedColor } = useColoringContext();

  return (
    <div
      className={cn('flex flex-wrap gap-2 p-4 rounded-lg shadow-lg bg-white', {
        [className as string]: !!className,
      })}
    >
      {COLORS.map((color) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="size-8 cursor-pointer rounded-full shadow-lg"
          style={{
            backgroundColor: color,
            border: selectedColor === color ? '2px solid black' : 'none',
          }}
          onClick={() => {
            trackEvent(ANALYTICS_EVENTS.COLOR_SELECTED, { color });
            setSelectedColor(color);
          }}
          key={color}
        />
      ))}
    </div>
  );
};

export default ColorPalette;
