/**
 * V2 component showcase — local-only Remotion comp for visual validation.
 *
 * Mounts every V2 building block in one frame so we can eyeball the brand
 * fidelity vs the live app. Not part of any real reel; lives alongside
 * the other compositions in `Root.tsx` and gets removed once the real V2
 * comps (TextDemoReelV2 / ImageDemoReelV2) ship.
 */
import { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  delayRender,
  continueRender,
  staticFile,
} from "remotion";
import {
  buildPreColoredCanvas,
  type MagicRevealRegionStore,
} from "@one-colored-pixel/canvas";
import { COLORS, FONTS, FONT_WEIGHTS, SPRINGS } from "./tokens/brand";
import { PaletteRow } from "./components/PaletteRow";
import { PromptInputCard } from "./components/PromptInputCard";
import { ImageInputCard } from "./components/ImageInputCard";
import { Toolbar } from "./components/Toolbar";
import {
  CanvasReveal,
  type CanvasRevealFixture,
  makeBoustrophedonPath,
} from "./components/CanvasReveal";
import koalaRegionsJson from "../spikes/fixtures/koala-regions.json";

// =============================================================================
// Hardcoded fixture (same as Phase 0 spike — koala beach scene)
// =============================================================================
const FIXTURE_FILES = {
  regionMapPath: "spike/koala.regions.bin.gz",
  regionMapWidth: 1024,
  regionMapHeight: 1024,
  svgPath: "spike/koala.svg",
};
const PALETTE_VARIANT = "cute";
const CANVAS_W = 768;
const CANVAS_H = 768;

const STAMPS_PER_ROW = 24;
const ROWS = 24;
const TOTAL_STAMPS = STAMPS_PER_ROW * ROWS;
const BRUSH_RADIUS =
  Math.max(CANVAS_W / STAMPS_PER_ROW, CANVAS_H / ROWS) * 0.85;
const STAMP_PATH = makeBoustrophedonPath(STAMPS_PER_ROW, ROWS);

// =============================================================================
// Region store types (mirrored locally — same as Phase 0 spike)
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

async function gunzip(buffer: ArrayBuffer): Promise<Uint8Array> {
  const ds = new (
    globalThis as { DecompressionStream: typeof DecompressionStream }
  ).DecompressionStream("gzip");
  const stream = new Blob([buffer]).stream().pipeThrough(ds);
  const decompressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(decompressed);
}

async function loadShowcase(): Promise<CanvasRevealFixture> {
  const regionMapUrl = staticFile(FIXTURE_FILES.regionMapPath);
  const svgUrl = staticFile(FIXTURE_FILES.svgPath);

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
  const pixelToRegion = new Uint16Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / 2,
  );

  const regionsJson = koalaRegionsJson as unknown as RegionStoreJson;
  const regionsById = new Map<number, RegionStoreRegion>();
  for (const r of regionsJson.regions) regionsById.set(r.id, r);

  const regionStore: MagicRevealRegionStore = {
    width: FIXTURE_FILES.regionMapWidth,
    height: FIXTURE_FILES.regionMapHeight,
    getRegionIdAt: (x, y) => {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (
        px < 0 ||
        px >= FIXTURE_FILES.regionMapWidth ||
        py < 0 ||
        py >= FIXTURE_FILES.regionMapHeight
      )
        return 0;
      return pixelToRegion[py * FIXTURE_FILES.regionMapWidth + px];
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

  return {
    preColoredCanvas,
    tempCanvas,
    svgText,
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
  };
}

// =============================================================================
// Fake-typed prompt animation
// =============================================================================
const SHOWCASE_PROMPT = "a koala building a sandcastle at the beach";
// Type out over ~3.5s, at 30fps = ~105 frames.
const TYPING_FRAMES = 105;

// =============================================================================
// Showcase composition
// =============================================================================
export const V2_SHOWCASE_FPS = 30;
// 0-90: typing
// 90-120: photo dropping in
// 120-180: palette pop animation
// 180-360: canvas reveal
export const V2_SHOWCASE_DURATION_FRAMES = 360;

export const V2ComponentShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: vWidth, height: vHeight, fps } = useVideoConfig();

  const [fixture, setFixture] = useState<CanvasRevealFixture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<number | null>(null);

  useEffect(() => {
    if (handleRef.current !== null) return;
    handleRef.current = delayRender("loading v2 showcase fixture");
    let cancelled = false;
    loadShowcase()
      .then((f) => {
        if (cancelled) return;
        setFixture(f);
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

  if (error) {
    return (
      <AbsoluteFill style={{ background: "#fee", padding: 40 }}>
        <div style={{ color: "#900", fontFamily: "monospace" }}>
          showcase error: {error}
        </div>
      </AbsoluteFill>
    );
  }

  if (!fixture) {
    return (
      <AbsoluteFill
        style={{
          background: COLORS.bgCream,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          fontSize: 32,
          color: COLORS.textMuted,
        }}
      >
        loading v2 showcase…
      </AbsoluteFill>
    );
  }

  // Typing animation: chars revealed = frame ratio over TYPING_FRAMES.
  const typedChars = Math.min(
    SHOWCASE_PROMPT.length,
    Math.floor((frame / TYPING_FRAMES) * SHOWCASE_PROMPT.length),
  );
  const typedText = SHOWCASE_PROMPT.slice(0, typedChars);
  const caretVisible = Math.floor(frame / 15) % 2 === 0;

  // Image input preview animation: starts at frame 90, completes by 120.
  const previewProgress = interpolate(frame, [90, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Magic-brush tool selection pop: at frame 120 the magic-reveal tool
  // activates. No colour swatch is ever selected — magic brush picks
  // colours per region automatically.
  const selectionPop = spring({
    frame: frame - 120,
    fps,
    config: SPRINGS.bouncy,
    durationInFrames: 30,
  });

  // Canvas reveal: starts at frame 180, runs 180 frames (~6s) at 4× speed.
  const revealStartFrame = 180;
  const REVEAL_SPEED = 4;
  const stampCount = Math.max(
    0,
    Math.min(TOTAL_STAMPS, (frame - revealStartFrame) * REVEAL_SPEED),
  );

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bgCream,
        padding: 60,
        gap: 32,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.heading,
          fontSize: 48,
          color: COLORS.textPrimary,
          marginBottom: 16,
        }}
      >
        V2 components
      </div>

      <div style={{ width: 800 }}>
        <PromptInputCard typedText={typedText} caretVisible={caretVisible} />
      </div>

      <div style={{ width: 600 }}>
        <ImageInputCard
          photoUrl="https://images.unsplash.com/photo-1506086679524-493c64fdfaa6?w=1200&q=80"
          filename="puppy.jpg"
          previewProgress={previewProgress}
        />
      </div>

      <div style={{ width: 900 }}>
        <Toolbar
          activeToolId={frame >= 120 ? "magic-reveal" : null}
          selectionPop={selectionPop}
        />
      </div>

      {/* Palette stays mounted but no swatch is ever selected — magic
          brush picks colours per region automatically, so the live UI
          shows the palette as visible-but-unselected. */}
      <div style={{ width: 800 }}>
        <PaletteRow selectedIndex={null} limit={12} />
      </div>

      {fixture && (
        <div style={{ marginTop: 24 }}>
          <CanvasReveal
            fixture={fixture}
            stampCount={stampCount}
            totalStamps={TOTAL_STAMPS}
            stampsPerRow={STAMPS_PER_ROW}
            brushRadius={BRUSH_RADIUS}
            stampPath={STAMP_PATH}
            size={Math.min(vWidth - 120, 720)}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};
