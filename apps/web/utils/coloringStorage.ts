/**
 * Utility functions for saving/loading coloring progress to localStorage
 * and syncing to the server for cross-platform persistence.
 * Uses both action-based format (for cross-platform sync) and base64 snapshots (for quick restore).
 */

import type { SerializableCanvasAction } from '@/types/canvasActions';
import { serializableToApiAction } from '@/types/canvasActions';

const STORAGE_KEY_PREFIX = 'coloring-progress-';
const SYNC_PENDING_PREFIX = 'coloring-sync-pending-';

type SavedColoringData = {
  imageDataUrl: string;
  savedAt: number;
  coloringImageId: string;
  version?: number;
  actions?: SerializableCanvasAction[]; // Now stored alongside snapshot for server sync
};

/**
 * Get the storage key for a coloring image
 */
export const getStorageKey = (coloringImageId: string): string => {
  return `${STORAGE_KEY_PREFIX}${coloringImageId}`;
};

/**
 * Sync canvas progress to the server with serializable actions (stroke actions only, no snapshots)
 */
const syncToServer = async (
  coloringImageId: string,
  actions: SerializableCanvasAction[],
  version: number = 0,
  canvasWidth?: number,
  canvasHeight?: number,
): Promise<{ success: boolean; version?: number }> => {
  try {
    console.log(
      `[CANVAS_SYNC_WEB] Syncing to server - Image: ${coloringImageId}, Actions: ${actions.length}, Version: ${version}, Dimensions: ${canvasWidth}x${canvasHeight}`,
    );

    // Convert serializable actions to API format (stroke actions only)
    const apiActions = actions.map((action, index) =>
      serializableToApiAction(action, index),
    );

    const response = await fetch('/api/canvas/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coloringImageId,
        actions: apiActions,
        version,
        canvasWidth,
        canvasHeight,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[CANVAS_SYNC_WEB] Server error: ${response.status}`,
        errorData,
      );

      // Handle version conflict - retry with correct version
      if (response.status === 409 && errorData.currentVersion !== undefined) {
        console.log(
          `[CANVAS_SYNC_WEB] Version conflict. Server: ${errorData.currentVersion}, Ours: ${version}`,
        );
        console.log(`[CANVAS_SYNC_WEB] Retrying with correct version...`);

        // Update local storage with server version
        try {
          const stored = localStorage.getItem(getStorageKey(coloringImageId));
          if (stored) {
            const data = JSON.parse(stored) as SavedColoringData;
            data.version = errorData.currentVersion;
            localStorage.setItem(
              getStorageKey(coloringImageId),
              JSON.stringify(data),
            );
          }
        } catch (e) {
          console.error(`[CANVAS_SYNC_WEB] Failed to update local version:`, e);
        }

        // Retry with the correct version (pass through dimensions)
        return syncToServer(
          coloringImageId,
          actions,
          errorData.currentVersion,
          canvasWidth,
          canvasHeight,
        );
      }

      // Mark for later sync if server error
      if (response.status >= 500) {
        markPendingSync(coloringImageId);
      }
      return { success: false };
    }

    const data = await response.json();
    console.log(`[CANVAS_SYNC_WEB] Sync successful - Version: ${data.version}`);

    // Clear pending sync marker
    clearPendingSync(coloringImageId);

    return { success: true, version: data.version };
  } catch (error) {
    console.error('[CANVAS_SYNC_WEB] Network error:', error);
    markPendingSync(coloringImageId);
    return { success: false };
  }
};

/**
 * Mark an image as needing sync when online
 */
const markPendingSync = (coloringImageId: string): void => {
  try {
    localStorage.setItem(
      `${SYNC_PENDING_PREFIX}${coloringImageId}`,
      JSON.stringify({ markedAt: Date.now() }),
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Clear pending sync marker
 */
const clearPendingSync = (coloringImageId: string): void => {
  try {
    localStorage.removeItem(`${SYNC_PENDING_PREFIX}${coloringImageId}`);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Save canvas state to localStorage and sync to server
 * @param coloringImageId - The ID of the coloring image
 * @param canvas - The HTML canvas element to capture as snapshot
 * @param drawingActions - The serializable drawing actions to sync (strokes, fills, etc.)
 */
export const saveColoringProgress = (
  coloringImageId: string,
  canvas: HTMLCanvasElement,
  drawingActions: SerializableCanvasAction[] = [],
): boolean => {
  try {
    const imageDataUrl = canvas.toDataURL('image/png');

    // Send actual CSS dimensions for cross-platform coordinate scaling
    // Actions are normalized to 0-1 range in normalizePointsForSync
    // These dimensions tell the receiving platform what aspect ratio to use
    const canvasWidth = canvas.clientWidth || canvas.width;
    const canvasHeight = canvas.clientHeight || canvas.height;

    // Read existing version from localStorage (may have been set by server sync)
    let currentVersion = 0;
    try {
      const existingData = localStorage.getItem(getStorageKey(coloringImageId));
      if (existingData) {
        const parsed = JSON.parse(existingData) as SavedColoringData;
        currentVersion = parsed.version || 0;
        console.log(
          `[CANVAS_SYNC_WEB] Using existing version: ${currentVersion}`,
        );
      }
    } catch {
      // Ignore parse errors, use default version
    }

    const data: SavedColoringData = {
      imageDataUrl,
      savedAt: Date.now(),
      coloringImageId,
      version: currentVersion,
      actions: drawingActions,
    };
    localStorage.setItem(getStorageKey(coloringImageId), JSON.stringify(data));

    console.log(
      `[CANVAS_SYNC_WEB] Saving progress - Actions: ${drawingActions.length}, Version: ${currentVersion}, Canvas: ${canvasWidth}x${canvasHeight}`,
    );

    // Sync to server in the background (don't block local save)
    syncToServer(
      coloringImageId,
      drawingActions,
      data.version,
      canvasWidth,
      canvasHeight,
    )
      .then((result) => {
        if (result.success && result.version !== undefined) {
          // Update local version
          data.version = result.version;
          localStorage.setItem(
            getStorageKey(coloringImageId),
            JSON.stringify(data),
          );
          console.log(
            `[CANVAS_SYNC_WEB] Updated local version to: ${result.version}`,
          );
        }
      })
      .catch((err) => {
        console.error('[CANVAS_SYNC_WEB] Background sync error:', err);
      });

    return true;
  } catch (error) {
    console.error('Failed to save coloring progress:', error);
    return false;
  }
};

/**
 * Load progress from the server (actions only, no snapshots)
 * Returns drawing actions that can be replayed on the canvas
 */
const loadFromServer = async (
  coloringImageId: string,
): Promise<{
  actions: SerializableCanvasAction[];
  version: number;
  sourceWidth?: number;
  sourceHeight?: number;
} | null> => {
  try {
    console.log(
      `[CANVAS_SYNC_WEB] Loading from server - Image: ${coloringImageId}`,
    );

    const response = await fetch(
      `/api/canvas/progress?imageId=${encodeURIComponent(coloringImageId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.status === 404) {
      console.log(
        `[CANVAS_SYNC_WEB] No server progress found for image ${coloringImageId}`,
      );
      return null;
    }

    if (!response.ok) {
      console.error(
        `[CANVAS_SYNC_WEB] Server error loading progress: ${response.status}`,
      );
      return null;
    }

    const data = await response.json();
    console.log(
      `[CANVAS_SYNC_WEB] Loaded from server - Actions: ${data.actions?.length}, Version: ${data.version}, Source dimensions: ${data.canvasWidth}x${data.canvasHeight}`,
    );
    console.log(
      `[CANVAS_SYNC_WEB] Action types:`,
      data.actions?.map((a: any) => a.type),
    );

    // Capture source canvas dimensions for coordinate normalization
    const sourceWidth = data.canvasWidth as number | undefined;
    const sourceHeight = data.canvasHeight as number | undefined;

    // Extract drawing actions (strokes, fills, stickers) - ignore snapshot actions
    const drawingActions: SerializableCanvasAction[] = [];
    console.log(
      `[CANVAS_SYNC_WEB] Processing ${data.actions?.length || 0} raw actions from server`,
    );

    for (let i = 0; i < (data.actions?.length || 0); i++) {
      const action = data.actions[i];
      console.log(
        `[CANVAS_SYNC_WEB] Action ${i}: type=${action.type}, hasData=${!!action.data}, hasPath=${!!action.data?.path}`,
      );

      // Log full structure of first action for debugging cross-platform sync
      if (i === 0) {
        console.log(
          `[CANVAS_SYNC_WEB] First action full structure:`,
          JSON.stringify(action, null, 2).substring(0, 500),
        );
      }

      // Skip snapshot actions - we no longer use them
      if (action.type === 'snapshot') {
        console.log(`[CANVAS_SYNC_WEB] Skipping legacy snapshot action`);
        continue;
      }

      if (action.type === 'stroke' && action.data?.path) {
        const strokeAction = {
          type: 'stroke' as const,
          path: [], // Path points would need to be parsed from SVG
          pathSvg: action.data.path,
          color: action.data.color || '#000000',
          brushType: action.data.brushType || 'marker',
          strokeWidth: action.data.brushSize || 10,
          timestamp: action.timestamp || Date.now(),
          // CRITICAL: Preserve per-action source dimensions for cross-platform sync
          // Each action may have different source dimensions (web CSS pixels vs mobile SVG viewBox)
          sourceWidth: action.data.sourceWidth as number | undefined,
          sourceHeight: action.data.sourceHeight as number | undefined,
        };
        console.log(
          `[CANVAS_SYNC_WEB] Created stroke action: color=${strokeAction.color}, brushType=${strokeAction.brushType}, pathLength=${strokeAction.pathSvg?.length || 0}, sourceWidth=${strokeAction.sourceWidth}`,
        );
        drawingActions.push(strokeAction);
      } else if (action.type === 'fill') {
        drawingActions.push({
          type: 'fill',
          x: action.data?.x || 0,
          y: action.data?.y || 0,
          color: action.data?.fillColor || action.data?.color || '#000000',
          timestamp: action.timestamp || Date.now(),
          // Preserve per-action source dimensions
          sourceWidth: action.data?.sourceWidth as number | undefined,
          sourceHeight: action.data?.sourceHeight as number | undefined,
        });
        console.log(
          `[CANVAS_SYNC_WEB] Created fill action at (${action.data?.x}, ${action.data?.y}), sourceWidth=${action.data?.sourceWidth}`,
        );
      } else if (action.type === 'sticker') {
        const position = action.data?.position || { x: 0, y: 0 };
        drawingActions.push({
          type: 'sticker',
          sticker: action.data?.stickerId || '',
          x: position.x,
          y: position.y,
          size: action.data?.scale || 48,
          timestamp: action.timestamp || Date.now(),
          // Preserve per-action source dimensions
          sourceWidth: action.data?.sourceWidth as number | undefined,
          sourceHeight: action.data?.sourceHeight as number | undefined,
        });
        console.log(
          `[CANVAS_SYNC_WEB] Created sticker action: ${action.data?.stickerId}, sourceWidth=${action.data?.sourceWidth}`,
        );
      } else {
        console.warn(
          `[CANVAS_SYNC_WEB] Unknown or invalid action at index ${i}:`,
          JSON.stringify(action).substring(0, 200),
        );
      }
    }

    console.log(
      `[CANVAS_SYNC_WEB] Parsed ${drawingActions.length} drawing actions from server`,
    );

    return {
      actions: drawingActions,
      version: data.version || 0,
      sourceWidth,
      sourceHeight,
    };
  } catch (error) {
    console.error('[CANVAS_SYNC_WEB] Network error loading progress:', error);
    return null;
  }
};

/**
 * Result type for loadColoringProgress
 * - image: Local snapshot for quick restore (from localStorage)
 * - actions: Drawing actions for server sync and cross-platform compatibility
 * - version: Server version for conflict resolution
 * - source: Where the data came from ('server' | 'local')
 * - sourceWidth/sourceHeight: Original canvas dimensions for coordinate normalization
 */
export type LoadProgressResult = {
  image?: HTMLImageElement; // Local snapshot (may not exist if only server data)
  actions: SerializableCanvasAction[]; // Drawing actions (always present)
  version: number;
  source: 'server' | 'local';
  sourceWidth?: number; // Original canvas width (for coordinate scaling)
  sourceHeight?: number; // Original canvas height (for coordinate scaling)
};

/**
 * Load saved canvas state from server and/or localStorage
 * Prioritizes server data for cross-platform sync, falls back to local storage
 * Returns actions (for replay) and optionally a local snapshot image (for quick restore)
 */
export const loadColoringProgress = async (
  coloringImageId: string,
): Promise<LoadProgressResult | null> => {
  console.log(
    `[CANVAS_SYNC_WEB] loadColoringProgress called for image: ${coloringImageId}`,
  );

  // First, try to load from server (has most recent cross-platform data)
  try {
    const serverData = await loadFromServer(coloringImageId);
    console.log(
      `[CANVAS_SYNC_WEB] loadFromServer returned:`,
      serverData
        ? `${serverData.actions.length} actions, version ${serverData.version}`
        : 'null',
    );

    if (serverData && serverData.actions.length > 0) {
      console.log(
        `[CANVAS_SYNC_WEB] Using server data - ${serverData.actions.length} actions, version ${serverData.version}`,
      );

      // Update local storage with server version for conflict resolution
      // This ensures future saves use the correct version number
      try {
        const existingLocal = localStorage.getItem(
          getStorageKey(coloringImageId),
        );
        if (existingLocal) {
          const localData = JSON.parse(existingLocal) as SavedColoringData;
          localData.version = serverData.version;
          localData.actions = serverData.actions;
          localStorage.setItem(
            getStorageKey(coloringImageId),
            JSON.stringify(localData),
          );
        } else {
          // No local data exists - create entry with server version
          // This is critical for first-time loads from another device
          const newLocalData: SavedColoringData = {
            imageDataUrl: '', // No snapshot yet
            savedAt: Date.now(),
            coloringImageId,
            version: serverData.version,
            actions: serverData.actions,
          };
          localStorage.setItem(
            getStorageKey(coloringImageId),
            JSON.stringify(newLocalData),
          );
          console.log(
            `[CANVAS_SYNC_WEB] Created local entry with server version: ${serverData.version}`,
          );
        }
      } catch {
        // Ignore local storage errors
      }

      const result = {
        actions: serverData.actions,
        version: serverData.version,
        source: 'server' as const,
        sourceWidth: serverData.sourceWidth,
        sourceHeight: serverData.sourceHeight,
      };
      console.log(
        `[CANVAS_SYNC_WEB] Returning server result: ${result.actions.length} actions, source=${result.source}, dimensions=${result.sourceWidth}x${result.sourceHeight}`,
      );
      return result;
    }
  } catch (error) {
    console.error('[CANVAS_SYNC_WEB] Error loading from server:', error);
    // Fall through to local storage
  }

  // Fall back to local storage
  try {
    const stored = localStorage.getItem(getStorageKey(coloringImageId));
    if (!stored) {
      return null;
    }

    const data: SavedColoringData = JSON.parse(stored);

    // If we have local actions, use those
    if (data.actions && data.actions.length > 0) {
      console.log(
        `[CANVAS_SYNC_WEB] Using local storage - ${data.actions.length} actions`,
      );

      // Also try to load the snapshot image for quick restore
      return new Promise((resolve) => {
        if (data.imageDataUrl) {
          const img = new Image();
          img.onload = () =>
            resolve({
              image: img,
              actions: data.actions || [],
              version: data.version || 0,
              source: 'local',
            });
          img.onerror = () =>
            resolve({
              actions: data.actions || [],
              version: data.version || 0,
              source: 'local',
            });
          img.src = data.imageDataUrl;
        } else {
          resolve({
            actions: data.actions || [],
            version: data.version || 0,
            source: 'local',
          });
        }
      });
    }

    // Legacy: only snapshot, no actions - load image
    if (data.imageDataUrl) {
      console.log(`[CANVAS_SYNC_WEB] Using legacy local snapshot (no actions)`);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({
            image: img,
            actions: [],
            version: data.version || 0,
            source: 'local',
          });
        img.onerror = () => resolve(null);
        img.src = data.imageDataUrl;
      });
    }

    return null;
  } catch (error) {
    console.error('Failed to load coloring progress:', error);
    return null;
  }
};

/**
 * Check if saved progress exists for a coloring image
 */
export const hasSavedProgress = (coloringImageId: string): boolean => {
  try {
    return localStorage.getItem(getStorageKey(coloringImageId)) !== null;
  } catch {
    return false;
  }
};

/**
 * Clear saved progress for a coloring image
 */
export const clearColoringProgress = (coloringImageId: string): boolean => {
  try {
    localStorage.removeItem(getStorageKey(coloringImageId));
    return true;
  } catch (error) {
    console.error('Failed to clear coloring progress:', error);
    return false;
  }
};

/**
 * Get metadata about saved progress (without loading the full image)
 */
export const getSavedProgressInfo = (
  coloringImageId: string,
): { savedAt: number } | null => {
  try {
    const stored = localStorage.getItem(getStorageKey(coloringImageId));
    if (!stored) return null;

    const data: SavedColoringData = JSON.parse(stored);
    return { savedAt: data.savedAt };
  } catch {
    return null;
  }
};
