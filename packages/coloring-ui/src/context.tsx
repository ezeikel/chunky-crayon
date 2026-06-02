"use client";

import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import type {
  BrushSize,
  BrushType,
  ColoringTool,
  FillPattern,
  Sticker,
} from "./types";
import type { SerializableCanvasAction } from "./canvasActions";
import { makeActionId, nextActionSeq, getWebDeviceId } from "./canvasActions";
import type { PaletteVariant } from "./types";

/** Controls which feature set is exposed in the UI */
export type ColoringVariant = "kids" | "adult";

// Magic-tool region-store status. 'ready' = usable; 'waiting'/'retrying' =
// loading (spinner on the tile); 'timeout' = worker stalled, show a retry
// affordance on the tile.
export type MagicStatus = "ready" | "waiting" | "timeout" | "retrying";

// Zoom/Pan constants
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1;

// Canvas action for undo/redo history
export type CanvasAction = {
  type: "stroke" | "fill" | "clear";
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
  /** Custom brush radius (1-40). When set, overrides the preset brushSize radius. */
  customBrushRadius: number | null;
  setCustomBrushRadius: Dispatch<SetStateAction<number | null>>;

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

  // History state (for undo/redo - uses ImageData)
  canUndo: boolean;
  canRedo: boolean;
  undoStack: CanvasAction[];
  redoStack: CanvasAction[];
  pushToHistory: (action: CanvasAction) => void;
  undo: () => CanvasAction | null;
  redo: () => CanvasAction | null;
  clearHistory: () => void;

  // Serializable actions (for server sync - uses stroke paths)
  drawingActions: SerializableCanvasAction[];
  addDrawingAction: (action: SerializableCanvasAction) => void;
  clearDrawingActions: () => void;
  setDrawingActions: Dispatch<SetStateAction<SerializableCanvasAction[]>>;

  // Audio state
  isMuted: boolean;
  setIsMuted: Dispatch<SetStateAction<boolean>>;
  isSfxMuted: boolean;
  setIsSfxMuted: Dispatch<SetStateAction<boolean>>;
  isAmbientMuted: boolean;
  setIsAmbientMuted: Dispatch<SetStateAction<boolean>>;

  // Progress state
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;

  // Coloring progress (0-100%)
  coloringProgress: number;
  setColoringProgress: Dispatch<SetStateAction<number>>;
  isColoringComplete: boolean;
  setIsColoringComplete: Dispatch<SetStateAction<boolean>>;

  // Auto-color state
  isAutoColoring: boolean;
  setIsAutoColoring: Dispatch<SetStateAction<boolean>>;
  hasAutoColored: boolean;
  setHasAutoColored: Dispatch<SetStateAction<boolean>>;

  // Palette variant — which pre-computed colour set to use for magic brush/auto-color
  paletteVariant: PaletteVariant;
  setPaletteVariant: Dispatch<SetStateAction<PaletteVariant>>;

  // Magic-tool readiness — the magic brush + auto-color depend on the
  // pre-computed region store (regionMapUrl + regionsJson), which the
  // backend writes asynchronously after image creation. While it's not
  // yet available the magic tools can't work, so the host sets this false
  // and the toolbars disable + show a spinner on those buttons. Defaults
  // true so images without a region store (or already-ready ones) aren't
  // blocked.
  magicReady: boolean;
  setMagicReady: Dispatch<SetStateAction<boolean>>;

  // Finer-grained magic-tool status (additive to magicReady, which stays the
  // disable/tap-guard boolean). The region store is fetched/regenerated
  // asynchronously; the host pushes the live status so the magic tiles can
  // show: 'ready' = usable; 'waiting'/'retrying' = spinner; 'timeout' = the
  // worker stalled, show a retry affordance ON the tile (tap → onMagicRetry).
  // This replaces the old floating "Wake me up!" timeout card.
  magicStatus: MagicStatus;
  setMagicStatus: Dispatch<SetStateAction<MagicStatus>>;
  // Retry callback the host wires up (re-kicks the worker + resumes polling).
  // Invoked when a magic tile is tapped in the 'timeout' state.
  onMagicRetry?: () => void | Promise<void>;
  setOnMagicRetry: Dispatch<
    SetStateAction<(() => void | Promise<void>) | undefined>
  >;

  // Variant — controls which feature set is exposed
  variant: ColoringVariant;
};

