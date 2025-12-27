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
import type {
  BrushSize,
  BrushType,
  ColoringTool,
  FillPattern,
  Sticker,
} from '@/constants';

// Zoom/Pan constants
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1;

// Canvas action for undo/redo history
export type CanvasAction = {
  type: 'stroke' | 'fill' | 'clear';
  imageData: ImageData;
  timestamp: number;
};

type PanOffset = { x: number; y: number };

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

  // Fill pattern state
  selectedPattern: FillPattern;
  setSelectedPattern: Dispatch<SetStateAction<FillPattern>>;

  // Sticker state
  selectedSticker: Sticker | null;
  setSelectedSticker: Dispatch<SetStateAction<Sticker | null>>;

  // Zoom/Pan state
  zoom: number;
  panOffset: PanOffset;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: PanOffset) => void;
  resetView: () => void;
  minZoom: number;
  maxZoom: number;

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
  selectedPattern: 'solid',
  setSelectedPattern: () => {},
  selectedSticker: null,
  setSelectedSticker: () => {},
  zoom: DEFAULT_ZOOM,
  panOffset: { x: 0, y: 0 },
  setZoom: () => {},
  setPanOffset: () => {},
  resetView: () => {},
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
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

  // Fill pattern state
  const [selectedPattern, setSelectedPattern] = useState<FillPattern>('solid');

  // Sticker state
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);

  // Zoom/Pan state
  const [zoom, setZoomState] = useState(DEFAULT_ZOOM);
  const [panOffset, setPanOffsetState] = useState<PanOffset>({ x: 0, y: 0 });

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

  // Zoom/Pan functions
  const setZoom = useCallback((newZoom: number) => {
    // Clamp zoom between min and max
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    setZoomState(clampedZoom);
  }, []);

  const setPanOffset = useCallback((offset: PanOffset) => {
    setPanOffsetState(offset);
  }, []);

  const resetView = useCallback(() => {
    setZoomState(DEFAULT_ZOOM);
    setPanOffsetState({ x: 0, y: 0 });
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
      selectedPattern,
      setSelectedPattern,
      selectedSticker,
      setSelectedSticker,
      zoom,
      panOffset,
      setZoom,
      setPanOffset,
      resetView,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
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
      selectedPattern,
      selectedSticker,
      zoom,
      panOffset,
      setZoom,
      setPanOffset,
      resetView,
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
