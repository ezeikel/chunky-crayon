'use client';

import { useRef } from 'react';
import { ColoringImage } from '@chunky-crayon/db/types';
import ColoringArea, {
  ColoringAreaHandle,
} from '@/components/ColoringArea/ColoringArea';
import ProgressIndicator from '@/components/ProgressIndicator';
import MuteToggle from '@/components/MuteToggle';

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

  return (
    <div className="flex flex-col gap-y-4">
      {/* Title with progress/mute underneath on desktop */}
      <div className="flex flex-col items-center gap-2 max-w-3xl w-full mx-auto">
        <h1 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary text-center">
          {title}
        </h1>
        {/* Desktop only: Progress bar stretches, mute on right */}
        <div className="hidden md:flex items-center gap-4 w-full">
          <ProgressIndicator getCanvas={getCanvas} className="flex-1" />
          <MuteToggle />
        </div>
      </div>

      {/* Coloring Area - clean white card matching gallery aesthetic */}
      <div className="max-w-3xl w-full mx-auto">
        <div className="bg-white rounded-2xl border-2 border-paper-cream-dark p-4 md:p-6 shadow-sm">
          <ColoringArea
            ref={coloringAreaRef}
            coloringImage={coloringImage}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  );
};

export default ColoringPageContent;
