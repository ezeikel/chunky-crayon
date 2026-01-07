import { create } from "zustand";
import { SkPath } from "@shopify/react-native-skia";
import type { SymmetryMode } from "@/utils/symmetryUtils";
import { getNextSymmetryMode } from "@/utils/symmetryUtils";

export type Tool = "brush" | "fill" | "eraser" | "sticker" | "magic" | "pan";
export type BrushType =
  | "crayon"
  | "marker"
  | "pencil"
  | "rainbow"
  | "glow"
  | "neon"
  | "glitter";
export type FillType = "solid" | "pattern";
export type PatternType =
  | "dots"
  | "stripes"
  | "hearts"
  | "stars"
  | "zigzag"
  | "confetti";
export type MagicMode = "suggest" | "auto"; // suggest = tap for color hint, auto = fill entire image

// Kid-friendly emoji stickers organized by category
export type StickerCategory =
  | "animals"
  | "nature"
  | "food"
  | "faces"
  | "objects"
  | "weather";
export const STICKER_CATEGORIES: Record<StickerCategory, string[]> = {
  animals: [
    "🐶",
    "🐱",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🦁",
    "🐯",
    "🐮",
    "🐷",
    "🐸",
    "🦋",
  ],
  nature: [
    "🌸",
    "🌺",
    "🌻",
    "🌷",
    "🌹",
    "🌼",
    "🌿",
    "🍀",
    "🌳",
    "🌴",
    "🌵",
    "🍄",
  ],
  food: [
    "🍎",
    "🍓",
    "🍌",
    "🍕",
    "🍩",
    "🍪",
    "🧁",
    "🍰",
    "🍫",
    "🍬",
    "🍭",
    "🍦",
  ],
  faces: [
    "😊",
    "😄",
    "🥰",
    "😎",
    "🤩",
    "😋",
    "🤗",
    "😺",
    "🙈",
    "👻",
    "🤖",
    "👽",
  ],
  objects: [
    "⭐",
    "🌟",
    "💫",
    "✨",
    "💖",
    "💝",
    "🎈",
    "🎀",
    "🎁",
    "🏆",
    "👑",
    "💎",
  ],
  weather: [
    "☀️",
    "🌈",
    "⛅",
    "🌙",
    "⭐",
    "❄️",
    "💧",
    "🌊",
    "🔥",
    "🌸",
    "🍂",
    "🌺",
  ],
};

export type DrawingAction = {
  type: "stroke" | "fill" | "sticker" | "magic-fill";
  path?: SkPath;
  color: string;
  brushType?: BrushType;
  strokeWidth?: number;
  // For rainbow brush
  startHue?: number;
  // For fill actions
  fillX?: number;
  fillY?: number;
  targetColor?: string;
  // For pattern fills
  fillType?: FillType;
  patternType?: PatternType;
  // For sticker actions
  sticker?: string;
  stickerX?: number;
  stickerY?: number;
  stickerSize?: number;
  // For magic auto-fill actions (stores all fills applied)
  magicFills?: Array<{ x: number; y: number; color: string }>;
  // Cross-platform source dimensions - each action stores where it was recorded
  // so actions from web (CSS pixels ~880) and mobile (SVG viewBox ~1024) can coexist
  sourceWidth?: number;
  sourceHeight?: number;
  // Apple Pencil pressure sensitivity data
  // Array of pressure values (0-1) corresponding to path points
  pressurePoints?: number[];
  // Whether this stroke was made with a stylus (Apple Pencil)
  isStylus?: boolean;
  // Layer this action belongs to (for layer visibility filtering)
  layerId?: string;
};

/**
 * Layer type for organizing drawing actions into separate layers.
 * Kids can use layers to separate foreground/background elements.
 */
export type Layer = {
  /** Unique identifier for the layer */
  id: string;
  /** Display name (e.g., "Layer 1", "Background") */
  name: string;
  /** Whether the layer is visible */
  visible: boolean;
  /** Drawing actions in this layer */
  actions: DrawingAction[];
  /** History index for undo/redo within this layer */
  historyIndex: number;
};

