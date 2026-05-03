"use client";

import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencil,
  faPaintbrush,
  faPenNib,
  faPaintRoller,
  faFillDrip,
  faEraser,
  faSparkles,
  faStar,
  faBrush,
  faHand,
} from "@fortawesome/pro-duotone-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { CanvasAction, useColoringContext } from "./context";
import { BRUSH_SIZES, type BrushSize } from "./types";
import { useSound } from "./useSound";
import {
  ActionButtonSizeProvider,
  type ActionButtonSize,
} from "./ActionButton";
import cn from "./cn";

type ToolId =
  | "crayon"
  | "marker"
  | "pencil"
  | "paintbrush"
  | "glitter"
  | "fill"
  | "eraser"
  | "sticker"
  | "magic-reveal"
  | "magic-auto";

type ToolConfig = {
  id: ToolId;
  defaultLabel: string;
  icon: IconDefinition;
};

/**
 * Optional label overrides. Apps can pass translated strings; omitted
 * keys fall back to the English defaults baked into the component.
 */
export type DesktopToolsSidebarLabels = Partial<Record<ToolId, string>> & {
  magicColoring?: string;
  autoColorDone?: string;
  brushSize?: Partial<Record<BrushSize, string>>;
  undo?: string;
  redo?: string;
  zoomIn?: string;
  zoomOut?: string;
  pan?: string;
  resetView?: string;
};

/** Tile sizing for tools/brush-size/undo/redo/zoom controls.
 * `default` = 64px tiles, 12px gap (chunky, good for kid-focused themes).
 * `compact` = 48px tiles, 8px gap (dense, good for adult/airy themes). */
export type DesktopToolsSidebarSize = "default" | "compact";

type DesktopToolsSidebarProps = {
  className?: string;
  /** Undo/redo handlers wired to the canvas */
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
  /** Opens the app's sticker selector modal */
  onStickerToolSelect?: () => void;
  /** Brand-specific action buttons (Start Over, Download, Share, Save, ...).
   * Rendered in the Actions row, same horizontal layout as the sidebar's
   * tool grid. Radix-style slot: each app supplies its own composed
   * button components. */
  actions?: ReactNode;
  /** Whether the sticker tool tile is shown. CC = true, CH = false. */
  showStickers?: boolean;
  /** Optional translated labels; English fallbacks used when omitted. */
  labels?: DesktopToolsSidebarLabels;
  /** Overall tile sizing — `default` (64px) or `compact` (48px). */
  size?: DesktopToolsSidebarSize;
};

const regularToolsAll: ToolConfig[] = [
  { id: "crayon", defaultLabel: "Crayon", icon: faPencil },
  { id: "marker", defaultLabel: "Marker", icon: faPaintbrush },
  { id: "pencil", defaultLabel: "Pencil", icon: faPenNib },
  { id: "paintbrush", defaultLabel: "Paint", icon: faPaintRoller },
  { id: "glitter", defaultLabel: "Glitter", icon: faSparkles },
  { id: "fill", defaultLabel: "Fill", icon: faFillDrip },
  { id: "eraser", defaultLabel: "Eraser", icon: faEraser },
  { id: "sticker", defaultLabel: "Sticker", icon: faStar },
];

const magicTools: ToolConfig[] = [
  { id: "magic-reveal", defaultLabel: "Magic Brush", icon: faBrush },
  { id: "magic-auto", defaultLabel: "Auto Color", icon: faFillDrip },
];

const DEFAULT_BRUSH_SIZE_LABELS: Record<BrushSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const UndoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const RedoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
  </svg>
);

const ZoomInIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

/**
 * Desktop (xl+) vertical tools sidebar.
 *
 * Composition: tool grid → magic tools → brush sizes → undo/redo →
 * zoom controls → actions slot. Themed entirely via `coloring-*` CSS
 * custom properties so the same component renders as CC or CH.
 *
 * Radix-style: the app passes its own action buttons (Start Over,
 * Download, Share, Save) as the `actions` slot.
 */
