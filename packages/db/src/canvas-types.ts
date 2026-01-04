/**
 * Shared canvas types for cross-platform synchronization
 */

export type CanvasActionType =
  | "stroke"
  | "fill"
  | "sticker"
  | "erase"
  | "magic-fill";

export type BrushType = "pencil" | "marker" | "crayon" | "watercolor";

export interface CanvasAction {
  id: string; // Unique action ID
  type: CanvasActionType;
  timestamp: number; // When the action was performed
  data: {
    // For strokes
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

    // For erase
    erasePath?: string;

    // For magic-fill (mobile)
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
  actions: CanvasAction[];
  version: number;
  canvasWidth?: number; // Canvas width for aspect ratio scaling
  canvasHeight?: number; // Canvas height for aspect ratio scaling
  previewDataUrl?: string; // Base64 data URL of canvas preview thumbnail
}

export interface GetCanvasProgressResponse {
  actions: CanvasAction[];
  version: number;
  lastUpdated: string;
  canvasWidth?: number; // Canvas width for aspect ratio scaling
  canvasHeight?: number; // Canvas height for aspect ratio scaling
  previewUrl?: string; // URL to progress preview thumbnail
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