/** Maximum number of layers allowed (keep it simple for kids) */
export const MAX_LAYERS = 3;

/** Layer colors for visual distinction in UI */
export const LAYER_COLORS = ["#E46444", "#4CAF50", "#2196F3"] as const;

/** Generate unique layer ID */
const generateLayerId = () =>
  `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Default layer ID (used for initial state) */
const DEFAULT_LAYER_ID = "default-layer";

/** Create the initial default layer */
const createInitialLayer = (): Layer => ({
  id: DEFAULT_LAYER_ID,
  name: "Layer 1",
  visible: true,
  actions: [],
  historyIndex: -1,
});

/** Create a new layer with given index */
const createNewLayer = (index: number): Layer => ({
  id: generateLayerId(),
  name: `Layer ${index}`,
  visible: true,
  actions: [],
  historyIndex: -1,
});

/**
 * Helper function to get visible actions filtered by layer visibility.
 * Actions without a layerId are shown on all layers (backward compatibility).
 */
export const getVisibleActions = (
  history: DrawingAction[],
  historyIndex: number,
  layers: Layer[],
): DrawingAction[] => {
  const visibleLayerIds = new Set(
    layers.filter((l) => l.visible).map((l) => l.id),
  );
  const visibleHistory = history.slice(0, historyIndex + 1);

  return visibleHistory.filter(
    (action) => !action.layerId || visibleLayerIds.has(action.layerId),
  );
};

// Capture function type for getting canvas image data
export type CanvasCaptureFunction = () => string | null;

export type CanvasState = {
  // Tool selection
  selectedTool: Tool;
  selectedColor: string;
  brushType: BrushType;
  brushSize: number;

  // Fill settings
  fillType: FillType;
  selectedPattern: PatternType;

  // Sticker settings
  selectedSticker: string;
  stickerCategory: StickerCategory;
  stickerSize: number;

  // Magic tool settings
  magicMode: MagicMode;

  // Rainbow brush hue tracking (0-360)
  rainbowHue: number;

  // Drawing history for undo/redo (legacy flat structure for backward compatibility)
  history: DrawingAction[];
  historyIndex: number;

  // Layers system
  layers: Layer[];
  activeLayerId: string;

  // Zoom/Pan state
  scale: number;
  translateX: number;
  translateY: number;

  // Canvas state
  imageId: string | null;
  isDirty: boolean;

  // Audio settings
  isMuted: boolean;

  // Progress tracking (0-100)
  progress: number;

  // Symmetry drawing mode
  symmetryMode: SymmetryMode;

  // Canvas capture function (set by ImageCanvas)
  captureCanvas: CanvasCaptureFunction | null;
};

type CanvasActions = {
  // Tool actions
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setBrushType: (type: BrushType) => void;
  setBrushSize: (size: number) => void;
  setFillType: (type: FillType) => void;
  setPattern: (pattern: PatternType) => void;
  setSticker: (sticker: string) => void;
  setStickerCategory: (category: StickerCategory) => void;
  setStickerSize: (size: number) => void;
  setMagicMode: (mode: MagicMode) => void;
  advanceRainbowHue: (amount?: number) => void;

  // History actions
  addAction: (action: DrawingAction) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Zoom/Pan actions
  setScale: (scale: number) => void;
  setTranslate: (x: number, y: number) => void;
  resetTransform: () => void;

  // Canvas state actions
  setImageId: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  reset: () => void;

  // Audio actions
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;

  // Progress actions
  setProgress: (progress: number) => void;

  // Symmetry actions
  setSymmetryMode: (mode: SymmetryMode) => void;
  cycleSymmetryMode: () => void;

  // Layer actions
  addLayer: () => void;
  removeLayer: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  renameLayer: (layerId: string, name: string) => void;

  // Canvas capture
  setCaptureCanvas: (fn: CanvasCaptureFunction | null) => void;
};

const initialState: CanvasState = {
  selectedTool: "brush",
  selectedColor: "#000000",
  brushType: "crayon",
  brushSize: 10,
  fillType: "solid",
  selectedPattern: "dots",
  selectedSticker: "🐶",
  stickerCategory: "animals",
  stickerSize: 40,
  magicMode: "suggest",
  rainbowHue: 0,

  history: [],
  historyIndex: -1,

  layers: [createInitialLayer()],
  activeLayerId: DEFAULT_LAYER_ID,

  scale: 1,
  translateX: 0,
  translateY: 0,

  imageId: null,
  isDirty: false,
  isMuted: false,
  progress: 0,
  symmetryMode: "none",
  captureCanvas: null,
};

const MAX_HISTORY = 50; // Limit history to prevent memory issues

export const useCanvasStore = create<CanvasState & CanvasActions>(
  (set, get) => ({
    ...initialState,

    // Tool actions
    setTool: (tool) => set({ selectedTool: tool }),
    setColor: (color) => set({ selectedColor: color }),
    setBrushType: (type) => set({ brushType: type }),
    setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(50, size)) }),
    setFillType: (type) => set({ fillType: type }),
    setPattern: (pattern) => set({ selectedPattern: pattern }),
    setSticker: (sticker) => set({ selectedSticker: sticker }),
    setStickerCategory: (category) => set({ stickerCategory: category }),
    setStickerSize: (size) =>
      set({ stickerSize: Math.max(20, Math.min(100, size)) }),
    setMagicMode: (mode) => set({ magicMode: mode }),
    advanceRainbowHue: (amount = 30) =>
      set((state) => ({ rainbowHue: (state.rainbowHue + amount) % 360 })),

    // History actions
    addAction: (action) => {
      const { history, historyIndex, imageId, activeLayerId } = get();

      // Tag action with current active layer
      const actionWithLayer = {
        ...action,
        layerId: action.layerId || activeLayerId,
      };

      console.log(
        `[CANVAS_STORE] ADD_ACTION - Type: ${action.type}, Color: ${action.color}, Layer: ${actionWithLayer.layerId}`,
      );
      console.log(
        `[CANVAS_STORE] ADD_ACTION - Current history: ${history.length} items, Index: ${historyIndex}, Image: ${imageId}`,
      );

      // Remove any redo history when new action is added
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(actionWithLayer);

      // Trim history if too long
      if (newHistory.length > MAX_HISTORY) {
        console.log(
          `[CANVAS_STORE] ADD_ACTION - Trimming history (exceeded ${MAX_HISTORY} items)`,
        );
        newHistory.shift();
      }

      console.log(
        `[CANVAS_STORE] ADD_ACTION - New history: ${newHistory.length} items`,
      );
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      });
    },

    undo: () => {
      const { historyIndex } = get();
      if (historyIndex >= 0) {
        set({ historyIndex: historyIndex - 1 });
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        set({ historyIndex: historyIndex + 1 });
      }
    },

    clearHistory: () => set({ history: [], historyIndex: -1 }),

    canUndo: () => get().historyIndex >= 0,

    canRedo: () => {
      const { history, historyIndex } = get();
      return historyIndex < history.length - 1;
    },

    // Zoom/Pan actions
    setScale: (scale) => set({ scale: Math.max(0.5, Math.min(4, scale)) }),

    setTranslate: (x, y) => set({ translateX: x, translateY: y }),

    resetTransform: () => set({ scale: 1, translateX: 0, translateY: 0 }),

    // Canvas state actions
    setImageId: (id) => {
      console.log(
        `[CANVAS_STORE] SET_IMAGE_ID - New ID: ${id}, Previous: ${get().imageId}`,
      );
      set({ imageId: id });
    },

    setDirty: (dirty) => {
      console.log(`[CANVAS_STORE] SET_DIRTY - ${dirty}`);
      set({ isDirty: dirty });
    },

    reset: () => {
      const currentState = get();
      console.log(
        `[CANVAS_STORE] RESET - Clearing state for image: ${currentState.imageId}, History: ${currentState.history.length} items`,
      );
      // Reset to initial state but preserve capture function and create fresh default layer
      set({
        ...initialState,
        captureCanvas: currentState.captureCanvas,
        layers: [createInitialLayer()],
        activeLayerId: DEFAULT_LAYER_ID,
      });
    },

    // Audio actions
    setMuted: (muted) => set({ isMuted: muted }),
    toggleMuted: () => set((state) => ({ isMuted: !state.isMuted })),

    // Progress actions
    setProgress: (progress) =>
      set({ progress: Math.max(0, Math.min(100, progress)) }),

    // Symmetry actions
    setSymmetryMode: (mode) => set({ symmetryMode: mode }),
    cycleSymmetryMode: () =>
      set((state) => ({
        symmetryMode: getNextSymmetryMode(state.symmetryMode),
      })),

    // Layer actions
    addLayer: () => {
      const { layers } = get();
      if (layers.length >= MAX_LAYERS) {
        console.log(
          `[CANVAS_STORE] ADD_LAYER - Max layers (${MAX_LAYERS}) reached`,
        );
        return;
      }
      const newLayer = createNewLayer(layers.length + 1);
      console.log(
        `[CANVAS_STORE] ADD_LAYER - Creating ${newLayer.name} (${newLayer.id})`,
      );
      set({
        layers: [...layers, newLayer],
        activeLayerId: newLayer.id,
        isDirty: true,
      });
    },

    removeLayer: (layerId) => {
      const { layers, activeLayerId } = get();
      if (layers.length <= 1) {
        console.log(`[CANVAS_STORE] REMOVE_LAYER - Cannot remove last layer`);
        return;
      }
      const newLayers = layers.filter((l) => l.id !== layerId);
      const newActiveId =
        activeLayerId === layerId
          ? newLayers[newLayers.length - 1].id
          : activeLayerId;
      console.log(
        `[CANVAS_STORE] REMOVE_LAYER - Removed ${layerId}, active is now ${newActiveId}`,
      );
      set({
        layers: newLayers,
        activeLayerId: newActiveId,
        isDirty: true,
      });
    },

    setActiveLayer: (layerId) => {
      const { layers } = get();
      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        console.log(
          `[CANVAS_STORE] SET_ACTIVE_LAYER - ${layer.name} (${layerId})`,
        );
        set({ activeLayerId: layerId });
      }
    },

    toggleLayerVisibility: (layerId) => {
      const { layers } = get();
      const newLayers = layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
      );
      const layer = newLayers.find((l) => l.id === layerId);
      console.log(
        `[CANVAS_STORE] TOGGLE_VISIBILITY - ${layer?.name} is now ${layer?.visible ? "visible" : "hidden"}`,
      );
      set({ layers: newLayers, isDirty: true });
    },

    reorderLayers: (fromIndex, toIndex) => {
      const { layers } = get();
      if (
        fromIndex < 0 ||
        fromIndex >= layers.length ||
        toIndex < 0 ||
        toIndex >= layers.length
      ) {
        return;
      }
      const newLayers = [...layers];
      const [movedLayer] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, movedLayer);
      console.log(
        `[CANVAS_STORE] REORDER_LAYERS - Moved from ${fromIndex} to ${toIndex}`,
      );
      set({ layers: newLayers, isDirty: true });
    },

    renameLayer: (layerId, name) => {
      const { layers } = get();
      const newLayers = layers.map((layer) =>
        layer.id === layerId ? { ...layer, name } : layer,
      );
      console.log(
        `[CANVAS_STORE] RENAME_LAYER - ${layerId} renamed to "${name}"`,
      );
      set({ layers: newLayers, isDirty: true });
    },

    // Canvas capture
    setCaptureCanvas: (fn) => set({ captureCanvas: fn }),
  }),
);
