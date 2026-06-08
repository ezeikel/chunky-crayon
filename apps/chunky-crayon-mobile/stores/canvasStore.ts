import { create } from "zustand";
import { SkPath } from "@shopify/react-native-skia";
import type { PaletteVariant } from "@/lib/coloring/palette";
import { makeActionId } from "@one-colored-pixel/canvas-sync";
import { getDeviceId } from "@/lib/auth";
import { track } from "@/utils/analytics";
import { ANALYTICS_EVENTS } from "@/constants/analytics";

// "Has fired PAGE_FIRST_STROKE" guard, scoped to the currently-loaded image.
// Holds the imageId we've already fired for so the event fires exactly ONCE per
// page load. Reset on reset()/setImageId(new id) (page-load boundaries — incl.
// Start Over, which clears history) so the next real stroke counts as the first
// again. Module-level (not store state) since this is fire-and-forget bookkeeping,
// not rendered UI — and addAction runs on the JS thread where track() is safe.
let firstStrokeFiredForImageId: string | null = null;

// Per-session monotonic creation counter — the `seq` ordering tiebreak for
// same-millisecond actions in the append-merge.
let actionSeqCounter = 0;
const nextActionSeq = (): number => {
  actionSeqCounter += 1;
  return actionSeqCounter;
};

// Synchronously-readable device id for originDeviceId. getDeviceId() is async
// (SecureStore), so we prime this cache once when the canvas mounts. Until
// primed we use a stable per-session fallback — fine, because originDeviceId
// only needs to be consistent within a session for the merge's skew guard.
let cachedDeviceId = `session-${makeActionId()}`;
let deviceIdPrimed = false;
export const primeDeviceId = async (): Promise<void> => {
  if (deviceIdPrimed) return;
  try {
    cachedDeviceId = await getDeviceId();
    deviceIdPrimed = true;
  } catch {
    // keep the session fallback
  }
};
export const getCachedDeviceId = (): string => cachedDeviceId;

export type Tool = "brush" | "fill" | "eraser" | "sticker" | "magic" | "pan";
export type BrushType =
  | "crayon"
  | "marker"
  | "pencil"
  | "paintbrush"
  | "rainbow"
  | "glow"
  | "neon"
  | "glitter"
  // The eraser is a stroke with brushType "eraser" (matches web's schema so
  // it persists + replays cross-platform); rendered with a dstOut blend.
  | "eraser";
export type FillType = "solid" | "pattern";
export type PatternType =
  | "dots"
  | "stripes"
  | "hearts"
  | "stars"
  | "zigzag"
  | "confetti";
export type MagicMode = "suggest" | "auto"; // suggest = tap for color hint, auto = fill entire image

// Region-store lifecycle the magic tiles render (mirrors web coloring-context).
export type MagicStatus = "ready" | "waiting" | "timeout" | "retrying";

// Canvas sticker tool now uses the shared PNG catalog (lib/canvasStickers) —
// `selectedSticker` holds a catalog ID (e.g. "star-classic"), not an emoji
// glyph. StickerCategory + the per-category sticker lists come from there.
import type { CanvasStickerCategory } from "@/lib/canvasStickers";

export type StickerCategory = CanvasStickerCategory;