const DesktopToolsSidebar = ({
  className,
  onUndo,
  onRedo,
  onStickerToolSelect,
  actions,
  showStickers = true,
  labels = {},
  size = "default",
}: DesktopToolsSidebarProps) => {
  const isCompact = size === "compact";
  const tileSize = isCompact ? "size-12" : "size-16";
  const smallTileSize = isCompact ? "size-10" : "size-12";
  const gridGap = isCompact ? "gap-2" : "gap-3";
  // Sidebar actions always render as tiles (icon-only squares) — same
  // structural layout for every brand, only the tile size scales with
  // the sidebar's own `size`. Brand theming happens via tokens, not
  // layout. Apps can still override per-button with an explicit `size`.
  const actionSlotSize: ActionButtonSize = isCompact ? "tile-compact" : "tile";
  const {
    activeTool,
    setActiveTool,
    brushType,
    setBrushType,
    brushSize,
    setBrushSize,
    selectedColor,
    canUndo,
    canRedo,
    undo,
    redo,
    zoom,
    setZoom,
    resetView,
    minZoom,
    maxZoom,
    isAutoColoring,
    hasAutoColored,
  } = useColoringContext();
  const { playSound } = useSound();

  const regularTools = showStickers
    ? regularToolsAll
    : regularToolsAll.filter((tool) => tool.id !== "sticker");

  const handleToolSelect = (toolId: ToolId) => {
    switch (toolId) {
      case "crayon":
      case "marker":
      case "pencil":
      case "paintbrush":
      case "glitter":
      case "eraser":
        setActiveTool("brush");
        setBrushType(toolId);
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

  const isToolActive = (toolId: ToolId) => {
    if (toolId === "fill") return activeTool === "fill";
    if (toolId === "sticker") return activeTool === "sticker";
    if (toolId === "magic-reveal") return activeTool === "magic-reveal";
    if (toolId === "magic-auto") return activeTool === "magic-auto";
    return activeTool === "brush" && brushType === toolId;
  };

  const handleUndo = () => {
    const action = undo();
    if (action && onUndo) onUndo(action);
  };

  const handleRedo = () => {
    const action = redo();
    if (action && onRedo) onRedo(action);
  };

  const ZOOM_STEP = 0.5;
  const handleZoomIn = () => {
    setZoom(Math.min(maxZoom, zoom + ZOOM_STEP));
    playSound("pop");
  };
  const handleZoomOut = () => {
    setZoom(Math.max(minZoom, zoom - ZOOM_STEP));
    playSound("pop");
  };
  const handleResetView = () => {
    resetView();
    playSound("pop");
  };
  const handlePanToggle = () => {
    setActiveTool(activeTool === "pan" ? "brush" : "pan");
    playSound("pop");
  };

  const isZoomed = zoom > 1;
  const isPanActive = activeTool === "pan";

  const sizes = Object.entries(BRUSH_SIZES) as [
    BrushSize,
    (typeof BRUSH_SIZES)[BrushSize],
  ][];

  return (
    <div
      className={cn(
        "w-fit flex flex-col gap-4 p-4 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-coloring-surface-dark shadow-lg",
        className,
      )}
    >
      {/* Regular Tools — 3×N icon grid */}
      <div className="flex flex-col gap-2">
        <div className={cn("grid grid-cols-3 w-fit", gridGap)}>
          {regularTools.map(({ id, defaultLabel, icon }) => {
            const isActive = isToolActive(id);
            const label = labels[id] ?? defaultLabel;
            return (
              <button
                type="button"
                key={id}
                onClick={() => handleToolSelect(id)}
                className={cn(
                  "flex items-center justify-center rounded-coloring-card transition-all duration-coloring-base ease-coloring",
                  tileSize,
                  "active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
                  isActive
                    ? "bg-coloring-accent text-white hover:bg-coloring-accent-dark shadow-sm"
                    : "bg-white border border-coloring-surface-dark text-coloring-text-primary hover:bg-coloring-surface",
                )}
                aria-label={label}
                title={label}
                aria-pressed={isActive}
                data-testid={`tool-${id}`}
              >
                <FontAwesomeIcon icon={icon} size="xl" />
              </button>
            );
          })}
        </div>

        {/* Magic Tools — 2-up tiles with sparkle marker */}
        <div className={cn("grid grid-cols-2 w-fit mt-1", gridGap)}>
          {magicTools.map(({ id, defaultLabel, icon }) => {
            const isActive = isToolActive(id);
            const isAutoColorBtn = id === "magic-auto";
            const showSpinner = isAutoColorBtn && isAutoColoring;
            const isAutoColorDone = isAutoColorBtn && hasAutoColored;
            const label = labels[id] ?? defaultLabel;
            const spinnerLabel = labels.magicColoring ?? "Coloring…";
            const doneLabel = labels.autoColorDone ?? "Auto colored";
            return (
              <button
                type="button"
                key={id}
                onClick={() => handleToolSelect(id)}
                disabled={showSpinner || isAutoColorDone}
                className={cn(
                  "relative flex items-center justify-center rounded-coloring-card border transition-all duration-coloring-base ease-coloring",
                  tileSize,
                  "active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-magic-from",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isActive || showSpinner
                    ? "bg-gradient-to-br from-coloring-magic-from to-coloring-magic-to text-white border-transparent"
                    : isAutoColorDone
                      ? "bg-gray-100 text-gray-400 border-gray-200"
                      : "bg-gradient-to-br from-coloring-magic-from/20 to-coloring-magic-to/20 text-coloring-magic-from border-coloring-magic-from/30 hover:from-coloring-magic-from/30 hover:to-coloring-magic-to/30",
                )}
                aria-label={
                  showSpinner
                    ? spinnerLabel
                    : isAutoColorDone
                      ? doneLabel
                      : label
                }
                title={
                  showSpinner
                    ? spinnerLabel
                    : isAutoColorDone
                      ? doneLabel
                      : label
                }
                aria-pressed={isActive}
                data-testid={`tool-${id}`}
              >
                {showSpinner ? (
                  <div className="size-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={icon} size="xl" />
                )}
                {!showSpinner && !isAutoColorDone && (
                  <FontAwesomeIcon
                    icon={faSparkles}
                    size="lg"
                    aria-hidden
                    className={cn(
                      "absolute -top-2 -right-2 drop-shadow-sm",
                      isActive ? "text-white" : "text-coloring-magic-from",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-coloring-surface-dark" />

      {/* Brush Sizes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          {sizes.map(([size, config]) => {
            const isSelected = brushSize === size;
            const displayColor =
              brushType === "eraser" ? "#9E9E9E" : selectedColor;
            const sizeLabel =
              labels.brushSize?.[size] ?? DEFAULT_BRUSH_SIZE_LABELS[size];
            return (
              <button
                type="button"
                key={size}
                onClick={() => {
                  setBrushSize(size);
                  playSound("tap");
                }}
                className={cn(
                  "flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150",
                  "hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
                  {
                    "bg-gray-200 ring-2 ring-gray-400": isSelected,
                  },
                )}
                aria-label={sizeLabel}
                title={sizeLabel}
                data-testid={`brush-size-${size}`}
              >
                <span
                  className="rounded-full transition-colors"
                  style={{
                    width: `${Math.min(config.radius * 2, 32)}px`,
                    height: `${Math.min(config.radius * 2, 32)}px`,
                    backgroundColor: displayColor,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-coloring-surface-dark" />

      {/* Undo / Redo */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className={cn(
              "flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-coloring-accent",
              canUndo
                ? "hover:bg-gray-100 active:scale-95 text-coloring-text-primary"
                : "text-gray-300 cursor-not-allowed",
            )}
            aria-label={labels.undo ?? "Undo"}
            title={labels.undo ?? "Undo"}
          >
            <UndoIcon className="size-8" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className={cn(
              "flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-coloring-accent",
              canRedo
                ? "hover:bg-gray-100 active:scale-95 text-coloring-text-primary"
                : "text-gray-300 cursor-not-allowed",
            )}
            aria-label={labels.redo ?? "Redo"}
            title={labels.redo ?? "Redo"}
          >
            <RedoIcon className="size-8" />
          </button>
        </div>
      </div>

      <div className="h-px bg-coloring-surface-dark" />

      {/* Zoom */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= minZoom}
            className={cn(
              "flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150",
              "hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
              zoom <= minZoom &&
                "opacity-50 cursor-not-allowed hover:bg-transparent",
            )}
            aria-label={labels.zoomOut ?? "Zoom out"}
            title={labels.zoomOut ?? "Zoom out"}
          >
            <ZoomOutIcon className="size-7" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
            className={cn(
              "flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150",
              "hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
              zoom >= maxZoom &&
                "opacity-50 cursor-not-allowed hover:bg-transparent",
            )}
            aria-label={labels.zoomIn ?? "Zoom in"}
            title={labels.zoomIn ?? "Zoom in"}
          >
            <ZoomInIcon className="size-7" />
          </button>

          {isZoomed && (
            <>
              <button
                type="button"
                onClick={handlePanToggle}
                className={cn(
                  "flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150",
                  "hover:bg-gray-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
                  isPanActive &&
                    "bg-coloring-accent text-white hover:bg-coloring-accent-dark",
                )}
                aria-label={labels.pan ?? "Pan"}
                title={labels.pan ?? "Pan"}
                aria-pressed={isPanActive}
              >
                <FontAwesomeIcon icon={faHand} size="lg" />
              </button>

              <button
                type="button"
                onClick={handleResetView}
                className={cn(
                  "flex items-center justify-center size-12 rounded-coloring-card transition-all duration-150",
                  "bg-coloring-accent/10 hover:bg-coloring-accent/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-coloring-accent",
                )}
                aria-label={labels.resetView ?? "Reset view"}
                title={labels.resetView ?? "Reset view"}
              >
                <HomeIcon className="size-7 text-coloring-accent" />
              </button>
            </>
          )}
        </div>

        <div className="text-center font-coloring-heading font-bold text-xl text-coloring-text-primary tabular-nums">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {actions && (
        <>
          <div className="h-px bg-coloring-surface-dark" />
          <ActionButtonSizeProvider value={actionSlotSize}>
            {/* 3-col grid matches the tool grid above so action tiles
             * line up column-for-column. Wraps to a second row when
             * there are 4+ actions (e.g. authenticated users see a 5th
             * SaveToGallery tile). w-fit keeps the grid tight to the
             * tile width instead of stretching across the sidebar. */}
            <div className={cn("grid grid-cols-3 w-fit", gridGap)}>
              {actions}
            </div>
          </ActionButtonSizeProvider>
        </>
      )}
    </div>
  );
};

export default DesktopToolsSidebar;
