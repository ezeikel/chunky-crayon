/**
 * Types for canvas actions that can be synced between web and mobile.
 * This format is compatible with mobile's SerializedAction format.
 */

import type { BrushType, FillPattern, PaletteVariant } from "./types";
import { makeActionId } from "@one-colored-pixel/db/types";

export { makeActionId };

/**
 * Stable per-browser device id for originDeviceId — generated once and
 * persisted in localStorage. The append-merge uses it to decide whether a
 * terminal (Auto Color / Start Over) may truncate an earlier action: only if
 * they share an origin device (or the earlier action is clearly older than the
 * skew window). SSR-safe: returns "" when there is no window/localStorage.
 */
const WEB_DEVICE_ID_KEY = "chunky_crayon_web_device_id";
let cachedWebDeviceId: string | undefined;
export function getWebDeviceId(): string {
  if (cachedWebDeviceId !== undefined) return cachedWebDeviceId;
  if (typeof window === "undefined" || !window.localStorage) {
    cachedWebDeviceId = "";
    return cachedWebDeviceId;
  }
  try {
    let id = window.localStorage.getItem(WEB_DEVICE_ID_KEY);
    if (!id) {
      id = makeActionId();
      window.localStorage.setItem(WEB_DEVICE_ID_KEY, id);
    }
    cachedWebDeviceId = id;
  } catch {
    cachedWebDeviceId = "";
  }
  return cachedWebDeviceId;
}

// Per-session monotonic creation counter for `seq` (secondary ordering key).
let webSeqCounter = 0;
export function nextActionSeq(): number {
  webSeqCounter += 1;
  return webSeqCounter;
}

/**
 * A single point in a stroke path
 */
export type StrokePoint = {
  x: number;
  y: number;
};

/**
 * Source dimensions for cross-platform coordinate scaling.
 * Each action stores the canvas dimensions from when it was recorded,
 * allowing actions from different platforms (web CSS pixels vs mobile SVG viewBox)
 * to coexist and scale correctly.
 */
export type ActionSourceDimensions = {
  /** Source canvas width when action was recorded */
  sourceWidth?: number;
  /** Source canvas height when action was recorded */
  sourceHeight?: number;
};

/**
 * Stable cross-device identity for an action, stamped ONCE at creation (in the
 * coloring context's addDrawingAction) and preserved through serialize → sync →
 * the append-merge. Optional on the serializable type because legacy rows
 * loaded from before Stage 4 lack them; mergeCanvasActions/ensureId normalize
 * those. New actions always carry all three.
 *  - id: a UUID v4 (makeActionId). The dedup key in the merge.
 *  - seq: per-session monotonic creation counter — secondary ordering key so
 *    two same-millisecond actions (e.g. an Auto Color and a stroke right after)
 *    order by true creation order, not by the random id.
 *  - originDeviceId: stable per-browser id — the merge only lets a terminal
 *    truncate an earlier action of the SAME device (or one clearly older than
 *    the skew window), so cross-device near-simultaneous strokes aren't eaten.
 */
export type ActionIdentity = {
  id?: string;
  seq?: number;
  originDeviceId?: string;
  // Durable UNDO tombstone. undo() flags the last live action undone=true with a
  // fresh undoneSeq; redo() clears it with a higher seq. Carried through
  // serialize → sync → the merge (which resolves it monotonically), so an undo
  // survives reload + cross-device instead of resurrecting via the union.
  undone?: boolean;
  undoneSeq?: number;
};

/**
 * Serializable stroke action - compatible with mobile format
 */
export type SerializableStrokeAction = {
  type: "stroke";
  path: StrokePoint[]; // Array of points (more compatible than SVG across platforms)
  pathSvg?: string; // SVG path string for mobile compatibility
  color: string;
  brushType: BrushType;
  strokeWidth: number;
  timestamp: number;
} & ActionSourceDimensions &
  ActionIdentity;

/**
 * Serializable fill action - compatible with mobile format
 */
export type SerializableFillAction = {
  type: "fill";
  x: number;
  y: number;
  color: string;
  fillType?: "solid" | "pattern";
  patternType?: FillPattern;
  timestamp: number;
} & ActionSourceDimensions &
  ActionIdentity;

/**
 * Serializable sticker action - compatible with mobile format
 */
