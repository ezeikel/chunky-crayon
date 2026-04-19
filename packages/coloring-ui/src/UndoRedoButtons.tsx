"use client";

import { CanvasAction, useColoringContext } from "./context";
import { haptics } from "./haptics";
import cn from "./cn";

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
      haptics.undoRedo();
    }
  };

  const handleRedo = () => {
    const action = redo();
    if (action && onRedo) {
      onRedo(action);
      haptics.undoRedo();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-coloring-card bg-white border-2 border-coloring-surface-dark",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleUndo}
        disabled={!canUndo}
        className={cn(
          "flex items-center justify-center size-10 sm:size-12 rounded-coloring-card border-2 border-coloring-surface-dark bg-white transition-all duration-coloring-base ease-coloring",
          "focus:outline-none focus:ring-2 focus:ring-coloring-accent",
          canUndo
            ? "active:scale-95 text-coloring-muted hover:border-coloring-accent"
            : "text-coloring-muted/40 cursor-not-allowed",
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
          "flex items-center justify-center size-10 sm:size-12 rounded-coloring-card border-2 border-coloring-surface-dark bg-white transition-all duration-coloring-base ease-coloring",
          "focus:outline-none focus:ring-2 focus:ring-coloring-accent",
          canRedo
            ? "active:scale-95 text-coloring-muted hover:border-coloring-accent"
            : "text-coloring-muted/40 cursor-not-allowed",
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
