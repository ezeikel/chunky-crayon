'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from 'framer-motion';
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
  faWandSparkles,
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
  type BrushSize,
} from '@/constants';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';

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

// All tools in a single scrollable row (matching mobile pattern)
const tools: ToolConfig[] = [
  { id: 'crayon', label: 'Crayon', icon: faPencil },
  { id: 'marker', label: 'Marker', icon: faPaintbrush },
  { id: 'glitter', label: 'Glitter', icon: faSparkles },
  { id: 'sparkle', label: 'Sparkle', icon: faWandSparkles },
  { id: 'rainbow', label: 'Rainbow', icon: faRainbow },
  { id: 'glow', label: 'Glow', icon: faSun },
  { id: 'neon', label: 'Neon', icon: faBoltLightning },
  { id: 'fill', label: 'Fill', icon: faFillDrip },
  { id: 'eraser', label: 'Eraser', icon: faEraser },
  { id: 'sticker', label: 'Sticker', icon: faStar },
  {
    id: 'magic-reveal',
    label: 'Magic Brush',
    shortLabel: 'Magic',
    icon: faBrush,
    isMagic: true,
  },
  {
    id: 'magic-auto',
    label: 'Auto Color',
    shortLabel: 'Auto',
    icon: faFillDrip,
    isMagic: true,
  },
];

// Fill type options - matching mobile native exactly
type FillType = 'solid' | 'pattern';
const fillTypes: { type: FillType; label: string; icon: IconDefinition }[] = [
  { type: 'solid', label: 'Solid', icon: faCircle },
  { type: 'pattern', label: 'Pattern', icon: faTableCellsLarge },
];

// Pattern options - matching mobile native exactly (same icons)
const patternTypes: {
  type: FillPattern;
  label: string;
  icon: IconDefinition;
}[] = [
  { type: 'dots', label: 'Dots', icon: faCircle },
  { type: 'stripes', label: 'Stripes', icon: faGripVertical },
  { type: 'hearts', label: 'Hearts', icon: faHeart },
  { type: 'stars', label: 'Stars', icon: faStar },
  { type: 'zigzag', label: 'Zigzag', icon: faBorderAll },
];

// ============================================================================
// Subcomponents
// ============================================================================

