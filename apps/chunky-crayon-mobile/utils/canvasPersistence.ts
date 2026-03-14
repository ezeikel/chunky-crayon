import AsyncStorage from "@react-native-async-storage/async-storage";
import { SkPath, Skia } from "@shopify/react-native-skia";
import { Platform } from "react-native";
import { getAuthHeader } from "@/lib/auth";
import { queryClient } from "@/providers";
import type {
  DrawingAction,
  BrushType,
  FillType,
  PatternType,
} from "@/stores/canvasStore";

const STORAGE_PREFIX = "chunky_crayon_canvas_";
const METADATA_KEY = `${STORAGE_PREFIX}metadata`;
const SYNC_PENDING_PREFIX = "chunky_crayon_sync_pending_";

// Get API URL from environment
const getApiUrl = () => {
  const apiUrlFromEnv =
    Platform.OS === "android"
      ? (process.env.EXPO_PUBLIC_API_URL_ANDROID ??
        process.env.EXPO_PUBLIC_API_URL)
      : process.env.EXPO_PUBLIC_API_URL;
  return apiUrlFromEnv || "http://localhost:3000/api";
};

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
  // Cross-platform source dimensions - each action stores where it was recorded
  // so actions from web (CSS pixels) and mobile (SVG viewBox) can coexist
  sourceWidth?: number;
  sourceHeight?: number;
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
 * Converts local SerializedAction to API-compatible CanvasAction format
 * @param action - The local action to convert
 * @param index - Index for generating unique ID
 * @param sourceWidth - SVG viewBox width for cross-platform coordinate scaling
 * @param sourceHeight - SVG viewBox height for cross-platform coordinate scaling
 */
const convertToApiAction = (
  action: SerializedAction,
  index: number,
  defaultSourceWidth?: number,
  defaultSourceHeight?: number,
) => ({
  id: `action-${Date.now()}-${index}`,
  type: action.type as "stroke" | "fill" | "sticker" | "erase",
  timestamp: Date.now(),
  data: {
    path: action.pathSvg,
    color: action.color,
    brushType: action.brushType,
    brushSize: action.strokeWidth,
    x: action.fillX,
    y: action.fillY,
    fillColor: action.color,
    stickerId: action.sticker,
    position:
      action.stickerX !== undefined
        ? { x: action.stickerX, y: action.stickerY || 0 }
        : undefined,
    scale: action.stickerSize,
    // CRITICAL: Use per-action source dimensions if available (preserves original coordinate space)
    // Only fall back to default dimensions for new actions that don't have their own
    // This ensures web-originated actions keep their CSS pixel dimensions,
    // and mobile-originated actions keep their SVG viewBox dimensions
    sourceWidth: action.sourceWidth ?? defaultSourceWidth,
    sourceHeight: action.sourceHeight ?? defaultSourceHeight,
  },
});

/**
 * Syncs canvas progress to the server (stroke actions only, no snapshots)
 * @param imageId - The coloring image ID
 * @param actions - The drawing actions to sync
 * @param version - The current version for conflict detection
 * @param canvasWidth - Canvas width for aspect ratio scaling
 * @param canvasHeight - Canvas height for aspect ratio scaling
 * @param previewDataUrl - Optional base64 data URL of preview thumbnail
 */
