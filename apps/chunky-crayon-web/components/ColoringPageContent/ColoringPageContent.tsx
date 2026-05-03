'use client';

import { useRef, useCallback, useEffect } from 'react';
import { ColoringImage } from '@one-colored-pixel/db/types';
import { useTranslations } from 'next-intl';
import ColoringArea, {
  ColoringAreaHandle,
} from '@/components/ColoringArea/ColoringArea';
import ProgressIndicator from '@/components/ProgressIndicator';
import { MuteToggle } from '@one-colored-pixel/coloring-ui';
import { DesktopColorPalette } from '@one-colored-pixel/coloring-ui';
import {
  DesktopToolsSidebar,
  type DesktopToolsSidebarLabels,
} from '@one-colored-pixel/coloring-ui';
import StartOverButton from '@/components/buttons/StartOverButton/StartOverButton';
import SaveButton from '@/components/buttons/SaveButton';
import PrintButton from '@/components/buttons/PrintButton';
import ShareButton from '@/components/buttons/ShareButton/ShareButton';
import SaveToGalleryButton from '@/components/buttons/SaveToGalleryButton/SaveToGalleryButton';
import { trackViewContent } from '@/utils/pixels';

type ColoringPageContentProps = {
  coloringImage: Partial<ColoringImage>;
  isAuthenticated: boolean;
  title: string;
};