export type DrawingAction = {
  // Stable cross-device identity, stamped ONCE at creation (in addAction) and
  // preserved through serialize → MMKV → sync → the append-merge. id is the
  // merge dedup key (a UUID, never derived from array position which re-rolls on
  // MAX_HISTORY shift / undo-truncate). createdAt is the creation timestamp —
  // the primary merge ordering key, NOT re-stamped at serialize (the old
  // Date.now()-at-convertToApiAction re-rolled it every save and broke dedup).
  // seq is the per-session creation counter (ordering tiebreak for same-ms
  // actions). originDeviceId lets the merge's terminal-collapse only eat
  // same-device earlier actions. Optional on the in-memory type because legacy
  // reloaded actions and the live-stroke preview path may lack them; addAction
  // stamps any missing ones.
  id?: string;
  createdAt?: number;
  seq?: number;
  originDeviceId?: string;
  // Durable UNDO tombstone. undo() sets undone=true with a fresh undoneSeq;
  // redo() clears it with a higher seq. Carried through serialize → MMKV → sync
  // so an undo survives reload + cross-device merge (the merge resolves it
  // monotonically by undoneSeq). Local render still uses the history prefix, so
  // these are for persistence, not the in-session visible state.
  undone?: boolean;
  undoneSeq?: number;
  // "magic-reveal" = region-store Magic Brush stroke (a path; the colour is
  // re-derived per region from the pre-coloured layer at render time).
  // "magic-auto" = region-store Auto Color (whole pre-coloured layer in one
  // shot). "magic-fill" is the LEGACY auto-fill (kept for fallback + replay of
  // old saved actions). "clear" = canvas reset (Start Over) — a real terminal
  // so a reset durably collapses a stale offline peer's strokes during a merge.
  type:
    | "stroke"
    | "fill"
    | "sticker"
    | "magic-fill"
    | "magic-reveal"
    | "magic-auto"
    | "clear";
  path?: SkPath;
  color: string;
  brushType?: BrushType;
  strokeWidth?: number;
  // For rainbow brush
  startHue?: number;
  // For fill actions
  fillX?: number;
  fillY?: number;
  targetColor?: string;
  // For pattern fills
  fillType?: FillType;
  patternType?: PatternType;
  // For sticker actions. `sticker` keeps the legacy emoji glyph (back-compat /
  // fallback render); stickerCatalogId + stickerImageUrl carry the PNG sticker
  // (the bundled transparent asset, web parity).
  sticker?: string;
  stickerCatalogId?: string;
  stickerImageUrl?: string;
  stickerX?: number;
  stickerY?: number;
  stickerSize?: number;
  // For magic auto-fill actions (stores all fills applied) — LEGACY
  magicFills?: Array<{ x: number; y: number; color: string }>;
  // For region-store magic actions (magic-reveal / magic-auto): the palette
  // variant the action was made under. Render looks up THIS variant's
  // pre-coloured image so undo/redo across a variant switch never recolours
  // history. (magic-reveal carries `path`; magic-auto carries no geometry.)
  variant?: PaletteVariant;
  // Cross-platform source dimensions - each action stores where it was recorded
  // so actions from web (CSS pixels ~880) and mobile (SVG viewBox ~1024) can coexist
  sourceWidth?: number;
  sourceHeight?: number;
  // Apple Pencil pressure sensitivity data
  // Array of pressure values (0-1) corresponding to path points
  pressurePoints?: number[];
  // Whether this stroke was made with a stylus (Apple Pencil)
  isStylus?: boolean;
  // Texture seed for deterministic texture rendering
  textureSeed?: number;
  // Render-only: monotonic id stamped by the live-stroke commit so the
  // UI-thread live preview can be cleared exactly when ITS committed <Path>
  // has rendered (fixes the draw→vanish→reappear flash). Never serialized
  // (see serializeActions), so reloaded actions never carry one and can't
  // spuriously match an in-flight live stroke.
  liveStrokeId?: number;
};

/**
 * Helper function to get visible actions from history — the prefix up to the
 * cursor, with UNDO-TOMBSTONED actions removed. Tombstones can sit in the middle
 * of the prefix after an undo-then-draw (addAction keeps the redo tail flagged
 * `undone` rather than slicing it, so the undo stays durable), so filtering by
 * `undone` here is what keeps them off the canvas while preserving them for
 * persistence. Mirrors getRenderableActions in canvas-sync.
 */
export const getVisibleActions = (
  history: DrawingAction[],
  historyIndex: number,
): DrawingAction[] => {
  return history.slice(0, historyIndex + 1).filter((a) => a.undone !== true);
};

