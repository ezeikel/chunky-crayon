/**
 * Shared canvas types for cross-platform synchronization
 */

// The canonical cross-platform action types. This is the SPINE both web
// (packages/coloring-ui/src/canvasActions.ts) and mobile
// (apps/chunky-crayon-mobile/utils/canvasPersistence.ts) converge on.
//
// `region` = Magic Brush / Auto Color, reconstructed from the shared region
// store on each platform (so magic pages round-trip without a raster).
// `snapshot` is carried as TOP-LEVEL request/response fields, NOT as an action
// (a magic/legacy page's flattened visual fallback) — see Save/Get types.
//
// `erase` and `magic-fill` are LEGACY: the eraser is now serialized as a
// `stroke` with brushType "eraser" (rendered destination-out), and legacy
// magic-fill folds into `region` mode "auto". Old saved rows may still carry
// them; clients keep a read-only deserialize path for back-compat.
export type CanvasActionType = "stroke" | "fill" | "sticker" | "region";

export type PaletteVariant = "realistic" | "pastel" | "cute" | "surprise";

// brushType "eraser" round-trips as a stroke rendered with destination-out.
export type BrushType =
  | "pencil"
  | "marker"
  | "crayon"
  | "watercolor"
  | "eraser"
  | "rainbow";

export interface CanvasAction {
  id: string; // Stable unique action ID (content/origin-derived, NOT Date.now())
  type: CanvasActionType;
  timestamp: number; // When the action was performed
  data: {
    // For strokes (eraser = brushType "eraser")
    path?: string; // SVG path data
    color?: string;
    brushType?: BrushType;
    brushSize?: number;
    opacity?: number;

    // For fills
    x?: number;
    y?: number;
    fillColor?: string;

    // For stickers
    stickerId?: string;
    position?: { x: number; y: number };
    scale?: number;
    rotation?: number;

    // For region (Magic Brush / Auto Color). Colour is re-derived per region
    // from the region store at replay time; we only carry what's needed to
    // reconstruct it. "auto" needs no geometry; "reveal" carries the brush path.
    mode?: "reveal" | "auto";
    variant?: PaletteVariant;
    // (region "reveal" reuses `path`/`brushSize` above for the stroke)

    // Cross-platform coordinate scaling: the canvas space the action was
    // authored in. Replay scales by (current dims / source dims).
    sourceWidth?: number;
    sourceHeight?: number;

    // LEGACY (read-only back-compat for old saved rows)
    erasePath?: string;
    magicFills?: Array<{ x: number; y: number; color: string }>;
  };
}

export interface CanvasProgressData {
  actions: CanvasAction[];
  version: number;
  lastUpdated: string;
}

// API request/response types
export interface SaveCanvasProgressRequest {
  coloringImageId: string;
  // Active profile this progress belongs to (per-profile scoping). Optional on
  // the wire for back-compat; the server resolves the active profile when
  // omitted. Sibling profiles get independent progress per image.
  profileId?: string;
  actions: CanvasAction[];
  version: number;
  canvasWidth?: number; // Canvas width for aspect ratio scaling
  canvasHeight?: number; // Canvas height for aspect ratio scaling
  previewDataUrl?: string; // Base64 data URL of canvas preview thumbnail
  // Flattened visual fallback (magic/legacy pages). Base64 PNG; server uploads
  // to R2 and stores the URL. Decoupled from the action union.
  snapshotDataUrl?: string;
  snapshotWidth?: number; // intrinsic dims for fitbox alignment on restore
  snapshotHeight?: number;
}

export interface GetCanvasProgressResponse {
  actions: CanvasAction[];
  version: number;
  lastUpdated: string;
  canvasWidth?: number; // Canvas width for aspect ratio scaling
  canvasHeight?: number; // Canvas height for aspect ratio scaling
  previewUrl?: string; // URL to progress preview thumbnail (feed display only)
  // Visual fallback raster (R2 url) + its intrinsic dims.
  snapshotUrl?: string;
  snapshotWidth?: number;
  snapshotHeight?: number;
}

// Sync status for UI
export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface CanvasSyncState {
  status: SyncStatus;
  lastSyncedAt?: Date;
  pendingActions: number;
  error?: string;
}

// Conflict resolution
export interface ConflictResolution {
  strategy: "local" | "remote" | "merge";
  localVersion: number;
  remoteVersion: number;
  resolvedActions: CanvasAction[];
}
