/**
 * Shared canvas types for cross-platform synchronization.
 *
 * This is the SPINE both web (packages/coloring-ui/src/canvasActions.ts) and
 * mobile (apps/chunky-crayon-mobile/utils/canvasPersistence.ts) converge on.
 * It lives in @one-colored-pixel/canvas-sync — a dependency-free pure-TS leaf
 * package — so BOTH clients and the server can import the wire types AND the
 * append-merge that operates on them from ONE source, with zero risk of pulling
 * the Prisma client / `ws` into the React Native Hermes bundle (which the db
 * barrel would). @one-colored-pixel/db re-exports these for server convenience.
 */

// The canonical cross-platform action types.
//
// `region` = Magic Brush / Auto Color, reconstructed from the shared region
// store on each platform (so magic pages round-trip without a raster).
// `clear` = canvas reset ("Start Over"). It is a TERMINAL action: a later clear
// supersedes every earlier action. Modelling reset as a real wire action (not a
// silently-emptied array) is what makes "Start Over on device A" durably wipe a
// stale offline peer's strokes during a merge instead of the union resurrecting
// them.
// `snapshot` is carried as TOP-LEVEL request/response fields, NOT as an action
// (a magic/legacy page's flattened visual fallback) — see Save/Get types.
//
// `erase` and `magic-fill` are LEGACY: the eraser is now serialized as a
// `stroke` with brushType "eraser" (rendered destination-out), and legacy
// magic-fill folds into `region` mode "auto" at serialize time. Old saved rows
// may still carry magic-fill; the merge folds it to region/auto so its
// terminal semantics are honoured.
export type CanvasActionType =
  | "stroke"
  | "fill"
  | "sticker"
  | "region"
  | "clear";

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
  // Stable, globally-unique id stamped ONCE at action creation (a UUID v4 via
  // makeActionId) and preserved byte-for-byte through serialize→save→sync→
  // reload. NEVER derived from array position or re-rolled at serialize time —
  // dedup in the append-merge keys on this, so an unstable id duplicates strokes
  // and a position-derived id collides across devices.
  id: string;
  type: CanvasActionType;
  // Creation-time epoch ms, stamped ONCE at creation. Primary ordering key in
  // the merge (a later auto/clear supersedes earlier actions by timestamp).
  timestamp: number;
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
    // `stickerId` historically (and still, for back-compat) carries the EMOJI
    // GLYPH of a placed sticker — pre-PNG-migration saved artwork has the glyph
    // here, and the renderer falls back to drawing it as text when `imageUrl`
    // is absent. New placements ALSO set `catalogId` (the stable
    // CANVAS_STICKERS id) + `imageUrl` (the transparent PNG) so the renderer
    // draws the image. Additive + opaque-JSON → no DB migration, old clients
    // ignore the new fields. Do NOT repurpose `stickerId` — it would break
    // every already-saved sticker.
    stickerId?: string;
    /** Stable catalog id (CANVAS_STICKERS[].id) for PNG stickers. */
    catalogId?: string;
    /** Transparent PNG path/url for the sticker (absent on legacy emoji saves). */
    imageUrl?: string;
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

    // Per-device monotonic creation sequence, stamped at creation alongside
    // `timestamp`. SECONDARY ordering key (timestamp, seq, id): the wall clock
    // is coarse, so two actions in the same millisecond — e.g. an Auto Color
    // and a hand stroke drawn right after it — would otherwise be ordered by
    // the random id, which carries no causal info and could wrongly truncate
    // the later stroke. seq reflects true local creation order within a
    // device's same-ms burst.
    seq?: number;
    // The device that authored this action (stable per-device/per-browser id).
    // The merge only lets a terminal (auto/clear) truncate an EARLIER action if
    // they share an origin device OR the earlier action predates the terminal by
    // more than the skew window — so a fast-clock device's Auto Color can't eat
    // a correct-clock device's legitimately-later cross-device stroke.
    originDeviceId?: string;

    // UNDO as a durable TOMBSTONE (not array removal). undo() sets undone=true;
    // redo() sets it back to false — each bump stamps a strictly-higher
    // undoneSeq so the merge resolves concurrent undo/redo by last-writer-wins.
    // The flag rides INSIDE this opaque `data` JSON, so: (a) no DB migration /
    // route change, (b) the action's id stays present in the array so the
    // server's id-set divergence guard (incoming ⊇ stored) keeps passing — a
    // true deletion would drop the id and wedge the guard into a 409 loop, and
    // (c) old clients ignore `undone` and just render the stroke (graceful
    // degradation = today's behaviour). The merge merges `undone` MONOTONICALLY
    // (a tombstone, once the latest by undoneSeq, can't be un-set by an older
    // copy re-synced from a stale device) and filters undone actions out of the
    // replay set before terminal-collapse.
    undone?: boolean;
    undoneSeq?: number;

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

// Conflict resolution — populated by mergeCanvasActions as a logging /
// diagnostics return-context (its first real use; it was previously dead).
export interface ConflictResolution {
  strategy: "local" | "remote" | "merge";
  localVersion: number;
  remoteVersion: number;
  resolvedActions: CanvasAction[];
}
