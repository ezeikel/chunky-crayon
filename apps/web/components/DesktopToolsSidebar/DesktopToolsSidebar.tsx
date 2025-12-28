'use client';

import { ColoringImage } from '@chunky-crayon/db/types';
import { useColoringContext, CanvasAction } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useTranslations } from 'next-intl';
import {
  faPencil,
  faPaintbrush,
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
  faToolbox,
  faRuler,
  faClockRotateLeft,
  faMagnifyingGlass,
  faRocketLaunch,
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
const regularTools: ToolConfig[] = [
  { id: 'crayon', label: 'Crayon', icon: faPencil },
  { id: 'marker', label: 'Marker', icon: faPaintbrush },
  { id: 'glitter', label: 'Glitter', icon: faSparkles },
  { id: 'sparkle', label: 'Sparkle', icon: faWandSparkles },
  { id: 'rainbow', label: 'Rainbow', icon: faRainbow },
  { id: 'glow', label: 'Glow', icon: faSun },
  { id: 'neon', label: 'Neon', icon: faBoltLightning },
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
        'flex flex-col gap-4 p-4 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-paper-cream-dark shadow-lg',
        className,
      )}
    >
      {/* Tools Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faToolbox}
            className="size-5 text-crayon-orange"
          />
          <h3 className="font-tondo font-bold text-sm text-text-primary">
            {t('sidebar.tools')}
          </h3>
        </div>

        {/* Regular Tool Grid - 4 columns, icons only with tooltips */}
        <div className="grid grid-cols-4 gap-1.5">
          {regularTools.map(({ id, icon }) => {
            const isActive = isToolActive(id);
            // Get translation key based on tool ID
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
                  'flex items-center justify-center p-3 rounded-lg transition-all duration-150',
                  'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                  {
                    'bg-crayon-orange text-white hover:bg-crayon-orange/90':
                      isActive,
                  },
                )}
                aria-label={label}
                title={label}
                aria-pressed={isActive}
              >
                <FontAwesomeIcon icon={icon} className="size-6" />
              </button>
            );
          })}
        </div>

        {/* Magic Tools - Featured with labels and gradient background */}
        <div className="flex flex-col gap-1.5 mt-1">
          {magicTools.map(({ id, icon }) => {
            const isActive = isToolActive(id);
            // Get translation key based on tool ID
            const translationKey =
              id === 'magic-reveal' ? 'tools.magicBrush' : 'tools.autoColor';
            const label = t(translationKey);

            return (
              <button
                type="button"
                key={id}
                onClick={() => handleToolSelect(id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-150',
                  'hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-purple',
                  isActive
                    ? 'bg-gradient-to-r from-crayon-purple to-crayon-pink text-white shadow-md'
                    : 'bg-gradient-to-r from-crayon-purple/10 to-crayon-pink/10 text-crayon-purple hover:from-crayon-purple/20 hover:to-crayon-pink/20',
                )}
                aria-label={label}
                aria-pressed={isActive}
              >
                <FontAwesomeIcon icon={icon} className="size-5" />
                <span className="font-bold text-sm">{label}</span>
                <span className="ml-auto text-xs opacity-70">✨</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-paper-cream-dark" />

      {/* Brush Size Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faRuler}
            className="size-4 text-crayon-orange"
          />
          <h3 className="font-tondo font-bold text-sm text-text-primary">
            {t('sidebar.size')}
          </h3>
        </div>

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
                  'flex items-center justify-center size-10 rounded-lg transition-all duration-150',
                  'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                  {
                    'bg-gray-200 ring-2 ring-gray-400': isSelected,
                  },
                )}
                aria-label={sizeLabel}
                title={sizeLabel}
              >
                <span
                  className="rounded-full transition-colors"
                  style={{
                    width: `${Math.min(config.radius * 1.5, 24)}px`,
                    height: `${Math.min(config.radius * 1.5, 24)}px`,
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

      {/* Undo/Redo Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faClockRotateLeft}
            className="size-4 text-crayon-orange"
          />
          <h3 className="font-tondo font-bold text-sm text-text-primary">
            {t('sidebar.history')}
          </h3>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className={cn(
              'flex items-center justify-center size-10 rounded-lg transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'hover:bg-gray-100 active:scale-95 text-gray-700': canUndo,
                'text-gray-300 cursor-not-allowed': !canUndo,
              },
            )}
            aria-label={t('undoRedo.undo')}
            title={t('undoRedo.undo')}
          >
            <UndoIcon className="size-5" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className={cn(
              'flex items-center justify-center size-10 rounded-lg transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'hover:bg-gray-100 active:scale-95 text-gray-700': canRedo,
                'text-gray-300 cursor-not-allowed': !canRedo,
              },
            )}
            aria-label={t('undoRedo.redo')}
            title={t('undoRedo.redo')}
          >
            <RedoIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-paper-cream-dark" />

      {/* Zoom Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="size-4 text-crayon-orange"
          />
          <h3 className="font-tondo font-bold text-sm text-text-primary">
            {t('sidebar.zoom')}
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= minZoom}
            className={cn(
              'flex items-center justify-center size-9 rounded-lg transition-all duration-150',
              'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'opacity-50 cursor-not-allowed hover:bg-transparent':
                  zoom <= minZoom,
              },
            )}
            aria-label={t('zoomControls.zoomOut')}
            title={t('zoomControls.zoomOut')}
          >
            <ZoomOutIcon className="size-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
            className={cn(
              'flex items-center justify-center size-9 rounded-lg transition-all duration-150',
              'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
              {
                'opacity-50 cursor-not-allowed hover:bg-transparent':
                  zoom >= maxZoom,
              },
            )}
            aria-label={t('zoomControls.zoomIn')}
            title={t('zoomControls.zoomIn')}
          >
            <ZoomInIcon className="size-4" />
          </button>

          {isZoomed && (
            <>
              <button
                type="button"
                onClick={handlePanToggle}
                className={cn(
                  'flex items-center justify-center size-9 rounded-lg transition-all duration-150',
                  'hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                  isPanActive &&
                    'bg-crayon-orange text-white hover:bg-crayon-orange/90',
                )}
                aria-label={t('zoomControls.pan')}
                title={t('zoomControls.pan')}
                aria-pressed={isPanActive}
              >
                <FontAwesomeIcon icon={faHand} className="size-4" />
              </button>

              <button
                type="button"
                onClick={handleResetView}
                className={cn(
                  'flex items-center justify-center size-9 rounded-lg transition-all duration-150',
                  'bg-crayon-orange/10 hover:bg-crayon-orange/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-crayon-orange',
                )}
                aria-label={t('zoomControls.reset')}
                title={t('zoomControls.reset')}
              >
                <HomeIcon className="size-4 text-crayon-orange" />
              </button>
            </>
          )}
        </div>

        {/* Zoom level indicator */}
        <div className="text-center text-xs text-text-secondary">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-paper-cream-dark" />

      {/* Actions Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faRocketLaunch}
            className="size-4 text-crayon-orange"
          />
          <h3 className="font-tondo font-bold text-sm text-text-primary">
            {t('sidebar.actions')}
          </h3>
        </div>

        <div className="flex flex-col gap-2">
          {onStartOver && (
            <StartOverButton
              onStartOver={onStartOver}
              className="!size-auto !w-full !px-4 !py-3 !text-sm !gap-2"
            />
          )}
          {coloringImage && (
            <DownloadPDFButton
              coloringImage={coloringImage}
              getCanvasDataUrl={getCanvasDataUrl}
              className="!size-auto !w-full !px-4 !py-3 !text-sm !gap-2"
            />
          )}
          <ShareButton
            url={typeof window !== 'undefined' ? window.location.href : ''}
            title={coloringImage?.title || 'Coloring Page'}
            description={`Color this ${coloringImage?.title || 'fun coloring page'} on Chunky Crayon!`}
            imageUrl={coloringImage?.url || undefined}
            getCanvasDataUrl={getCanvasDataUrl}
            className="!size-auto !w-full !px-4 !py-3 !text-sm !gap-2"
          />
          {isAuthenticated && coloringImage?.id && (
            <SaveToGalleryButton
              coloringImageId={coloringImage.id}
              getCanvasDataUrl={getCanvasDataUrl!}
              className="!size-auto !w-full !px-4 !py-3 !text-sm !gap-2"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopToolsSidebar;
