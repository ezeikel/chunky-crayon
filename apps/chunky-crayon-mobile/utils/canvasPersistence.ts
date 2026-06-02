import { canvasStorage } from "@/lib/storage/mmkv";
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
import type { PaletteVariant } from "@/types";
import {
  makeActionId,
  mergeCanvasActions,
  type CanvasAction,
} from "@one-colored-pixel/canvas-sync";

// 409 merge/retry loop bound (same as web). After the cap we keep the merged
// result locally + mark pending — never blind-clobber.
const MAX_MERGE_RETRIES = 2;

// Per-image in-flight sync coalescing. Autosave fires 1s after each stroke; on
// a fast device a burst of strokes (or a rotation / auto-color) can fire
// several autosaves whose POSTs overlap. Each carries the same version, so all
// but the first 409 → merge → retry — self-healing but noisy (the version
// climbs fast and the LogBox fills with conflict logs). Serialize syncs per
// image: if one is already running, don't start a second — flag that a re-sync
// is wanted; the running sync triggers exactly one follow-up when it finishes,
// using the latest MMKV state. This removes the races at the source.
const _syncInFlight = new Set<string>();
const _syncWanted = new Set<string>();

// After a 409 append-merge, the merged action set must be pushed back into the
// live in-memory canvas store so the next autosave serializes the union (not
// this device's set). The canvas screen registers a handler that replaces the
// store history for the matching image.
let _onMergedActions:
  | ((imageId: string, actions: DrawingAction[]) => void)
  | null = null;
export const setMergedActionsHandler = (
  fn: (imageId: string, actions: DrawingAction[]) => void,
): void => {
  _onMergedActions = fn;
};

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
  type: "stroke" | "fill" | "sticker" | "magic-fill" | "region" | "clear";
  // Stable cross-device identity, carried verbatim from the DrawingAction.
  // Required for the append-merge: id = dedup key, createdAt = ordering key,
  // seq = same-ms tiebreak, originDeviceId = skew-guard. Persisted in MMKV.
  id?: string;
  createdAt?: number;
  seq?: number;
  originDeviceId?: string;
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
  // For magic-fill actions (LEGACY)
  magicFills?: Array<{ x: number; y: number; color: string }>;
  // For region actions (Magic Brush 'reveal' / Auto Color 'auto') — colour is
  // re-derived per region from the region store at replay; 'reveal' carries the
  // brush path (pathSvg) + width (strokeWidth).
  mode?: "reveal" | "auto";
  variant?: PaletteVariant;
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
 * Converts a local SerializedAction to the cross-platform API CanvasAction.
 * Identity (id/timestamp/seq/originDeviceId) is read from the action's STABLE
 * creation-stamped fields — never re-fabricated with Date.now() here (that was
 * the bug: it re-rolled id + timestamp every save, breaking the append-merge
 * dedup and the supersede-by-timestamp ordering).
 * @param defaultSourceWidth - SVG viewBox width fallback for coordinate scaling
 * @param defaultSourceHeight - SVG viewBox height fallback for coordinate scaling
 */
const convertToApiAction = (
  action: SerializedAction,
  defaultSourceWidth?: number,
  defaultSourceHeight?: number,
) => ({
  // Stable id stamped at creation; fall back to a fresh UUID only if a legacy
  // action somehow lacks one (NOT a position-derived id).
  id: action.id ?? makeActionId(),
  // Wire type union is stroke|fill|sticker|region|clear. serializeActions has
  // already folded magic-reveal/magic-auto AND legacy magic-fill into region,
  // so the type is honest here — no cast needed.
  type: action.type as "stroke" | "fill" | "sticker" | "region" | "clear",
  // Creation timestamp, not the wall clock at serialize time.
  timestamp: action.createdAt ?? Date.now(),
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
    // region fields (Magic Brush / Auto Color)
    mode: action.mode,
    variant: action.variant,
    // Cross-device identity tiebreak + skew-guard fields.
    seq: action.seq,
    originDeviceId: action.originDeviceId,
    // CRITICAL: Use per-action source dimensions if available (preserves original coordinate space)
    // Only fall back to default dimensions for new actions that don't have their own
    // This ensures web-originated actions keep their CSS pixel dimensions,
    // and mobile-originated actions keep their SVG viewBox dimensions
    sourceWidth: action.sourceWidth ?? defaultSourceWidth,
    sourceHeight: action.sourceHeight ?? defaultSourceHeight,
  },
});

