"use client";

import { BRUSH_SIZES, BrushSize } from "./types";
import { useColoringContext } from "./context";
import { useSound } from "./useSound";
import cn from "./cn";

type BrushSizeSelectorProps = {
  className?: string;
};

const BrushSizeSelector = ({ className }: BrushSizeSelectorProps) => {
  const { brushSize, setBrushSize, selectedColor, brushType, variant } =
    useColoringContext();
  const { playSound } = useSound();
  const isKids = variant === "kids";

  const sizes = Object.entries(BRUSH_SIZES) as [
    BrushSize,
    (typeof BRUSH_SIZES)[BrushSize],
  ][];

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-white/90 backdrop-blur-sm",
        // Kids: bigger gap between buttons for easier tapping
        { "gap-3": isKids },
        className,
      )}
    >
      {sizes.map(([size, config]) => {
        const isSelected = brushSize === size;
        const displayColor = brushType === "eraser" ? "#9E9E9E" : selectedColor;

        return (
          <button
            type="button"
            key={size}
            onClick={() => {
              setBrushSize(size);
              playSound("tap");
            }}
            className={cn(
              "flex items-center justify-center rounded-lg transition-all duration-150",
              "hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
              // Kids: larger touch targets (48px min per NN/g research)
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
    </div>
  );
};

export default BrushSizeSelector;
