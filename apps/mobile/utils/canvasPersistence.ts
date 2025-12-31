import AsyncStorage from "@react-native-async-storage/async-storage";
import { SkPath, Skia } from "@shopify/react-native-skia";
import type {
  DrawingAction,
  BrushType,
  FillType,
  PatternType,
} from "@/stores/canvasStore";

const STORAGE_PREFIX = "chunky_crayon_canvas_";
const METADATA_KEY = `${STORAGE_PREFIX}metadata`;

type SerializedAction = {
  type: "stroke" | "fill" | "sticker" | "magic-fill";
  pathSvg?: string; // Serialized path as SVG
  color: string;
  brushType?: BrushType;
  strokeWidth?: number;
  startHue?: number;
  // For fill actions
  fillX?: number;
  fillY?: number;
  targetColor?: string;
  fillType?: FillType;
  patternType?: PatternType;
  // For sticker actions
  sticker?: string;
  stickerX?: number;
  stickerY?: number;
  stickerSize?: number;
  // For magic-fill actions
  magicFills?: Array<{ x: number; y: number; color: string }>;
};

type SavedCanvasData = {
  imageId: string;
  actions: SerializedAction[];
  savedAt: number;
  version: number;
};

type CanvasMetadata = {
  savedCanvases: { imageId: string; savedAt: number }[];
};

const CURRENT_VERSION = 1;
const MAX_SAVED_CANVASES = 20; // Limit saved canvases to manage storage

/**
 * Serializes a SkPath to SVG string
 */
const serializePath = (path: SkPath): string => {
  return path.toSVGString();
};

/**
 * Deserializes an SVG string back to SkPath
 */
const deserializePath = (svgString: string): SkPath | null => {
  try {
    const path = Skia.Path.MakeFromSVGString(svgString);
    return path;
  } catch (error) {
    console.warn("Failed to deserialize path:", error);
    return null;
  }
};

/**
 * Serializes drawing actions for storage
 */
const serializeActions = (actions: DrawingAction[]): SerializedAction[] => {
  return actions.map((action) => ({
    type: action.type,
    pathSvg: action.path ? serializePath(action.path) : undefined,
    color: action.color,
    brushType: action.brushType,
    strokeWidth: action.strokeWidth,
    startHue: action.startHue,
    // Fill fields
    fillX: action.fillX,
    fillY: action.fillY,
    targetColor: action.targetColor,
    fillType: action.fillType,
    patternType: action.patternType,
    // Sticker fields
    sticker: action.sticker,
    stickerX: action.stickerX,
    stickerY: action.stickerY,
    stickerSize: action.stickerSize,
    // Magic-fill fields
    magicFills: action.magicFills,
  }));
};

/**
 * Deserializes stored actions back to DrawingAction[]
 */
const deserializeActions = (
  serialized: SerializedAction[],
): DrawingAction[] => {
  return serialized
    .map((action) => {
      const path = action.pathSvg ? deserializePath(action.pathSvg) : undefined;

      // Skip actions with invalid paths
      if (action.type === "stroke" && action.pathSvg && !path) {
        return null;
      }

      return {
        type: action.type,
        path: path || undefined,
        color: action.color,
        brushType: action.brushType,
        strokeWidth: action.strokeWidth,
        startHue: action.startHue,
        // Fill fields
        fillX: action.fillX,
        fillY: action.fillY,
        targetColor: action.targetColor,
        fillType: action.fillType,
        patternType: action.patternType,
        // Sticker fields
        sticker: action.sticker,
        stickerX: action.stickerX,
        stickerY: action.stickerY,
        stickerSize: action.stickerSize,
        // Magic-fill fields
        magicFills: action.magicFills,
      } as DrawingAction;
    })
    .filter((action): action is DrawingAction => action !== null);
};

/**
 * Saves canvas state for a specific image
 */
