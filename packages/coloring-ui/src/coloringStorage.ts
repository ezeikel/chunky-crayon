/**
 * Utility functions for saving/loading coloring progress to localStorage
 * and syncing to the server for cross-platform persistence.
 * Uses both action-based format (for cross-platform sync) and base64 snapshots (for quick restore).
 */

import type { SerializableCanvasAction } from "./canvasActions";
import {
  serializableToApiAction,
  apiActionToSerializable,
} from "./canvasActions";
import { idbSet, idbGet, idbDelete } from "./idbStorage";
import {
  mergeCanvasActions,
  type CanvasAction,
} from "@one-colored-pixel/db/types";

// On a 409 the merged array is re-POSTed; cap the merge/retry loop so a third
// concurrent writer can't ping-pong it forever. After the cap we keep the
// merged result locally + mark pending (never blind-clobber).
const MAX_MERGE_RETRIES = 2;
// Preview cache invalidation — apps can provide their own implementation
let _invalidatePreviewCache: ((id: string) => void) | null = null;

export function setPreviewCacheInvalidator(fn: (id: string) => void) {
  _invalidatePreviewCache = fn;
}

function invalidatePreviewCache(id: string) {
  _invalidatePreviewCache?.(id);
}

// After a 409 append-merge, the storage layer needs to push the merged action
// set back into the live in-memory canvas so future autosaves serialize the
// union (not the device-only set). The app (ColoringArea) registers a callback
// that calls setDrawingActions with the merged actions for the matching image.
let _onMergedActions:
  | ((coloringImageId: string, actions: SerializableCanvasAction[]) => void)
  | null = null;

export function setMergedActionsHandler(
  fn: (coloringImageId: string, actions: SerializableCanvasAction[]) => void,
) {
  _onMergedActions = fn;
}

