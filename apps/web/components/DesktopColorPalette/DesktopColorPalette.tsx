'use client';

import { ALL_COLORING_COLORS, TRACKING_EVENTS } from '@/constants';
import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';

type DesktopColorPaletteProps = {
  className?: string;
};

/**
 * Desktop-only vertical color palette for sidebar layout
 * Displays colors in a 4-column grid optimized for sidebar width
 */
const DesktopColorPalette = ({ className }: DesktopColorPaletteProps) => {
  const t = useTranslations('coloringPage');
  const { selectedColor, setSelectedColor, activeTool } = useColoringContext();
  const { playSound } = useSound();

  // Disable palette when magic tools are active (they use AI-assigned colors)
  const isMagicToolActive =
    activeTool === 'magic-reveal' || activeTool === 'magic-auto';

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-paper-cream-dark shadow-lg',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <FontAwesomeIcon
          icon={faPalette}
          className="size-5 text-crayon-orange"
        />
        <h3 className="font-tondo font-bold text-sm text-text-primary">
          {t('sidebar.colors')}
        </h3>
      </div>

      {/* Color Grid - 4 columns for sidebar width */}
      {/* Math: 4×32px buttons + 3×6px gaps = 146px, fits in 180px - 32px padding = 148px */}
      <div
        className={cn(
          'grid grid-cols-4 gap-1.5',
          'transition-opacity duration-200',
          isMagicToolActive && 'opacity-40 pointer-events-none',
        )}
        aria-disabled={isMagicToolActive}
        title={isMagicToolActive ? t('colorPalette.magicToolsMessage') : undefined}
      >
        {ALL_COLORING_COLORS.map((color, index) => {
          const isSelected = selectedColor === color.hex;
          const isWhite = color.hex === '#FFFFFF';

          return (
            <button
              type="button"
              className={cn(
                'size-8 rounded-full shadow-md transition-all duration-150 ease-out',
                'hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crayon-orange',
                {
                  'ring-2 ring-offset-2 ring-gray-800 scale-110':
                    isSelected && !isMagicToolActive,
                  'border border-gray-300': isWhite,
                },
              )}
              style={{
                backgroundColor: color.hex,
              }}
              onClick={() => {
                if (isMagicToolActive) return;
                trackEvent(TRACKING_EVENTS.PAGE_COLOR_SELECTED, {
                  color: color.hex,
                  colorName: color.name,
                  colorIndex: index,
                });
                setSelectedColor(color.hex);
                playSound('tap');
              }}
              disabled={isMagicToolActive}
              aria-label={t('colorPalette.selectColor', { color: color.name })}
              title={
                isMagicToolActive
                  ? t('colorPalette.magicToolsMessage')
                  : color.name
              }
              key={color.hex}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DesktopColorPalette;