export const syncCanvasToServer = async (
  imageId: string,
  actions: SerializedAction[],
  version: number = 0,
  canvasWidth?: number,
  canvasHeight?: number,
  previewDataUrl?: string,
): Promise<{ success: boolean; version?: number; error?: string }> => {
  console.log(
    `[CANVAS_SYNC] Syncing to server - Image: ${imageId}, Actions: ${actions.length}, Dimensions: ${canvasWidth}x${canvasHeight}`,
  );

  try {
    const apiUrl = getApiUrl();
    const authHeader = await getAuthHeader();

    console.log(`[CANVAS_SYNC] API URL: ${apiUrl}/canvas/progress`);
    console.log(
      `[CANVAS_SYNC] Auth header present: ${!!authHeader.Authorization}`,
    );
    console.log(
      `[CANVAS_SYNC] Has preview: ${!!previewDataUrl}, preview size: ${previewDataUrl?.length || 0} chars`,
    );

    // Convert to API format (stroke actions only)
    const apiActions = actions.map((action, idx) =>
      convertToApiAction(action, idx, canvasWidth, canvasHeight),
    );

    const response = await fetch(`${apiUrl}/canvas/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({
        coloringImageId: imageId,
        actions: apiActions,
        version,
        canvasWidth,
        canvasHeight,
        previewDataUrl,
      }),
    });

    console.log(`[CANVAS_SYNC] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }
      console.error(
        `[CANVAS_SYNC] Server error (${response.status}):`,
        errorData,
      );
      console.error(
        `[CANVAS_SYNC] Error message:`,
        errorData.error ||
          errorData.details ||
          errorData.raw ||
          "No error message",
      );

      // Handle version conflict - retry with the correct version
      if (response.status === 409 && errorData.currentVersion !== undefined) {
        console.log(
          `[CANVAS_SYNC] Version conflict detected. Server version: ${errorData.currentVersion}, Our version: ${version}`,
        );
        console.log(`[CANVAS_SYNC] Retrying with correct version...`);

        // Update local storage with server version and retry once
        const key = `${STORAGE_PREFIX}${imageId}`;
        try {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            data.version = errorData.currentVersion;
            await AsyncStorage.setItem(key, JSON.stringify(data));
            console.log(
              `[CANVAS_SYNC] Updated local version to ${errorData.currentVersion}`,
            );
          }
        } catch (e) {
          console.error(`[CANVAS_SYNC] Failed to update local version:`, e);
        }

        // Retry the sync with the correct version (pass through dimensions and preview)
        return syncCanvasToServer(
          imageId,
          actions,
          errorData.currentVersion,
          canvasWidth,
          canvasHeight,
          previewDataUrl,
        );
      }

      // Mark as pending sync if server error (not auth error)
      if (response.status >= 500) {
        await markPendingSync(imageId);
      }

      return {
        success: false,
        error: errorData.error || `Server error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[CANVAS_SYNC] Sync successful - Version: ${data.version}`);

    // Clear pending sync marker
    await clearPendingSync(imageId);

    // Invalidate feed query so previews refresh when user navigates back
    queryClient.invalidateQueries({ queryKey: ["feed"] });

    return { success: true, version: data.version };
  } catch (error) {
    console.error(`[CANVAS_SYNC] Network error:`, error);

    // Mark as pending sync for later retry
    await markPendingSync(imageId);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

/**
 * Loads canvas progress from the server
 * Returns:
 * - { actions, version, canvasWidth, canvasHeight } if data found
 * - { actions: [], version: 0, notFound: true } if 404 (no data on server)
 * - null if network/auth error (should fall back to local)
 */
export const loadCanvasFromServer = async (
  imageId: string,
): Promise<{
  actions: SerializedAction[];
  version: number;
  canvasWidth?: number;
  canvasHeight?: number;
  notFound?: boolean;
} | null> => {
  console.log(`[CANVAS_SYNC] Loading from server - Image: ${imageId}`);

  try {
    const apiUrl = getApiUrl();
    const authHeader = await getAuthHeader();

    const response = await fetch(
      `${apiUrl}/canvas/progress?imageId=${encodeURIComponent(imageId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
      },
    );

    if (response.status === 404) {
      console.log(
        `[CANVAS_SYNC] No server progress found for image ${imageId}`,
      );
      // Return empty result with notFound flag to indicate server explicitly says no data
      return { actions: [], version: 0, notFound: true };
    }

    if (!response.ok) {
      console.error(
        `[CANVAS_SYNC] Server error loading progress: ${response.status}`,
      );
      return null;
    }

    const data = await response.json();
    console.log(
      `[CANVAS_SYNC] Loaded from server - Actions: ${data.actions?.length}, Version: ${data.version}, Dimensions: ${data.canvasWidth}x${data.canvasHeight}`,
    );

    // Convert API actions back to local format (skip snapshot actions)
    // CRITICAL: Preserve per-action sourceWidth/sourceHeight for cross-platform sync
    // This ensures actions from web (CSS pixels ~880) keep their dimensions
    // even when loaded on mobile (SVG viewBox ~1024)
    const localActions: SerializedAction[] =
      data.actions
        ?.filter((action: any) => action.type !== "snapshot") // Skip legacy snapshot actions
        .map((action: any) => ({
          type: action.type,
          pathSvg: action.data?.path,
          color: action.data?.color || action.data?.fillColor || "",
          brushType: action.data?.brushType,
          strokeWidth: action.data?.brushSize,
          fillX: action.data?.x,
          fillY: action.data?.y,
          sticker: action.data?.stickerId,
          stickerX: action.data?.position?.x,
          stickerY: action.data?.position?.y,
          stickerSize: action.data?.scale,
          // Preserve per-action source dimensions from server
          // This is critical for cross-platform sync - web actions have different
          // coordinate space than mobile actions
          sourceWidth: action.data?.sourceWidth,
          sourceHeight: action.data?.sourceHeight,
        })) || [];

    return {
      actions: localActions,
      version: data.version,
      canvasWidth: data.canvasWidth,
      canvasHeight: data.canvasHeight,
    };
  } catch (error) {
    console.error(`[CANVAS_SYNC] Network error loading progress:`, error);
    return null;
  }
};

/**
 * Mark an image as needing sync when online
 */
const markPendingSync = async (imageId: string): Promise<void> => {
  try {
    const key = `${SYNC_PENDING_PREFIX}${imageId}`;
    await AsyncStorage.setItem(key, JSON.stringify({ markedAt: Date.now() }));
    console.log(`[CANVAS_SYNC] Marked ${imageId} for pending sync`);
  } catch (error) {
    console.error(`[CANVAS_SYNC] Failed to mark pending sync:`, error);
  }
};

/**
 * Clear pending sync marker
 */
const clearPendingSync = async (imageId: string): Promise<void> => {
  try {
    const key = `${SYNC_PENDING_PREFIX}${imageId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[CANVAS_SYNC] Failed to clear pending sync:`, error);
  }
};

/**
 * Get all images with pending syncs
 */
export const getPendingSyncs = async (): Promise<string[]> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys
      .filter((key) => key.startsWith(SYNC_PENDING_PREFIX))
      .map((key) => key.replace(SYNC_PENDING_PREFIX, ""));
  } catch (error) {
    console.error(`[CANVAS_SYNC] Failed to get pending syncs:`, error);
    return [];
  }
};

/**
 * Sync all pending canvases
 */
export const syncPendingCanvases = async (): Promise<void> => {
  console.log(`[CANVAS_SYNC] Checking for pending syncs...`);
  const pendingIds = await getPendingSyncs();

  if (pendingIds.length === 0) {
    console.log(`[CANVAS_SYNC] No pending syncs`);
    return;
  }

  console.log(`[CANVAS_SYNC] Found ${pendingIds.length} pending syncs`);

  for (const imageId of pendingIds) {
    try {
      const key = `${STORAGE_PREFIX}${imageId}`;
      const stored = await AsyncStorage.getItem(key);

      if (stored) {
        const data: SavedCanvasData = JSON.parse(stored);
        await syncCanvasToServer(imageId, data.actions, data.version);
      } else {
        // No local data, just clear the pending marker
        await clearPendingSync(imageId);
      }
    } catch (error) {
      console.error(
        `[CANVAS_SYNC] Failed to sync pending canvas ${imageId}:`,
        error,
      );
    }
  }
};

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
 * Preserves sourceWidth/sourceHeight for cross-platform coordinate scaling
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
    // Cross-platform source dimensions - preserve so actions from different
    // platforms keep their original coordinate space
    sourceWidth: action.sourceWidth,
    sourceHeight: action.sourceHeight,
  }));
};

/**
 * Deserializes stored actions back to DrawingAction[]
 * Preserves sourceWidth/sourceHeight for cross-platform coordinate scaling
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
        // Cross-platform source dimensions - preserve so actions from different
        // platforms keep their original coordinate space
        sourceWidth: action.sourceWidth,
        sourceHeight: action.sourceHeight,
      } as DrawingAction;
    })
    .filter((action): action is DrawingAction => action !== null);
};

/**
 * Saves canvas state for a specific image (stroke actions only)
 * @param imageId - The coloring image ID
 * @param actions - The drawing actions to save
 * @param canvasWidth - Canvas width for cross-platform aspect ratio scaling
 * @param canvasHeight - Canvas height for cross-platform aspect ratio scaling
 * @param previewDataUrl - Optional base64 data URL of preview thumbnail
 */
export const saveCanvasState = async (
  imageId: string,
  actions: DrawingAction[],
  canvasWidth?: number,
  canvasHeight?: number,
  previewDataUrl?: string,
): Promise<boolean> => {
  console.log(
    `[CANVAS_PERSIST] SAVE START - Image: ${imageId}, Actions: ${actions.length}, Dimensions: ${canvasWidth}x${canvasHeight}`,
  );

  // Validate inputs
  if (!imageId) {
    console.error(`[CANVAS_PERSIST] SAVE FAILED - Invalid imageId: ${imageId}`);
    return false;
  }

  if (!actions || actions.length === 0) {
    console.warn(`[CANVAS_PERSIST] SAVE SKIPPED - No actions to save`);
    return false;
  }

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

    // Read existing version from local storage (may have been set by server sync)
    let currentVersion = CURRENT_VERSION;
    try {
      const existingData = await AsyncStorage.getItem(key);
      if (existingData) {
        const parsed = JSON.parse(existingData) as SavedCanvasData;
        // Use the stored version (which reflects server version after sync)
        currentVersion = parsed.version || CURRENT_VERSION;
        console.log(
          `[CANVAS_PERSIST] Using existing version: ${currentVersion}`,
        );
      }
    } catch {
      // Ignore parse errors, use default version
    }

    const data: SavedCanvasData = {
      imageId,
      actions: serializeActions(actions),
      savedAt: Date.now(),
      version: currentVersion,
    };

    console.log(
      `[CANVAS_PERSIST] Serialized data size: ${JSON.stringify(data).length} bytes`,
    );
    console.log(`[CANVAS_PERSIST] Saving to AsyncStorage with key: ${key}`);

    // Try to save to AsyncStorage
    await AsyncStorage.setItem(key, JSON.stringify(data));

    // Verify the save worked by reading it back
    const verification = await AsyncStorage.getItem(key);
    if (!verification) {
      throw new Error("Save verification failed - data not found after save");
    }

    console.log(
      `[CANVAS_PERSIST] SAVE SUCCESS - Saved ${data.actions.length} serialized actions, verified size: ${verification.length} bytes`,
    );

    // Update metadata
    await updateMetadata(imageId);

    // Run debug check to confirm data is persisted
    console.log(`[CANVAS_PERSIST] Running post-save verification...`);
    const allKeys = await AsyncStorage.getAllKeys();
    const canvasKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
    console.log(
      `[CANVAS_PERSIST] Post-save canvas keys found: ${canvasKeys.length}`,
    );

    // Sync to server in the background (don't block local save)
    console.log(`[CANVAS_PERSIST] Triggering server sync...`);
    syncCanvasToServer(
      imageId,
      data.actions,
      data.version,
      canvasWidth,
      canvasHeight,
      previewDataUrl,
    )
      .then(async (result) => {
        if (result.success && result.version !== undefined) {
          console.log(
            `[CANVAS_PERSIST] Server sync completed - Version: ${result.version}`,
          );
          // Update local storage with new server version
          try {
            data.version = result.version;
            await AsyncStorage.setItem(key, JSON.stringify(data));
            console.log(
              `[CANVAS_PERSIST] Updated local version to: ${result.version}`,
            );
          } catch (updateError) {
            console.error(
              `[CANVAS_PERSIST] Failed to update local version:`,
              updateError,
            );
          }
        } else {
          console.log(
            `[CANVAS_PERSIST] Server sync failed: ${result.error} (will retry later)`,
          );
        }
      })
      .catch((err) => {
        console.error(`[CANVAS_PERSIST] Server sync error:`, err);
      });

    return true;
  } catch (error) {
    console.error(`[CANVAS_PERSIST] SAVE FAILED - Error:`, error);
    console.error(`[CANVAS_PERSIST] Error stack:`, (error as Error)?.stack);
    return false;
  }
};

/**
 * Result of loading canvas state - actions only (no snapshots)
 * Includes source canvas dimensions for aspect ratio scaling
 */
export type LoadCanvasResult = {
  actions: DrawingAction[];
  sourceCanvasWidth?: number; // Original canvas width (from web)
  sourceCanvasHeight?: number; // Original canvas height (from web)
};

/**
 * Loads canvas state for a specific image
 * Tries to load from server first for cross-platform sync, falls back to local storage
 * Returns drawing actions for replay on canvas
 */
export const loadCanvasState = async (
  imageId: string,
): Promise<LoadCanvasResult | null> => {
  console.log(`[CANVAS_PERSIST] LOAD START - Image: ${imageId}`);

  // First, try to load from server (most recent cross-platform data)
  try {
    const serverData = await loadCanvasFromServer(imageId);

    // If server explicitly says no data (404), clear local storage to stay in sync
    if (serverData?.notFound) {
      console.log(
        `[CANVAS_PERSIST] Server has no data (404) - clearing local storage to sync`,
      );
      const key = `${STORAGE_PREFIX}${imageId}`;
      await AsyncStorage.removeItem(key);
      return null;
    }

    // If server returned data (not null, not notFound)
    if (serverData && serverData.actions.length > 0) {
      console.log(
        `[CANVAS_PERSIST] Found server data - Actions: ${serverData.actions.length}, Source dimensions: ${serverData.canvasWidth}x${serverData.canvasHeight}`,
      );

      // Deserialize actions for rendering
      const actions = deserializeActions(serverData.actions);

      // Also update local storage with server data
      const key = `${STORAGE_PREFIX}${imageId}`;
      const data: SavedCanvasData = {
        imageId,
        actions: serverData.actions,
        savedAt: Date.now(),
        version: serverData.version,
      };
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`[CANVAS_PERSIST] Updated local storage with server data`);

      if (actions.length > 0) {
        console.log(
          `[CANVAS_PERSIST] Returning ${actions.length} drawing actions`,
        );
        return {
          actions,
          sourceCanvasWidth: serverData.canvasWidth,
          sourceCanvasHeight: serverData.canvasHeight,
        };
      }
    }

    // If server returned null (network/auth error), fall through to local storage
  } catch (error) {
    console.log(
      `[CANVAS_PERSIST] Server load failed, falling back to local:`,
      error,
    );
  }

  // Fall back to local storage
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

    return { actions };
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
