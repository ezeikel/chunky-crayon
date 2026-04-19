"use client";

import { ALL_COLORING_COLORS, TRACKING_EVENTS } from "./types";
import { useColoringContext } from "./context";
import { useSound } from "./useSound";
import { trackEvent } from "./analytics-client";
import cn from "./cn";

type ColorStripProps = {
  className?: string;
};

/**
 * Horizontal scrollable color strip for mobile — compact single row of
 * colors, optimized for thumb-friendly selection on smaller screens.
 * Disabled while magic tools are active (they use AI-assigned colors).
 */
const ColorStrip = ({ className }: ColorStripProps) => {
  const { selectedColor, setSelectedColor, activeTool } = useColoringContext();
  const { playSound } = useSound();

  const isMagicToolActive =
    activeTool === "magic-reveal" || activeTool === "magic-auto";

  return (
    <div className={cn("relative", className)}>
      {/* Gradient fade on right edge to indicate more colors */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10 rounded-r-lg" />

      <div
        className={cn(
          "flex gap-2 p-2 overflow-x-auto scrollbar-hide bg-white/95 backdrop-blur-sm rounded-coloring-card",
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          "transition-opacity duration-coloring-base ease-coloring",
          isMagicToolActive && "opacity-40 pointer-events-none",
        )}
        aria-disabled={isMagicToolActive}
        title={
          isMagicToolActive
            ? "Colors are chosen automatically with Magic tools"
            : undefined
        }
      >
        {ALL_COLORING_COLORS.map((color, index) => {
          const isSelected = selectedColor === color.hex;
          const isWhite = color.hex === "#FFFFFF";

          return (
            <button
              type="button"
              className={cn(
                "size-11 min-w-11 rounded-full shadow-md transition-all duration-150 ease-out flex-shrink-0",
                "active:scale-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-coloring-accent",
                isSelected &&
                  !isMagicToolActive &&
                  "ring-2 ring-offset-1 ring-gray-800 scale-105",
                isWhite && "border border-coloring-surface-dark",
              )}
              style={{ backgroundColor: color.hex }}
              onClick={() => {
                if (isMagicToolActive) return;
                trackEvent(TRACKING_EVENTS.PAGE_COLOR_SELECTED, {
                  color: color.hex,
                  colorName: color.name,
                  colorIndex: index,
                });
                setSelectedColor(color.hex);
                playSound("tap");
              }}
              disabled={isMagicToolActive}
              aria-label={`Select ${color.name} color`}
              title={
                isMagicToolActive
                  ? "Colors are chosen automatically with Magic tools"
                  : color.name
              }
              key={color.hex}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ColorStrip;
