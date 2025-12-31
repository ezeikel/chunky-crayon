'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPencil,
  faPaintbrush,
  faFillDrip,
  faSparkles,
  faRainbow,
  faSun,
  faBoltLightning,
  faEraser,
  faStar,
  faBrush,
  faCircle,
  faGripVertical,
  faHeart,
  faBorderAll,
  faTableCellsLarge,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { CanvasAction, useColoringContext } from '@/contexts/coloring';
import {
  ALL_COLORING_COLORS,
  BRUSH_SIZES,
  type FillPattern,
} from '@/constants';
import cn from '@/utils/cn';

// ============================================================================
// Types
// ============================================================================

type Tool =
  | 'crayon'
  | 'marker'
  | 'pencil'
  | 'glitter'
  | 'rainbow'
  | 'glow'
  | 'neon'
  | 'fill'
  | 'eraser'
  | 'sticker'
  | 'magic-reveal'
  | 'magic-auto';

type ToolConfig = {
  id: Tool;
  label: string;
  icon: IconDefinition;
  isMagic?: boolean;
};

type MobileColoringToolbarProps = {
  className?: string;
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
  onStickerToolSelect?: () => void;
};

// ============================================================================
// Constants
// ============================================================================

// Snap points (matching mobile's 140px collapsed, 380px expanded pattern)
const COLLAPSED_HEIGHT = 180; // Enough for handle + tools + colors
const EXPANDED_HEIGHT = 420; // Full height with all sections

// All tools in a single scrollable row (matching mobile pattern)
const tools: ToolConfig[] = [
  { id: 'crayon', label: 'Crayon', icon: faPencil },
  { id: 'marker', label: 'Marker', icon: faPaintbrush },
  { id: 'pencil', label: 'Pencil', icon: faPencil },
  { id: 'glitter', label: 'Glitter', icon: faSparkles },
  { id: 'rainbow', label: 'Rainbow', icon: faRainbow },
  { id: 'glow', label: 'Glow', icon: faSun },
  { id: 'neon', label: 'Neon', icon: faBoltLightning },
  { id: 'fill', label: 'Fill', icon: faFillDrip },
  { id: 'eraser', label: 'Eraser', icon: faEraser },
  { id: 'sticker', label: 'Sticker', icon: faStar },
  { id: 'magic-reveal', label: 'Magic', icon: faBrush, isMagic: true },
  { id: 'magic-auto', label: 'Auto', icon: faFillDrip, isMagic: true },
];

// Pattern options for fill tool
const patternOptions: {
  type: FillPattern;
  label: string;
  icon: IconDefinition;
}[] = [
  { type: 'solid', label: 'Solid', icon: faCircle },
  { type: 'dots', label: 'Dots', icon: faCircle },
  { type: 'stripes', label: 'Stripes', icon: faGripVertical },
  { type: 'hearts', label: 'Hearts', icon: faHeart },
  { type: 'stars', label: 'Stars', icon: faStar },
  { type: 'zigzag', label: 'Zigzag', icon: faBorderAll },
  { type: 'checkerboard', label: 'Checkers', icon: faBorderAll },
];

// ============================================================================
// Subcomponents
// ============================================================================

/** Section header matching mobile's uppercase gray styling */
const SectionHeader = ({ title }: { title: string }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
    {title}
  </h3>
);

/** Undo icon */
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

/** Redo icon */
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
 * Mobile-optimized bottom sheet toolbar matching native mobile design.
 *
 * Features:
 * - Draggable bottom sheet with snap points (collapsed/expanded)
 * - Clear section headers (TOOLS, COLORS, BRUSH SIZE, PATTERNS, HISTORY)
 * - Horizontal scrolling rows for each section
 * - Large touch targets: 48px tools, 40px colors (kid-friendly for ages 3-8)
 * - Smooth CSS transitions for expand/collapse
 */
