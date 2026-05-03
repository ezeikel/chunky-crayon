"use client";

import {
  COLORING_PALETTE_VARIANTS,
  PALETTE_VARIANTS,
  TRACKING_EVENTS,
  type PaletteVariant,
} from "./types";
import { useColoringContext } from "./context";
import { useSound } from "./useSound";
import cn from "./cn";
import { trackEvent } from "./analytics-client";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPalette,
  faIceCream,
  faHeart,
  faDice,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type DesktopColorPaletteProps = {
  className?: string;
};

const variantIcons: Record<PaletteVariant, IconDefinition> = {
  realistic: faPalette,
  pastel: faIceCream,
  cute: faHeart,
  surprise: faDice,
};

/**
 * Desktop-only vertical color palette for sidebar layout.
 *
 * Top of the panel: 4 mood tabs (realistic/pastel/cute/surprise). Tapping a
 * mood swaps the swatch grid AND drives the same paletteVariant the magic
 * tools use — one knob, two effects.
 */
const DesktopColorPalette = ({ className }: DesktopColorPaletteProps) => {
  const t = useTranslations("coloringPage");
  const {
    selectedColor,
    setSelectedColor,
    paletteVariant,
    setPaletteVariant,
    activeTool,
  } = useColoringContext();
  const { playSound } = useSound();

  const colors = COLORING_PALETTE_VARIANTS[paletteVariant];

  return (
    <div
      className={cn(
        "@container flex flex-col gap-3 p-4 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-coloring-surface-dark shadow-lg",
        className,
      )}
    >
      {/* Mood tabs — 2×2 tiles aligned to match the colour grid below. */}
      <div className="grid grid-cols-2 gap-2">
        {PALETTE_VARIANTS.map((variant) => {
          const isActive = paletteVariant === variant;
          return (
            <button
              key={variant}
              type="button"
              onClick={() => {
                if (variant !== paletteVariant) {
                  trackEvent(TRACKING_EVENTS.PALETTE_VARIANT_CHANGED, {
                    fromVariant: paletteVariant,
                    toVariant: variant,
                  });
                }
                setPaletteVariant(variant);
                playSound("tap");
              }}
              aria-label={variant}
              aria-pressed={isActive}
              title={variant}
              className={cn(
                "flex items-center justify-center h-12 @[200px]:h-14 w-full rounded-coloring-card transition-all duration-coloring-base ease-coloring",
                "active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
                isActive
                  ? "bg-coloring-accent text-white"
                  : "bg-white border border-coloring-surface-dark text-coloring-text-primary hover:bg-coloring-surface",
              )}
            >
              <FontAwesomeIcon icon={variantIcons[variant]} size="xl" />
            </button>
          );
        })}
      </div>

      {/* Color grid — 3 columns. Swatches shrink at narrow container widths. */}
      <div className="grid grid-cols-3 gap-2">
        {colors.map((color, index) => {
          const isSelected = selectedColor === color.hex;
          const isWhite = color.hex === "#FFFFFF";

          return (
            <button
              type="button"
              className={cn(
                // Swatches shrink at narrow container widths so the row stays balanced.
                "size-10 @[200px]:size-12 rounded-full shadow-md transition-all duration-coloring-base ease-coloring",
                "hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coloring-accent",
                isSelected && "ring-2 ring-offset-2 ring-gray-800 scale-110",
                isWhite && "border border-gray-300",
              )}
              style={{ backgroundColor: color.hex }}
              onClick={() => {
                trackEvent(TRACKING_EVENTS.PAGE_COLOR_SELECTED, {
                  color: color.hex,
                  colorName: color.name,
                  colorIndex: index,
                  tool: activeTool,
                });
                setSelectedColor(color.hex);
                playSound("tap");
              }}
              aria-label={t("colorPalette.selectColor", { color: color.name })}
              title={color.name}
              key={color.hex}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DesktopColorPalette;
