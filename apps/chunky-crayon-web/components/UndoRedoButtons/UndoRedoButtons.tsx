'use client';

import { CanvasAction, useColoringContext } from '@/contexts/coloring';
import cn from '@/utils/cn';

type UndoRedoButtonsProps = {
  className?: string;
  onUndo?: (action: CanvasAction) => void;
  onRedo?: (action: CanvasAction) => void;
};

// SVG icons
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

const UndoRedoButtons = ({
  className,
  onUndo,
  onRedo,
}: UndoRedoButtonsProps) => {
  const { canUndo, canRedo, undo, redo } = useColoringContext();

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

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 rounded-lg bg-white/90 backdrop-blur-sm',
        className,
      )}
    >
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo}
        className={cn(
          'flex items-center justify-center size-10 sm:size-12 rounded-lg transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-crayon-orange',
          {
            'hover:bg-gray-100 active:scale-95 text-gray-700': canUndo,
            'text-gray-300 cursor-not-allowed': !canUndo,
          },
        )}
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
      >
        <UndoIcon className="size-5 sm:size-6" />
      </button>

      <button
        type="button"
        onClick={handleRedo}
        disabled={!canRedo}
        className={cn(
          'flex items-center justify-center size-10 sm:size-12 rounded-lg transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-crayon-orange',
          {
            'hover:bg-gray-100 active:scale-95 text-gray-700': canRedo,
            'text-gray-300 cursor-not-allowed': !canRedo,
          },
        )}
        aria-label="Redo"
        title="Redo (Ctrl+Y)"
      >
        <RedoIcon className="size-5 sm:size-6" />
      </button>
    </div>
  );
};

export default UndoRedoButtons;
