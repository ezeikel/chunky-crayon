/**
 * Build the demo-reel cover JPEG — the same image the viewer sees at the
 * end of the Magic Brush sweep: line art over flat region-store fills.
 *
 * Mirrors V1's runtime canvas composite (drawing canvas + image canvas
 * with multiply blend, see `record/session.ts`). V1 captured this from
 * an actual browser canvas during the Playwright recording; V2 has no
 * Playwright session so we reconstruct it from the same inputs the
 * Remotion comp uses (regionMapUrl + regionsJson + svgUrl) but in pure
 * Node — no headless Chromium, no canvas DOM stub.
 *
 * Why not `coloredReferenceUrl`?
 *   That field stores the GPT-Image AI-rendered version of the line art,
 *   which is a stylistically different image than what gets revealed in
 *   the reel (different colour choices, different strokes/textures, lit
 *   scenes). Using it as the reel cover would show viewers a thumbnail
 *   that doesn't match the video they tap into. Region-store fills do.
 */
import sharp from "sharp";
import { gunzipSync } from "node:zlib";

type RegionStoreRegion = {
  id: number;
  palettes: Record<string, { hex: string; colorName: string }>;
};

type RegionStoreJson = {
  regions: RegionStoreRegion[];
};

type BuildCoverOptions = {
  regionMapUrl: string;
  regionMapWidth: number;
  regionMapHeight: number;
  regionsJson: RegionStoreJson;
  svgUrl: string;
  /** Palette variant key on `region.palettes` — e.g. `cute`. */
  paletteVariant: string;
  /**
   * Output canvas size. The reel renders at 768×768 magic canvas inside
   * a 1080×1920 frame; for cover we want a square thumbnail at 1024×1024
   * because that matches Pinterest pin specs and IG's preferred reel
   * cover ratio.
   */
  size?: number;
  /** JPEG quality 0-100. Default 88 mirrors V1. */
  quality?: number;
};

/**
 * Returns a JPEG buffer of the line-art-over-region-fill composite.
 * Throws on fetch / parse errors — caller decides whether to fall back.
 */
export async function buildDemoReelCover(
  opts: BuildCoverOptions,
): Promise<Buffer> {
  const size = opts.size ?? 1024;
  const quality = opts.quality ?? 88;
  const regionW = opts.regionMapWidth;
  const regionH = opts.regionMapHeight;

  // 1. Fetch region map (gzipped Uint16Array of pixel→region id) and
  //    line-art SVG concurrently.
  const [regionMapResp, svgResp] = await Promise.all([
    fetch(opts.regionMapUrl),
    fetch(opts.svgUrl),
  ]);
  if (!regionMapResp.ok) {
    throw new Error(
      `region map fetch failed: ${regionMapResp.status} ${opts.regionMapUrl}`,
    );
  }
  if (!svgResp.ok) {
    throw new Error(`svg fetch failed: ${svgResp.status} ${opts.svgUrl}`);
  }

  const [regionMapBuf, svgBuf] = await Promise.all([
    regionMapResp.arrayBuffer(),
    svgResp.arrayBuffer(),
  ]);

  // 2. Gunzip + view as Uint16Array (same shape Remotion's loadFixture uses).
  const decompressed = gunzipSync(Buffer.from(regionMapBuf));
  const expected = regionW * regionH * 2;
  if (decompressed.byteLength !== expected) {
    throw new Error(
      `region map size mismatch: got ${decompressed.byteLength}, expected ${expected}`,
    );
  }
  const pixelToRegion = new Uint16Array(
    decompressed.buffer,
    decompressed.byteOffset,
    decompressed.byteLength / 2,
  );

  // 3. Build a region-id → RGB lookup from the JSON's palette variant.
  //    Boundary regionId 0 stays unset (white in the final composite).
  const colorByRegion = new Map<number, { r: number; g: number; b: number }>();
  for (const region of opts.regionsJson.regions) {
    const palette = region.palettes?.[opts.paletteVariant];
    if (!palette?.hex) continue;
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(palette.hex);
    if (!m) continue;
    colorByRegion.set(region.id, {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16),
    });
  }

  // 4. Walk every output pixel, sample the region map at the same relative
  //    coords, write the region's palette colour. RGBA buffer because we
  //    composite the line art over it next.
  const fillBuf = Buffer.alloc(size * size * 4);
  for (let cy = 0; cy < size; cy++) {
    const ry = Math.floor((cy / size) * regionH);
    const rowStart = ry * regionW;
    for (let cx = 0; cx < size; cx++) {
      const rx = Math.floor((cx / size) * regionW);
      const rid = pixelToRegion[rowStart + rx];
      const i = (cy * size + cx) * 4;
      const rgb = rid !== 0 ? colorByRegion.get(rid) : undefined;
      if (rgb) {
        fillBuf[i] = rgb.r;
        fillBuf[i + 1] = rgb.g;
        fillBuf[i + 2] = rgb.b;
        fillBuf[i + 3] = 255;
      } else {
        // Boundary or unmapped → white, full opacity. Sharp's multiply
        // blend will let the line art show through.
        fillBuf[i] = 255;
        fillBuf[i + 1] = 255;
        fillBuf[i + 2] = 255;
        fillBuf[i + 3] = 255;
      }
    }
  }

  // 5. Rasterize the SVG to the same size, then multiply-blend over the
  //    region fill. Same recipe as V1's canvas composite — line strokes
  //    on top means the black outlines stay crisp over the colours.
  const lineArtPng = await sharp(Buffer.from(svgBuf), {
    density: 300, // crisp at 1024px target
  })
    .resize(size, size, { fit: "fill" })
    .png()
    .toBuffer();

  const composed = await sharp(fillBuf, {
    raw: { width: size, height: size, channels: 4 },
  })
    .composite([{ input: lineArtPng, blend: "multiply" }])
    .jpeg({ quality })
    .toBuffer();

  return composed;
}