export type SerializableStickerAction = {
  type: "sticker";
  /** Legacy emoji glyph (still carried for back-compat / fallback render). */
  sticker: string;
  /** Stable catalog id (CANVAS_STICKERS[].id) for PNG stickers. */
  catalogId?: string;
  /** Transparent PNG path for PNG stickers (absent on legacy emoji saves). */
  imageUrl?: string;
  x: number;
  y: number;
  size: number;
  timestamp: number;
} & ActionSourceDimensions &
  ActionIdentity;

/**
 * Serializable clear action. A real cross-device terminal: emitted by Start
 * Over (clearDrawingActions) so a reset durably collapses a stale offline
 * peer's strokes during a merge instead of the union resurrecting them.
 */
export type SerializableClearAction = {
  type: "clear";
  timestamp: number;
} & ActionIdentity;

/**
 * Snapshot action for cross-platform fallback
 */
export type SerializableSnapshotAction = {
  type: "snapshot";
  imageDataUrl: string;
  timestamp: number;
} & ActionIdentity;

/**
 * Serializable region action — Magic Brush ("reveal") / Auto Color ("auto").
 * The colour is re-derived per region from the shared region store at replay
 * time on each platform, so we carry only what's needed to reconstruct it:
 * the palette variant, and (reveal only) the brush path + width. "auto" needs
 * no geometry → no coordinate scaling; "reveal" reuses the stroke scaler.
 */
export type SerializableRegionAction = {
  type: "region";
  mode: "reveal" | "auto";
  variant: PaletteVariant;
  pathSvg?: string; // reveal only — the brush stroke
  brushSize?: number; // reveal only
  timestamp: number;
} & ActionSourceDimensions &
  ActionIdentity;

/**
 * Union of all serializable action types
 */
export type SerializableCanvasAction =
  | SerializableStrokeAction
  | SerializableFillAction
  | SerializableStickerAction
  | SerializableClearAction
  | SerializableSnapshotAction
  | SerializableRegionAction;

/**
 * Convert an array of points to an SVG path string
 * This creates a mobile-compatible path format
 */