type ColoringContextProviderProps = {
  children: React.ReactNode;
  /** localStorage key prefix for persisting audio settings (e.g. "chunky-crayon" or "coloring-habitat") */
  storagePrefix?: string;
  /** Controls which feature set is exposed: 'kids' (simplified) or 'adult' (full power) */
  variant?: ColoringVariant;
};

const MAX_HISTORY_SIZE = 20;

export const ColoringContext = createContext<ColoringContextArgs>({
  selectedColor: "",
  setSelectedColor: () => {},
  brushSize: "medium",
  setBrushSize: () => {},
  brushType: "crayon",
  setBrushType: () => {},
  customBrushRadius: null,
  setCustomBrushRadius: () => {},
  activeTool: "brush",
  setActiveTool: () => {},
  selectedPattern: "solid",
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
  drawingActions: [],
  addDrawingAction: () => {},
  clearDrawingActions: () => {},
  setDrawingActions: () => {},
  isMuted: false,
  setIsMuted: () => {},
  isSfxMuted: false,
  setIsSfxMuted: () => {},
  isAmbientMuted: true,
  setIsAmbientMuted: () => {},
  hasUnsavedChanges: false,
  setHasUnsavedChanges: () => {},
  coloringProgress: 0,
  setColoringProgress: () => {},
  isColoringComplete: false,
  setIsColoringComplete: () => {},
  isAutoColoring: false,
  setIsAutoColoring: () => {},
  hasAutoColored: false,
  setHasAutoColored: () => {},
  paletteVariant: "realistic",
  setPaletteVariant: () => {},
  magicReady: true,
  setMagicReady: () => {},
  magicStatus: "ready",
  setMagicStatus: () => {},
  onMagicRetry: undefined,
  setOnMagicRetry: () => {},
  variant: "adult",
});

