/**
 * Phase 0 spike — frame-deterministic brush playback for Demo Reels V2.
 *
 * Validates that the live magic-reveal brush in <ImageCanvas> can be driven
 * off useCurrentFrame() for Remotion. Phase 3 will lift the same primitives
 * directly into <ImageCanvas> as a `playbackMode: 'remotion'` branch.
 *
 * The painting logic is NOT reimplemented here — it lives in
 * `@one-colored-pixel/canvas`'s `buildPreColoredCanvas` and
 * `paintMagicRevealStamp`, extracted from `ImageCanvas.tsx`. Live brush and
 * spike share one implementation.
 *
 * Pass criteria:
 *   - Reveal is deterministic at any frame (rewindable).
 *   - SPEED_FACTOR=4 has no artifacts.
 *   - Visual output matches the live app.
 *
 * Run: cd apps/chunky-crayon-worker && pnpm remotion:studio
 *      Open BrushPlaybackSpike composition.
 */
import { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  delayRender,
  continueRender,
  staticFile,
} from "remotion";
import {
  buildPreColoredCanvas,
  paintMagicRevealStamp,
  type MagicRevealRegionStore,
} from "@one-colored-pixel/canvas";
import koalaRegionsJson from "./fixtures/koala-regions.json";

// =============================================================================
// Hardcoded test fixture
// =============================================================================
// "Cute Koala Building a Sandcastle at the Beach" — prod image, 131 regions,
// 1024×1024 region map.
const FIXTURE = {
  // Same-origin fixtures from apps/chunky-crayon-worker/public/spike/.
  // Avoids R2 CORS (the prod bucket has no Access-Control-Allow-Origin set).
  regionMapPath: "spike/koala.regions.bin.gz",
  regionMapWidth: 1024,
  regionMapHeight: 1024,
  svgPath: "spike/koala.svg",
};

const PALETTE_VARIANT = "cute";

// Speedup knob — Phase 0 must validate 4x without artifacts.
const SPEED_FACTOR = 4;

// Working canvas dimensions. Smaller than 1024×1024 keeps the per-frame
// stamp work fast in Remotion preview while staying high enough to read on
// a phone screen. The line art SVG scales over the top.
const CANVAS_W = 768;
const CANVAS_H = 768;

// Brush sweep — boustrophedon (snake) path of stamp positions in CSS pixels
// of the working canvas. The stamps are dense enough that consecutive ones
// connect via drawTexturedStroke's `lastX/lastY` segment, giving the same
// continuous-stroke look as the live app.
const STAMPS_PER_ROW = 24;
const ROWS = 24;
const TOTAL_STAMPS = STAMPS_PER_ROW * ROWS;

// Brush radius in CSS pixels. Tuned so each row of stamps overlaps the next
// — gives full coverage without the brush dab grid being visible.
const BRUSH_RADIUS =
  Math.max(CANVAS_W / STAMPS_PER_ROW, CANVAS_H / ROWS) * 0.85;

// =============================================================================
// Region store types (mirrored locally to avoid pulling in coloring-ui's hook,
// which is React-only and tied to fetch lifecycles)
// =============================================================================
type RegionStoreRegion = {
  id: number;
  bounds: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  pixelCount: number;
  label: string;
  objectGroup: string;
  palettes: Record<
    "realistic" | "pastel" | "cute" | "surprise",
    { hex: string; colorName: string }
  >;
};

type RegionStoreJson = {
  sceneDescription: string;
  sourceWidth: number;
  sourceHeight: number;
  regionPixelCount: number;
  regions: RegionStoreRegion[];
};

// =============================================================================
// Helpers
// =============================================================================

async function gunzip(buffer: ArrayBuffer): Promise<Uint8Array> {
  const ds = new (
    globalThis as { DecompressionStream: typeof DecompressionStream }
  ).DecompressionStream("gzip");
  const stream = new Blob([buffer]).stream().pipeThrough(ds);
  const decompressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(decompressed);
}

function stampPosition(index: number): { x: number; y: number } {
  const row = Math.floor(index / STAMPS_PER_ROW);
  const col = index % STAMPS_PER_ROW;
  const colInRow = row % 2 === 0 ? col : STAMPS_PER_ROW - 1 - col;
  const x = ((colInRow + 0.5) / STAMPS_PER_ROW) * CANVAS_W;
  const y = ((row + 0.5) / ROWS) * CANVAS_H;
  return { x, y };
}

// =============================================================================
// Loaded fixture state
// =============================================================================

type LoadedSpike = {
  preColoredCanvas: HTMLCanvasElement;
  tempCanvas: HTMLCanvasElement;
  svgText: string;
};

