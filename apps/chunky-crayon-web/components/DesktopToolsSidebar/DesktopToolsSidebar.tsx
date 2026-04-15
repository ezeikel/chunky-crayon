'use client';

import { ColoringImage } from '@one-colored-pixel/db/types';
import {
  useColoringContext,
  CanvasAction,
  type PaletteVariant,
} from '@one-colored-pixel/coloring-ui';
import { useSound } from '@one-colored-pixel/coloring-ui';
import cn from '@/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import {
  faPencil,
  faPaintbrush,
  faPenNib,
  faPaintRoller,
  faFillDrip,
  faEraser,
  faSparkles,
  faWandSparkles,
  faRainbow,
  faSun,
  faBoltLightning,
  faStar,
  faBrush,
  faHand,
} from '@fortawesome/pro-duotone-svg-icons';
import { BRUSH_SIZES, BrushSize } from '@/constants';
import StartOverButton from '@/components/buttons/StartOverButton/StartOverButton';
import DownloadPDFButton from '@/components/buttons/DownloadPDFButton/DownloadPDFButton';
import ShareButton from '@/components/buttons/ShareButton/ShareButton';
import SaveToGalleryButton from '@/components/buttons/SaveToGalleryButton/SaveToGalleryButton';

type DesktopToolsSidebarProps = {
  className?: string;
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
  onStickerToolSelect?: () => void;
  onStartOver?: () => void;
  coloringImage?: Partial<ColoringImage>;
  getCanvasDataUrl?: () => string | null;
  isAuthenticated?: boolean;
};

type ToolConfig = {
  id:
    | 'crayon'
    | 'marker'
    | 'pencil'
    | 'paintbrush'
    | 'glitter'
    | 'sparkle'
    | 'rainbow'
    | 'glow'
    | 'neon'
    | 'fill'
    | 'eraser'
    | 'sticker'
    | 'magic-reveal'
    | 'magic-auto';
  label: string;
  icon: typeof faPencil;
  isMagic?: boolean;
};

// Regular tools shown as icon-only grid
// Core tools only — sparkle, rainbow, glow, neon removed because they
// don't map to real-world tools kids understand and the implementations
// are confusing (garish rainbow, particle effects, unclear glow/neon).
// Glitter kept but needs a fix to use selected colour not random rainbow.
const regularTools: ToolConfig[] = [
  { id: 'crayon', label: 'Crayon', icon: faPencil },
  { id: 'marker', label: 'Marker', icon: faPaintbrush },
  { id: 'pencil', label: 'Pencil', icon: faPenNib },
  { id: 'paintbrush', label: 'Paint', icon: faPaintRoller },
  { id: 'glitter', label: 'Glitter', icon: faSparkles },
  { id: 'fill', label: 'Fill', icon: faFillDrip },
  { id: 'eraser', label: 'Eraser', icon: faEraser },
  { id: 'sticker', label: 'Sticker', icon: faStar },
];

// Magic tools shown with labels (special featured tools)
const magicTools: ToolConfig[] = [
  { id: 'magic-reveal', label: 'Magic Brush', icon: faBrush, isMagic: true },
  { id: 'magic-auto', label: 'Auto Color', icon: faFillDrip, isMagic: true },
];

// Undo/Redo SVG icons
const UndoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const RedoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
  </svg>
);

// Zoom icons
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

/**
 * Desktop-only vertical tools sidebar for right panel layout
 * Contains: Tools, Brush Size, Undo/Redo, Zoom Controls
 */
