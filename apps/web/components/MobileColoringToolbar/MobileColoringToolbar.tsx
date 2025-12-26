'use client';

import { useState } from 'react';
import ColorStrip from '@/components/ColorStrip/ColorStrip';
import ToolSelector from '@/components/ToolSelector/ToolSelector';
import BrushSizeSelector from '@/components/BrushSizeSelector/BrushSizeSelector';
import UndoRedoButtons from '@/components/UndoRedoButtons/UndoRedoButtons';
import PatternSelector from '@/components/PatternSelector/PatternSelector';
import { CanvasAction, useColoringContext } from '@/contexts/coloring';
import cn from '@/utils/cn';

type MobileColoringToolbarProps = {
  className?: string;
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
};

// Chevron icon for expand/collapse
const ChevronIcon = ({
  className,
  expanded,
}: {
  className?: string;
  expanded: boolean;
}) => (
  <svg
    className={cn(
      className,
      'transition-transform duration-200',
      expanded ? 'rotate-180' : '',
    )}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

/**
 * Mobile-optimized toolbar fixed to bottom of screen.
 * Features:
 * - Scrollable color strip for quick color access
 * - Expandable panel for additional tools
 * - Large touch targets for young children (44px+)
 * - Compact layout to maximize canvas space
 */
const MobileColoringToolbar = ({
  className,
  onUndo,
  onRedo,
}: MobileColoringToolbarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { activeTool, selectedColor } = useColoringContext();

  // Show pattern selector only when fill tool is active
  const showPatternSelector = activeTool === 'fill';

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white via-white to-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]',
        // Safe area padding for notched devices
        'pb-safe',
        className,
      )}
    >
      {/* Expand/Collapse handle - prominent and obvious */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-center py-2 transition-colors',
          'active:bg-gray-100',
          isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50',
        )}
        aria-label={isExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
        aria-expanded={isExpanded}
      >
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-1 rounded-full transition-colors',
            isExpanded
              ? 'bg-crayon-orange/10 text-crayon-orange'
              : 'bg-gray-100 text-gray-600',
          )}
        >
          {/* Grab handle bars */}
          <div className="flex flex-col gap-0.5">
            <div className="w-5 h-0.5 bg-current rounded-full" />
            <div className="w-5 h-0.5 bg-current rounded-full" />
          </div>

          {/* Label text */}
          <span className="text-xs font-semibold uppercase tracking-wide">
            {isExpanded ? 'Less' : 'More tools'}
          </span>

          {/* Chevron */}
          <ChevronIcon className="size-4" expanded={isExpanded} />
        </div>
      </button>

      {/* Expanded tools panel */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="px-2 pb-2 space-y-2">
          {/* Pattern selector - only when fill tool active */}
          {showPatternSelector && (
            <div className="flex justify-center">
              <PatternSelector className="shadow-sm" />
            </div>
          )}

          {/* Brush sizes and undo/redo */}
          <div className="flex items-center justify-center gap-2">
            <BrushSizeSelector className="shadow-sm" />
            <UndoRedoButtons
              className="shadow-sm"
              onUndo={onUndo}
              onRedo={onRedo}
            />
          </div>
        </div>
      </div>

      {/* Main toolbar row - always visible */}
      <div className="flex items-center gap-2 px-2 pb-2">
        {/* Tools (Crayon, Marker, Fill, Eraser) */}
        <ToolSelector className="shadow-sm flex-shrink-0" />

        {/* Scrollable color strip */}
        <ColorStrip className="flex-1 shadow-sm" />
      </div>
    </div>
  );
};

export default MobileColoringToolbar;