export const ColoringContextProvider = ({
  children,
  storagePrefix = "coloring",
  variant = "adult",
}: ColoringContextProviderProps) => {
  // Color state
  const [selectedColor, setSelectedColor] = useState("#212121"); // Default to black

  // Brush state
  const [brushSize, setBrushSize] = useState<BrushSize>("medium");
  const [brushType, setBrushType] = useState<BrushType>("crayon");
  const [customBrushRadius, setCustomBrushRadius] = useState<number | null>(
    null,
  );

  // Tool state
  const [activeTool, setActiveTool] = useState<ColoringTool>("brush");

  // Fill pattern state
  const [selectedPattern, setSelectedPattern] = useState<FillPattern>("solid");

  // Sticker state
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);

  // Zoom/Pan state
  const [zoom, setZoomState] = useState(DEFAULT_ZOOM);
  const [panOffset, setPanOffsetState] = useState<PanOffset>({ x: 0, y: 0 });

  // History state for undo/redo
  const [undoStack, setUndoStack] = useState<CanvasAction[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasAction[]>([]);

  // Serializable drawing actions for server sync
  const [drawingActions, setDrawingActions] = useState<
    SerializableCanvasAction[]
  >([]);

  // Audio state - initialize with defaults, hydrate from localStorage after mount
  const [isMuted, setIsMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);
  // Music defaults to OFF — kids find ambient music intrusive in coloring
  // sessions; SFX (taps, completion) stays on.
  const [isAmbientMuted, setIsAmbientMuted] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate audio settings from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setIsMuted(localStorage.getItem(`${storagePrefix}-muted`) === "true");
    setIsSfxMuted(
      localStorage.getItem(`${storagePrefix}-sfx-muted`) === "true",
    );
    setIsAmbientMuted(
      localStorage.getItem(`${storagePrefix}-ambient-muted`) === "true",
    );
    setIsHydrated(true);
  }, []);

  // Persist audio settings to localStorage (only after hydration). One effect
  // for all three keys — setItem is idempotent, so re-writing an unchanged key
  // is a no-op and the end state is identical to three separate effects.
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(`${storagePrefix}-muted`, String(isMuted));
    localStorage.setItem(`${storagePrefix}-sfx-muted`, String(isSfxMuted));
    localStorage.setItem(
      `${storagePrefix}-ambient-muted`,
      String(isAmbientMuted),
    );
  }, [isMuted, isSfxMuted, isAmbientMuted, isHydrated]);

  // Progress state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [coloringProgress, setColoringProgress] = useState(0);
  const [isColoringComplete, setIsColoringComplete] = useState(false);
  const [isAutoColoring, setIsAutoColoring] = useState(false);
  const [hasAutoColored, setHasAutoColored] = useState(false);
  const [paletteVariant, setPaletteVariant] =
    useState<PaletteVariant>("realistic");
  // Default true: images without a region store, or already-ready ones,
  // shouldn't have their magic tools blocked. The host flips this false
  // while the region store is still being written.
  const [magicReady, setMagicReady] = useState(true);
  const [magicStatus, setMagicStatus] = useState<MagicStatus>("ready");
  const [onMagicRetry, setOnMagicRetry] = useState<
    (() => void | Promise<void>) | undefined
  >(undefined);

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
    // Durable UNDO: undo is LIFO, so tombstone the LAST live (non-undone) synced
    // action. Previously undo only popped the raster undoStack and never touched
    // `drawingActions`, so the undone stroke stayed in the synced set and
    // resurrected on reload/cross-device. The flag rides inside the action and
    // the merge resolves it monotonically (a stale device can't un-undo it).
    setDrawingActions((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (!prev[i].undone) {
          const next = prev.slice();
          next[i] = { ...next[i], undone: true, undoneSeq: nextActionSeq() };
          return next;
        }
      }
      return prev;
    });
    setHasUnsavedChanges(true);

    return lastAction;
  }, [undoStack]);

  const redo = useCallback((): CanvasAction | null => {
    if (redoStack.length === 0) return null;

    const lastRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, lastRedo]);
    // Mirror of undo: clear the tombstone on the LAST undone synced action
    // (redo wins via a strictly-higher undoneSeq).
    setDrawingActions((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i].undone) {
          const next = prev.slice();
          next[i] = { ...next[i], undone: false, undoneSeq: nextActionSeq() };
          return next;
        }
      }
      return prev;
    });
    setHasUnsavedChanges(true);

    return lastRedo;
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Serializable drawing action functions (for server sync). Every action is
  // stamped HERE — the single funnel — with a stable cross-device identity:
  // id (UUID, the merge dedup key), seq (per-session creation counter, the
  // ordering tiebreak for same-ms actions), originDeviceId (so the merge's
  // terminal-collapse only eats same-device earlier actions). Stamped once at
  // append; never re-derived at serialize time.
  const addDrawingAction = useCallback((action: SerializableCanvasAction) => {
    const stamped = {
      ...action,
      id: action.id ?? makeActionId(),
      seq: action.seq ?? nextActionSeq(),
      originDeviceId: action.originDeviceId ?? getWebDeviceId(),
    } as SerializableCanvasAction;
    setDrawingActions((prev) => [...prev, stamped]);
    setHasUnsavedChanges(true);
  }, []);

  // Start Over emits a real `clear` terminal action (not just an empty array)
  // so a reset durably collapses a stale offline peer's strokes during a merge.
  const clearDrawingActions = useCallback(() => {
    const clearAction: SerializableCanvasAction = {
      type: "clear",
      timestamp: Date.now(),
      id: makeActionId(),
      seq: nextActionSeq(),
      originDeviceId: getWebDeviceId(),
    };
    setDrawingActions([clearAction]);
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
      customBrushRadius,
      setCustomBrushRadius,
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
      drawingActions,
      addDrawingAction,
      clearDrawingActions,
      setDrawingActions,
      isMuted,
      setIsMuted,
      isSfxMuted,
      setIsSfxMuted,
      isAmbientMuted,
      setIsAmbientMuted,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      coloringProgress,
      setColoringProgress,
      isColoringComplete,
      setIsColoringComplete,
      isAutoColoring,
      setIsAutoColoring,
      hasAutoColored,
      setHasAutoColored,
      paletteVariant,
      setPaletteVariant,
      magicReady,
      setMagicReady,
      magicStatus,
      setMagicStatus,
      onMagicRetry,
      setOnMagicRetry,
      variant,
    }),
    [
      selectedColor,
      brushSize,
      brushType,
      customBrushRadius,
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
      drawingActions,
      addDrawingAction,
      clearDrawingActions,
      isMuted,
      isSfxMuted,
      isAmbientMuted,
      hasUnsavedChanges,
      coloringProgress,
      isColoringComplete,
      isAutoColoring,
      hasAutoColored,
      paletteVariant,
      magicReady,
      magicStatus,
      onMagicRetry,
      variant,
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
      "useColoringContext must be used within a ColoringContextProvider",
    );
  }

  return context;
};