const MobileColoringToolbar = ({
  className,
  onUndo,
  onRedo,
  onStickerToolSelect,
}: MobileColoringToolbarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(COLLAPSED_HEIGHT);
  const sheetRef = useRef<HTMLDivElement>(null);

  const {
    activeTool,
    selectedColor,
    brushSize,
    selectedPattern,
    setActiveTool,
    setSelectedColor,
    setBrushSize,
    setSelectedPattern,
    canUndo,
    canRedo,
    undoStack,
    redoStack,
    undo: contextUndo,
    redo: contextRedo,
  } = useColoringContext();

  // Show pattern selector only when fill tool is active
  const showPatternSelector = activeTool === 'fill';

  // Calculate current height based on expanded state
  const sheetHeight = isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;

  // -------------------------------------------------------------------------
  // Drag handling for bottom sheet
  // -------------------------------------------------------------------------

  const handleDragStart = useCallback(
    (clientY: number) => {
      setIsDragging(true);
      setDragStartY(clientY);
      setCurrentHeight(sheetHeight);
    },
    [sheetHeight],
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;

      const deltaY = dragStartY - clientY;
      const newHeight = Math.max(
        COLLAPSED_HEIGHT,
        Math.min(EXPANDED_HEIGHT, currentHeight + deltaY),
      );

      if (sheetRef.current) {
        sheetRef.current.style.height = `${newHeight}px`;
      }
    },
    [isDragging, dragStartY, currentHeight],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Snap to closest point
    const currentSheetHeight =
      sheetRef.current?.offsetHeight || COLLAPSED_HEIGHT;
    const midpoint = (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2;
    const shouldExpand = currentSheetHeight > midpoint;

    setIsExpanded(shouldExpand);

    // Reset inline style, let CSS handle the transition
    if (sheetRef.current) {
      sheetRef.current.style.height = '';
    }
  }, [isDragging]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY);
    },
    [handleDragStart],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleDragMove(e.touches[0].clientY);
    },
    [handleDragMove],
  );

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientY);
    },
    [handleDragStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // -------------------------------------------------------------------------
  // Tool handling
  // -------------------------------------------------------------------------

  const handleToolSelect = useCallback(
    (tool: Tool) => {
      // Map tool id to context's expected format
      const toolMap: Record<Tool, string> = {
        crayon: 'crayon',
        marker: 'marker',
        pencil: 'pencil',
        glitter: 'glitter',
        rainbow: 'rainbow',
        glow: 'glow',
        neon: 'neon',
        fill: 'fill',
        eraser: 'eraser',
        sticker: 'sticker',
        'magic-reveal': 'magic-reveal',
        'magic-auto': 'magic-auto',
      };

      setActiveTool(toolMap[tool] as any);

      if (tool === 'sticker') {
        onStickerToolSelect?.();
      }
    },
    [setActiveTool, onStickerToolSelect],
  );

  const isToolActive = (tool: Tool) => {
    return activeTool === tool;
  };

  // -------------------------------------------------------------------------
  // Undo/Redo handling
  // -------------------------------------------------------------------------

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const action = undoStack[undoStack.length - 1];
    contextUndo();
    onUndo?.(action);
  }, [canUndo, undoStack, contextUndo, onUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const action = redoStack[redoStack.length - 1];
    contextRedo();
    onRedo?.(action);
  }, [canRedo, redoStack, contextRedo, onRedo]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={sheetRef}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white rounded-t-3xl',
        'shadow-[0_-4px_24px_rgba(0,0,0,0.15)]',
        'transition-[height] duration-300 ease-out',
        isDragging && 'transition-none',
        'pb-safe',
        className,
      )}
      style={{ height: isDragging ? undefined : sheetHeight }}
    >
      {/* Drag handle */}
      <div
        className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Scrollable content area */}
      <div className="overflow-y-auto overflow-x-hidden h-[calc(100%-28px)] px-4">
        {/* TOOLS Section */}
        <div className="mb-3">
          <SectionHeader title="Tools" />
          <div
            className="overflow-x-auto -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-3">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleToolSelect(tool.id)}
                  className={cn(
                    // Base: 48x48px touch target
                    'flex-shrink-0 size-12 rounded-xl',
                    'flex flex-col items-center justify-center',
                    'transition-all duration-150 active:scale-95',
                    // Default state
                    'bg-gray-100',
                    // Active state
                    isToolActive(tool.id) && 'bg-crayon-orange text-white',
                    // Magic tools slightly wider
                    tool.isMagic && 'w-14',
                  )}
                  aria-label={tool.label}
                  aria-pressed={isToolActive(tool.id)}
                >
                  <FontAwesomeIcon
                    icon={tool.icon}
                    className={cn(
                      'text-xl',
                      isToolActive(tool.id) ? 'text-white' : 'text-gray-600',
                    )}
                  />
                  {tool.isMagic && (
                    <span
                      className={cn(
                        'text-[8px] font-bold uppercase leading-none mt-0.5',
                        isToolActive(tool.id) ? 'text-white' : 'text-gray-600',
                      )}
                    >
                      {tool.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* COLORS Section */}
        <div className="mb-3">
          <SectionHeader title="Colors" />
          <div
            className="overflow-x-auto -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-3">
              {ALL_COLORING_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color.hex)}
                  className={cn(
                    // Base: 40x40px color swatch
                    'flex-shrink-0 size-10 rounded-full',
                    'transition-all duration-150 active:scale-95',
                    // Active: ring indicator
                    selectedColor === color.hex &&
                      'ring-3 ring-gray-700 ring-offset-2 scale-110',
                  )}
                  style={{ backgroundColor: color.hex }}
                  aria-label={`Select color ${color.name}`}
                  aria-pressed={selectedColor === color.hex}
                />
              ))}
            </div>
          </div>
        </div>

        {/* BRUSH SIZE Section (only when expanded) */}
        {isExpanded && (
          <div className="mb-3">
            <SectionHeader title="Brush Size" />
            <div
              className="overflow-x-auto -mx-4 px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex gap-3">
                {Object.entries(BRUSH_SIZES).map(([key, size]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setBrushSize(key as 'small' | 'medium' | 'large')
                    }
                    className={cn(
                      // Base: 48px tall, variable width
                      'flex-shrink-0 h-12 px-4 rounded-xl',
                      'flex items-center justify-center gap-2',
                      'transition-all duration-150 active:scale-95',
                      // Default state
                      'bg-gray-100',
                      // Active state
                      brushSize === key && 'bg-crayon-orange',
                    )}
                    aria-label={size.name}
                    aria-pressed={brushSize === key}
                  >
                    {/* Size indicator dot */}
                    <div
                      className={cn(
                        'rounded-full',
                        brushSize === key ? 'bg-white' : 'bg-gray-600',
                      )}
                      style={{
                        width: Math.min(size.radius, 20),
                        height: Math.min(size.radius, 20),
                      }}
                    />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        brushSize === key ? 'text-white' : 'text-gray-600',
                      )}
                    >
                      {size.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PATTERNS Section (only when fill tool is active and expanded) */}
        {isExpanded && showPatternSelector && (
          <div className="mb-3">
            <SectionHeader title="Patterns" />
            <div
              className="overflow-x-auto -mx-4 px-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex gap-3">
                {patternOptions.map((pattern) => (
                  <button
                    key={pattern.type}
                    type="button"
                    onClick={() => setSelectedPattern(pattern.type)}
                    className={cn(
                      // Base: 48px button
                      'flex-shrink-0 h-12 px-4 rounded-xl',
                      'flex items-center justify-center gap-2',
                      'transition-all duration-150 active:scale-95',
                      // Default state
                      'bg-gray-100',
                      // Active state
                      selectedPattern === pattern.type && 'bg-crayon-orange',
                    )}
                    aria-label={pattern.label}
                    aria-pressed={selectedPattern === pattern.type}
                  >
                    <FontAwesomeIcon
                      icon={pattern.icon}
                      className={cn(
                        'text-base',
                        selectedPattern === pattern.type
                          ? 'text-white'
                          : 'text-gray-600',
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        selectedPattern === pattern.type
                          ? 'text-white'
                          : 'text-gray-600',
                      )}
                    >
                      {pattern.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY Section (only when expanded) */}
        {isExpanded && (
          <div className="mb-3">
            <SectionHeader title="History" />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className={cn(
                  // Base: 48px button
                  'h-12 px-5 rounded-xl',
                  'flex items-center justify-center gap-2',
                  'transition-all duration-150 active:scale-95',
                  // Default state
                  'bg-gray-100',
                  // Disabled state
                  !canUndo && 'opacity-50 cursor-not-allowed',
                )}
                aria-label="Undo"
              >
                <UndoIcon className="size-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Undo</span>
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className={cn(
                  // Base: 48px button
                  'h-12 px-5 rounded-xl',
                  'flex items-center justify-center gap-2',
                  'transition-all duration-150 active:scale-95',
                  // Default state
                  'bg-gray-100',
                  // Disabled state
                  !canRedo && 'opacity-50 cursor-not-allowed',
                )}
                aria-label="Redo"
              >
                <RedoIcon className="size-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Redo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileColoringToolbar;
