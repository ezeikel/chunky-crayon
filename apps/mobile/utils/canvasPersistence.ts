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
  console.log(
    `[CANVAS_PERSIST] SAVE START - Image: ${imageId}, Actions: ${actions.length}`,
  );

  // Log action types
  const actionTypes = actions.reduce(
    (acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log(`[CANVAS_PERSIST] Action breakdown:`, actionTypes);

  try {
    const key = `${STORAGE_PREFIX}${imageId}`;
    const data: SavedCanvasData = {
      imageId,
      actions: serializeActions(actions),
      savedAt: Date.now(),
      version: CURRENT_VERSION,
    };

    console.log(`[CANVAS_PERSIST] Saving to AsyncStorage with key: ${key}`);
    await AsyncStorage.setItem(key, JSON.stringify(data));
    console.log(
      `[CANVAS_PERSIST] SAVE SUCCESS - Saved ${data.actions.length} serialized actions`,
    );

    // Update metadata
    await updateMetadata(imageId);

    return true;
  } catch (error) {
    console.error(`[CANVAS_PERSIST] SAVE FAILED - Error:`, error);
    return false;
  }
};

/**
 * Loads canvas state for a specific image
 */
export const loadCanvasState = async (
  imageId: string,
): Promise<DrawingAction[] | null> => {
  console.log(`[CANVAS_PERSIST] LOAD START - Image: ${imageId}`);

  try {
    const key = `${STORAGE_PREFIX}${imageId}`;
    console.log(`[CANVAS_PERSIST] Loading from AsyncStorage with key: ${key}`);
    const stored = await AsyncStorage.getItem(key);

    if (!stored) {
      console.log(
        `[CANVAS_PERSIST] LOAD RESULT - No saved data found for image ${imageId}`,
      );
      return null;
    }

    const data: SavedCanvasData = JSON.parse(stored);
    console.log(
      `[CANVAS_PERSIST] Found saved data - Actions: ${data.actions.length}, Saved at: ${new Date(data.savedAt).toISOString()}`,
    );

    // Handle version migrations if needed
    if (data.version !== CURRENT_VERSION) {
      console.log(
        `[CANVAS_PERSIST] Version mismatch - stored: ${data.version}, current: ${CURRENT_VERSION}`,
      );
      // Future: handle migrations here
    }

    const actions = deserializeActions(data.actions);
    console.log(
      `[CANVAS_PERSIST] LOAD SUCCESS - Deserialized ${actions.length} actions`,
    );

    // Log action types
    const actionTypes = actions.reduce(
      (acc, action) => {
        acc[action.type] = (acc[action.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log(`[CANVAS_PERSIST] Loaded action breakdown:`, actionTypes);

    return actions;
  } catch (error) {
    console.error(`[CANVAS_PERSIST] LOAD FAILED - Error:`, error);
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

/**
 * Debug utility to inspect all saved canvas data
 */
export const debugCanvasStorage = async (): Promise<void> => {
  console.log(`[CANVAS_DEBUG] ===== STORAGE INSPECTION START =====`);

  try {
    // Get all keys
    const allKeys = await AsyncStorage.getAllKeys();
    const canvasKeys = allKeys.filter((key) => key.startsWith(STORAGE_PREFIX));

    console.log(`[CANVAS_DEBUG] Total canvas keys found: ${canvasKeys.length}`);

    // Get metadata
    const metadata = await getMetadata();
    if (metadata) {
      console.log(
        `[CANVAS_DEBUG] Metadata - Saved canvases: ${metadata.savedCanvases.length}`,
      );
      metadata.savedCanvases.forEach((canvas, idx) => {
        console.log(
          `[CANVAS_DEBUG]   ${idx + 1}. Image: ${canvas.imageId}, Saved: ${new Date(canvas.savedAt).toISOString()}`,
        );
      });
    } else {
      console.log(`[CANVAS_DEBUG] No metadata found`);
    }

    // Inspect each canvas
    for (const key of canvasKeys) {
      if (key === METADATA_KEY) continue;

      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        try {
          const data = JSON.parse(stored) as SavedCanvasData;
          const imageId = key.replace(STORAGE_PREFIX, "");
          console.log(`[CANVAS_DEBUG] Canvas ${imageId}:`);
          console.log(`[CANVAS_DEBUG]   - Actions: ${data.actions.length}`);
          console.log(
            `[CANVAS_DEBUG]   - Saved at: ${new Date(data.savedAt).toISOString()}`,
          );
          console.log(`[CANVAS_DEBUG]   - Size: ${stored.length} bytes`);

          // Count action types
          const actionTypes = data.actions.reduce(
            (acc, action) => {
              acc[action.type] = (acc[action.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          console.log(`[CANVAS_DEBUG]   - Action types:`, actionTypes);
        } catch (e) {
          console.log(`[CANVAS_DEBUG] Failed to parse data for key ${key}:`, e);
        }
      }
    }
  } catch (error) {
    console.error(`[CANVAS_DEBUG] Error inspecting storage:`, error);
  }

  console.log(`[CANVAS_DEBUG] ===== STORAGE INSPECTION END =====`);
};
