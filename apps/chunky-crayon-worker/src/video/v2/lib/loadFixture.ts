/**
 * Demo Reel V2 — fixture loader for Remotion compositions.
 *
 * Fetches the region-store binary + line-art SVG for a given coloring image,
 * decompresses the gzipped pixel→region map, builds the pre-coloured canvas,
 * and returns the bundle the `<CanvasReveal>` component expects.
 *
 * The reel comp owns the `delayRender` lifecycle: this module is just an
 * `async () => CanvasRevealFixture` to invoke inside `useEffect`.
 *
 * Note on regionsJson: it lives on the `coloring_images` row, not as an
 * R2 file. Real renders pass it inline via Remotion `inputProps` from the
 * worker's `/publish/v2` handler. The studio preview can pass it via
 * `?props=` or `defaultProps` for local validation.
 */
import {
  buildPreColoredCanvas,
  type MagicRevealRegionStore,
} from "@one-colored-pixel/canvas";
import type { CanvasRevealFixture } from "../components/CanvasReveal";

// =============================================================================
// Region store types — mirror packages/coloring-ui/src/types.ts. Defined
// locally to avoid pulling the React-only useRegionStore hook into a
// pure utility module.
// =============================================================================
export type RegionStoreRegion = {
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

export type RegionStoreJson = {
  sceneDescription: string;
  sourceWidth: number;
  sourceHeight: number;
  regionPixelCount: number;
  regions: RegionStoreRegion[];
};

export type PaletteVariant = "realistic" | "pastel" | "cute" | "surprise";

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

// =============================================================================
// Loader
// =============================================================================

export type LoadFixtureOptions = {
  /** Public URL of the gzipped Uint16Array region map binary. */
  regionMapUrl: string;
  /** Region map dimensions — both default to 1024 in production today. */
  regionMapWidth: number;
  regionMapHeight: number;
  /** Already-parsed regions JSON (DB column → inputProps). */
  regionsJson: RegionStoreJson;
  /** Public URL of the line art SVG. Composited via mix-blend-mode: multiply. */
  svgUrl: string;
  /** Working canvas dimensions. Both default to 768 (Phase 0 spike value). */
  canvasW?: number;
  canvasH?: number;
  /** Palette variant for pre-colour. Defaults to 'cute' for Chunky Crayon. */
  paletteVariant?: PaletteVariant;
};

export async function loadCanvasRevealFixture(
  opts: LoadFixtureOptions,
): Promise<CanvasRevealFixture> {
  const canvasW = opts.canvasW ?? 768;
  const canvasH = opts.canvasH ?? 768;
  const paletteVariant = opts.paletteVariant ?? "cute";

  const [regionMapResp, svgResp] = await Promise.all([
    fetch(opts.regionMapUrl),
    fetch(opts.svgUrl),
  ]);
  if (!regionMapResp.ok)
    throw new Error(
      `region map ${regionMapResp.status} (${opts.regionMapUrl})`,
    );
  if (!svgResp.ok) throw new Error(`svg ${svgResp.status} (${opts.svgUrl})`);

  const [gzipBuf, svgText] = await Promise.all([
    regionMapResp.arrayBuffer(),
    svgResp.text(),
  ]);

  const bytes = await gunzip(gzipBuf);
  const expected = opts.regionMapWidth * opts.regionMapHeight * 2;
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

  const regionsById = new Map<number, RegionStoreRegion>();
  for (const r of opts.regionsJson.regions) regionsById.set(r.id, r);

  const regionStore: MagicRevealRegionStore = {
    width: opts.regionMapWidth,
    height: opts.regionMapHeight,
    getRegionIdAt: (x, y) => {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (
        px < 0 ||
        px >= opts.regionMapWidth ||
        py < 0 ||
        py >= opts.regionMapHeight
      )
        return 0;
      return pixelToRegion[py * opts.regionMapWidth + px];
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
    paletteVariant,
    canvasW,
    canvasH,
    factory: () => document.createElement("canvas"),
  });

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvasW;
  tempCanvas.height = canvasH;

  return {
    preColoredCanvas,
    tempCanvas,
    svgText,
    canvasW,
    canvasH,
  };
}
