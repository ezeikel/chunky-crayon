"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
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

  // Three snap points (peek / half / full). Heights in px so behaviour is
  // predictable across devices.
  // - PEEK 120px:  drag handle + tools row only. The default — keeps the
  //                canvas dominant, the 60% of users who came to print don't
  //                need to drag.
  // - HALF 340px:  adds palette-variant switcher + color swatches. Where
  //                most coloring happens.
  // - FULL 560px:  adds brush sizes / fill / patterns / undo-redo.
  const snapPoints = [120, 340, 560] as const;
  type SnapIndex = 0 | 1 | 2;

  const height = useMotionValue<number>(snapPoints[0]);
  const [currentSnap, setCurrentSnap] = useState<SnapIndex>(0);
  // Tracks whether the user has tapped a tool yet. Auto-snap-up on first
  // tool tap teaches the gesture implicitly — like an iOS keyboard
  // expanding when you focus a text field. After the first tap we don't
  // force-snap again; the user is in control.
  const hasAutoSnappedRef = useRef(false);

  // Spring config — feels good already, keep as-is.
  const springConfig = {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  };

  /**
   * Pick the closest snap point to the current height, biased by the
   * user's flick direction. If they're flicking hard (|velocity.y| > 400)
   * we prefer the next snap in the flick direction even if it's not the
   * mathematically nearest — matches iOS bottom-sheet feel.
   */
  const nearestSnap = (currentHeight: number, velocityY: number): SnapIndex => {
    const flickThreshold = 400;
    let closest: SnapIndex = 0;
    let closestDistance = Infinity;
    snapPoints.forEach((point, index) => {
      const distance = Math.abs(point - currentHeight);
      if (distance < closestDistance) {
        closest = index as SnapIndex;
        closestDistance = distance;
      }
    });
    if (Math.abs(velocityY) > flickThreshold) {
      // Flick UP = grow drawer (negative velocity in framer pan space).
      // Flick DOWN = shrink drawer.
      if (velocityY < 0 && closest < 2) {
        return Math.max(closest, currentSnap + 1) as SnapIndex;
      }
      if (velocityY > 0 && closest > 0) {
        return Math.min(closest, currentSnap - 1) as SnapIndex;
      }
    }
    return closest;
  };

  const snapTo = (index: SnapIndex) => {
    animate(height, snapPoints[index], springConfig);
    setCurrentSnap(index);
  };

  const handlePan = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    // Dragging up (negative delta.y) grows the sheet.
    const currentHeight = height.get();
    const newHeight = Math.max(
      snapPoints[0],
      Math.min(snapPoints[2], currentHeight - info.delta.y),
    );
    height.set(newHeight);
  };

  const handlePanEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    snapTo(nearestSnap(height.get(), info.velocity.y));
  };

  // Tap on the handle jumps straight to full when collapsed (peek/half),
  // and back to peek when already full. Cycling through three states
  // felt like in-between-ness for no reason — a click means "show me
  // everything" or "get out of the way." Dragging is still the way to
  // land on the half state, which is where most coloring happens
  // (palette + colors visible, canvas mostly unobscured).
  const handleToggle = () => {
    snapTo(currentSnap === 2 ? 0 : 2);
  };

  // Once-on-mount bounce — handle floats up ~8px and back over 600ms
  // when the drawer first appears. Catches the eye, confirms it's
  // interactive without copy. Only runs at peek state on mount.
  const [hasBounced, setHasBounced] = useState(false);
  useEffect(() => {
    if (hasBounced) return;
    const id = window.setTimeout(() => {
      const peek = snapPoints[0];
      animate(height, [peek, peek + 8, peek], {
        duration: 0.6,
        ease: "easeInOut",
      });
      setHasBounced(true);
    }, 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // First time the user taps a tool from peek state, auto-snap up to
    // half so the colour palette becomes visible. Teaches the gesture
    // implicitly without copy. Only fires once per mount; after that the
    // user is in control of the sheet.
    if (!hasAutoSnappedRef.current && currentSnap === 0) {
      hasAutoSnappedRef.current = true;
      snapTo(1);
    }
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
              "border-2 border-b-0 border-coloring-surface-dark",
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
              aria-label={
                currentSnap === 2 ? "Collapse toolbar" : "Expand toolbar"
              }
            >
              {/* Bigger, slightly shadowed pill — clearer "drag me"
                  affordance than the old 12x1.5 hairline. */}
              <div className="w-14 h-[5px] rounded-full bg-coloring-surface-dark/80 shadow-[0_1px_2px_rgba(0,0,0,0.08)]" />
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
                              ? "bg-gradient-to-br from-coloring-magic-from to-coloring-magic-to text-white"
                              : "bg-gradient-to-br from-coloring-magic-from/10 to-coloring-magic-to/10 text-coloring-magic-from",
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
                              isActive
                                ? "text-white"
                                : "text-coloring-magic-from",
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
                            : "bg-white border-coloring-surface-dark text-coloring-text-primary",
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
               * the magic-tool palette too, matching desktop's single-knob UX.
               * Hidden at peek so the canvas dominates; appears at half. */}
              {currentSnap >= 1 && (
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
                              : "bg-white border-coloring-surface-dark text-coloring-text-primary",
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
              )}

              {/* Colors — grid driven by the current palette variant.
                  Half-snap+ only so peek stays canvas-dominant. */}
              {currentSnap >= 1 && (
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
                              : "border-coloring-surface-dark",
                          )}
                          style={{ backgroundColor: color.hex }}
                          aria-label={`Select ${color.name} color`}
                          aria-pressed={isSelected}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Brush Size Section — full-snap only when brush tool active */}
              {currentSnap >= 2 && showBrushSizeSelector && (
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
                              : "bg-white border-coloring-surface-dark",
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
              {currentSnap >= 2 && showFillTypeSelector && (
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
                              : "bg-white border-coloring-surface-dark",
                          )}
                          aria-label={fill.label}
                          aria-pressed={isActive}
                        >
                          <FontAwesomeIcon
                            icon={fill.icon}
                            size="xl"
                            className={cn(
                              isActive
                                ? "text-white"
                                : "text-coloring-text-primary",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pattern — icon-only tile grid */}
              {currentSnap >= 2 && showPatternSelector && (
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
                              : "bg-white border-coloring-surface-dark",
                          )}
                          aria-label={pattern.label}
                          aria-pressed={isActive}
                        >
                          <FontAwesomeIcon
                            icon={pattern.icon}
                            size="xl"
                            className={cn(
                              isActive
                                ? "text-white"
                                : "text-coloring-text-primary",
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* History Section — Undo/Redo, full-snap only */}
              {currentSnap >= 2 && (
                <div className="mb-4">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className={cn(
                        "size-14 rounded-coloring-card border-2 border-coloring-surface-dark bg-white",
                        "flex items-center justify-center",
                        "transition-all duration-coloring-base ease-coloring active:scale-95",
                        !canUndo && "opacity-50 cursor-not-allowed",
                      )}
                      aria-label="Undo"
                    >
                      <UndoIcon className="size-6 text-coloring-text-primary" />
                    </button>

                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className={cn(
                        "size-14 rounded-coloring-card border-2 border-coloring-surface-dark bg-white",
                        "flex items-center justify-center",
                        "transition-all duration-coloring-base ease-coloring active:scale-95",
                        !canRedo && "opacity-50 cursor-not-allowed",
                      )}
                      aria-label="Redo"
                    >
                      <RedoIcon className="size-6 text-coloring-text-primary" />
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