// Capture function type for getting canvas image data
export type CanvasCaptureFunction = () => string | null;

export type CanvasState = {
  // Tool selection
  selectedTool: Tool;
  selectedColor: string;
  brushType: BrushType;
  brushSize: number;

  /**
   * Active colour palette "mood" variant (realistic / pastel / cute /
   * surprise), mirroring web. Drives the swatch grid shown in the
   * palette, and is the single knob that will also pick the magic
   * auto-color palette. See lib/coloring/palette.
   */
  paletteVariant: PaletteVariant;

  // Fill settings
  fillType: FillType;
  selectedPattern: PatternType;

  // Sticker settings
  /** Canvas sticker catalog id (lib/canvasStickers), NOT an emoji glyph. */
  selectedSticker: string;
  stickerCategory: StickerCategory;
  stickerSize: number;

  // Magic tool settings
  magicMode: MagicMode;
  /**
   * Whether the magic tools (auto-color / magic brush) are usable. They
   * depend on the pre-computed region store, which the backend writes
   * async after image creation. While it's not ready the toolbars disable
   * + spin those buttons. Mirrors web's coloring-context `magicReady`.
   * Defaults true so images without a region store aren't blocked.
   */
  magicReady: boolean;
  /**
   * Finer-grained region-store lifecycle the magic tiles render (mirrors web's
   * coloring-context `magicStatus`):
   *   'ready'    — store present, tools usable.
   *   'waiting'  — no store yet; host is polling the worker pipeline (spinner).
   *   'retrying' — kid tapped retry, worker re-kicked, polling again (spinner).
   *   'timeout'  — poll budget exhausted; tile stops spinning and shows a
   *                tap-to-retry rotate arrow (not a forever spinner).
   * `magicReady` stays the usable/tap-guard boolean (true only when 'ready' OR
   * legacy fill/colorMap data is present).
   */
  magicStatus: MagicStatus;
  /**
   * Retry handler the magic tiles call when magicStatus === 'timeout' — set by
   * ImageCanvas (which owns the region-store poll), invoked by ToolsSidebar
   * (a sibling). Mirrors web's coloring-context `onMagicRetry`. Null when no
   * canvas is mounted.
   */
  onMagicRetry: (() => void) | null;

  // Rainbow brush hue tracking (0-360)
  rainbowHue: number;

  // Drawing history for undo/redo
  history: DrawingAction[];
  historyIndex: number;

  // Zoom/Pan state
  scale: number;
  translateX: number;
  translateY: number;

  // Canvas state
  imageId: string | null;
  isDirty: boolean;

  // Audio settings
  // `isMuted` is the legacy single flag that gates brush HAPTICS (kept for
  // back-compat with ImageCanvas). The web-parity canvas chrome exposes two
  // independent toggles instead: sound-effects and ambient music.
  isMuted: boolean;
  /** Sound-effects muted (web's speaker tile). Default off = SFX on. */
  isSfxMuted: boolean;
  /** Ambient/background music muted (web's music tile). Default off = on. */
  isAmbientMuted: boolean;

  // Progress tracking (0-100)
  progress: number;

  // Canvas capture function (set by ImageCanvas)
  captureCanvas: CanvasCaptureFunction | null;
};

