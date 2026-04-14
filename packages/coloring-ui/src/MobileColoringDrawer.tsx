"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
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
  faCircle,
  faGripVertical,
  faHeart,
  faBorderAll,
  faTableCellsLarge,
  faPalette,
  faIceCream,
  faDice,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { CanvasAction, useColoringContext } from "./context";
import {
  BRUSH_SIZES,
  COLORING_PALETTE_VARIANTS,
  PALETTE_VARIANTS,
  type FillPattern,
  type BrushSize,
  type PaletteVariant,
} from "./types";
import { useSound } from "./useSound";
import cn from "./cn";

// ============================================================================
// Types
// ============================================================================

type MobileColoringDrawerProps = {
  className?: string;
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
  onStickerToolSelect?: () => void;
};

type ToolConfig = {
  id: string;
  label: string;
  shortLabel?: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

// ============================================================================
// Constants - Matching mobile native app
// ============================================================================

// Palette mood icons — same mapping desktop uses so both surfaces feel unified.
const variantIcons: Record<PaletteVariant, IconDefinition> = {
  realistic: faPalette,
  pastel: faIceCream,
  cute: faHeart,
  surprise: faDice,
};

// Tools — match desktop sidebar's list and order exactly so the two surfaces
// stay feature-coherent.
const tools: ToolConfig[] = [
  { id: "crayon", label: "Crayon", icon: faPencil },
  { id: "marker", label: "Marker", icon: faPaintbrush },
  { id: "pencil", label: "Pencil", icon: faPenNib },
  { id: "paintbrush", label: "Paint", icon: faPaintRoller },
  { id: "glitter", label: "Glitter", icon: faSparkles },
  { id: "fill", label: "Fill", icon: faFillDrip },
  { id: "eraser", label: "Eraser", icon: faEraser },
  { id: "sticker", label: "Sticker", icon: faStar },
  {
    id: "magic-reveal",
    label: "Magic Brush",
    shortLabel: "Magic",
    icon: faBrush,
    isMagic: true,
  },
  {
    id: "magic-auto",
    label: "Auto Color",
    shortLabel: "Auto",
    icon: faFillDrip,
    isMagic: true,
  },
];

// Fill type options - matching mobile native exactly
type FillType = "solid" | "pattern";
const fillTypes: { type: FillType; label: string; icon: IconDefinition }[] = [
  { type: "solid", label: "Solid", icon: faCircle },
  { type: "pattern", label: "Pattern", icon: faTableCellsLarge },
];

// Pattern options - matching mobile native exactly (same icons)
const patternTypes: {
  type: FillPattern;
  label: string;
  icon: IconDefinition;
}[] = [
  { type: "dots", label: "Dots", icon: faCircle },
  { type: "stripes", label: "Stripes", icon: faGripVertical },
  { type: "hearts", label: "Hearts", icon: faHeart },
  { type: "stars", label: "Stars", icon: faStar },
  { type: "zigzag", label: "Zigzag", icon: faBorderAll },
];

// ============================================================================
// Subcomponents
// ============================================================================

// Undo icon
const UndoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

// Redo icon
const RedoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * Mobile-optimized bottom sheet drawer using Vaul.
 * Matches the iOS/Android-style bottom sheet from the mobile app.
 *
 * Design specs (matching mobile native):
 * - Tool buttons: 48x48px, 8px gap, rounded-coloring-card, bg-gray-100
 * - Color swatches: 40x40px, 8px gap, rounded-full, 2px border
 * - Section rows: Direct flex with gap, no container wrappers
 * - Large touch targets for young children (ages 3-8)
 */
const MobileColoringDrawer = ({
  className,
  onUndo,
  onRedo,
  onStickerToolSelect,
}: MobileColoringDrawerProps) => {
  const {
    activeTool,
    brushType,
    selectedColor,
    brushSize,
    selectedPattern,
    paletteVariant,
    setActiveTool,
    setBrushType,
    setSelectedColor,
    setBrushSize,
    setSelectedPattern,
    setPaletteVariant,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useColoringContext();
  const colors = COLORING_PALETTE_VARIANTS[paletteVariant];
  const { playSound } = useSound();

  // Heights matching mobile app
  const collapsedHeight = 200; // Tools + Colors visible
  const expandedHeight = 450; // All sections visible

  // Framer Motion height value
  const height = useMotionValue(collapsedHeight);

  // Track expanded state for conditional rendering
  const [isExpanded, setIsExpanded] = useState(false);

  // Snap threshold - percentage of range where we snap to the other state
  const snapThreshold = 0.4;
  const midPoint =
    collapsedHeight + (expandedHeight - collapsedHeight) * snapThreshold;

  // Spring config for natural snapping animation
  const springConfig = {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  };

  // Handle drag on the handle bar
  const handlePan = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    // Dragging up (negative offset.y) should increase height
    const currentHeight = height.get();
    const newHeight = Math.max(
      collapsedHeight,
      Math.min(expandedHeight, currentHeight - info.delta.y),
    );
    height.set(newHeight);
  };

  // Handle drag end - snap to nearest state with spring animation
  const handlePanEnd = () => {
    const currentHeight = height.get();

    if (currentHeight > midPoint) {
      // Snap to expanded
      animate(height, expandedHeight, springConfig);
      setIsExpanded(true);
    } else {
      // Snap to collapsed
      animate(height, collapsedHeight, springConfig);
      setIsExpanded(false);
    }
  };

  // Handle click to toggle
  const handleToggle = () => {
    if (isExpanded) {
      animate(height, collapsedHeight, springConfig);
      setIsExpanded(false);
    } else {
      animate(height, expandedHeight, springConfig);
      setIsExpanded(true);
    }
  };

  // Show fill type selector when fill tool is active
  const showFillTypeSelector = activeTool === "fill";
  // Derive fillType from selectedPattern (solid = solid, anything else = pattern)
  const fillType: FillType = selectedPattern === "solid" ? "solid" : "pattern";
  // Show pattern selector only when fill tool is active AND fillType is 'pattern'
  const showPatternSelector = activeTool === "fill" && fillType === "pattern";
  // Show brush size selector when brush tool is active
  const showBrushSizeSelector = activeTool === "brush";

  // -------------------------------------------------------------------------
  // Tool handling
  // -------------------------------------------------------------------------

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
      case "sparkle":
        setActiveTool("brush");
        setBrushType("sparkle");
        break;
      case "rainbow":
        setActiveTool("brush");
        setBrushType("rainbow");
        break;
      case "glow":
        setActiveTool("brush");
        setBrushType("glow");
        break;
      case "neon":
        setActiveTool("brush");
        setBrushType("neon");
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
    // For brush-based tools, check both activeTool and brushType
    return activeTool === "brush" && brushType === toolId;
  };

  // -------------------------------------------------------------------------
  // Undo/Redo handling
  // -------------------------------------------------------------------------

  const handleUndo = () => {
    const action = undo();
    if (action && onUndo) {
      onUndo(action);
    }
  };

  const handleRedo = () => {
    const action = redo();
    if (action && onRedo) {
      onRedo(action);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Drawer.Root open modal={false} dismissible={false}>
      <Drawer.Portal>
        <Drawer.Content aria-describedby={undefined} asChild>
          <motion.div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 mx-2",
              "flex flex-col overflow-hidden",
              "bg-white rounded-t-3xl",
              "border-2 border-b-0 border-paper-cream-dark",
              "shadow-[0_-4px_16px_rgba(0,0,0,0.15)]",
              // Safe area padding for notched devices
              "pb-safe",
              className,
            )}
            style={{ height }}
          >
            {/* Accessible title - visually hidden */}
            <Drawer.Title className="sr-only">Coloring Tools</Drawer.Title>

            {/* Drag handle - drag or click to toggle expanded/collapsed */}
            <motion.div
              role="button"
              tabIndex={0}
              className="flex items-center justify-center pt-3 pb-2 w-full cursor-grab active:cursor-grabbing touch-none select-none"
              onPan={handlePan}
              onPanEnd={handlePanEnd}
              onTap={handleToggle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleToggle();
                }
              }}
              aria-label={isExpanded ? "Collapse toolbar" : "Expand toolbar"}
            >
              <div className="w-12 h-1.5 rounded-full bg-paper-cream-dark" />
            </motion.div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4">
              {/* Tools — icon-only chunky-card grid, matching desktop sidebar */}
              <div className="mb-4">
                <div className="grid grid-cols-5 gap-2">
                  {tools.map((tool) => {
                    const isActive = isToolActive(tool.id);
                    if (tool.isMagic) {
                      // Magic tools — purple→pink gradient background + sparkle
                      // decoration, mirroring desktop.
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
                        aria-pressed={isActive}
                      >
                        <FontAwesomeIcon icon={tool.icon} size="xl" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Palette variant switcher — swaps the swatch grid and drives
               * the magic-tool palette too, matching desktop's single-knob UX. */}
              <div className="mb-3">
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
                        <FontAwesomeIcon
                          icon={variantIcons[variant]}
                          size="lg"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors — grid driven by the current palette variant */}
              <div className="mb-4">
                <div className="grid grid-cols-8 gap-1.5 py-1">
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
              </div>

              {/* Brush Size Section - only when expanded and brush tool active */}
              {isExpanded && showBrushSizeSelector && (
                <div className="mb-4">
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
                      // Scale icon size based on brush size (min 8, max 24)
                      const dotSize = Math.max(
                        8,
                        Math.min(24, config.radius * 1.5),
                      );

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
                              backgroundColor: isSelected
                                ? "#FFFFFF"
                                : displayColor,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fill Type — icon-only tiles matching tools */}
              {isExpanded && showFillTypeSelector && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    {fillTypes.map((fill) => {
                      const isActive = fillType === fill.type;
                      return (
                        <button
                          key={fill.type}
                          type="button"
                          onClick={() => {
                            if (fill.type === "solid") {
                              setSelectedPattern("solid");
                            } else if (selectedPattern === "solid") {
                              setSelectedPattern("dots");
                            }
                            playSound("tap");
                          }}
                          className={cn(
                            "size-14 rounded-coloring-card border-2",
                            "flex items-center justify-center",
                            "transition-all duration-coloring-base ease-coloring active:scale-95",
                            isActive
                              ? "bg-coloring-accent border-transparent shadow-btn-primary"
                              : "bg-white border-paper-cream-dark",
                          )}
                          aria-label={fill.label}
                          aria-pressed={isActive}
                        >
                          <FontAwesomeIcon
                            icon={fill.icon}
                            size="xl"
                            className={cn(
                              isActive ? "text-white" : "text-text-primary",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pattern — icon-only tile grid */}
              {isExpanded && showPatternSelector && (
                <div className="mb-4">
                  <div className="grid grid-cols-5 gap-2">
                    {patternTypes.map((pattern) => {
                      const isActive = selectedPattern === pattern.type;
                      return (
                        <button
                          key={pattern.type}
                          type="button"
                          onClick={() => {
                            setSelectedPattern(pattern.type);
                            playSound("tap");
                          }}
                          className={cn(
                            "aspect-square w-full rounded-coloring-card border-2",
                            "flex items-center justify-center",
                            "transition-all duration-coloring-base ease-coloring active:scale-95",
                            isActive
                              ? "bg-coloring-accent border-transparent shadow-btn-primary"
                              : "bg-white border-paper-cream-dark",
                          )}
                          aria-label={pattern.label}
                          aria-pressed={isActive}
                        >
                          <FontAwesomeIcon
                            icon={pattern.icon}
                            size="xl"
                            className={cn(
                              isActive ? "text-white" : "text-text-primary",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* History Section - Undo/Redo - only when expanded */}
              {isExpanded && (
                <div className="mb-4">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className={cn(
                        "size-14 rounded-coloring-card border-2 border-paper-cream-dark bg-white",
                        "flex items-center justify-center",
                        "transition-all duration-coloring-base ease-coloring active:scale-95",
                        !canUndo && "opacity-50 cursor-not-allowed",
                      )}
                      aria-label="Undo"
                    >
                      <UndoIcon className="size-6 text-text-primary" />
                    </button>

                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className={cn(
                        "size-14 rounded-coloring-card border-2 border-paper-cream-dark bg-white",
                        "flex items-center justify-center",
                        "transition-all duration-coloring-base ease-coloring active:scale-95",
                        !canRedo && "opacity-50 cursor-not-allowed",
                      )}
                      aria-label="Redo"
                    >
                      <RedoIcon className="size-6 text-text-primary" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default MobileColoringDrawer;
