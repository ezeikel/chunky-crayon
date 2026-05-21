"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "vaul";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
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
import { faHandPointer } from "@fortawesome/pro-solid-svg-icons";
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
  /**
   * Translated label shown under the pulsing hand affordance on the
   * drag handle for first-time visitors (e.g. "Drag for tools"). Omit
   * to render the hand without a label. Persisted dismissal lives in
   * localStorage('coloring-drawer-handle-hinted').
   */
  handleHintLabel?: string;
  /**
   * Which feature set to render.
   *
   * - `'full'` (default): the real coloring experience used on
   *   /coloring-image/[id] — all 10 tools, palette variant switcher,
   *   fill types, patterns, brush sizes, undo/redo.
   * - `'slim'`: a stripped-down variant for marketing surfaces like
   *   /start where there's no save/undo/sticker state to drive. Renders
   *   only crayon / magic-auto (one-shot) / eraser in the tools row,
   *   skips the palette variant switcher / fill / patterns / sticker /
   *   magic-reveal / undo / redo. The shell (vaul, snap points, drag
   *   physics, pulsing-hand hint, safe-area handling) is identical, so
   *   improvements to either surface land in both.
   */
  variant?: "full" | "slim";
  /**
   * Optional content rendered as extra cells at the end of the tools
   * row. Only used by the `slim` variant — lets marketing surfaces
   * inline Print / Save (or any action buttons) alongside crayon /
   * magic / eraser so the whole controls block reads as one row. The
   * tools row is a 5-col grid; pass a fragment of grid-cell children
   * (e.g. two wrappers around PrintButton + SaveButton).
   */
  trailingAction?: React.ReactNode;
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
// Slim variant only renders crayon / magic-auto / eraser. Marketing
// surfaces (e.g. /start) don't have save/undo/sticker state, so the
// rest of the full tool set is meaningless there.
const slimTools: ToolConfig[] = [
  { id: "crayon", label: "Crayon", icon: faPencil },
  {
    id: "magic-auto",
    label: "Auto Color",
    shortLabel: "Magic",
    icon: faBrush,
    isMagic: true,
  },
  { id: "eraser", label: "Eraser", icon: faEraser },
];