export const saveCanvasState = async (
  imageId: string,
  actions: DrawingAction[],
): Promise<boolean> => {
  try {
    const key = `${STORAGE_PREFIX}${imageId}`;
    const data: SavedCanvasData = {
      imageId,
      actions: serializeActions(actions),
      savedAt: Date.now(),
      version: CURRENT_VERSION,
    };

    await AsyncStorage.setItem(key, JSON.stringify(data));

    // Update metadata
    await updateMetadata(imageId);

    return true;
  } catch (error) {
    console.error("Failed to save canvas state:", error);
    return false;
  }
};

/**
 * Loads canvas state for a specific image
 */
export const loadCanvasState = async (
  imageId: string,
): Promise<DrawingAction[] | null> => {
  try {
    const key = `${STORAGE_PREFIX}${imageId}`;
    const stored = await AsyncStorage.getItem(key);

    if (!stored) return null;

    const data: SavedCanvasData = JSON.parse(stored);

    // Handle version migrations if needed
    if (data.version !== CURRENT_VERSION) {
      // Future: handle migrations here
    }

    return deserializeActions(data.actions);
  } catch (error) {
    console.error("Failed to load canvas state:", error);
    return null;
  }
};

/**
 * Deletes canvas state for a specific image
 */
export const deleteCanvasState = async (imageId: string): Promise<boolean> => {
  try {
    const key = `${STORAGE_PREFIX}${imageId}`;
    await AsyncStorage.removeItem(key);

    // Update metadata
    const metadata = await getMetadata();
    if (metadata) {
      metadata.savedCanvases = metadata.savedCanvases.filter(
        (c) => c.imageId !== imageId,
      );
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    }

    return true;
  } catch (error) {
    console.error("Failed to delete canvas state:", error);
    return false;
  }
};

/**
 * Gets metadata about all saved canvases
 */
const getMetadata = async (): Promise<CanvasMetadata | null> => {
  try {
    const stored = await AsyncStorage.getItem(METADATA_KEY);
    if (!stored) return { savedCanvases: [] };
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to get canvas metadata:", error);
    return null;
  }
};

/**
 * Updates metadata when a canvas is saved
 */
const updateMetadata = async (imageId: string): Promise<void> => {
  try {
    let metadata = await getMetadata();
    if (!metadata) {
      metadata = { savedCanvases: [] };
    }

    // Remove existing entry for this image
    metadata.savedCanvases = metadata.savedCanvases.filter(
      (c) => c.imageId !== imageId,
    );

    // Add new entry at the beginning
    metadata.savedCanvases.unshift({ imageId, savedAt: Date.now() });

    // Trim to max size
    if (metadata.savedCanvases.length > MAX_SAVED_CANVASES) {
      const toDelete = metadata.savedCanvases.slice(MAX_SAVED_CANVASES);
      metadata.savedCanvases = metadata.savedCanvases.slice(
        0,
        MAX_SAVED_CANVASES,
      );

      // Delete old canvases
      for (const canvas of toDelete) {
        const key = `${STORAGE_PREFIX}${canvas.imageId}`;
        await AsyncStorage.removeItem(key);
      }
    }

    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error("Failed to update canvas metadata:", error);
  }
};

/**
 * Gets a list of all saved canvas IDs
 */
export const getSavedCanvasIds = async (): Promise<string[]> => {
  try {
    const metadata = await getMetadata();
    if (!metadata) return [];
    return metadata.savedCanvases.map((c) => c.imageId);
  } catch (error) {
    console.error("Failed to get saved canvas IDs:", error);
    return [];
  }
};

/**
 * Checks if a canvas has saved state
 */
export const hasCanvasState = async (imageId: string): Promise<boolean> => {
  try {
    const key = `${STORAGE_PREFIX}${imageId}`;
    const stored = await AsyncStorage.getItem(key);
    return stored !== null;
  } catch (error) {
    return false;
  }
};

/**
 * Clears all saved canvas data
 */
export const clearAllCanvasData = async (): Promise<boolean> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const canvasKeys = keys.filter((key) => key.startsWith(STORAGE_PREFIX));
    await AsyncStorage.multiRemove(canvasKeys);
    return true;
  } catch (error) {
    console.error("Failed to clear all canvas data:", error);
    return false;
  }
};
