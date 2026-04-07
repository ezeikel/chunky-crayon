"use client";

import ColorPalette from "./ColorPalette";
import BrushSizeSelector from "./BrushSizeSelector";
import ToolSelector from "./ToolSelector";
import PatternSelector from "./PatternSelector";
import UndoRedoButtons from "./UndoRedoButtons";
import ZoomControls from "./ZoomControls";
import { CanvasAction, useColoringContext } from "./context";
import cn from "./cn";

type ColoringToolbarProps = {
  className?: string;
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
  onStickerToolSelect?: () => void;
};

const ColoringToolbar = ({
  className,
  onUndo,
  onRedo,
  onStickerToolSelect,
}: ColoringToolbarProps) => {
  const { variant } = useColoringContext();
  const isKids = variant === "kids";

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* Color Palette - Full width */}
      <ColorPalette className="shadow-lg" />

      {/* Tools Row - Responsive layout */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {/* Tool Selector (Brush/Fill/Eraser/Sticker) */}
        <ToolSelector
          className="shadow-lg"
          onStickerToolSelect={onStickerToolSelect}
        />

        {/* Pattern Selector - adults only, shows when fill tool is active */}
        {!isKids && <PatternSelector className="shadow-lg" />}

        {/* Brush Size Selector */}
        <BrushSizeSelector className="shadow-lg" />

        {/* Undo/Redo */}
        <UndoRedoButtons
          className="shadow-lg"
          onUndo={onUndo}
          onRedo={onRedo}
        />

        {/* Zoom Controls - adults only (kids use pinch-to-zoom) */}
        {!isKids && <ZoomControls className="shadow-lg" />}
      </div>
    </div>
  );
};

export default ColoringToolbar;