const STORAGE_KEY_PREFIX = "coloring-progress-";
const SYNC_PENDING_PREFIX = "coloring-sync-pending-";

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
  previewDataUrl?: string,
  snapshotDataUrl?: string,
  attempt: number = 0,
): Promise<{ success: boolean; version?: number; previewUrl?: string }> => {
  try {
    console.log(
      `[CANVAS_SYNC_WEB] Syncing to server - Image: ${coloringImageId}, Actions: ${actions.length}, Version: ${version}, Dimensions: ${canvasWidth}x${canvasHeight}`,
    );

    // Convert serializable actions to API format (stable ids carried through)
    const apiActions = actions.map((action) => serializableToApiAction(action));

    const response = await fetch("/api/canvas/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // profileId is omitted — the server resolves the active profile from the
      // web session (getActiveProfile). Snapshot is the cross-device restore
      // raster for magic/legacy pages.
      body: JSON.stringify({
        coloringImageId,
        actions: apiActions,
        version,
        canvasWidth,
        canvasHeight,
        previewDataUrl,
        snapshotDataUrl,
        snapshotWidth: snapshotDataUrl ? 1024 : undefined,
        snapshotHeight: snapshotDataUrl ? 1024 : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[CANVAS_SYNC_WEB] Server error: ${response.status}`,
        errorData,
      );

      // Handle version conflict — APPEND-MERGE (not blind last-write-wins).
      // The 409 body hands us the server's current actions; union them with
      // ours by stable id, then re-POST the merged set at the server version.
      if (response.status === 409 && errorData.currentVersion !== undefined) {
        console.log(
          `[CANVAS_SYNC_WEB] Version conflict. Server: ${errorData.currentVersion}, Ours: ${version}. Merging…`,
        );

        const serverActions = (errorData.actions ?? []) as CanvasAction[];
        const merged = mergeCanvasActions(
          apiActions as CanvasAction[],
          serverActions,
        );
        const mergedSerializable = merged
          .map((a) => apiActionToSerializable(a))
          .filter((a): a is SerializableCanvasAction => a !== null);

        // Persist the merged actions + server version locally BEFORE returning,
        // so the next autosave/load carries the union — not our device-only set
        // (otherwise the next save would clobber the just-merged server work).
        try {
          const stored = localStorage.getItem(getStorageKey(coloringImageId));
          if (stored) {
            const data = JSON.parse(stored) as SavedColoringData;
            data.version = errorData.currentVersion;
            data.actions = mergedSerializable;
            localStorage.setItem(
              getStorageKey(coloringImageId),
              JSON.stringify(data),
            );
          }
        } catch (e) {
          console.error(`[CANVAS_SYNC_WEB] Failed to persist merged state:`, e);
        }
        // Rehydrate the in-memory canvas so future autosaves serialize the union.
        _onMergedActions?.(coloringImageId, mergedSerializable);

        if (attempt >= MAX_MERGE_RETRIES) {
          console.warn(
            `[CANVAS_SYNC_WEB] Merge retries exhausted; merged state kept locally + marked pending.`,
          );
          markPendingSync(coloringImageId);
          return { success: false };
        }

        // Re-POST the MERGED actions at the server version. Drop our local
        // snapshot — the server's snapshot matches the server action set the
        // merge built on; shipping a pre-merge raster would diverge from actions.
        return syncToServer(
          coloringImageId,
          mergedSerializable,
          errorData.currentVersion,
          canvasWidth,
          canvasHeight,
          previewDataUrl,
          undefined,
          attempt + 1,
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

    return {
      success: true,
      version: data.version,
      previewUrl: data.previewUrl,
    };
  } catch (error) {
    console.error("[CANVAS_SYNC_WEB] Network error:", error);
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
 * @param previewDataUrl - Optional base64 data URL of preview thumbnail for server storage
 */
export const saveColoringProgress = (
  coloringImageId: string,
  canvas: HTMLCanvasElement,
  drawingActions: SerializableCanvasAction[] = [],
  previewDataUrl?: string,
  snapshotDataUrl?: string,
): boolean => {
  try {
    const imageDataUrl = canvas.toDataURL("image/png");

    // Send actual CSS dimensions for cross-platform coordinate scaling
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
      imageDataUrl: "", // Snapshot stored in IndexedDB, not localStorage
      savedAt: Date.now(),
      coloringImageId,
      version: currentVersion,
      actions: drawingActions,
    };

    // Store lightweight metadata in localStorage (no base64 snapshot)
    localStorage.setItem(getStorageKey(coloringImageId), JSON.stringify(data));

    // Store the snapshot in IndexedDB (avoids localStorage 5MB limit)
    idbSet(`snapshot-${coloringImageId}`, imageDataUrl).catch((err) => {
      console.warn(
        "[CANVAS_SYNC_WEB] IDB snapshot save failed, using localStorage fallback:",
        err,
      );
      // Fallback: store in localStorage if IDB fails
      data.imageDataUrl = imageDataUrl;
      try {
        localStorage.setItem(
          getStorageKey(coloringImageId),
          JSON.stringify(data),
        );
      } catch {
        // localStorage also full — snapshot will be lost but actions are synced to server
      }
    });

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
      previewDataUrl,
      snapshotDataUrl,
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

          // Invalidate preview cache so feed/gallery shows fresh preview
          invalidatePreviewCache(coloringImageId);
        }
      })
      .catch((err) => {
        console.error("[CANVAS_SYNC_WEB] Background sync error:", err);
      });

    return true;
  } catch (error) {
    console.error("Failed to save coloring progress:", error);
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
  snapshotUrl?: string;
} | null> => {
  try {
    console.log(
      `[CANVAS_SYNC_WEB] Loading from server - Image: ${coloringImageId}`,
    );

    const response = await fetch(
      `/api/canvas/progress?imageId=${encodeURIComponent(coloringImageId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
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

    // Map each wire action to its serializable form via the shared converter,
    // which carries the stable id + seq + originDeviceId through (required for
    // the append-merge dedup/ordering) and handles every type including clear.
    // Snapshot actions are skipped (they're a top-level field, not an action).
    for (let i = 0; i < (data.actions?.length || 0); i++) {
      const action = data.actions[i];
      if (action.type === "snapshot") continue;
      const serializable = apiActionToSerializable({
        id: action.id,
        type: action.type,
        timestamp: action.timestamp || Date.now(),
        data: action.data,
      });
      if (serializable) drawingActions.push(serializable);
    }

    console.log(
      `[CANVAS_SYNC_WEB] Parsed ${drawingActions.length} drawing actions from server`,
    );

    return {
      actions: drawingActions,
      version: data.version || 0,
      sourceWidth,
      sourceHeight,
      snapshotUrl: data.snapshotUrl as string | undefined,
    };
  } catch (error) {
    console.error("[CANVAS_SYNC_WEB] Network error loading progress:", error);
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
  source: "server" | "local";
  sourceWidth?: number; // Original canvas width (for coordinate scaling)
  sourceHeight?: number; // Original canvas height (for coordinate scaling)
  // Server-stored restore raster (R2 url) — the cross-device visual fallback
  // for magic/legacy pages whose actions can't be replayed on this device.
  snapshotUrl?: string;
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
        : "null",
    );

    // Use server data when it has actions OR a snapshot (a magic-only page may
    // have a region action + snapshot, or just a snapshot on a legacy device).
    if (
      serverData &&
      (serverData.actions.length > 0 || serverData.snapshotUrl)
    ) {
      console.log(
        `[CANVAS_SYNC_WEB] Using server data - ${serverData.actions.length} actions, version ${serverData.version}, snapshot=${!!serverData.snapshotUrl}`,
      );

      // LOAD-RECONCILE: if local has un-synced edits (a pending-sync marker, or
      // local action-ids the server doesn't have), MERGE rather than blindly
      // overwrite — otherwise opening the page on this device after editing it
      // offline would erase those edits before they ever sync. This is the
      // second blind-LWW path (the first is the 409 handler).
      let effectiveActions = serverData.actions;
      try {
        const existingLocal = localStorage.getItem(
          getStorageKey(coloringImageId),
        );
        const hasPending =
          localStorage.getItem(`${SYNC_PENDING_PREFIX}${coloringImageId}`) !==
          null;
        const localParsed = existingLocal
          ? (JSON.parse(existingLocal) as SavedColoringData)
          : null;
        const localActions = localParsed?.actions ?? [];
        const serverIds = new Set(
          serverData.actions.map((a) => a.id).filter(Boolean),
        );
        const localHasUnsynced =
          localActions.length > 0 &&
          (hasPending ||
            localActions.some((a) => a.id && !serverIds.has(a.id)));

        if (localHasUnsynced) {
          console.log(
            `[CANVAS_SYNC_WEB] Local has un-synced actions — reconciling (merge) on load`,
          );
          const merged = mergeCanvasActions(
            localActions.map((a) =>
              serializableToApiAction(a),
            ) as CanvasAction[],
            serverData.actions.map((a) =>
              serializableToApiAction(a),
            ) as CanvasAction[],
          );
          effectiveActions = merged
            .map((a) => apiActionToSerializable(a))
            .filter((a): a is SerializableCanvasAction => a !== null);
          // keep it pending so the merged union re-POSTs
          markPendingSync(coloringImageId);
        }

        const base: SavedColoringData = localParsed ?? {
          imageDataUrl: "",
          savedAt: Date.now(),
          coloringImageId,
        };
        base.version = serverData.version;
        base.actions = effectiveActions;
        localStorage.setItem(
          getStorageKey(coloringImageId),
          JSON.stringify(base),
        );
      } catch {
        // Ignore local storage errors — fall back to raw server actions
        effectiveActions = serverData.actions;
      }

      const result: LoadProgressResult = {
        actions: effectiveActions,
        version: serverData.version,
        source: "server" as const,
        sourceWidth: serverData.sourceWidth,
        sourceHeight: serverData.sourceHeight,
        snapshotUrl: serverData.snapshotUrl,
      };
      console.log(
        `[CANVAS_SYNC_WEB] Returning server result: ${result.actions.length} actions, source=${result.source}, dimensions=${result.sourceWidth}x${result.sourceHeight}, snapshot=${!!result.snapshotUrl}`,
      );
      return result;
    }
  } catch (error) {
    console.error("[CANVAS_SYNC_WEB] Error loading from server:", error);
    // Fall through to local storage
  }

  // Fall back to local storage + IndexedDB
  try {
    const stored = localStorage.getItem(getStorageKey(coloringImageId));
    if (!stored) {
      return null;
    }

    const data: SavedColoringData = JSON.parse(stored);

    // Try to load snapshot from IndexedDB first (new path), then localStorage (legacy)
    let snapshotUrl = data.imageDataUrl || null;
    if (!snapshotUrl) {
      try {
        const idbSnapshot = await idbGet<string>(`snapshot-${coloringImageId}`);
        if (idbSnapshot) {
          snapshotUrl = idbSnapshot;
          console.log(`[CANVAS_SYNC_WEB] Loaded snapshot from IndexedDB`);
        }
      } catch {
        // IDB unavailable, continue without snapshot
      }
    }

    // If we have local actions, use those
    if (data.actions && data.actions.length > 0) {
      console.log(
        `[CANVAS_SYNC_WEB] Using local storage - ${data.actions.length} actions`,
      );

      // Also try to load the snapshot image for quick restore
      return new Promise((resolve) => {
        if (snapshotUrl) {
          const img = new Image();
          img.onload = () =>
            resolve({
              image: img,
              actions: data.actions || [],
              version: data.version || 0,
              source: "local",
            });
          img.onerror = () =>
            resolve({
              actions: data.actions || [],
              version: data.version || 0,
              source: "local",
            });
          img.src = snapshotUrl;
        } else {
          resolve({
            actions: data.actions || [],
            version: data.version || 0,
            source: "local",
          });
        }
      });
    }

    // Legacy: only snapshot, no actions - load image
    if (snapshotUrl) {
      console.log(`[CANVAS_SYNC_WEB] Using local/IDB snapshot (no actions)`);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () =>
          resolve({
            image: img,
            actions: [],
            version: data.version || 0,
            source: "local",
          });
        img.onerror = () => resolve(null);
        img.src = snapshotUrl;
      });
    }

    return null;
  } catch (error) {
    console.error("Failed to load coloring progress:", error);
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
    // Also clean up IndexedDB snapshot
    idbDelete(`snapshot-${coloringImageId}`).catch(() => {});
    return true;
  } catch (error) {
    console.error("Failed to clear coloring progress:", error);
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
