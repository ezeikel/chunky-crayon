'use client';

import { useRef, useCallback, useState } from 'react';
import { ColoringImage } from '@chunky-crayon/db/types';
import ColoringArea, {
  ColoringAreaHandle,
} from '@/components/ColoringArea/ColoringArea';
import ProgressIndicator from '@/components/ProgressIndicator';
import MuteToggle from '@/components/MuteToggle';
import DesktopColorPalette from '@/components/DesktopColorPalette';
import DesktopToolsSidebar from '@/components/DesktopToolsSidebar';

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
  const coloringAreaRef = useRef<ColoringAreaHandle>(null);

  const getCanvas = () => {
    return coloringAreaRef.current?.getCanvas() || null;
  };

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
        <h1 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary text-center">
          {title}
        </h1>
        {/* Desktop only: Progress bar stretches, mute on right */}
        {/* Hidden on xl+ where sidebars are visible */}
        <div className="hidden md:flex xl:hidden items-center gap-4 w-full">
          <ProgressIndicator getCanvas={getCanvas} className="flex-1" />
          <MuteToggle />
        </div>
      </div>

      {/* Three-panel layout for xl+, single column for smaller screens */}
      {/* Uses container queries to scale with available space */}
      <div className="flex justify-center gap-4 xl:gap-6 @[1400px]:gap-8 xl:px-4">
        {/* Left Sidebar - Color Palette (xl+ only) */}
        {/* Scales wider on larger containers */}
        {/* top-24 (96px) accounts for header height + padding */}
        <div className="hidden xl:block shrink-0 sticky top-24 self-start">
          <DesktopColorPalette className="w-[180px] @[1400px]:w-[200px] @[1600px]:w-[220px]" />
        </div>

        {/* Center - Canvas Area */}
        {/* Grows to fill available space with max-width cap */}
        <div className="max-w-3xl w-full flex-1 xl:max-w-none xl:w-[800px] @[1400px]:w-[900px] @[1600px]:w-[1000px] @[1800px]:w-[1100px]">
          {/* Progress bar for xl+ - above canvas */}
          <div className="hidden xl:flex items-center gap-4 mb-3">
            <ProgressIndicator getCanvas={getCanvas} className="flex-1" />
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
            className="w-[200px] @[1400px]:w-[220px] @[1600px]:w-[240px]"
            onUndo={handleUndo}
            onRedo={handleRedo}
            onStickerToolSelect={handleStickerToolSelect}
            onStartOver={handleStartOver}
            coloringImage={coloringImage}
            getCanvasDataUrl={getCanvasDataUrl}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  );
};

export default ColoringPageContent;
