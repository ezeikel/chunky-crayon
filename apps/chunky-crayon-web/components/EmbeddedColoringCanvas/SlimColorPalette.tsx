'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaintbrushPencil,
  faEraser,
  faWandMagicSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import { useColoringContext } from '@one-colored-pixel/coloring-ui';
import type { BrushSize } from '@one-colored-pixel/coloring-ui';
import { COLORING_PALETTE, TRACKING_EVENTS } from '@/constants';
import { useAnalytics } from '@/utils/analytics-client';
import cn from '@/utils/cn';

// Slim palette for the /start landing page canvas. Deliberately stripped
// down vs DesktopColorPalette / DesktopToolsSidebar — no variant picker,
// no expanded swatches, no zoom/save/share/sticker controls. Just enough
// to let a paid-ad visitor try the product without overwhelming the
// marketing page above + below.
//
// Visible on both desktop and mobile (no `hidden md:flex`). We
// previously rendered coloring-ui's full MobileColoringDrawer for
// mobile but it expanded into a giant bottom sheet (sticker tray,
// magic-auto, undo, fill patterns) that dominated the viewport.
// Compact-everywhere is friendlier on a marketing landing.

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
  /** utm_campaign — forwarded to engagement events for attribution. */
  campaign: string;
  /**
   * Optional button rendered at the end of the tools row (e.g. the
   * Save / Download PDF button). Aligning it inline with the tools
   * keeps the action group visually unified — matches the real
   * coloring page's sidebar where save sits in the same grid as tools.
   */
  trailingAction?: React.ReactNode;
  className?: string;
};

const SlimColorPalette = ({
  magicAvailable,
  campaign,
  trailingAction,
  className,
}: SlimColorPaletteProps) => {
  const { track } = useAnalytics();
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
    if (id === selectedSlimTool) return; // no-op when re-selecting current
    track(TRACKING_EVENTS.START_HERO_TOOL_CHANGED, {
      campaign,
      from: selectedSlimTool,
      to: id,
    });
    if (id === 'magic-reveal') {
      setActiveTool('magic-reveal');
      return;
    }
    setActiveTool('brush');
    setBrushType(id === 'eraser' ? 'eraser' : 'crayon');
  };

  return (
    <div className={cn('flex flex-col gap-3 items-center w-full', className)}>
      {/* Tools row + trailing action (save button) inline.
          64×64 with rounded-coloring-card (24px radius = 37.5%) → reads
          as a squircle. CC's brand radius-coloring-button is 24px which
          on smaller (48px) buttons makes them look like full circles —
          we use 64px here to match the real /coloring-image/[id]
          MobileColoringDrawer tile look. Save button is paired with
          ActionButtonSizeProvider value="tile" (64px) by the parent so
          the whole row aligns column-for-column. */}
      <div className="flex gap-2 items-center">
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
              title={tool.label}
              aria-pressed={isActive}
              className={cn(
                'flex items-center justify-center w-16 h-16 rounded-coloring-card border-2 transition-all',
                isActive
                  ? 'bg-crayon-orange text-white border-crayon-orange shadow-md'
                  : 'bg-white text-text-secondary border-paper-cream-dark hover:border-crayon-orange/50',
                disabled &&
                  'opacity-40 cursor-not-allowed hover:border-paper-cream-dark',
              )}
            >
              <FontAwesomeIcon icon={tool.icon} className="text-xl" />
            </button>
          );
        })}
        {trailingAction}
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
                if (selectedColor !== color.hex) {
                  track(TRACKING_EVENTS.START_HERO_COLOR_PICKED, {
                    campaign,
                    color: color.hex,
                    colorName: color.name,
                  });
                }
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

      {/* Brush sizes — round to match the dot inside, mirrors the
          /coloring-image/[id] brush-size selector. */}
      <div className="flex gap-2 items-center">
        {BRUSH_SIZES.map(({ size, px }) => {
          const isActive = brushSize === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => setBrushSize(size)}
              aria-label={`${size} brush`}
              title={`${size} brush`}
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