export function pointsToSvgPath(points: StrokePoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    // Single point - create a small circle/dot
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
  }

  // Start with moveTo, then lineTo for each subsequent point
  const [first, ...rest] = points;
  const parts = [`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`];

  for (const point of rest) {
    parts.push(`L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  }

  return parts.join(" ");
}

/**
 * Convert API action format to serializable format
 */
export function apiActionToSerializable(apiAction: {
  id?: string;
  type: string;
  timestamp: number;
  data?: Record<string, unknown>;
}): SerializableCanvasAction | null {
  const { id, type, timestamp, data } = apiAction;

  // Extract source dimensions for cross-platform scaling
  const sourceWidth = data?.sourceWidth as number | undefined;
  const sourceHeight = data?.sourceHeight as number | undefined;

  // Carry the stable identity back so a round-tripped action keeps the SAME id
  // (dedup) + seq/originDeviceId (ordering + skew guard) across save/load.
  const identity: ActionIdentity = {
    id,
    seq: data?.seq as number | undefined,
    originDeviceId: data?.originDeviceId as string | undefined,
    undone: data?.undone as boolean | undefined,
    undoneSeq: data?.undoneSeq as number | undefined,
  };

  switch (type) {
    case "stroke":
      return {
        type: "stroke",
        path: [], // Will be populated from pathSvg if available
        pathSvg: data?.path as string | undefined,
        color: (data?.color as string) || "#000000",
        brushType: (data?.brushType as BrushType) || "marker",
        strokeWidth: (data?.brushSize as number) || 10,
        timestamp,
        sourceWidth,
        sourceHeight,
        ...identity,
      };

    case "fill":
      return {
        type: "fill",
        x: (data?.x as number) || 0,
        y: (data?.y as number) || 0,
        color:
          (data?.fillColor as string) || (data?.color as string) || "#000000",
        fillType: (data?.fillType as "solid" | "pattern") || "solid",
        patternType: data?.patternType as FillPattern | undefined,
        timestamp,
        sourceWidth,
        sourceHeight,
        ...identity,
      };

    case "sticker":
      const position = data?.position as { x: number; y: number } | undefined;
      return {
        type: "sticker",
        sticker: (data?.stickerId as string) || "",
        catalogId: data?.catalogId as string | undefined,
        imageUrl: data?.imageUrl as string | undefined,
        x: position?.x || 0,
        y: position?.y || 0,
        size: (data?.scale as number) || 50,
        timestamp,
        sourceWidth,
        sourceHeight,
        ...identity,
      };

    case "clear":
      return {
        type: "clear",
        timestamp,
        ...identity,
      };

    case "snapshot":
      return {
        type: "snapshot",
        imageDataUrl: (data?.imageDataUrl as string) || "",
        timestamp,
      };

    case "region":
      return {
        type: "region",
        mode: (data?.mode as "reveal" | "auto") || "auto",
        variant: (data?.variant as PaletteVariant) || "realistic",
        pathSvg: data?.path as string | undefined,
        brushSize: data?.brushSize as number | undefined,
        timestamp,
        sourceWidth,
        sourceHeight,
        ...identity,
      };

    default:
      console.warn(`Unknown action type: ${type}`);
      return null;
  }
}

/**
 * Convert serializable action to API format
 */
export function serializableToApiAction(action: SerializableCanvasAction): {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
} {
  // Stable id stamped at creation (addDrawingAction). Fall back to a fresh id
  // only if somehow absent (e.g. a legacy in-memory action) — NEVER derive from
  // array position, which re-rolls on reorder and breaks dedup.
  const id = ("id" in action && action.id) || makeActionId();

  // Stable cross-device identity carried into data.* (ordering + skew guard).
  const identity: Record<string, unknown> = {};
  if ("seq" in action && action.seq !== undefined) identity.seq = action.seq;
  if ("originDeviceId" in action && action.originDeviceId) {
    identity.originDeviceId = action.originDeviceId;
  }
  // Undo tombstone into data.* — rides inside the opaque payload (no wire/route
  // change); the merge resolves it monotonically by undoneSeq.
  if ("undone" in action && action.undone !== undefined) {
    identity.undone = action.undone;
  }
  if ("undoneSeq" in action && action.undoneSeq !== undefined) {
    identity.undoneSeq = action.undoneSeq;
  }

  // Extract source dimensions for cross-platform scaling (if available)
  const sourceDimensions: Record<string, unknown> = {};
  if ("sourceWidth" in action && action.sourceWidth) {
    sourceDimensions.sourceWidth = action.sourceWidth;
  }
  if ("sourceHeight" in action && action.sourceHeight) {
    sourceDimensions.sourceHeight = action.sourceHeight;
  }

  switch (action.type) {
    case "stroke":
      return {
        id,
        type: "stroke",
        timestamp: action.timestamp,
        data: {
          path: action.pathSvg || pointsToSvgPath(action.path),
          color: action.color,
          brushType: action.brushType,
          brushSize: action.strokeWidth,
          ...sourceDimensions,
          ...identity,
        },
      };

    case "fill":
      return {
        id,
        type: "fill",
        timestamp: action.timestamp,
        data: {
          x: action.x,
          y: action.y,
          color: action.color,
          fillColor: action.color,
          fillType: action.fillType,
          patternType: action.patternType,
          ...sourceDimensions,
          ...identity,
        },
      };

    case "sticker":
      return {
        id,
        type: "sticker",
        timestamp: action.timestamp,
        data: {
          // stickerId keeps the legacy emoji glyph for back-compat; catalogId
          // + imageUrl carry the PNG sticker (additive — old clients ignore).
          stickerId: action.sticker,
          ...(action.catalogId ? { catalogId: action.catalogId } : {}),
          ...(action.imageUrl ? { imageUrl: action.imageUrl } : {}),
          position: { x: action.x, y: action.y },
          scale: action.size,
          ...sourceDimensions,
          ...identity,
        },
      };

    case "clear":
      return {
        id,
        type: "clear",
        timestamp: action.timestamp,
        data: { ...identity },
      };

    case "snapshot":
      return {
        id,
        type: "snapshot",
        timestamp: action.timestamp,
        data: {
          imageDataUrl: action.imageDataUrl,
        },
      };

    case "region":
      return {
        id,
        type: "region",
        timestamp: action.timestamp,
        data: {
          mode: action.mode,
          variant: action.variant,
          ...(action.pathSvg && { path: action.pathSvg }),
          ...(action.brushSize && { brushSize: action.brushSize }),
          ...sourceDimensions,
          ...identity,
        },
      };
  }
}
