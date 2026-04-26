'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaintbrushPencil,
  faEraser,
  faWandMagicSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import { useColoringContext } from '@one-colored-pixel/coloring-ui';
import type { BrushSize } from '@one-colored-pixel/coloring-ui';
import { COLORING_PALETTE } from '@/constants';
import cn from '@/utils/cn';

// Slim palette for the /start landing page canvas. Deliberately stripped
// down vs DesktopColorPalette / DesktopToolsSidebar — no variant picker,
// no expanded swatches, no zoom/save/share/sticker controls. Just enough
// to let a paid-ad visitor try the product without overwhelming the
// marketing page above + below.
//
// Mobile users get the full MobileColoringDrawer instead (rendered
// conditionally by EmbeddedColoringCanvas based on viewport visibility);
// this palette is desktop-only via `hidden md:flex`.

const SWATCHES = COLORING_PALETTE.primary; // 8 high-saturation colors

// `eraser` is a `brushType`, not an `activeTool` — selecting it sets
// activeTool='brush' + brushType='eraser'. Magic reveal and crayon are
// distinct activeTool values. Encoded here so the click handler can
// flip both fields atomically.
type SlimTool =
  | { id: 'crayon'; label: string; icon: typeof faPaintbrushPencil }
  | { id: 'magic-reveal'; label: string; icon: typeof faWandMagicSparkles }
  | { id: 'eraser'; label: string; icon: typeof faEraser };

// FontAwesome Pro doesn't have a literal "crayon" icon. faPaintbrushPencil
// combines a paintbrush + pencil — closest semantic match to the chunky
// kid-friendly crayon tool we're labelling. (faPencil reads too pointy
// for a kids brand; faMarker visually clashes with the marker tool used
// elsewhere in the app.)
const TOOLS: SlimTool[] = [
  { id: 'crayon', label: 'Crayon', icon: faPaintbrushPencil },
  { id: 'magic-reveal', label: 'Magic', icon: faWandMagicSparkles },
  { id: 'eraser', label: 'Eraser', icon: faEraser },
];

const BRUSH_SIZES: Array<{ size: BrushSize; px: number }> = [
  { size: 'small', px: 8 },
  { size: 'medium', px: 14 },
  { size: 'large', px: 22 },
];

type SlimColorPaletteProps = {
  /** Whether the magic-reveal tool should be enabled (region store ready). */
  magicAvailable: boolean;
  className?: string;
};

const SlimColorPalette = ({
  magicAvailable,
  className,
}: SlimColorPaletteProps) => {
  const {
    selectedColor,
    setSelectedColor,
    activeTool,
    setActiveTool,
    brushType,
    setBrushType,
    brushSize,
    setBrushSize,
  } = useColoringContext();

  // Derive a single "selected slim tool" from the underlying activeTool
  // + brushType combo. This is what powers the highlighted button below.
  const selectedSlimTool: SlimTool['id'] =
    activeTool === 'magic-reveal'
      ? 'magic-reveal'
      : brushType === 'eraser'
        ? 'eraser'
        : 'crayon';

  const handleToolClick = (id: SlimTool['id']) => {
    if (id === 'magic-reveal') {
      setActiveTool('magic-reveal');
      return;
    }
    setActiveTool('brush');
    setBrushType(id === 'eraser' ? 'eraser' : 'crayon');
  };

  return (
    <div className={cn('flex flex-col gap-3 items-center w-full', className)}>
      {/* Tools row */}
      <div className="flex gap-2">
        {TOOLS.map((tool) => {
          const disabled = tool.id === 'magic-reveal' && !magicAvailable;
          const isActive = selectedSlimTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              disabled={disabled}
              onClick={() => handleToolClick(tool.id)}
              aria-label={tool.label}
              aria-pressed={isActive}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all',
                'font-rooney-sans text-xs font-bold',
                isActive
                  ? 'bg-crayon-orange text-white border-crayon-orange shadow-md'
                  : 'bg-white text-text-secondary border-paper-cream-dark hover:border-crayon-orange/50',
                disabled &&
                  'opacity-40 cursor-not-allowed hover:border-paper-cream-dark',
              )}
            >
              <FontAwesomeIcon icon={tool.icon} className="text-base" />
              {tool.label}
            </button>
          );
        })}
      </div>

      {/* Color swatches */}
      <div className="flex flex-wrap gap-2 justify-center">
        {SWATCHES.map((color) => {
          const isActive = selectedColor === color.hex;
          return (
            <button
              key={color.hex}
              type="button"
              onClick={() => {
                setSelectedColor(color.hex);
                // Picking a color implies they want to paint, not erase
                // or magic-reveal.
                if (brushType === 'eraser') setBrushType('crayon');
                if (activeTool === 'magic-reveal') setActiveTool('brush');
              }}
              aria-label={color.name}
              aria-pressed={isActive}
              className={cn(
                'w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 shadow-sm',
                isActive
                  ? 'border-text-primary ring-2 ring-crayon-orange ring-offset-2'
                  : 'border-white',
              )}
              style={{ backgroundColor: color.hex }}
            />
          );
        })}
      </div>

      {/* Brush sizes */}
      <div className="flex gap-2 items-center">
        {BRUSH_SIZES.map(({ size, px }) => {
          const isActive = brushSize === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => setBrushSize(size)}
              aria-label={`${size} brush`}
              aria-pressed={isActive}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all bg-white',
                isActive
                  ? 'border-crayon-orange shadow-md'
                  : 'border-paper-cream-dark hover:border-crayon-orange/50',
              )}
            >
              <span
                className="rounded-full bg-text-primary"
                style={{ width: px, height: px }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SlimColorPalette;