// Section header component matching mobile app style
const SectionTitle = ({ title }: { title: string }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 font-body">
    {title}
  </h3>
);

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
 * - Tool buttons: 48x48px, 8px gap, rounded-xl, bg-gray-100
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
    setActiveTool,
    setBrushType,
    setSelectedColor,
    setBrushSize,
    setSelectedPattern,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useColoringContext();
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
    type: 'spring' as const,
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
  const showFillTypeSelector = activeTool === 'fill';
  // Derive fillType from selectedPattern (solid = solid, anything else = pattern)
  const fillType: FillType = selectedPattern === 'solid' ? 'solid' : 'pattern';
  // Show pattern selector only when fill tool is active AND fillType is 'pattern'
  const showPatternSelector = activeTool === 'fill' && fillType === 'pattern';
  // Show brush size selector when brush tool is active
  const showBrushSizeSelector = activeTool === 'brush';

  // -------------------------------------------------------------------------
  // Tool handling
  // -------------------------------------------------------------------------

  const handleToolSelect = (toolId: string) => {
    switch (toolId) {
      case 'crayon':
        setActiveTool('brush');
        setBrushType('crayon');
        break;
      case 'marker':
        setActiveTool('brush');
        setBrushType('marker');
        break;
      case 'glitter':
        setActiveTool('brush');
        setBrushType('glitter');
        break;
      case 'sparkle':
        setActiveTool('brush');
        setBrushType('sparkle');
        break;
      case 'rainbow':
        setActiveTool('brush');
        setBrushType('rainbow');
        break;
      case 'glow':
        setActiveTool('brush');
        setBrushType('glow');
        break;
      case 'neon':
        setActiveTool('brush');
        setBrushType('neon');
        break;
      case 'eraser':
        setActiveTool('brush');
        setBrushType('eraser');
        break;
      case 'fill':
        setActiveTool('fill');
        break;
      case 'sticker':
        setActiveTool('sticker');
        onStickerToolSelect?.();
        break;
      case 'magic-reveal':
        setActiveTool('magic-reveal');
        break;
      case 'magic-auto':
        setActiveTool('magic-auto');
        break;
    }
    playSound('pop');
  };

  const isToolActive = (toolId: string) => {
    if (toolId === 'fill') return activeTool === 'fill';
    if (toolId === 'sticker') return activeTool === 'sticker';
    if (toolId === 'magic-reveal') return activeTool === 'magic-reveal';
    if (toolId === 'magic-auto') return activeTool === 'magic-auto';
    // For brush-based tools, check both activeTool and brushType
    return activeTool === 'brush' && brushType === toolId;
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
              'fixed bottom-0 left-0 right-0 z-50 mx-2',
              'flex flex-col overflow-hidden',
              'bg-white rounded-t-3xl',
              'shadow-[0_-4px_16px_rgba(0,0,0,0.15)]',
              // Safe area padding for notched devices
              'pb-safe',
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
                if (e.key === 'Enter' || e.key === ' ') {
                  handleToggle();
                }
              }}
              aria-label={isExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </motion.div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-4">
              {/* Tools Section */}
              <div className="mb-4">
                <SectionTitle title="Tools" />
                <div
                  className="overflow-x-auto -mx-4 px-4 scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div className="flex gap-2">
                    {tools.map((tool) => {
                      const isActive = isToolActive(tool.id);
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => handleToolSelect(tool.id)}
                          className={cn(
                            // Base: 48x48px touch target matching mobile native
                            'shrink-0 size-12 rounded-xl',
                            'flex flex-col items-center justify-center',
                            'transition-all duration-150 active:scale-95',
                            // Default state - bg-gray-100 matching mobile
                            'bg-gray-100',
                            // Active state - crayon orange
                            isActive && 'bg-crayon-orange',
                            // Magic tools slightly wider
                            tool.isMagic && 'w-14 gap-0.5',
                          )}
                          aria-label={tool.label}
                          aria-pressed={isActive}
                        >
                          <FontAwesomeIcon
                            icon={tool.icon}
                            className={cn(
                              tool.isMagic ? 'text-base' : 'text-xl',
                              isActive ? 'text-white' : 'text-gray-600',
                            )}
                          />
                          {tool.isMagic && tool.shortLabel && (
                            <span
                              className={cn(
                                'text-[8px] font-bold uppercase leading-none',
                                isActive ? 'text-white' : 'text-gray-600',
                              )}
                            >
                              {tool.shortLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Colors Section */}
              <div className="mb-4">
                <SectionTitle title="Colors" />
                <div
                  className="overflow-x-auto -mx-4 px-4 scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div className="flex gap-2">
                    {ALL_COLORING_COLORS.map((color) => {
                      const isSelected = selectedColor === color.hex;
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color.hex);
                            playSound('tap');
                          }}
                          className={cn(
                            // Base: 40x40px color swatch matching mobile native
                            'shrink-0 size-10 rounded-full',
                            'border-2 border-gray-200',
                            'transition-all duration-150 active:scale-95',
                            // Active: thicker border matching mobile
                            isSelected &&
                              'border-[3px] border-gray-700 scale-105',
                          )}
                          style={{ backgroundColor: color.hex }}
                          aria-label={`Select ${color.name} color`}
                          aria-pressed={isSelected}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Brush Size Section - only when expanded and brush tool active */}
              {isExpanded && showBrushSizeSelector && (
                <div className="mb-4">
                  <SectionTitle title="Brush Size" />
                  <div className="flex gap-2">
                    {(
                      Object.entries(BRUSH_SIZES) as [
                        BrushSize,
                        (typeof BRUSH_SIZES)[BrushSize],
                      ][]
                    ).map(([size, config]) => {
                      const isSelected = brushSize === size;
                      const displayColor =
                        brushType === 'eraser' ? '#9E9E9E' : selectedColor;
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
                            playSound('tap');
                          }}
                          className={cn(
                            // Base: 48x48px button matching mobile native
                            'shrink-0 size-12 rounded-xl',
                            'flex items-center justify-center',
                            'transition-all duration-150 active:scale-95',
                            // Default state
                            'bg-gray-100',
                            // Active state
                            isSelected && 'bg-crayon-orange',
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
                                ? '#FFFFFF'
                                : displayColor,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fill Type Section - only when expanded and fill tool active (matching mobile) */}
              {isExpanded && showFillTypeSelector && (
                <div className="mb-4">
                  <SectionTitle title="Fill Type" />
                  <div className="flex gap-2">
                    {fillTypes.map((fill) => {
                      const isActive = fillType === fill.type;
                      return (
                        <button
                          key={fill.type}
                          type="button"
                          onClick={() => {
                            // When selecting solid, set pattern to solid
                            // When selecting pattern, set to first pattern type (dots)
                            if (fill.type === 'solid') {
                              setSelectedPattern('solid');
                            } else if (selectedPattern === 'solid') {
                              // Switching from solid to pattern, default to dots
                              setSelectedPattern('dots');
                            }
                            playSound('tap');
                          }}
                          className={cn(
                            // Base: pill-shaped button with label matching mobile
                            'shrink-0 h-12 px-4 rounded-xl',
                            'flex items-center justify-center gap-2',
                            'transition-all duration-150 active:scale-95',
                            // Default state
                            'bg-gray-100',
                            // Active state
                            isActive && 'bg-crayon-orange',
                          )}
                          aria-label={fill.label}
                          aria-pressed={isActive}
                        >
                          <FontAwesomeIcon
                            icon={fill.icon}
                            className={cn(
                              'text-base',
                              isActive ? 'text-white' : 'text-gray-600',
                            )}
                          />
                          <span
                            className={cn(
                              'text-sm font-medium',
                              isActive ? 'text-white' : 'text-gray-600',
                            )}
                          >
                            {fill.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pattern Section - only when expanded, fill tool active AND fillType is 'pattern' (matching mobile) */}
              {isExpanded && showPatternSelector && (
                <div className="mb-4">
                  <SectionTitle title="Pattern" />
                  <div
                    className="overflow-x-auto -mx-4 px-4 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    <div className="flex gap-2">
                      {patternTypes.map((pattern) => {
                        const isActive = selectedPattern === pattern.type;
                        return (
                          <button
                            key={pattern.type}
                            type="button"
                            onClick={() => {
                              setSelectedPattern(pattern.type);
                              playSound('tap');
                            }}
                            className={cn(
                              // Base: pill-shaped button with label matching mobile
                              'shrink-0 h-12 px-4 rounded-xl',
                              'flex items-center justify-center gap-2',
                              'transition-all duration-150 active:scale-95',
                              // Default state
                              'bg-gray-100',
                              // Active state
                              isActive && 'bg-crayon-orange',
                            )}
                            aria-label={pattern.label}
                            aria-pressed={isActive}
                          >
                            <FontAwesomeIcon
                              icon={pattern.icon}
                              className={cn(
                                'text-base',
                                isActive ? 'text-white' : 'text-gray-600',
                              )}
                            />
                            <span
                              className={cn(
                                'text-sm font-medium',
                                isActive ? 'text-white' : 'text-gray-600',
                              )}
                            >
                              {pattern.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* History Section - Undo/Redo - only when expanded */}
              {isExpanded && (
                <div className="mb-4">
                  <SectionTitle title="History" />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className={cn(
                        // Base: pill button with icon and label
                        'h-12 px-4 rounded-xl',
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
                      <span className="text-sm font-medium text-gray-600">
                        Undo
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className={cn(
                        // Base: pill button with icon and label
                        'h-12 px-4 rounded-xl',
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
                      <span className="text-sm font-medium text-gray-600">
                        Redo
                      </span>
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