type CanvasActions = {
  // Tool actions
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setBrushType: (type: BrushType) => void;
  setBrushSize: (size: number) => void;
  setPaletteVariant: (variant: PaletteVariant) => void;
  setFillType: (type: FillType) => void;
  setPattern: (pattern: PatternType) => void;
  setSticker: (sticker: string) => void;
  setStickerCategory: (category: StickerCategory) => void;
  setStickerSize: (size: number) => void;
  setMagicMode: (mode: MagicMode) => void;
  setMagicReady: (ready: boolean) => void;
  setMagicStatus: (status: MagicStatus) => void;
  setOnMagicRetry: (fn: (() => void) | null) => void;
  advanceRainbowHue: (amount?: number) => void;

  // History actions
  addAction: (action: DrawingAction) => void;
  setHistory: (history: DrawingAction[]) => void;
  // Atomically install a full restored action set in ONE store commit (one
  // re-render, one Skia repaint). Used by the canvas load path instead of N
  // sequential addAction() calls — those each fire a separate set() → separate
  // paint, so an N-action page visibly rebuilds region-by-region from blank on
  // every open (the "first-open flash"). Stamps any action missing stable
  // identity, exactly like addAction, so restored actions keep their ids.
  restoreHistory: (actions: DrawingAction[]) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Zoom/Pan actions
  setScale: (scale: number) => void;
  setTranslate: (x: number, y: number) => void;
  resetTransform: () => void;

  // Canvas state actions
  setImageId: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  reset: () => void;

  // Audio actions
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  toggleSfxMuted: () => void;
  toggleAmbientMuted: () => void;

  // Progress actions
  setProgress: (progress: number) => void;

  // Canvas capture
  setCaptureCanvas: (fn: CanvasCaptureFunction | null) => void;
};

const initialState: CanvasState = {
  selectedTool: "brush",
  selectedColor: "#000000",
  paletteVariant: "realistic",
  brushType: "crayon",
  brushSize: 10,
  fillType: "solid",
  selectedPattern: "dots",
  selectedSticker: "star-classic",
  stickerCategory: "stars",
  // Default placed-sticker size (canvas-px terms; mapped to SVG space at
  // placement). Bumped 40→80 (~2x) — at 40 stickers read tiny against the
  // artwork and are fiddly for ages 3-8. Clamp max widened to match (see below).
  stickerSize: 80,
  magicMode: "suggest",
  magicReady: true,
  magicStatus: "ready",
  onMagicRetry: null,
  rainbowHue: 0,

  history: [],
  historyIndex: -1,

  scale: 1,
  translateX: 0,
  translateY: 0,

  imageId: null,
  isDirty: false,
  isMuted: false,
  isSfxMuted: false,
  // Music (ambient) OFF by default — matches web (coloring-ui context
  // isAmbientMuted defaults true). Sound effects stay on.
  isAmbientMuted: true,
  progress: 0,
  captureCanvas: null,
};

const MAX_HISTORY = 50; // Limit history to prevent memory issues