/**
 * Reverse of convertToApiAction: a wire CanvasAction → local SerializedAction,
 * carrying the stable identity (id/createdAt/seq/originDeviceId) so a server- or
 * merge-sourced action keeps the SAME id for dedup. Snapshot is skipped by
 * callers; clear/region/stroke/fill/sticker map through.
 */
const apiToSerialized = (action: CanvasAction): SerializedAction => ({
  id: action.id,
  createdAt: action.timestamp,
  seq: action.data?.seq,
  originDeviceId: action.data?.originDeviceId,
  type: action.type as SerializedAction["type"],
  pathSvg: action.data?.path,
  color: action.data?.color || action.data?.fillColor || "",
  brushType: action.data?.brushType as BrushType | undefined,
  strokeWidth: action.data?.brushSize,
  fillX: action.data?.x,
  fillY: action.data?.y,
  sticker: action.data?.stickerId,
  stickerX: action.data?.position?.x,
  stickerY: action.data?.position?.y,
  stickerSize: action.data?.scale,
  mode: action.data?.mode,
  variant: action.data?.variant as PaletteVariant | undefined,
  sourceWidth: action.data?.sourceWidth,
  sourceHeight: action.data?.sourceHeight,
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
/**
 * Public sync entry — coalesces concurrent syncs per image so overlapping
 * autosaves don't race into 409 conflicts. If a sync for this image is already
 * running, flags that another is wanted (the running one will fire one
 * follow-up from the latest MMKV state) and returns without POSTing. The actual
 * work is `doSyncCanvasToServer`, which the 409 retry path also calls directly.
 */
export const syncCanvasToServer = async (
  imageId: string,
  actions: SerializedAction[],
  version: number = 0,
  canvasWidth?: number,
  canvasHeight?: number,
  previewDataUrl?: string,
  snapshotDataUrl?: string,
): Promise<{ success: boolean; version?: number; error?: string }> => {
  if (_syncInFlight.has(imageId)) {
    // Another sync is running for this image — don't race it. Mark that the
    // latest state still needs flushing; the in-flight sync re-fires once.
    _syncWanted.add(imageId);
    console.log(
      `[CANVAS_SYNC] Sync already in flight for ${imageId}; coalescing.`,
    );
    return { success: true, version };
  }

  _syncInFlight.add(imageId);
  try {
    const result = await doSyncCanvasToServer(
      imageId,
      actions,
      version,
      canvasWidth,
      canvasHeight,
      previewDataUrl,
      snapshotDataUrl,
    );
    return result;
  } finally {
    _syncInFlight.delete(imageId);
    // If strokes landed while we were syncing, flush ONCE more from the latest
    // MMKV state (newest actions + the version our sync just wrote back).
    if (_syncWanted.has(imageId)) {
      _syncWanted.delete(imageId);
      const key = `${STORAGE_PREFIX}${imageId}`;
      try {
        const stored = canvasStorage.getString(key);
        if (stored) {
          const data = JSON.parse(stored);
          void syncCanvasToServer(
            imageId,
            data.actions ?? [],
            data.version ?? 0,
            canvasWidth,
            canvasHeight,
            previewDataUrl,
            snapshotDataUrl,
          );
        }
      } catch {
        // best-effort follow-up; a later autosave will retry
      }
    }
  }
};

const doSyncCanvasToServer = async (
  imageId: string,
  actions: SerializedAction[],
  version: number = 0,
  canvasWidth?: number,
  canvasHeight?: number,
  previewDataUrl?: string,
  snapshotDataUrl?: string,
  attempt: number = 0,
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

    // Convert to API format (stable ids carried through, no Date.now()).
    const apiActions = actions.map((action) =>
      convertToApiAction(action, canvasWidth, canvasHeight),
    );

    const response = await fetch(`${apiUrl}/canvas/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      // profileId omitted — the server resolves the active profile from the
      // mobile token. Snapshot = the cross-device restore raster.
      body: JSON.stringify({
        coloringImageId: imageId,
        actions: apiActions,
        version,
        canvasWidth,
        canvasHeight,
        previewDataUrl,
        snapshotDataUrl,
        snapshotWidth: snapshotDataUrl ? (canvasWidth ?? 1024) : undefined,
        snapshotHeight: snapshotDataUrl ? (canvasHeight ?? 1024) : undefined,
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
      // A 409 version conflict is EXPECTED and self-healing (append-merge
      // below) — log it as info, not error, so a normal merge doesn't surface
      // as a red failure in the LogBox. Only genuinely unexpected statuses are
      // errors.
      const isRecoverableConflict =
        response.status === 409 && errorData.currentVersion !== undefined;
      const logFn = isRecoverableConflict ? console.log : console.error;
      logFn(
        `[CANVAS_SYNC] Server responded ${response.status}:`,
        errorData.error || errorData.details || errorData.raw || errorData,
      );

      // Version conflict → APPEND-MERGE (not blind last-write-wins). The 409
      // body hands us the server's current actions; union with ours by stable
      // id, persist the merged set locally + rehydrate the store, then re-POST
      // the merged set at the server version.
      if (response.status === 409 && errorData.currentVersion !== undefined) {
        console.log(
          `[CANVAS_SYNC] Version conflict. Server: ${errorData.currentVersion}, Our: ${version}. Merging…`,
        );

        const serverActions = (errorData.actions ?? []) as CanvasAction[];
        const merged = mergeCanvasActions(
          apiActions as CanvasAction[],
          serverActions,
        );
        const mergedSerialized = merged.map(apiToSerialized);

        // Persist merged actions + server version to MMKV BEFORE returning so a
        // later autosave/pending-sync carries the union, not our device-only set
        // (which would clobber the just-merged server work). Then rehydrate the
        // in-memory store so the next autosave serializes the union.
        const key = `${STORAGE_PREFIX}${imageId}`;
        try {
          const stored = canvasStorage.getString(key);
          const data = stored
            ? JSON.parse(stored)
            : { imageId, savedAt: Date.now() };
          data.version = errorData.currentVersion;
          data.actions = mergedSerialized;
          canvasStorage.set(key, JSON.stringify(data));
        } catch (e) {
          console.error(`[CANVAS_SYNC] Failed to persist merged state:`, e);
        }
        _onMergedActions?.(imageId, deserializeActions(mergedSerialized));

        if (attempt >= MAX_MERGE_RETRIES) {
          console.warn(
            `[CANVAS_SYNC] Merge retries exhausted; merged state kept locally + marked pending.`,
          );
          await markPendingSync(imageId);
          return { success: false, error: "merge-retry-exhausted" };
        }

        // Re-POST the MERGED actions at the server version. Drop the local
        // snapshot — the server's snapshot matches the server action set the
        // merge built on; shipping a pre-merge raster would diverge. Call the
        // internal worker directly (we're already inside the in-flight guard).
        return doSyncCanvasToServer(
          imageId,
          mergedSerialized,
          errorData.currentVersion,
          canvasWidth,
          canvasHeight,
          previewDataUrl,
          undefined,
          attempt + 1,
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
  snapshotUrl?: string;
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

    // Convert API actions back to local format via the shared reverse mapping
    // (carries the stable id/createdAt/seq/originDeviceId for the append-merge,
    // and preserves per-action sourceWidth/sourceHeight for cross-platform
    // coordinate scaling). Snapshot actions are skipped (top-level field).
    const localActions: SerializedAction[] =
      (data.actions as CanvasAction[] | undefined)
        ?.filter((action) => (action.type as string) !== "snapshot")
        .map(apiToSerialized) || [];

    return {
      actions: localActions,
      version: data.version,
      canvasWidth: data.canvasWidth,
      canvasHeight: data.canvasHeight,
      snapshotUrl: data.snapshotUrl,
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
    canvasStorage.set(key, JSON.stringify({ markedAt: Date.now() }));
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
    canvasStorage.remove(key);
  } catch (error) {
    console.error(`[CANVAS_SYNC] Failed to clear pending sync:`, error);
  }
};

/**
 * Get all images with pending syncs
 */
export const getPendingSyncs = async (): Promise<string[]> => {
  try {
    const allKeys = canvasStorage.getAllKeys();
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
      const stored = canvasStorage.getString(key);

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
  return actions.map((action): SerializedAction => {
    // Stable identity, carried verbatim onto every SerializedAction.
    const identity = {
      id: action.id,
      createdAt: action.createdAt,
      seq: action.seq,
      originDeviceId: action.originDeviceId,
    };

    // Magic Brush / Auto Color → the cross-platform `region` action (web
    // reconstructs it from the same region store). magic-reveal carries the
    // brush path; magic-auto carries no geometry. Legacy magic-fill is also a
    // whole-page Auto Color → fold to region/auto so its TERMINAL semantics are
    // honoured by the merge (otherwise prior strokes wouldn't collapse under it).
    if (
      action.type === "magic-reveal" ||
      action.type === "magic-auto" ||
      action.type === "magic-fill"
    ) {
      return {
        ...identity,
        type: "region",
        mode: action.type === "magic-reveal" ? "reveal" : "auto",
        variant: action.variant,
        pathSvg: action.path ? serializePath(action.path) : undefined,
        strokeWidth: action.strokeWidth,
        color: action.color,
        sourceWidth: action.sourceWidth,
        sourceHeight: action.sourceHeight,
      };
    }

    return {
      ...identity,
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
      // Magic-fill (legacy) fields
      magicFills: action.magicFills,
      // Cross-platform source dimensions - preserve so actions from different
      // platforms keep their original coordinate space
      sourceWidth: action.sourceWidth,
      sourceHeight: action.sourceHeight,
    };
  });
};

/**
 * Deserializes stored actions back to DrawingAction[]
 * Preserves sourceWidth/sourceHeight for cross-platform coordinate scaling
 */
export const deserializeActions = (
  serialized: SerializedAction[],
): DrawingAction[] => {
  return serialized
    .map((action) => {
      const path = action.pathSvg ? deserializePath(action.pathSvg) : undefined;

      // Carry the stable identity back onto every DrawingAction so a reloaded
      // action keeps the SAME id/createdAt/seq for the append-merge dedup +
      // ordering (addAction preserves these rather than re-stamping).
      const identity = {
        id: action.id,
        createdAt: action.createdAt,
        seq: action.seq,
        originDeviceId: action.originDeviceId,
      };

      // Skip actions with invalid paths
      if (action.type === "stroke" && action.pathSvg && !path) {
        return null;
      }

      // clear → a clear DrawingAction (replay blanks the canvas).
      if (action.type === "clear") {
        return { ...identity, type: "clear", color: "" } as DrawingAction;
      }

      // region → the in-memory magic-reveal / magic-auto action types.
      if (action.type === "region") {
        if (action.mode === "reveal") {
          if (action.pathSvg && !path) return null; // bad path → drop
          return {
            ...identity,
            type: "magic-reveal",
            path: path || undefined,
            color: action.color || "#REGIONSTORE",
            variant: action.variant,
            strokeWidth: action.strokeWidth,
            sourceWidth: action.sourceWidth,
            sourceHeight: action.sourceHeight,
          } as DrawingAction;
        }
        return {
          ...identity,
          type: "magic-auto",
          color: action.color || "#REGIONSTORE",
          variant: action.variant,
          sourceWidth: action.sourceWidth,
          sourceHeight: action.sourceHeight,
        } as DrawingAction;
      }

      return {
        ...identity,
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
  snapshotDataUrl?: string,
): Promise<boolean> => {
  console.log(
    `[CANVAS_PERSIST] SAVE START - Image: ${imageId}, Actions: ${actions.length}, Dimensions: ${canvasWidth}x${canvasHeight}`,
  );

  // Validate inputs
  if (!imageId) {
    console.error(`[CANVAS_PERSIST] SAVE FAILED - Invalid imageId: ${imageId}`);
    return false;
  }

  // Save if there are actions OR a snapshot to persist (a legacy/reference page
  // may have only a snapshot).
  if ((!actions || actions.length === 0) && !snapshotDataUrl) {
    console.warn(`[CANVAS_PERSIST] SAVE SKIPPED - Nothing to save`);
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
      const existingData = canvasStorage.getString(key);
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
    console.log(`[CANVAS_PERSIST] Saving to MMKV with key: ${key}`);

    // Try to save to MMKV (synchronous)
    canvasStorage.set(key, JSON.stringify(data));

    // Verify the save worked by reading it back
    const verification = canvasStorage.getString(key);
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
    const allKeys = canvasStorage.getAllKeys();
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
      snapshotDataUrl,
    )
      .then(async (result) => {
        if (result.success && result.version !== undefined) {
          console.log(
            `[CANVAS_PERSIST] Server sync completed - Version: ${result.version}`,
          );
          // Update ONLY the version field by re-reading stored data — a 409
          // append-merge during sync may have already written the merged action
          // union to this key; writing back the stale in-memory `data` (still
          // our device-only actions) would clobber that merge. Re-read first.
          try {
            const latest = canvasStorage.getString(key);
            const latestData = latest ? JSON.parse(latest) : data;
            latestData.version = result.version;
            canvasStorage.set(key, JSON.stringify(latestData));
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
  // Server restore raster (R2 url) — painted as a base layer when actions can't
  // reconstruct the page (legacy/reference page synced from another device).
  snapshotUrl?: string;
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
      canvasStorage.remove(key);
      return null;
    }

    // If server returned data (actions OR a snapshot)
    if (
      serverData &&
      (serverData.actions.length > 0 || serverData.snapshotUrl)
    ) {
      console.log(
        `[CANVAS_PERSIST] Found server data - Actions: ${serverData.actions.length}, snapshot: ${!!serverData.snapshotUrl}, Source dimensions: ${serverData.canvasWidth}x${serverData.canvasHeight}`,
      );

      const key = `${STORAGE_PREFIX}${imageId}`;

      // LOAD-RECONCILE: if local has un-synced edits (a pending marker, or local
      // action-ids the server doesn't have), MERGE rather than blindly adopt
      // server data — else opening the page after editing offline would erase
      // those edits before they ever sync. (Mirror of the web load path.)
      let effectiveSerialized = serverData.actions;
      try {
        const storedLocal = canvasStorage.getString(key);
        const hasPending =
          canvasStorage.getString(`${SYNC_PENDING_PREFIX}${imageId}`) != null;
        const localData = storedLocal
          ? (JSON.parse(storedLocal) as SavedCanvasData)
          : null;
        const localActions = localData?.actions ?? [];
        const serverIds = new Set(
          serverData.actions.map((a) => a.id).filter(Boolean),
        );
        const localHasUnsynced =
          localActions.length > 0 &&
          (hasPending ||
            localActions.some((a) => a.id && !serverIds.has(a.id)));

        if (localHasUnsynced) {
          console.log(
            `[CANVAS_PERSIST] Local has un-synced actions — reconciling (merge) on load`,
          );
          const merged = mergeCanvasActions(
            localActions.map((a) =>
              convertToApiAction(a),
            ) as unknown as CanvasAction[],
            serverData.actions.map((a) =>
              convertToApiAction(a),
            ) as unknown as CanvasAction[],
          );
          effectiveSerialized = merged.map(apiToSerialized);
          await markPendingSync(imageId); // re-POST the union
        }
      } catch (e) {
        console.error(`[CANVAS_PERSIST] Load-reconcile failed:`, e);
        effectiveSerialized = serverData.actions;
      }

      // Deserialize actions for rendering
      const actions = deserializeActions(effectiveSerialized);

      // Update local storage with the effective (server or merged) data
      const data: SavedCanvasData = {
        imageId,
        actions: effectiveSerialized,
        savedAt: Date.now(),
        version: serverData.version,
      };
      canvasStorage.set(key, JSON.stringify(data));
      console.log(
        `[CANVAS_PERSIST] Updated local storage with reconciled data`,
      );

      return {
        actions,
        sourceCanvasWidth: serverData.canvasWidth,
        sourceCanvasHeight: serverData.canvasHeight,
        snapshotUrl: serverData.snapshotUrl,
      };
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
    console.log(`[CANVAS_PERSIST] Loading from MMKV with key: ${key}`);
    const stored = canvasStorage.getString(key);

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
    canvasStorage.remove(key);

    // Update metadata
    const metadata = await getMetadata();
    if (metadata) {
      metadata.savedCanvases = metadata.savedCanvases.filter(
        (c) => c.imageId !== imageId,
      );
      canvasStorage.set(METADATA_KEY, JSON.stringify(metadata));
    }

    // Also delete the SERVER progress row so Start Over doesn't resurrect it on
    // the next load (and doesn't sync back to the other device). Fire-and-
    // forget; the route is idempotent. profileId resolved server-side from the
    // mobile token.
    try {
      const apiUrl = getApiUrl();
      const authHeader = await getAuthHeader();
      await fetch(
        `${apiUrl}/canvas/progress?imageId=${encodeURIComponent(imageId)}`,
        { method: "DELETE", headers: { ...authHeader } },
      );
    } catch (err) {
      console.warn("[CANVAS_PERSIST] Failed to delete server progress:", err);
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
    const stored = canvasStorage.getString(METADATA_KEY);
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
        canvasStorage.remove(key);
      }
    }

    canvasStorage.set(METADATA_KEY, JSON.stringify(metadata));
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
    return canvasStorage.contains(key);
  } catch (error) {
    return false;
  }
};

/**
 * Clears all saved canvas data
 */
export const clearAllCanvasData = async (): Promise<boolean> => {
  try {
    const keys = canvasStorage.getAllKeys();
    const canvasKeys = keys.filter((key) => key.startsWith(STORAGE_PREFIX));
    for (const key of canvasKeys) {
      canvasStorage.remove(key);
    }
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
    const allKeys = canvasStorage.getAllKeys();
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

      const stored = canvasStorage.getString(key);
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
