'use client';

import ColorPalette from '@/components/ColorPalette/ColorPalette';
import BrushSizeSelector from '@/components/BrushSizeSelector/BrushSizeSelector';
import ToolSelector from '@/components/ToolSelector/ToolSelector';
import PatternSelector from '@/components/PatternSelector/PatternSelector';
import UndoRedoButtons from '@/components/UndoRedoButtons/UndoRedoButtons';
import ZoomControls from '@/components/ZoomControls/ZoomControls';
import { CanvasAction } from '@/contexts/coloring';
import cn from '@/utils/cn';

type ColoringToolbarProps = {
  className?: string;
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
};

const ColoringToolbar = ({
  className,
  onUndo,
  onRedo,
}: ColoringToolbarProps) => {
  return (
    <div className={cn('flex flex-col gap-3 w-full', className)}>
      {/* Color Palette - Full width */}
      <ColorPalette className="shadow-lg" />

      {/* Tools Row - Responsive layout */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Tool Selector (Brush/Fill/Eraser) */}
        <ToolSelector className="shadow-lg" />

        {/* Pattern Selector - shows only when fill tool is active */}
        <PatternSelector className="shadow-lg" />

        {/* Brush Size Selector */}
        <BrushSizeSelector className="shadow-lg" />

        {/* Undo/Redo */}
        <UndoRedoButtons
          className="shadow-lg"
          onUndo={onUndo}
          onRedo={onRedo}
        />

        {/* Zoom Controls */}
        <ZoomControls className="shadow-lg" />
      </div>
    </div>
  );
};

export default ColoringToolbar;
