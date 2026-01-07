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

  // Drawing history for undo/redo
  history: DrawingAction[];
  historyIndex: number;

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
      console.log(
        `[CANVAS_STORE] ADD_ACTION - Type: ${action.type}, Color: ${action.color}`,
      );

      const { history, historyIndex, imageId } = get();
      console.log(
        `[CANVAS_STORE] ADD_ACTION - Current history: ${history.length} items, Index: ${historyIndex}, Image: ${imageId}`,
      );

      // Remove any redo history when new action is added
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(action);

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
      set({ ...initialState, captureCanvas: currentState.captureCanvas });
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

    // Canvas capture
    setCaptureCanvas: (fn) => set({ captureCanvas: fn }),
  }),
);
