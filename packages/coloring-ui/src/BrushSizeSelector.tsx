"use client";

import { BRUSH_SIZES, BrushSize } from "./types";
import { useColoringContext } from "./context";
import { useSound } from "./useSound";
import cn from "./cn";

type BrushSizeSelectorProps = {
  className?: string;
};

const MIN_RADIUS = 1;
const MAX_RADIUS = 40;

const BrushSizeSelector = ({ className }: BrushSizeSelectorProps) => {
  const {
    brushSize,
    setBrushSize,
    selectedColor,
    brushType,
    variant,
    customBrushRadius,
    setCustomBrushRadius,
  } = useColoringContext();
  const { playSound } = useSound();
  const isKids = variant === "kids";

  const sizes = Object.entries(BRUSH_SIZES) as [
    BrushSize,
    (typeof BRUSH_SIZES)[BrushSize],
  ][];

  // Current effective radius (custom or preset)
  const effectiveRadius = customBrushRadius ?? BRUSH_SIZES[brushSize].radius;

  const handlePresetClick = (size: BrushSize) => {
    setBrushSize(size);
    // Clear custom radius when a preset is selected
    setCustomBrushRadius(null);
    playSound("tap");
  };

  const handleSliderChange = (value: number) => {
    setCustomBrushRadius(value);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-white/90 backdrop-blur-sm",
        { "gap-3": isKids },
        className,
      )}
    >
      {/* Preset size buttons */}
      {sizes.map(([size, config]) => {
        const isSelected = customBrushRadius === null && brushSize === size;
        const displayColor = brushType === "eraser" ? "#9E9E9E" : selectedColor;

        return (
          <button
            type="button"
            key={size}
            onClick={() => handlePresetClick(size)}
            className={cn(
              "flex items-center justify-center rounded-lg transition-all duration-150",
              "hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
              isKids ? "size-12 sm:size-14" : "size-10 sm:size-12",
              {
                "bg-gray-200 ring-2 ring-gray-400": isSelected,
              },
            )}
            aria-label={`${config.name} brush size`}
            title={config.name}
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

      {/* Continuous slider (adults only) */}
      {!isKids && (
        <div className="flex items-center gap-2 ml-1">
          <input
            type="range"
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            value={effectiveRadius}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-20 sm:w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600"
            aria-label="Brush size"
            title={`Size: ${effectiveRadius}px`}
          />
          <span className="text-xs text-gray-500 tabular-nums w-6 text-right">
            {effectiveRadius}
          </span>
        </div>
      )}
    </div>
  );
};

export default BrushSizeSelector;