export const useCanvasStore = create<CanvasState & CanvasActions>(
  (set, get) => ({
    ...initialState,

    // Tool actions
    setTool: (tool) => set({ selectedTool: tool }),
    setColor: (color) => set({ selectedColor: color }),
    setBrushType: (type) => set({ brushType: type }),
    setPaletteVariant: (variant) => set({ paletteVariant: variant }),
    setBrushSize: (size) => set({ brushSize: Math.max(1, Math.min(50, size)) }),
    setFillType: (type) => set({ fillType: type }),
    setPattern: (pattern) => set({ selectedPattern: pattern }),
    setSticker: (sticker) => set({ selectedSticker: sticker }),
    setStickerCategory: (category) => set({ stickerCategory: category }),
    setStickerSize: (size) =>
      // Max widened 100→150 so kids can size stickers up further (default is 80).
      set({ stickerSize: Math.max(20, Math.min(150, size)) }),
    setMagicMode: (mode) => set({ magicMode: mode }),
    setMagicReady: (ready) => set({ magicReady: ready }),
    setMagicStatus: (status) => set({ magicStatus: status }),
    setOnMagicRetry: (fn) => set({ onMagicRetry: fn }),
    advanceRainbowHue: (amount = 30) =>
      set((state) => ({ rainbowHue: (state.rainbowHue + amount) % 360 })),

    // History actions
    addAction: (action) => {
      const { history, historyIndex, imageId } = get();

      // Stamp the stable cross-device identity ONCE, here at the logical-action
      // birth point (every committed action funnels through addAction). Never
      // re-derived at serialize time. Existing id/createdAt (e.g. a reloaded
      // action) are preserved.
      const stamped: DrawingAction = {
        ...action,
        id: action.id ?? makeActionId(),
        createdAt: action.createdAt ?? Date.now(),
        seq: action.seq ?? nextActionSeq(),
        originDeviceId: action.originDeviceId ?? cachedDeviceId,
      };

      console.log(
        `[CANVAS_STORE] ADD_ACTION - Type: ${stamped.type}, Color: ${stamped.color}`,
      );
      console.log(
        `[CANVAS_STORE] ADD_ACTION - Current history: ${history.length} items, Index: ${historyIndex}, Image: ${imageId}`,
      );

      // Drawing after an undo discards the redo tail. We DON'T slice it away —
      // a sliced-away action that was already synced would resurrect on reload
      // (the server still has its live copy and nothing tells it the action is
      // gone). Instead, TOMBSTONE the tail (mark each undone with a fresh seq)
      // and keep it, so the durable-undo flag reaches the server on the next
      // sync. The kept prefix is history[0..historyIndex]; the tail is
      // history[historyIndex+1..].
      const prefix = history.slice(0, historyIndex + 1);
      const tombstonedTail = history.slice(historyIndex + 1).map((a) => ({
        ...a,
        undone: true as const,
        undoneSeq: nextActionSeq(),
      }));
      const newHistory = [...prefix, ...tombstonedTail, stamped];

      // Trim history if too long
      if (newHistory.length > MAX_HISTORY) {
        console.log(
          `[CANVAS_STORE] ADD_ACTION - Trimming history (exceeded ${MAX_HISTORY} items)`,
        );
        newHistory.shift();
      }

      console.log(
        `[CANVAS_STORE] ADD_ACTION - New history: ${newHistory.length} items`,
      );
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isDirty: true,
      });

      // PAGE_FIRST_STROKE: fire the FIRST time a real user stroke commits after
      // a page loads. Only `stroke` actions count (not clear/magic/fill/sticker
      // or restored history), and only once per imageId until the next page-load
      // boundary resets the guard. tool = the active drawing tool for the stroke.
      if (
        stamped.type === "stroke" &&
        imageId &&
        firstStrokeFiredForImageId !== imageId
      ) {
        firstStrokeFiredForImageId = imageId;
        track(ANALYTICS_EVENTS.PAGE_FIRST_STROKE, {
          coloringImageId: imageId,
          tool: stamped.brushType ?? get().selectedTool,
        });
      }
    },

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= 0) {
        // Stamp a durable UNDO TOMBSTONE on the action we're stepping past so
        // the undo survives sync/merge/reload (it's no longer just a local
        // index move — see canvas-sync mergeTombstone). The local render still
        // uses the prefix (history.slice(0, historyIndex+1)), so the canvas
        // updates instantly; the flag is for persistence + cross-device.
        const next = history.map((a, i) =>
          i === historyIndex
            ? { ...a, undone: true, undoneSeq: nextActionSeq() }
            : a,
        );
        set({ history: next, historyIndex: historyIndex - 1, isDirty: true });
      }
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < history.length - 1) {
        const target = historyIndex + 1;
        // Clear the tombstone (redo wins via a strictly-higher undoneSeq).
        const next = history.map((a, i) =>
          i === target
            ? { ...a, undone: false, undoneSeq: nextActionSeq() }
            : a,
        );
        set({ history: next, historyIndex: target, isDirty: true });
      }
    },

    // Replace the whole history (used to rehydrate after a 409 append-merge so
    // the next autosave serializes the merged union, not this device's set).
    setHistory: (history) =>
      set({ history, historyIndex: history.length - 1, isDirty: false }),

    // Atomic restore for the canvas load path. Stamps each action's stable
    // identity the same way addAction does (preserving any already present —
    // restored actions carry their saved ids), then commits the whole set in a
    // SINGLE set(). This replaces the old `savedActions.forEach(addAction)`
    // restore in ImageCanvas, which fired one set()/paint per action and made
    // the page rebuild visibly from blank on every open (the first-open flash).
    // isDirty stays false: a freshly-restored canvas isn't a pending edit.
    restoreHistory: (actions) => {
      const stamped = actions.map((action) => ({
        ...action,
        id: action.id ?? makeActionId(),
        createdAt: action.createdAt ?? Date.now(),
        seq: action.seq ?? nextActionSeq(),
        originDeviceId: action.originDeviceId ?? cachedDeviceId,
      }));
      console.log(
        `[CANVAS_STORE] RESTORE_HISTORY - ${stamped.length} actions in one commit`,
      );
      set({
        history: stamped,
        historyIndex: stamped.length - 1,
        isDirty: false,
      });
    },

    clearHistory: () => set({ history: [], historyIndex: -1 }),

    canUndo: () => get().historyIndex >= 0,

    canRedo: () => {
      const { history, historyIndex } = get();
      return historyIndex < history.length - 1;
    },

    // Zoom/Pan actions
    setScale: (scale) => {
      const clamped = Math.max(0.5, Math.min(4, scale));
      // No-op when effectively unchanged. The pan/pinch gesture springs settle a
      // hair off the committed value and run setScale on every gesture end
      // (including plain draw strokes), which wrote a sub-pixel-different scale
      // and fired every `scale` subscriber (the route's zoom-% readout), forcing
      // a ~110ms whole-screen re-render PER STROKE (measured via the profiler).
      // Ignoring sub-epsilon deltas keeps that subscription quiet on draw while
      // still updating on a real zoom (button = ±20%, pinch = visible change).
      // The 1% displayed zoom readout (whole-number %) can't show a <0.5% delta
      // anyway, so this is visually lossless.
      if (Math.abs(clamped - get().scale) < 0.005) return;
      set({ scale: clamped });
    },

    setTranslate: (x, y) => set({ translateX: x, translateY: y }),

    resetTransform: () => set({ scale: 1, translateX: 0, translateY: 0 }),

    // Canvas state actions
    setImageId: (id) => {
      console.log(
        `[CANVAS_STORE] SET_IMAGE_ID - New ID: ${id}, Previous: ${get().imageId}`,
      );
      // New page loaded → reset the PAGE_FIRST_STROKE guard so the next real
      // stroke on this image fires the event again (a different id is a fresh
      // page; the same id reloading is also a fresh load boundary).
      if (id !== get().imageId) {
        firstStrokeFiredForImageId = null;
      }
      set({ imageId: id });
    },

    setDirty: (dirty) => {
      console.log(`[CANVAS_STORE] SET_DIRTY - ${dirty}`);
      set({ isDirty: dirty });
    },

    reset: () => {
      const currentState = get();
      console.log(
        `[CANVAS_STORE] RESET - Clearing state for image: ${currentState.imageId}, History: ${currentState.history.length} items`,
      );
      // Start Over clears the page → re-arm PAGE_FIRST_STROKE so the next real
      // stroke after a reset counts as the first stroke again.
      firstStrokeFiredForImageId = null;
      // Reset to initial state but preserve capture function
      set({
        ...initialState,
        captureCanvas: currentState.captureCanvas,
      });
    },

    // Audio actions
    setMuted: (muted) => set({ isMuted: muted }),
    toggleMuted: () => set((state) => ({ isMuted: !state.isMuted })),
    toggleSfxMuted: () => set((state) => ({ isSfxMuted: !state.isSfxMuted })),
    toggleAmbientMuted: () =>
      set((state) => ({ isAmbientMuted: !state.isAmbientMuted })),

    // Progress actions
    setProgress: (progress) =>
      set({ progress: Math.max(0, Math.min(100, progress)) }),

    // Canvas capture
    setCaptureCanvas: (fn) => set({ captureCanvas: fn }),
  }),
);