async function loadSpike(): Promise<LoadedSpike> {
  const regionMapUrl = staticFile(FIXTURE.regionMapPath);
  const svgUrl = staticFile(FIXTURE.svgPath);

  const [regionMapResp, svgResp] = await Promise.all([
    fetch(regionMapUrl),
    fetch(svgUrl),
  ]);
  if (!regionMapResp.ok)
    throw new Error(`region map ${regionMapResp.status} (${regionMapUrl})`);
  if (!svgResp.ok) throw new Error(`svg ${svgResp.status} (${svgUrl})`);

  const [gzipBuf, svgText] = await Promise.all([
    regionMapResp.arrayBuffer(),
    svgResp.text(),
  ]);

  const bytes = await gunzip(gzipBuf);
  const expected = FIXTURE.regionMapWidth * FIXTURE.regionMapHeight * 2;
  if (bytes.byteLength !== expected) {
    throw new Error(
      `region map size mismatch: got ${bytes.byteLength}, expected ${expected}`,
    );
  }
  const pixelToRegion = new Uint16Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / 2,
  );

  // Build the MagicRevealRegionStore the shared helper expects. This is the
  // same shape coloring-ui's useRegionStore returns.
  const regionsJson = koalaRegionsJson as unknown as RegionStoreJson;
  const regionsById = new Map<number, RegionStoreRegion>();
  for (const r of regionsJson.regions) regionsById.set(r.id, r);

  const regionStore: MagicRevealRegionStore = {
    width: FIXTURE.regionMapWidth,
    height: FIXTURE.regionMapHeight,
    getRegionIdAt: (x, y) => {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (
        px < 0 ||
        px >= FIXTURE.regionMapWidth ||
        py < 0 ||
        py >= FIXTURE.regionMapHeight
      )
        return 0;
      return pixelToRegion[py * FIXTURE.regionMapWidth + px];
    },
    getColorForRegion: (regionId, variant) => {
      const region = regionsById.get(regionId);
      if (!region) return null;
      const palette = region.palettes[variant as keyof typeof region.palettes];
      return palette?.hex ?? null;
    },
  };

  const preColoredCanvas = buildPreColoredCanvas({
    regionStore,
    paletteVariant: PALETTE_VARIANT,
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    factory: () => document.createElement("canvas"),
  });

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = CANVAS_W;
  tempCanvas.height = CANVAS_H;

  return { preColoredCanvas, tempCanvas, svgText };
}

// =============================================================================
// Per-frame replay — clears the destination canvas and stamps 0..N-1 in order
// =============================================================================
function replayStamps(
  destCtx: CanvasRenderingContext2D,
  stampCount: number,
  spike: LoadedSpike,
): void {
  destCtx.save();
  destCtx.setTransform(1, 0, 0, 1, 0, 0);
  destCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  destCtx.restore();

  let lastX: number | null = null;
  let lastY: number | null = null;
  for (let i = 0; i < stampCount; i++) {
    const { x, y } = stampPosition(i);
    paintMagicRevealStamp({
      destCtx,
      tempCanvas: spike.tempCanvas,
      preColoredCanvas: spike.preColoredCanvas,
      x,
      y,
      lastX,
      lastY,
      radius: BRUSH_RADIUS,
      pressure: 0.6,
      dpr: 1,
    });
    // Boustrophedon: at the start of each row break the segment so the brush
    // doesn't visibly leap back across the canvas. Live app does this naturally
    // because pointer leaves the canvas between strokes.
    const isFirstOfRow = i % STAMPS_PER_ROW === 0;
    lastX = isFirstOfRow ? null : x;
    lastY = isFirstOfRow ? null : y;
  }
}

// =============================================================================
// Spike composition
// =============================================================================
export const BRUSH_SPIKE_FPS = 30;
export const BRUSH_SPIKE_DURATION_FRAMES = Math.ceil(
  TOTAL_STAMPS / SPEED_FACTOR + 30,
);

export const BrushPlaybackSpike: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: vWidth, height: vHeight } = useVideoConfig();

  const [spike, setSpike] = useState<LoadedSpike | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<number | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Block render until fixture is loaded + pre-coloured canvas is built.
  useEffect(() => {
    if (handleRef.current !== null) return;
    handleRef.current = delayRender("loading magic-reveal spike fixture");
    let cancelled = false;
    loadSpike()
      .then((s) => {
        if (cancelled) return;
        setSpike(s);
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Replay stamps up to current frame's count. Full clear + replay every
  // frame keeps the timeline rewindable without state leakage.
  useEffect(() => {
    if (!spike || !drawingCanvasRef.current) return;
    const ctx = drawingCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const stampCount = Math.min(TOTAL_STAMPS, Math.floor(frame * SPEED_FACTOR));
    replayStamps(ctx, stampCount, spike);
  }, [frame, spike]);

  if (error) {
    return (
      <AbsoluteFill style={{ background: "#fee", padding: 40 }}>
        <div style={{ color: "#900", fontFamily: "monospace" }}>
          spike error: {error}
        </div>
      </AbsoluteFill>
    );
  }

  if (!spike) {
    return (
      <AbsoluteFill
        style={{
          background: "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: "monospace" }}>loading fixture…</div>
      </AbsoluteFill>
    );
  }

  const SIZE = Math.min(vWidth, vHeight - 200);
  const offsetX = (vWidth - SIZE) / 2;
  const offsetY = (vHeight - SIZE) / 2;

  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(spike.svgText)}`;

  const stampCount = Math.min(TOTAL_STAMPS, Math.floor(frame * SPEED_FACTOR));

  return (
    <AbsoluteFill style={{ background: "#fff8e7" }}>
      <div
        style={{
          position: "absolute",
          left: offsetX,
          top: offsetY,
          width: SIZE,
          height: SIZE,
          background: "#fff",
        }}
      >
        <canvas
          ref={drawingCanvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
        <Img
          src={svgDataUrl}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 24,
          right: 24,
          fontFamily: "monospace",
          fontSize: 18,
          color: "#444",
          textAlign: "center",
        }}
      >
        frame {frame} · stamp {stampCount}/{TOTAL_STAMPS} · {SPEED_FACTOR}×
        speed
      </div>
    </AbsoluteFill>
  );
};