const MobileColoringDrawer = ({
  className,
  onUndo,
  onRedo,
  onStickerToolSelect,
  handleHintLabel,
  variant = "full",
  trailingAction,
}: MobileColoringDrawerProps) => {
  const isSlim = variant === "slim";
  const visibleTools = isSlim ? slimTools : tools;
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

  // Four snap points. Heights in px so behaviour is predictable across
  // devices. Bumped by ~16-20px after the drag handle's vertical hit
  // area grew (py-5 instead of pt-3 pb-2) so a 5-year-old can actually
  // grab it; minimums and tools-row peek scale up to match.
  // - MIN  64px:   drag handle only — minimum footprint for users who
  //                want full canvas visibility while coloring.
  //                Drag-down only (not part of the click cycle).
  // - PEEK 140px:  drag handle + tools row. Default mount state.
  // - HALF 360px:  adds palette-variant switcher + color swatches.
  // - FULL 580px:  adds brush sizes / fill / patterns / undo-redo.
  const snapPoints = [64, 140, 360, 580] as const;
  type SnapIndex = 0 | 1 | 2 | 3;
  // Default mount state is PEEK (index 1), not MIN. MIN is a power-user
  // drag-down destination, not the first thing a new user should see.
  const DEFAULT_SNAP: SnapIndex = 1;

  const height = useMotionValue<number>(snapPoints[DEFAULT_SNAP]);
  const [currentSnap, setCurrentSnap] = useState<SnapIndex>(DEFAULT_SNAP);
  // Tracks whether the user has tapped a tool yet. Auto-snap-up on first
  // tool tap teaches the gesture implicitly — like an iOS keyboard
  // expanding when you focus a text field. After the first tap we don't
  // force-snap again; the user is in control.
  const hasAutoSnappedRef = useRef(false);
  // Tracks whether the user has clicked the drag handle yet. The very
  // first click jumps straight to full — most users wanted "show me
  // everything" not "show me a bit more." After that, taps cycle
  // peek → half → full → peek as normal.
  const hasFirstHandleClickFiredRef = useRef(false);

  // First-visit-only pulsing hand on the drag handle. Same vocabulary as
  // the canvas TapPromptOverlay — pulsing orange ring around faHandPointer
  // — so the page reads as one consistent "this is interactive" language.
  // Dismisses on first drag or click of the handle, persisted via
  // localStorage so it never reappears on subsequent visits. Starts off
  // and flips on after the localStorage check on mount to avoid a flash
  // for repeat visitors.
  const [showHandleHint, setShowHandleHint] = useState(false);

  // Live drawer height tracked into React state so the hint can
  // re-render its position on every framer animation tick. We can't use
  // viewport-relative top measurements because iOS Safari's collapsing
  // URL bar shifts visual viewport without firing resize — but the
  // drawer is position:fixed bottom:0, so its top edge is exactly
  // `drawerHeight` px from the visual viewport bottom. Anchoring the
  // hint with `bottom: drawerHeight + gap` (also bottom-relative to
  // visual viewport via position:fixed) means both elements move
  // together when Safari's chrome collapses or expands.
  const [drawerHeightLive, setDrawerHeightLive] = useState<number>(
    snapPoints[DEFAULT_SNAP],
  );

  // In-app browsers (Instagram, Facebook, TikTok) overlay their own
  // bottom chrome on top of the page without pushing
  // env(safe-area-inset-bottom) down — so `pb-safe` alone won't keep
  // the drawer above their gesture bar / close button row. The visual
  // viewport API is the only reliable signal: the difference between
  // window.innerHeight (layout viewport bottom) and
  // visualViewport.offsetTop + visualViewport.height (visible bottom)
  // is the chrome's height. Pad the drawer's bottom by that amount so
  // tools never hide under the in-app browser footer.
  const [visualBottomInset, setVisualBottomInset] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const inset = Math.max(
        0,
        window.innerHeight - (vv.offsetTop + vv.height),
      );
      setVisualBottomInset(inset);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

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
      // Flick UP = grow drawer (negative delta in framer pan space).
      // Flick DOWN = shrink.
      const maxIndex = (snapPoints.length - 1) as SnapIndex;
      if (velocityY < 0 && closest < maxIndex) {
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
    // First drag dismisses the pulsing-hand hint — once they've grabbed
    // the handle, the affordance has done its job. Also marks the
    // first-click flag so a later click cycles normally rather than
    // jumping back to full unexpectedly.
    dismissHandleHint();
    hasFirstHandleClickFiredRef.current = true;
    // Dragging up (negative delta.y) grows the sheet. Clamp between
    // MIN (snapPoints[0]) and FULL (snapPoints[snapPoints.length-1]).
    const currentHeight = height.get();
    const newHeight = Math.max(
      snapPoints[0],
      Math.min(snapPoints[snapPoints.length - 1], currentHeight - info.delta.y),
    );
    height.set(newHeight);
  };

  const handlePanEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    snapTo(nearestSnap(height.get(), info.velocity.y));
  };

  // Tap on the handle. First click jumps to FULL so the user sees every
  // tool at once — that's the action that pays for the affordance hint.
  // After the first click, taps cycle through every snap so MIN is
  // reachable via click as well as drag:
  //   PEEK(1) → HALF(2) → FULL(3) → MIN(0) → PEEK(1) → ...
  const handleToggle = () => {
    dismissHandleHint();
    if (!hasFirstHandleClickFiredRef.current) {
      hasFirstHandleClickFiredRef.current = true;
      snapTo(3);
      return;
    }
    const next = ((currentSnap + 1) % snapPoints.length) as SnapIndex;
    snapTo(next);
  };

  // Once-on-mount bounce — handle floats up ~8px and back over 600ms
  // when the drawer first appears. Catches the eye, confirms it's
  // interactive without copy. Only runs at the default mount state.
  const [hasBounced, setHasBounced] = useState(false);
  useEffect(() => {
    if (hasBounced) return;
    const id = window.setTimeout(() => {
      const peek = snapPoints[DEFAULT_SNAP];
      animate(height, [peek, peek + 8, peek], {
        duration: 0.6,
        ease: "easeInOut",
      });
      setHasBounced(true);
    }, 400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle hint visibility — first visit only. Same vocabulary as the
  // canvas tap prompt so the page reads as one consistent affordance
  // language. Skipped if the user has already interacted with the
  // handle on a prior visit.
  useEffect(() => {
    try {
      if (window.localStorage.getItem("coloring-drawer-handle-hinted")) return;
    } catch {
      // Storage disabled — show the hint anyway, first interaction will
      // still dismiss it for the session.
    }
    setShowHandleHint(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissHandleHint = () => {
    if (!showHandleHint) return;
    setShowHandleHint(false);
    try {
      window.localStorage.setItem("coloring-drawer-handle-hinted", "1");
    } catch {
      // ignore
    }
  };

  // Keep the live drawer height in React state so the hint's
  // bottom-anchored position re-renders during framer height
  // animations (peek -> half -> full snap). The framer motionValue
  // itself updates the inline style on the drawer's motion.div, but
  // we need a re-render to reposition the portal hint as well.
  useMotionValueEvent(height, "change", (latest) => {
    setDrawerHeightLive(latest);
  });

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

    // First time the user taps a tool while the drawer is below HALF
    // (i.e. at MIN or PEEK), auto-snap up to HALF so the colour palette
    // becomes visible. Teaches the gesture implicitly without copy.
    // Only fires once per mount; after that the user is in control.
    if (!hasAutoSnappedRef.current && currentSnap < 2) {
      hasAutoSnappedRef.current = true;
      snapTo(2);
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
    <>
      <Drawer.Root open modal={false} dismissible={false}>
        <Drawer.Portal>
          <Drawer.Content aria-describedby={undefined} asChild>
            <motion.div
              className={cn(
                "fixed left-0 right-0 z-50 mx-2",
                "flex flex-col overflow-hidden",
                "bg-white rounded-t-3xl",
                "border-2 border-b-0 border-coloring-surface-dark",
                "shadow-[0_-4px_16px_rgba(0,0,0,0.15)]",
                // Safe area padding for notched devices. visualBottomInset
                // (applied via inline `bottom`) handles in-app browser
                // chrome that env(safe-area-inset-bottom) doesn't reach.
                "pb-safe",
                className,
              )}
              style={{ height, bottom: visualBottomInset }}
            >
              {/* Accessible title - visually hidden */}
              <Drawer.Title className="sr-only">Coloring Tools</Drawer.Title>

              {/* Drag handle - drag or click to toggle expanded/collapsed.
                  Tall (~56px) padding around a small visible pill: a 5yo
                  needs a chunky hit area, but a chunky pill looks wrong.
                  The padding is on the touch target, not the pill. */}
              <motion.div
                role="button"
                tabIndex={0}
                className="flex items-center justify-center py-5 w-full cursor-grab active:cursor-grabbing touch-none select-none"
                onPan={handlePan}
                onPanEnd={handlePanEnd}
                onTap={handleToggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleToggle();
                  }
                }}
                aria-label={
                  currentSnap === 3
                    ? "Collapse toolbar"
                    : currentSnap <= 1
                      ? "Expand toolbar"
                      : "Expand toolbar more"
                }
              >
                {/* Bigger, slightly shadowed pill — clearer "drag me"
                  affordance than the old 12x1.5 hairline. */}
                <div className="w-14 h-[5px] rounded-full bg-coloring-surface-dark/80 shadow-[0_1px_2px_rgba(0,0,0,0.08)]" />
              </motion.div>

              {/* Scrollable content area. `pt-4` gives the magic
                  tool's sparkle decoration (`-top-2 -right-2` on the
                  button) room to peek out — the sparkle icon itself
                  is ~14px tall and offset 8px above the button, so
                  it needs ~16px of headroom or it gets clipped by
                  the scroll area's top edge. Bumped `px-4 → px-5`
                  for the same reason on the right side, where the
                  full variant's magic-auto sits as the last cell. */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pt-4 pb-4">
                {/* Tools — icon-only chunky-card grid, matching desktop sidebar.
                    Slim variant renders 3 tools + the consumer's trailing
                    action cells (e.g. Print + Save) in the same 5-col
                    grid so everything reads as one row. */}
                <div className="mb-4">
                  <div className="grid grid-cols-5 gap-2">
                    {visibleTools.map((tool) => {
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
                    {isSlim && trailingAction}
                  </div>
                </div>

                {/* Palette variant switcher — swaps the swatch grid and drives
                 * the magic-tool palette too, matching desktop's single-knob UX.
                 * Always rendered so the inner overflow-y-auto can scroll to it
                 * even at peek; the snap height controls how much is visible.
                 * Slim variant hides this — marketing surfaces use the
                 * default 'realistic' palette and don't expose mood. */}
                {!isSlim && (
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
                  Always rendered; scrollable at peek via the parent
                  overflow-y-auto. */}
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

                {/* Brush Size Section — only when brush tool active.
                    Always rendered (when applicable) so it's reachable
                    by scroll at any snap. */}
                {showBrushSizeSelector && (
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

                {/* Fill Type — icon-only tiles matching tools. Slim
                    variant has no fill tool, so this is never shown. */}
                {!isSlim && showFillTypeSelector && (
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

                {/* Pattern — icon-only tile grid. Slim has no fill, no patterns. */}
                {!isSlim && showPatternSelector && (
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

                {/* History Section — Undo/Redo. Slim variant has no
                    history (marketing canvas, no save/restore state)
                    so the row is hidden entirely. */}
                {!isSlim && (
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
      {/* First-visit pulsing hand — same vocabulary as the canvas
        TapPromptOverlay so the page reads as one consistent "this is
        interactive" language. Rendered via createPortal to document.body
        so it lives at the body root, completely outside the drawer's
        stacking + clipping context (the drawer's overflow-hidden,
        load-bearing for rounded-t-3xl corner masking during animation,
        was clipping the hint when it lived inside Drawer.Content even
        with z-index escalation). Anchored to the drawer's top edge via
        fixed positioning; disappears on first interaction and is
        persisted via localStorage. SSR-safe via the typeof window check.
        */}
      {showHandleHint &&
        typeof window !== "undefined" &&
        createPortal(
          // Anchored to the visual viewport BOTTOM via position:fixed +
          // bottom: (drawerHeight + gap). Crucially this avoids any
          // viewport-top measurements — iOS Safari's collapsing URL
          // bar shifts the visual viewport top without firing resize,
          // so any approach that captures handle.top via
          // getBoundingClientRect goes stale and the hint drifts to
          // the middle of the canvas. The drawer itself is bottom:0,
          // so anchoring to the same edge keeps the two locked
          // together regardless of Safari chrome state.
          //
          // drawerHeightLive updates every framer tick so the hint
          // smoothly tracks the snap animations (peek -> half -> full).
          <div
            aria-hidden
            // md:hidden — the parent MobileColoringDrawer is gated to
            // mobile widths but `createPortal` mounts this hint into
            // document.body, escaping that gate. Without the explicit
            // hidden class here the hint label and pulsing ring leak
            // onto desktop where there's no drawer to drag.
            className="pointer-events-none fixed left-0 right-0 z-[60] flex justify-center md:hidden"
            style={{
              bottom: drawerHeightLive + visualBottomInset + 12,
            }}
          >
            <div className="relative flex flex-col items-center gap-2">
              {handleHintLabel && (
                <span className="font-tondo font-bold text-xs sm:text-sm text-coloring-text-primary bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-md border border-coloring-surface-dark whitespace-nowrap">
                  {handleHintLabel}
                </span>
              )}
              {/* 44x44 footprint — matches the visible ring extent at
                  the most opaque part of the pulse. The rings *visually*
                  extend a few px past this at peak but they're nearly
                  fully transparent there, so trimming the bbox here
                  removes wasted vertical space without showing a hard
                  edge. ResizeObserver-driven positioning (above) uses
                  this measurement to keep a 12px gap to the handle. */}
              <div className="relative w-11 h-11 flex items-center justify-center">
                <span
                  className="absolute w-9 h-9 rounded-full bg-crayon-orange/55 animate-ping"
                  style={{ animationDuration: "1.6s" }}
                />
                <span
                  className="absolute w-9 h-9 rounded-full bg-crayon-orange/35 animate-ping"
                  style={{
                    animationDuration: "1.6s",
                    animationDelay: "0.8s",
                  }}
                />
                <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-crayon-orange shadow-btn-primary">
                  <FontAwesomeIcon
                    icon={faHandPointer}
                    className="text-base text-white"
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default MobileColoringDrawer;
