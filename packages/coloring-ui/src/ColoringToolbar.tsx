"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencil,
  faPaintbrush,
  faPenNib,
  faPaintRoller,
  faFillDrip,
  faSparkles,
  faEraser,
  faStar,
  faBrush,
  faPalette,
  faIceCream,
  faHeart,
  faDice,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { CanvasAction, useColoringContext } from "./context";
import {
  BRUSH_SIZES,
  COLORING_PALETTE_VARIANTS,
  PALETTE_VARIANTS,
  type BrushSize,
  type PaletteVariant,
} from "./types";
import UndoRedoButtons from "./UndoRedoButtons";
import ZoomControls from "./ZoomControls";
import { useSound } from "./useSound";
import cn from "./cn";

// ============================================================================
// Types
// ============================================================================

type ColoringToolbarProps = {
  className?: string;
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
  onStickerToolSelect?: () => void;
};

type ToolConfig = {
  id: string;
  label: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

// ============================================================================
// Constants — mirrored from MobileColoringDrawer so tablet and mobile render
// the same tool set in the same order.
// ============================================================================

const tools: ToolConfig[] = [
  { id: "crayon", label: "Crayon", icon: faPencil },
  { id: "marker", label: "Marker", icon: faPaintbrush },
  { id: "pencil", label: "Pencil", icon: faPenNib },
  { id: "paintbrush", label: "Paint", icon: faPaintRoller },
  { id: "glitter", label: "Glitter", icon: faSparkles },
  { id: "fill", label: "Fill", icon: faFillDrip },
  { id: "eraser", label: "Eraser", icon: faEraser },
  { id: "sticker", label: "Sticker", icon: faStar },
  { id: "magic-reveal", label: "Magic Brush", icon: faBrush, isMagic: true },
  { id: "magic-auto", label: "Auto Color", icon: faFillDrip, isMagic: true },
];

const variantIcons: Record<PaletteVariant, IconDefinition> = {
  realistic: faPalette,
  pastel: faIceCream,
  cute: faHeart,
  surprise: faDice,
};

// ============================================================================
// Component
// ============================================================================

/**
 * Tablet-width toolbar (md-to-xl). Renders the same compact chunky-card grids
 * as `MobileColoringDrawer` — palette variant switcher, colour grid, tool grid,
 * brush size picker, and undo/redo/zoom controls — but statically above the
 * canvas rather than inside a vaul bottom sheet. Keeps mobile + tablet visually
 * identical at the component level.
 */
const ColoringToolbar = ({
  className,
  onUndo,
  onRedo,
  onStickerToolSelect,
}: ColoringToolbarProps) => {
  const {
    activeTool,
    brushType,
    selectedColor,
    brushSize,
    paletteVariant,
    setActiveTool,
    setBrushType,
    setSelectedColor,
    setBrushSize,
    setPaletteVariant,
  } = useColoringContext();
  const { playSound } = useSound();

  const colors = COLORING_PALETTE_VARIANTS[paletteVariant];
  const showBrushSizeSelector = activeTool === "brush";

  const handleToolSelect = (toolId: string) => {
    switch (toolId) {
      case "crayon":
        setActiveTool("brush");
        setBrushType("crayon");
        break;
      case "marker":
        setActiveTool("brush");
        setBrushType("marker");
        break;
      case "pencil":
        setActiveTool("brush");
        setBrushType("pencil");
        break;
      case "paintbrush":
        setActiveTool("brush");
        setBrushType("paintbrush");
        break;
      case "glitter":
        setActiveTool("brush");
        setBrushType("glitter");
        break;
      case "eraser":
        setActiveTool("brush");
        setBrushType("eraser");
        break;
      case "fill":
        setActiveTool("fill");
        break;
      case "sticker":
        setActiveTool("sticker");
        onStickerToolSelect?.();
        break;
      case "magic-reveal":
        setActiveTool("magic-reveal");
        break;
      case "magic-auto":
        setActiveTool("magic-auto");
        break;
    }
    playSound("pop");
  };

  const isToolActive = (toolId: string) => {
    if (toolId === "fill") return activeTool === "fill";
    if (toolId === "sticker") return activeTool === "sticker";
    if (toolId === "magic-reveal") return activeTool === "magic-reveal";
    if (toolId === "magic-auto") return activeTool === "magic-auto";
    return activeTool === "brush" && brushType === toolId;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 bg-white border-2 border-paper-cream-dark rounded-coloring-card shadow-coloring-surface",
        className,
      )}
    >
      {/* Palette variant switcher — 4 moods, drives both the swatch grid and
       * the magic-tool palette. */}
      <div className="grid grid-cols-4 gap-2">
        {PALETTE_VARIANTS.map((variant) => {
          const isActive = paletteVariant === variant;
          return (
            <button
              key={variant}
              type="button"
              onClick={() => {
                setPaletteVariant(variant);
                playSound("tap");
              }}
              aria-label={variant}
              title={variant}
              aria-pressed={isActive}
              className={cn(
                "flex items-center justify-center h-12 rounded-coloring-card border-2",
                "transition-all duration-coloring-base ease-coloring active:scale-95",
                isActive
                  ? "bg-coloring-accent border-transparent text-white shadow-btn-primary"
                  : "bg-white border-paper-cream-dark text-text-primary",
              )}
            >
              <FontAwesomeIcon icon={variantIcons[variant]} size="lg" />
            </button>
          );
        })}
      </div>

      {/* Colour grid */}
      <div className="grid grid-cols-10 sm:grid-cols-12 gap-1.5 py-1">
        {colors.map((color) => {
          const isSelected = selectedColor === color.hex;
          return (
            <button
              key={color.hex}
              type="button"
              onClick={() => {
                setSelectedColor(color.hex);
                playSound("tap");
              }}
              className={cn(
                "aspect-square w-full rounded-full border-2",
                "transition-all duration-coloring-base ease-coloring active:scale-95",
                isSelected
                  ? "ring-2 ring-coloring-accent ring-offset-1 border-white"
                  : "border-paper-cream-dark",
              )}
              style={{ backgroundColor: color.hex }}
              aria-label={`Select ${color.name} color`}
              aria-pressed={isSelected}
            />
          );
        })}
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {tools.map((tool) => {
          const isActive = isToolActive(tool.id);
          if (tool.isMagic) {
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleToolSelect(tool.id)}
                className={cn(
                  "relative aspect-square w-full rounded-coloring-card",
                  "flex items-center justify-center",
                  "transition-all duration-coloring-base ease-coloring active:scale-95",
                  isActive
                    ? "bg-gradient-to-br from-crayon-purple to-crayon-pink text-white"
                    : "bg-gradient-to-br from-crayon-purple/10 to-crayon-pink/10 text-crayon-purple",
                )}
                aria-label={tool.label}
                title={tool.label}
                aria-pressed={isActive}
              >
                <FontAwesomeIcon icon={tool.icon} size="xl" />
                <FontAwesomeIcon
                  icon={faSparkles}
                  size="lg"
                  aria-hidden
                  className={cn(
                    "absolute -top-2 -right-2 drop-shadow-sm",
                    isActive ? "text-white" : "text-crayon-purple",
                  )}
                />
              </button>
            );
          }
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleToolSelect(tool.id)}
              className={cn(
                "aspect-square w-full rounded-coloring-card border-2",
                "flex items-center justify-center",
                "transition-all duration-coloring-base ease-coloring active:scale-95",
                isActive
                  ? "bg-coloring-accent border-transparent text-white shadow-btn-primary"
                  : "bg-white border-paper-cream-dark text-text-primary",
              )}
              aria-label={tool.label}
              title={tool.label}
              aria-pressed={isActive}
            >
              <FontAwesomeIcon icon={tool.icon} size="xl" />
            </button>
          );
        })}
      </div>

      {/* Brush size — only when brush tool active */}
      {showBrushSizeSelector && (
        <div className="flex gap-2">
          {(
            Object.entries(BRUSH_SIZES) as [
              BrushSize,
              (typeof BRUSH_SIZES)[BrushSize],
            ][]
          ).map(([size, config]) => {
            const isSelected = brushSize === size;
            const displayColor =
              brushType === "eraser" ? "#9E9E9E" : selectedColor;
            const dotSize = Math.max(8, Math.min(24, config.radius * 1.5));
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setBrushSize(size);
                  playSound("tap");
                }}
                className={cn(
                  "shrink-0 size-14 rounded-coloring-card border-2",
                  "flex items-center justify-center",
                  "transition-all duration-coloring-base ease-coloring active:scale-95",
                  isSelected
                    ? "bg-coloring-accent border-transparent shadow-btn-primary"
                    : "bg-white border-paper-cream-dark",
                )}
                aria-label={`${config.name} brush size`}
                aria-pressed={isSelected}
              >
                <span
                  className="rounded-full transition-colors"
                  style={{
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: isSelected ? "#FFFFFF" : displayColor,
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Undo/Redo + Zoom — reuse shared chunky-card components */}
      <div className="flex items-center gap-3">
        <UndoRedoButtons onUndo={onUndo} onRedo={onRedo} />
        <ZoomControls />
      </div>
    </div>
  );
};

export default ColoringToolbar;
