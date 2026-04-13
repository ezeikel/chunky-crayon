"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ALL_COLORING_COLORS,
  COLORING_PALETTE,
  TRACKING_EVENTS,
} from "./types";
import { useColoringContext } from "./context";
import { useSound } from "./useSound";
import { haptics } from "./haptics";
import cn from "./cn";
import { trackEvent } from "./analytics-client";

type ColorPaletteProps = {
  className?: string;
};

const MAX_RECENT_COLORS = 8;
const RECENT_COLORS_KEY = "coloring-recent-colors";

const ColorPalette = ({ className }: ColorPaletteProps) => {
  const { selectedColor, setSelectedColor, activeTool, variant } =
    useColoringContext();
  const { playSound } = useSound();
  const isKids = variant === "kids";

  // Recent colors (adults only, persisted to localStorage)
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showSkinTones, setShowSkinTones] = useState(false);

  // Load recent colors from localStorage on mount
  useEffect(() => {
    if (isKids) return;
    try {
      const stored = localStorage.getItem(RECENT_COLORS_KEY);
      if (stored) setRecentColors(JSON.parse(stored));
    } catch {
      // Ignore
    }
  }, [isKids]);

  const addRecentColor = useCallback(
    (hex: string) => {
      if (isKids) return;
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== hex);
        const updated = [hex, ...filtered].slice(0, MAX_RECENT_COLORS);
        try {
          localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    },
    [isKids],
  );

  // Disable palette when magic tools are active
  const isMagicToolActive =
    activeTool === "magic-reveal" || activeTool === "magic-auto";

  // Colors to display based on variant
  const baseColors = ALL_COLORING_COLORS;
  const extendedColors = COLORING_PALETTE.extended;
  const skinTones = COLORING_PALETTE.skinTones;

  const handleColorSelect = (hex: string, name: string, index: number) => {
    if (isMagicToolActive) return;
    trackEvent(TRACKING_EVENTS.PAGE_COLOR_SELECTED, {
      color: hex,
      colorName: name,
      colorIndex: index,
    });
    setSelectedColor(hex);
    addRecentColor(hex);
    playSound("tap");
    haptics.tap(variant);
  };

  const renderColorButton = (
    color: { name: string; hex: string },
    index: number,
    size: "small" | "normal" | "large" = "normal",
  ) => {
    const isSelected = selectedColor === color.hex;
    const isWhite = color.hex === "#FFFFFF";

    const sizeClasses = {
      small: "size-7 sm:size-8",
      normal: isKids ? "size-10 sm:size-12" : "size-8 sm:size-10",
      large: "size-10 sm:size-12",
    };

    return (
      <button
        type="button"
        className={cn(
          "rounded-full shadow-md transition-all duration-150 ease-out",
          "hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coloring-accent",
          sizeClasses[size],
          {
            "ring-2 ring-offset-2 ring-gray-800 scale-110":
              isSelected && !isMagicToolActive,
            "border border-gray-300": isWhite,
          },
        )}
        style={{ backgroundColor: color.hex }}
        onClick={() => handleColorSelect(color.hex, color.name, index)}
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
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 sm:p-4 rounded-coloring-card bg-white/90 backdrop-blur-sm shadow-coloring-surface",
        "transition-opacity duration-coloring-base ease-coloring",
        isMagicToolActive && "opacity-40 pointer-events-none",
        className,
      )}
      aria-disabled={isMagicToolActive}
      title={
        isMagicToolActive
          ? "Colors are chosen automatically with Magic tools"
          : undefined
      }
    >
      {/* Recent colors row (adults only) */}
      {!isKids && recentColors.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-coloring-muted uppercase tracking-wider shrink-0">
            Recent
          </span>
          <div className="flex gap-1.5 overflow-x-auto">
            {recentColors.map((hex, i) => (
              <button
                type="button"
                key={`recent-${hex}`}
                className={cn(
                  "size-6 sm:size-7 rounded-full shadow-sm transition-all duration-150",
                  "hover:scale-110 active:scale-95 focus:outline-none",
                  selectedColor === hex &&
                    "ring-2 ring-offset-1 ring-gray-800 scale-110",
                  hex === "#FFFFFF" && "border border-gray-300",
                )}
                style={{ backgroundColor: hex }}
                onClick={() => handleColorSelect(hex, "Recent", i)}
                disabled={isMagicToolActive}
                aria-label="Recent color"
              />
            ))}
          </div>
        </div>
      )}

      {/* Main palette */}
      <div
        className={cn(
          "grid gap-1.5 sm:gap-2",
          // Kids: fewer columns, bigger buttons
          isKids ? "grid-cols-5 sm:grid-cols-7" : "grid-cols-6 sm:grid-cols-8",
        )}
      >
        {baseColors.map((color, index) => renderColorButton(color, index))}
      </div>

      {/* Extended colors (adults only) */}
      {!isKids && (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2">
          {extendedColors.map((color, index) =>
            renderColorButton(
              color as { name: string; hex: string },
              baseColors.length + index,
              "small",
            ),
          )}
        </div>
      )}

      {/* Skin tones toggle */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => setShowSkinTones((prev) => !prev)}
          className="text-xs text-coloring-muted hover:opacity-80 transition-colors self-start"
          disabled={isMagicToolActive}
        >
          {showSkinTones ? "Hide" : "Show"} skin tones
        </button>
        {showSkinTones && (
          <div className="flex gap-1.5 sm:gap-2">
            {skinTones.map((color, index) =>
              renderColorButton(
                color as { name: string; hex: string },
                baseColors.length + extendedColors.length + index,
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPalette;
