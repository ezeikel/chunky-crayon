/**
 * @one-colored-pixel/coloring-ui
 *
 * Shared coloring UI components for all One Colored Pixel apps.
 * Components are unstyled by default and themed via CSS custom properties.
 */

// Types and constants
export {
  COLORING_PALETTE,
  ALL_COLORING_COLORS,
  BRUSH_SIZES,
  CANVAS_STICKERS,
  STICKER_CATEGORIES,
  FILL_PATTERNS,
  TRACKING_EVENTS,
} from "./types";
export type {
  BrushType,
  FillPattern,
  BrushSize,
  ColoringTool,
  StickerCategory,
  Sticker,
  ColorDefinition,
} from "./types";

// Context
export {
  ColoringContextProvider,
  useColoringContext,
  type CanvasAction,
} from "./context";

// Canvas action types
export {
  pointsToSvgPath,
  type SerializableCanvasAction,
} from "./canvasActions";

// Utilities
export { default as cn } from "./cn";
export { trackEvent } from "./analytics-client";
export { setPreviewCacheInvalidator } from "./coloringStorage";
export { proxyR2Url, setR2Host } from "./proxyR2Url";

// Sound
export { useSound } from "./useSound";
export { getSoundManager } from "./audio";
export type { SoundType, BrushSoundType } from "./audio";

// Components
export { default as ImageCanvas } from "./ImageCanvas";
export { default as ColorPalette } from "./ColorPalette";
export { default as DesktopColorPalette } from "./DesktopColorPalette";
export { default as MobileColoringToolbar } from "./MobileColoringToolbar";
export { default as MobileColoringDrawer } from "./MobileColoringDrawer";
export { default as ColoringToolbar } from "./ColoringToolbar";
export { default as ZoomControls } from "./ZoomControls";
export { default as MuteToggle } from "./MuteToggle";
export { default as AutoColorButton } from "./AutoColorButton";
export { default as BrushSizeSelector } from "./BrushSizeSelector";
export { default as ToolSelector } from "./ToolSelector";
export { default as PatternSelector } from "./PatternSelector";
export { default as UndoRedoButtons } from "./UndoRedoButtons";

// Storage utilities
export {
  saveColoringProgress,
  loadColoringProgress,
  clearColoringProgress,
  hasSavedProgress,
  getStorageKey,
  getSavedProgressInfo,
} from "./coloringStorage";