const DesktopToolsSidebar = ({
  className,
  onUndo,
  onRedo,
  onStickerToolSelect,
  onStartOver,
  coloringImage,
  getCanvasDataUrl,
  isAuthenticated = false,
}: DesktopToolsSidebarProps) => {
  const t = useTranslations('coloringPage');
  const {
    activeTool,
    setActiveTool,
    brushType,
    setBrushType,
    brushSize,
    setBrushSize,
    selectedColor,
    canUndo,
    canRedo,
    undo,
    redo,
    zoom,
    setZoom,
    resetView,
    minZoom,
    maxZoom,
    isAutoColoring,
    hasAutoColored,
  } = useColoringContext();
  const { playSound } = useSound();

  // Tool selection handler
  const handleToolSelect = (toolId: ToolConfig['id']) => {
    switch (toolId) {
      case 'crayon':
        setActiveTool('brush');
        setBrushType('crayon');
        break;
      case 'marker':
        setActiveTool('brush');
        setBrushType('marker');
        break;
      case 'pencil':
        setActiveTool('brush');
        setBrushType('pencil');
        break;
      case 'paintbrush':
        setActiveTool('brush');
        setBrushType('paintbrush');
        break;
      case 'glitter':
        setActiveTool('brush');
        setBrushType('glitter');
        break;
      case 'sparkle':
        setActiveTool('brush');
        setBrushType('sparkle');
        break;
      case 'rainbow':
        setActiveTool('brush');
        setBrushType('rainbow');
        break;
      case 'glow':
        setActiveTool('brush');
        setBrushType('glow');
        break;
      case 'neon':
        setActiveTool('brush');
        setBrushType('neon');
        break;
      case 'eraser':
        setActiveTool('brush');
        setBrushType('eraser');
        break;
      case 'fill':
        setActiveTool('fill');
        break;
      case 'sticker':
        setActiveTool('sticker');
        onStickerToolSelect?.();
        break;
      case 'magic-reveal':
        setActiveTool('magic-reveal');
        break;
      case 'magic-auto':
        setActiveTool('magic-auto');
        break;
    }
    playSound('pop');
  };

  const isToolActive = (toolId: ToolConfig['id']) => {
    if (toolId === 'fill') return activeTool === 'fill';
    if (toolId === 'sticker') return activeTool === 'sticker';
    if (toolId === 'magic-reveal') return activeTool === 'magic-reveal';
    if (toolId === 'magic-auto') return activeTool === 'magic-auto';
    return activeTool === 'brush' && brushType === toolId;
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    const action = undo();
    if (action && onUndo) onUndo(action);
  };

  const handleRedo = () => {
    const action = redo();
    if (action && onRedo) onRedo(action);
  };

  // Zoom handlers
  const ZOOM_STEP = 0.5;
  const handleZoomIn = () => {
    setZoom(Math.min(maxZoom, zoom + ZOOM_STEP));
    playSound('pop');
  };

  const handleZoomOut = () => {
    setZoom(Math.max(minZoom, zoom - ZOOM_STEP));
    playSound('pop');
  };

  const handleResetView = () => {
    resetView();
    playSound('pop');
  };

  const handlePanToggle = () => {
    if (activeTool === 'pan') {
      setActiveTool('brush');
    } else {
      setActiveTool('pan');
    }
    playSound('pop');
  };

  const isZoomed = zoom > 1;
  const isPanActive = activeTool === 'pan';

  // Brush sizes
  const sizes = Object.entries(BRUSH_SIZES) as [
    BrushSize,
    (typeof BRUSH_SIZES)[BrushSize],
  ][];

  return (
    <div
      className={cn(
        'w-fit flex flex-col gap-4 p-4 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-paper-cream-dark shadow-lg',
        className,
      )}
    >
      {/* Tools Section — header omitted; brush/fill/eraser icons speak for themselves. */}
      <div className="flex flex-col gap-2">
        {/* Regular Tool Grid - 3 columns, 64px each */}
        <div className="grid grid-cols-3 gap-3 w-fit">
          {regularTools.map(({ id, icon }) => {
            const isActive = isToolActive(id);
            const translationKey =
              id === 'fill' || id === 'sticker'
                ? `tools.${id}`
                : `brushTypes.${id}`;
            const label = t(translationKey);

            return (
              <button
                type="button"
                key={id}
                onClick={() => handleToolSelect(id)}
                className={cn(
                  'flex items-center justify-center size-16 rounded-coloring-card transition-all duration-coloring-base ease-coloring',
                  'active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                  isActive
                    ? 'bg-crayon-orange text-white hover:bg-crayon-orange/90 shadow-sm'
                    : 'bg-white border border-paper-cream-dark text-text-primary hover:bg-paper-cream',
                )}
                aria-label={label}
                title={label}
                aria-pressed={isActive}
                data-testid={`tool-${id}`}
              >
                <FontAwesomeIcon icon={icon} size="xl" />
              </button>
            );
          })}
        </div>

        {/* Magic Tools - 2-up icon-only tiles with sparkle marker */}
        <div className="grid grid-cols-2 gap-3 w-fit mt-1">
          {magicTools.map(({ id, icon }) => {
            const isActive = isToolActive(id);
            const isAutoColorBtn = id === 'magic-auto';
            const showSpinner = isAutoColorBtn && isAutoColoring;
            const isAutoColorDone = isAutoColorBtn && hasAutoColored;
            const translationKey =
              id === 'magic-reveal' ? 'tools.magicBrush' : 'tools.autoColor';
            const label = t(translationKey);

            return (
              <button
                type="button"
                key={id}
                onClick={() => handleToolSelect(id)}
                disabled={showSpinner || isAutoColorDone}
                className={cn(
                  'relative flex items-center justify-center size-16 rounded-coloring-card transition-all duration-coloring-base ease-coloring',
                  'active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-purple',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  isActive || showSpinner
                    ? 'bg-gradient-to-br from-crayon-purple to-crayon-pink text-white'
                    : isAutoColorDone
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gradient-to-br from-crayon-purple/10 to-crayon-pink/10 text-crayon-purple hover:from-crayon-purple/20 hover:to-crayon-pink/20',
                )}
                aria-label={
                  showSpinner
                    ? 'Coloring…'
                    : isAutoColorDone
                      ? 'Auto colored'
                      : label
                }
                title={
                  showSpinner
                    ? 'Coloring…'
                    : isAutoColorDone
                      ? 'Auto colored'
                      : label
                }
                aria-pressed={isActive}
                data-testid={`tool-${id}`}
              >
                {showSpinner ? (
                  <div className="size-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={icon} size="xl" />
                )}
                {!showSpinner && !isAutoColorDone && (
                  <FontAwesomeIcon
                    icon={faSparkles}
                    size="lg"
                    aria-hidden
                    className={cn(
                      'absolute -top-2 -right-2 drop-shadow-sm',
                      isActive ? 'text-white' : 'text-crayon-purple',
                    )}
                  />
                )}
              </button>
            );
          })}

          {/* Palette variant switcher moved to the colours panel — it now
           * controls both the manual swatches and the magic-tool palette. */}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-paper-cream-dark" />

      {/* Brush Size Section — header omitted; the row of size dots reads as size on its own. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          {sizes.map(([size, config]) => {
            const isSelected = brushSize === size;
            const displayColor =
              brushType === 'eraser' ? '#9E9E9E' : selectedColor;
            const sizeLabel = t(`brushSizes.${size}`);

            return (
              <button
                type="button"
                key={size}
                onClick={() => {
                  setBrushSize(size);
                  playSound('tap');
                }}
                className={cn(
                  'flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150',
                  'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                  {
                    'bg-gray-200 ring-2 ring-gray-400': isSelected,
                  },
                )}
                aria-label={sizeLabel}
                title={sizeLabel}
                data-testid={`brush-size-${size}`}
              >
                <span
                  className="rounded-full transition-colors"
                  style={{
                    width: `${Math.min(config.radius * 2, 32)}px`,
                    height: `${Math.min(config.radius * 2, 32)}px`,
                    backgroundColor: displayColor,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-paper-cream-dark" />

      {/* Undo/Redo Section — header omitted; the ↶ ↷ icons are universal. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className={cn(
              'flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'hover:bg-gray-100 active:scale-95 text-gray-700': canUndo,
                'text-gray-300 cursor-not-allowed': !canUndo,
              },
            )}
            aria-label={t('undoRedo.undo')}
            title={t('undoRedo.undo')}
          >
            <UndoIcon className="size-8" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className={cn(
              'flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'hover:bg-gray-100 active:scale-95 text-gray-700': canRedo,
                'text-gray-300 cursor-not-allowed': !canRedo,
              },
            )}
            aria-label={t('undoRedo.redo')}
            title={t('undoRedo.redo')}
          >
            <RedoIcon className="size-8" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-paper-cream-dark" />

      {/* Zoom Section — header omitted; +/- magnifier icons are universal. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= minZoom}
            className={cn(
              'flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150',
              'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'opacity-50 cursor-not-allowed hover:bg-transparent':
                  zoom <= minZoom,
              },
            )}
            aria-label={t('zoomControls.zoomOut')}
            title={t('zoomControls.zoomOut')}
          >
            <ZoomOutIcon className="size-7" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
            className={cn(
              'flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150',
              'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'opacity-50 cursor-not-allowed hover:bg-transparent':
                  zoom >= maxZoom,
              },
            )}
            aria-label={t('zoomControls.zoomIn')}
            title={t('zoomControls.zoomIn')}
          >
            <ZoomInIcon className="size-7" />
          </button>

          {isZoomed && (
            <>
              <button
                type="button"
                onClick={handlePanToggle}
                className={cn(
                  'flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150',
                  'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                  isPanActive &&
                    'bg-crayon-orange text-white hover:bg-crayon-orange/90',
                )}
                aria-label={t('zoomControls.pan')}
                title={t('zoomControls.pan')}
                aria-pressed={isPanActive}
              >
                <FontAwesomeIcon icon={faHand} size="lg" />
              </button>

              <button
                type="button"
                onClick={handleResetView}
                className={cn(
                  'flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150',
                  'bg-crayon-orange/10 hover:bg-crayon-orange/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                )}
                aria-label={t('zoomControls.reset')}
                title={t('zoomControls.reset')}
              >
                <HomeIcon className="size-7 text-crayon-orange" />
              </button>
            </>
          )}
        </div>

        {/* Zoom level indicator */}
        <div className="text-center font-tondo font-bold text-xl text-text-primary tabular-nums">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-paper-cream-dark" />

      {/* Actions Section */}
      <div className="flex flex-col gap-3">
        {/* Icon-only tile row — distribute across the same width as the 4-tool grid above. */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          {onStartOver && <StartOverButton onStartOver={onStartOver} />}
          {coloringImage && (
            <DownloadPDFButton
              coloringImage={coloringImage}
              getCanvasDataUrl={getCanvasDataUrl}
            />
          )}
          <ShareButton
            url={typeof window !== 'undefined' ? window.location.href : ''}
            title={coloringImage?.title || 'Coloring Page'}
            description={`Color this ${coloringImage?.title || 'fun coloring page'} on Chunky Crayon!`}
            imageUrl={coloringImage?.url || undefined}
            getCanvasDataUrl={getCanvasDataUrl}
          />
          {isAuthenticated && coloringImage?.id && (
            <SaveToGalleryButton
              coloringImageId={coloringImage.id}
              getCanvasDataUrl={getCanvasDataUrl!}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopToolsSidebar;