const ColoringPageContent = ({
  coloringImage,
  isAuthenticated,
  title,
}: ColoringPageContentProps) => {
  const t = useTranslations('coloringPage');
  const sidebarLabels: DesktopToolsSidebarLabels = {
    crayon: t('brushTypes.crayon'),
    marker: t('brushTypes.marker'),
    glitter: t('brushTypes.glitter'),
    eraser: t('brushTypes.eraser'),
    fill: t('tools.fill'),
    sticker: t('tools.sticker'),
    'magic-reveal': t('tools.magicBrush'),
    'magic-auto': t('tools.autoColor'),
    undo: t('undoRedo.undo'),
    redo: t('undoRedo.redo'),
    zoomIn: t('zoomControls.zoomIn'),
    zoomOut: t('zoomControls.zoomOut'),
    pan: t('zoomControls.pan'),
    resetView: t('zoomControls.reset'),
  };
  console.log('[ColoringPageContent] Received coloringImage:', {
    id: coloringImage?.id,
    title: coloringImage?.title,
    backgroundMusicUrl: coloringImage?.backgroundMusicUrl,
    hasBackgroundMusicUrl: !!coloringImage?.backgroundMusicUrl,
  });

  useEffect(() => {
    trackViewContent({
      contentType: 'coloring_page',
      contentId: coloringImage.id,
      contentName: coloringImage.title || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const coloringAreaRef = useRef<ColoringAreaHandle>(null);

  const getCanvas = useCallback(() => {
    return coloringAreaRef.current?.getCanvas() || null;
  }, []);

  const getBoundaryCanvas = useCallback(() => {
    return coloringAreaRef.current?.getBoundaryCanvas() || null;
  }, []);

  const getCanvasDataUrl = useCallback(() => {
    return coloringAreaRef.current?.getCanvasDataUrl() || null;
  }, []);

  // Handlers that forward to ColoringArea ref methods
  // These must be callbacks to work with ref that's populated after mount
  const handleUndo = useCallback(
    (...args: Parameters<NonNullable<ColoringAreaHandle['handleUndo']>>) => {
      coloringAreaRef.current?.handleUndo(...args);
    },
    [],
  );

  const handleRedo = useCallback(
    (...args: Parameters<NonNullable<ColoringAreaHandle['handleRedo']>>) => {
      coloringAreaRef.current?.handleRedo(...args);
    },
    [],
  );

  const handleStartOver = useCallback(() => {
    coloringAreaRef.current?.handleStartOver();
  }, []);

  const handleStickerToolSelect = useCallback(() => {
    coloringAreaRef.current?.openStickerSelector();
  }, []);

  return (
    // Container query context for responsive layout
    <div className="flex flex-col gap-y-4 @container">
      {/* Title with progress/mute underneath on desktop */}
      <div className="flex flex-col items-center gap-2 max-w-3xl xl:max-w-none w-full mx-auto xl:px-4">
        {/* Hidden on mobile to maximise canvas real estate — the title is
         * already present via the breadcrumb and browser tab. */}
        <h1 className="hidden md:block font-tondo font-bold text-2xl md:text-3xl text-text-primary text-center">
          {title}
        </h1>
        {/* Desktop only: Progress bar stretches, mute on right */}
        {/* Hidden on xl+ where sidebars are visible */}
        <div className="hidden md:flex xl:hidden items-center gap-4 w-full">
          <ProgressIndicator
            getCanvas={getCanvas}
            getBoundaryCanvas={getBoundaryCanvas}
            className="flex-1"
          />
          <MuteToggle />
        </div>
      </div>

      {/* Three-panel layout for xl+, single column for smaller screens */}
      {/* Uses container queries to scale with available space */}
      <div className="flex justify-center xl:justify-between items-start gap-4 xl:gap-6 @[1400px]:gap-8">
        {/* Left Sidebar - Color Palette (xl+ only) */}
        {/* Scales wider on larger containers */}
        {/* top-24 (96px) accounts for header height + padding */}
        <div className="hidden xl:block shrink-0 sticky top-24 self-start">
          <DesktopColorPalette className="w-[180px] @[1400px]:w-[200px] @[1600px]:w-[220px]" />
        </div>

        {/* Center - Canvas Area */}
        {/* Grows to fill available space with max-width cap */}
        <div className="max-w-3xl w-full flex-1 xl:max-w-none xl:min-w-[600px]">
          {/* Progress bar for xl+ - above canvas */}
          <div className="hidden xl:flex items-center gap-4 mb-3">
            <ProgressIndicator
              getCanvas={getCanvas}
              getBoundaryCanvas={getBoundaryCanvas}
              className="flex-1"
            />
            <MuteToggle />
          </div>

          {/* Coloring Area - clean white card matching gallery aesthetic */}
          <div className="bg-white rounded-2xl border-2 border-paper-cream-dark p-4 md:p-6 @[1600px]:p-8 shadow-sm">
            <ColoringArea
              ref={coloringAreaRef}
              coloringImage={coloringImage}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>

        {/* Right Sidebar - Tools (xl+ only) */}
        {/* Scales wider on larger containers */}
        {/* top-24 (96px) accounts for header height + padding */}
        <div className="hidden xl:block shrink-0 sticky top-24 self-start">
          <DesktopToolsSidebar
            onUndo={handleUndo}
            onRedo={handleRedo}
            onStickerToolSelect={handleStickerToolSelect}
            labels={sidebarLabels}
            actions={
              <>
                <StartOverButton onStartOver={handleStartOver} />
                <PrintButton
                  coloringImage={coloringImage}
                  getCanvasDataUrl={getCanvasDataUrl}
                />
                <SaveButton
                  coloringImage={coloringImage}
                  getCanvasDataUrl={getCanvasDataUrl}
                />
                <ShareButton
                  url={
                    typeof window !== 'undefined' ? window.location.href : ''
                  }
                  title={coloringImage?.title || 'Coloring Page'}
                  description={`Color this ${coloringImage?.title || 'fun coloring page'} on Chunky Crayon!`}
                  imageUrl={coloringImage?.url || undefined}
                  getCanvasDataUrl={getCanvasDataUrl}
                />
                {isAuthenticated && coloringImage?.id && (
                  <SaveToGalleryButton
                    coloringImageId={coloringImage.id}
                    getCanvasDataUrl={getCanvasDataUrl}
                  />
                )}
              </>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default ColoringPageContent;
