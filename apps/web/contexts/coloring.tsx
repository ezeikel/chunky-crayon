'use client';

import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { BrushSize, BrushType, ColoringTool } from '@/constants';

// Canvas action for undo/redo history
export type CanvasAction = {
  type: 'stroke' | 'fill' | 'clear';
  imageData: ImageData;
  timestamp: number;
};

type ColoringContextArgs = {
  // Color state
  selectedColor: string;
  setSelectedColor: Dispatch<SetStateAction<string>>;

  // Brush state
  brushSize: BrushSize;
  setBrushSize: Dispatch<SetStateAction<BrushSize>>;
  brushType: BrushType;
  setBrushType: Dispatch<SetStateAction<BrushType>>;

  // Tool state
  activeTool: ColoringTool;
  setActiveTool: Dispatch<SetStateAction<ColoringTool>>;

  // History state
  canUndo: boolean;
  canRedo: boolean;
  undoStack: CanvasAction[];
  redoStack: CanvasAction[];
  pushToHistory: (action: CanvasAction) => void;
  undo: () => CanvasAction | null;
  redo: () => CanvasAction | null;
  clearHistory: () => void;

  // Audio state
  isMuted: boolean;
  setIsMuted: Dispatch<SetStateAction<boolean>>;

  // Progress state
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
};

type ColoringContextProviderProps = {
  children: React.ReactNode;
};

const MAX_HISTORY_SIZE = 20;

export const ColoringContext = createContext<ColoringContextArgs>({
  selectedColor: '',
  setSelectedColor: () => {},
  brushSize: 'medium',
  setBrushSize: () => {},
  brushType: 'crayon',
  setBrushType: () => {},
  activeTool: 'brush',
  setActiveTool: () => {},
  canUndo: false,
  canRedo: false,
  undoStack: [],
  redoStack: [],
  pushToHistory: () => {},
  undo: () => null,
  redo: () => null,
  clearHistory: () => {},
  isMuted: false,
  setIsMuted: () => {},
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
});

export const ColoringContextProvider = ({
  children,
}: ColoringContextProviderProps) => {
  // Color state
  const [selectedColor, setSelectedColor] = useState('#212121'); // Default to black

  // Brush state
  const [brushSize, setBrushSize] = useState<BrushSize>('medium');
  const [brushType, setBrushType] = useState<BrushType>('crayon');

  // Tool state
  const [activeTool, setActiveTool] = useState<ColoringTool>('brush');

  // History state for undo/redo
  const [undoStack, setUndoStack] = useState<CanvasAction[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasAction[]>([]);

  // Audio state
  const [isMuted, setIsMuted] = useState(false);

  // Progress state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const pushToHistory = useCallback((action: CanvasAction) => {
    setUndoStack((prev) => {
      const newStack = [...prev, action];
      // Limit history size
      if (newStack.length > MAX_HISTORY_SIZE) {
        return newStack.slice(-MAX_HISTORY_SIZE);
      }
      return newStack;
    });
    // Clear redo stack when new action is performed
    setRedoStack([]);
    setHasUnsavedChanges(true);
  }, []);

  const undo = useCallback((): CanvasAction | null => {
    if (undoStack.length === 0) return null;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastAction]);
    setHasUnsavedChanges(true);

    return lastAction;
  }, [undoStack]);

  const redo = useCallback((): CanvasAction | null => {
    if (redoStack.length === 0) return null;

    const lastRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, lastRedo]);
    setHasUnsavedChanges(true);

    return lastRedo;
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const value = useMemo(
    () => ({
      selectedColor,
      setSelectedColor,
      brushSize,
      setBrushSize,
      brushType,
      setBrushType,
      activeTool,
      setActiveTool,
      canUndo,
      canRedo,
      undoStack,
      redoStack,
      pushToHistory,
      undo,
      redo,
      clearHistory,
      isMuted,
      setIsMuted,
      hasUnsavedChanges,
      setHasUnsavedChanges,
    }),
    [
      selectedColor,
      brushSize,
      brushType,
      activeTool,
      canUndo,
      canRedo,
      undoStack,
      redoStack,
      pushToHistory,
      undo,
      redo,
      clearHistory,
      isMuted,
      hasUnsavedChanges,
    ],
  );

  return (
    <ColoringContext.Provider value={value}>
      {children}
    </ColoringContext.Provider>
  );
};

export const useColoringContext = () => {
  const context = useContext(ColoringContext);
  if (context === undefined) {
    throw new Error(
      'useColoringContext must be used within a ColoringContextProvider',
    );
  }

  return context;
};
