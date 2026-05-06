/**
 * Build the demo-reel STOP-SCROLL hook cover JPEG.
 *
 * Sister to `cover.ts` (the finished-colored canvas used for IG Story /
 * FB Story / Pinterest). This one is the FEED cover used by IG Reel +
 * FB feed video. It's structured as a curiosity gap:
 *   top half  → INPUT (what the user gave: prompt / photo / voice quote)
 *   bottom half → OUTCOME (the colored line-art, pixelated so the
 *                 viewer sees enough to want to tap, not enough to
 *                 spoil the resolution).
 *
 * Why not reuse cover.ts?
 *   That cover IS the resolution. Pinterest + Stories want resolution.
 *   Feed Reels want curiosity. Two different jobs, two different files.
 *
 * Compositing pipeline (mirrors content-reel/shared/cover.tsx):
 *   1. Sharp builds the OUTCOME layer (bottom half) — same line-art-
 *      over-region-fill composite as cover.ts, then pixelated 24× via
 *      downsize+nearest-upscale so it reads as deliberate mosaic.
 *   2. Satori renders the HOOK layer (top half) — gradient background,
 *      mode-specific framing, brand. SVG out.
 *   3. Sharp converts the SVG to PNG, composites top half over bottom
 *      half, encodes the whole frame as JPEG.
 *
 * Output: 1080×1920 JPEG, IG/FB feed reel cover spec.
 *
 * Per-mode top half:
 *   TEXT  → big quoted prompt (serif italic in quotes — reads as
 *           "human input", not UI label).
 *   IMAGE → user photo, cropped 1080×900, with a small "made from this
 *           photo" pill underneath.
 *   VOICE → first ~60 chars of transcript, in quotes, with a mic icon.
 *           Truncates at last word boundary, appends "…".
 */

import satori from "satori";
import sharp from "sharp";
import { gunzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { DemoReelVariant } from "@one-colored-pixel/db";

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1920;
const TOP_HALF_HEIGHT = 900; // 47% of frame; bottom half slightly bigger so the line-art "outcome" feels weighty
const BOTTOM_HALF_HEIGHT = FRAME_HEIGHT - TOP_HALF_HEIGHT;
// Pixelation factor — outcome downscaled to 1/PIXELATION before being
// upscaled back. 16 reads as "I can see what kind of thing it is, but
// not the details" at 1080 width — the curiosity-gap sweet spot.
// First pass at 24 read as "is that a blob?" — too aggressive, the
// viewer needs enough detail to want to see more.
const PIXELATION = 16;

// Module-cached fonts + brand mark. Loaded once per worker process,
// re-used across all hook-cover renders.
let tondoBold: ArrayBuffer | null = null;
let tondoRegular: ArrayBuffer | null = null;
let ccLogoDataUri: string | null = null;

async function loadFonts(): Promise<{
  tondoBold: ArrayBuffer;
  tondoRegular: ArrayBuffer;
}> {
  if (!tondoBold || !tondoRegular) {
    const fontsDir = join(process.cwd(), "public", "fonts");
    const [bold, regular] = await Promise.all([
      readFile(join(fontsDir, "tondo-bold.ttf")),
      readFile(join(fontsDir, "tondo-regular.ttf")),
    ]);
    tondoBold = bold.buffer.slice(
      bold.byteOffset,
      bold.byteOffset + bold.byteLength,
    ) as ArrayBuffer;
    tondoRegular = regular.buffer.slice(
      regular.byteOffset,
      regular.byteOffset + regular.byteLength,
    ) as ArrayBuffer;
  }
  return { tondoBold, tondoRegular };
}

/**
 * Load the C-logo SVG and return it as a data URI Satori can use as
 * an `<img src>`. The same logo file Remotion templates load via
 * staticFile(); duplicating to a data URI here avoids a separate HTTP
 * fetch from Satori at render time.
 */
async function loadCcLogoDataUri(): Promise<string> {
  if (!ccLogoDataUri) {
    const logoPath = join(
      process.cwd(),
      "public",
      "logos",
      "cc-logo-no-bg.svg",
    );
    const buf = await readFile(logoPath);
    // Satori accepts data:image/svg+xml;base64,… as <img src>. Base64
    // is more reliable than utf8 for SVGs with quotes/ampersands in
    // path data.
    ccLogoDataUri = `data:image/svg+xml;base64,${buf.toString("base64")}`;
  }
  return ccLogoDataUri;
}

/**
 * Truncate a transcript to fit comfortably on the cover.
 *
 * Strategy:
 *   1. Strip leading filler words ("um", "like", "so") — voice
 *      transcripts often start with these and they make a poor hook.
 *   2. If still over `maxChars`, find the last word boundary before
 *      maxChars and cut there + "…".
 *
 * Public so the wiring layer can preview what'll go on the cover
 * before render — useful for fallback decisions ("if extracted
 * transcript is <10 chars after cleaning, fall back to sourcePrompt").
 */
export function cleanTranscriptForCover(raw: string, maxChars = 60): string {
  let cleaned = raw.trim();
  // Strip up to 3 leading filler words. Common in toddler-voice utterances:
  // "um, can you make a bunny" → "can you make a bunny".
  const fillers = /^(um+|uh+|like|so|well|okay|ok|hmm+)[,\s]+/i;
  for (let i = 0; i < 3; i++) {
    const next = cleaned.replace(fillers, "");
    if (next === cleaned) break;
    cleaned = next.trim();
  }
  if (cleaned.length <= maxChars) return cleaned;
  // Word-boundary truncation. -1 leaves room for the "…" we append.
  const sliced = cleaned.slice(0, maxChars - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const cutAt = lastSpace > 20 ? lastSpace : maxChars - 1;
  return cleaned.slice(0, cutAt).trimEnd() + "…";
}

type RegionStoreRegion = {
  id: number;
  palettes: Record<string, { hex: string; colorName: string }>;
};

type RegionStoreJson = {
  regions: RegionStoreRegion[];
};

type BuildHookCoverOptions = {
  variant: DemoReelVariant;
  /** TEXT variant: the user-facing prompt (e.g. row.sourcePrompt). */
  prompt?: string | null;
  /** IMAGE variant: URL of the user-supplied photo. */
  inputPhotoUrl?: string | null;
  /** VOICE variant: raw transcript; will be cleaned/truncated. */
  transcript?: string | null;
  // Outcome inputs — mirror the cover.ts signature so the worker can
  // pass them straight through.
  regionMapUrl: string;
  regionMapWidth: number;
  regionMapHeight: number;
  regionsJson: RegionStoreJson;
  svgUrl: string;
  paletteVariant: string;
  /** JPEG quality 0-100. Default 88 mirrors the resolution cover. */
  quality?: number;
};

/**
 * Render a JPEG buffer of the input→blurred-outcome stop-scroll cover.
 * Returns the buffer; caller uploads to R2 and writes
 * demoReelHookCoverUrl on the row.
 */
export async function buildDemoReelHookCover(
  opts: BuildHookCoverOptions,
): Promise<Buffer> {
  const quality = opts.quality ?? 88;

  // 1. Build the OUTCOME layer (bottom half of the frame). Same recipe
  //    as cover.ts but pixelated. We render at the bottom-half width
  //    (1080) but compute the line-art at 1024² and crop/scale, since
  //    that's what cover.ts proved works for region-store fills.
  const outcomeJpeg = await buildPixelatedOutcome(opts);

  // 2. Build the HOOK layer (top half of the frame) via Satori.
  const hookSvg = await buildHookSvg(opts);
  const hookPng = await sharp(Buffer.from(hookSvg))
    .resize(FRAME_WIDTH, TOP_HALF_HEIGHT, { fit: "fill" })
    .png()
    .toBuffer();

  // 3. Stack: bottom half is the outcome, top half is the hook. Sharp
  //    composites with absolute positioning so we don't need to glue
  //    images via concat.
  const composed = await sharp({
    create: {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: outcomeJpeg, top: TOP_HALF_HEIGHT, left: 0 },
      { input: hookPng, top: 0, left: 0 },
    ])
    .jpeg({ quality })
    .toBuffer();

  return composed;
}

/**
 * Build the bottom-half outcome — line-art over palette fills, then
 * pixelated. Same fill+composite logic as cover.ts; the pixelation is
 * what makes this an outcome TEASER not an outcome REVEAL.
 */
async function buildPixelatedOutcome(
  opts: BuildHookCoverOptions,
): Promise<Buffer> {
  const regionW = opts.regionMapWidth;
  const regionH = opts.regionMapHeight;
  const targetW = FRAME_WIDTH;
  const targetH = BOTTOM_HALF_HEIGHT;

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

  // Render the fill to a 1024² square first (same as cover.ts), then
  // resize to 1080×BOTTOM_HALF_HEIGHT later. The 1024² intermediate
  // matches the line-art SVG's natural aspect.
  const interimSize = 1024;
  const fillBuf = Buffer.alloc(interimSize * interimSize * 4);
  for (let cy = 0; cy < interimSize; cy++) {
    const ry = Math.floor((cy / interimSize) * regionH);
    const rowStart = ry * regionW;
    for (let cx = 0; cx < interimSize; cx++) {
      const rx = Math.floor((cx / interimSize) * regionW);
      const rid = pixelToRegion[rowStart + rx];
      const i = (cy * interimSize + cx) * 4;
      const rgb = rid !== 0 ? colorByRegion.get(rid) : undefined;
      if (rgb) {
        fillBuf[i] = rgb.r;
        fillBuf[i + 1] = rgb.g;
        fillBuf[i + 2] = rgb.b;
        fillBuf[i + 3] = 255;
      } else {
        fillBuf[i] = 255;
        fillBuf[i + 1] = 255;
        fillBuf[i + 2] = 255;
        fillBuf[i + 3] = 255;
      }
    }
  }

  const lineArtPng = await sharp(Buffer.from(svgBuf), { density: 300 })
    .resize(interimSize, interimSize, { fit: "fill" })
    .png()
    .toBuffer();

  const composedSquare = await sharp(fillBuf, {
    raw: { width: interimSize, height: interimSize, channels: 4 },
  })
    .composite([{ input: lineArtPng, blend: "multiply" }])
    .png()
    .toBuffer();

  // Pixelate. Sharp's pipeline only honours the LAST resize() call, so
  // we have to split this across separate pipelines:
  //   1) crop+scale composedSquare to targetW×targetH
  //   2) downsample to tinyW×tinyH (this is what destroys the detail)
  //   3) upscale back to targetW×targetH with nearest-neighbour
  // Steps 2+3 in one pipeline collapse to a single resize → no
  // pixelation. Step 2 must complete (intermediate buffer) before
  // step 3 starts.
  const tinyW = Math.max(8, Math.round(targetW / PIXELATION));
  const tinyH = Math.max(8, Math.round(targetH / PIXELATION));

  const cropped = await sharp(composedSquare)
    .resize(targetW, targetH, { fit: "cover" })
    .png()
    .toBuffer();

  const tiny = await sharp(cropped)
    .resize(tinyW, tinyH, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer();

  const pixelated = await sharp(tiny)
    .resize(targetW, targetH, { fit: "fill", kernel: "nearest" })
    .jpeg({ quality: 80 })
    .toBuffer();

  return pixelated;
}

/**
 * Build the top-half hook SVG via Satori. The mode discriminant picks
 * the layout. All three layouts share the brand strip + "tap to see"
 * affordance to keep the cover recognisable as a Chunky Crayon thing.
 */
async function buildHookSvg(opts: BuildHookCoverOptions): Promise<string> {
  const { tondoBold, tondoRegular } = await loadFonts();
  const ccLogo = await loadCcLogoDataUri();

  const cream = "#fff7ed";
  const inkDark = "#2a1a0a";

  const brandStrip = {
    display: "flex",
    width: "100%",
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 60,
    paddingRight: 60,
    alignItems: "center",
    justifyContent: "space-between",
  } as const;

  // Bolder, fuller-opacity tap affordance — was getting lost at 0.55.
  // Reads as a confident CTA at full strength; the brand-mark on the
  // left already gives the strip its visual anchor so we don't need
  // tap-to-watch hiding in the corner.
  const tapAffordance = {
    display: "flex",
    fontFamily: "Tondo Bold",
    fontSize: 28,
    color: inkDark,
    letterSpacing: 3,
  } as const;

  const inner = pickInnerForVariant(opts);

  const root = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: FRAME_WIDTH,
        height: TOP_HALF_HEIGHT,
        background: cream,
      },
      children: [
        {
          type: "div",
          props: {
            style: brandStrip,
            children: [
              // C logo (SVG → data URI). Replaces the wordmark; recognition
              // cue without competing with the hook text. Sized to match
              // the visual weight of the TAP TO WATCH label on the right.
              {
                type: "img",
                props: {
                  src: ccLogo,
                  width: 64,
                  height: 64,
                  style: {
                    width: 64,
                    height: 64,
                  },
                },
              },
              {
                type: "div",
                props: { style: tapAffordance, children: "TAP TO WATCH" },
              },
            ],
          },
        },
        // The variant-specific block fills the rest of the top half.
        inner,
      ],
    },
  };

  return satori(root as unknown as React.ReactElement, {
    width: FRAME_WIDTH,
    height: TOP_HALF_HEIGHT,
    fonts: [
      { name: "Tondo Bold", data: tondoBold, weight: 700, style: "normal" },
      {
        name: "Tondo Regular",
        data: tondoRegular,
        weight: 400,
        style: "normal",
      },
    ],
  });
}

function pickInnerForVariant(opts: BuildHookCoverOptions): unknown {
  switch (opts.variant) {
    case "TEXT":
      return innerText(opts.prompt ?? "");
    case "IMAGE":
      return innerImage(opts.inputPhotoUrl ?? "");
    case "VOICE":
      return innerVoice(opts.transcript ?? "");
    default:
      return innerText(opts.prompt ?? "");
  }
}

/**
 * TEXT variant: big quoted prompt, serif-italic-ish styling. Tondo
 * isn't a serif but the quote-marks + italic-leaning weight do the
 * "human input" framing well enough that we don't need to ship another
 * font.
 */
function innerText(prompt: string): unknown {
  const cleaned = (prompt || "a coloring page").trim();
  // Auto-shrink driven by char-length-vs-line-width estimate. Tondo
  // Bold averages ~0.55em per char in Satori's renderer; with
  // max-width 880px after horizontal padding, a single line at
  // fontSize=N fits roughly `880 / (N * 0.55)` chars. Solving for
  // common prompt lengths:
  //   ≤16 chars  → 100 (single line, "a running puppy" comfortably)
  //   ≤24 chars  → 80  (single line for typical "kid + adjective" prompts)
  //   ≤40 chars  → 64  (allows one wrap if needed)
  //   ≤80 chars  → 50  (multi-line, still legible at thumbnail)
  //   else        → 40  (long-form prompts — wraps to ~3 lines)
  const len = cleaned.length;
  // Tondo Bold averages ~0.62em/char in Satori (wider than the Helvetica
  // baseline I'd estimated). Ramped these down so single-line prompts
  // actually fit on one line at the chosen size — "a running puppy" (15
  // chars) at 100px wraps; at 78 it doesn't.
  const fontSize =
    len <= 12 ? 100 : len <= 18 ? 78 : len <= 28 ? 62 : len <= 50 ? 50 : 40;

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 80,
        paddingRight: 80,
        paddingTop: 40,
        paddingBottom: 40,
        textAlign: "center",
        // Full-bleed warm tint so the bottom edge of the hook flush-
        // meets the pixelated outcome. Earlier draft had marginLeft/
        // Right + marginBottom + borderRadius which left visible gaps
        // around all sides of the card.
        background: "#fdebd3",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontFamily: "Tondo Bold",
              fontSize: 30,
              color: "#c4721a",
              marginBottom: 32,
              letterSpacing: 4,
              textTransform: "uppercase",
            },
            // No "PROMPT" framing — calls out the AI scaffolding. "FROM
            // THESE WORDS" mirrors the IMAGE variant's "FROM THIS PHOTO"
            // structurally, framing the input as a creative starting
            // point rather than a model query.
            children: "from these words",
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "block",
              fontFamily: "Tondo Bold",
              fontSize,
              color: "#2a1a0a",
              lineHeight: 1.1,
              maxWidth: 880,
              textAlign: "center",
            },
            children: `“${cleaned}”`,
          },
        },
      ],
    },
  };
}

/**
 * IMAGE variant: photo dominates the top half. Pill below says "made
 * from this photo" so the curiosity gap is explicit.
 */
function innerImage(photoUrl: string): unknown {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 16,
        paddingBottom: 16,
      },
      children: [
        {
          type: "img",
          props: {
            src: photoUrl,
            width: 760,
            height: 620,
            style: {
              width: 760,
              height: 620,
              objectFit: "cover",
              borderRadius: 32,
              border: "8px solid #ff6b35",
            },
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              marginTop: 24,
              fontFamily: "Tondo Bold",
              fontSize: 30,
              color: "#c4721a",
              letterSpacing: 4,
              textTransform: "uppercase",
            },
            // No → glyph — Satori's font subset doesn't reliably
            // ship Unicode arrows. Keep the framing in the words.
            children: "from this photo",
          },
        },
      ],
    },
  };
}

/**
 * VOICE variant: cleaned transcript in quotes, mic icon to telegraph
 * "this was spoken". Mic is a unicode glyph — keeps Satori happy
 * without a glyph atlas.
 */
function innerVoice(rawTranscript: string): unknown {
  const cleaned = cleanTranscriptForCover(
    rawTranscript || "a fun thing to color",
  );
  // Voice transcripts get cleaned + truncated to ≤60 chars, so the
  // ramp here is shorter than TEXT. Same line-fit math.
  const len = cleaned.length;
  // Same ramp as TEXT after empirical tuning.
  const fontSize =
    len <= 12 ? 96 : len <= 18 ? 76 : len <= 28 ? 60 : len <= 50 ? 48 : 38;

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 80,
        paddingRight: 80,
        paddingTop: 40,
        paddingBottom: 40,
        textAlign: "center",
        // Full-bleed rose tint — distinguishes from TEXT's warm-amber
        // tint in side-by-side digests. No margin/borderRadius so the
        // bottom edge meets the pixelated outcome flush.
        background: "#fce5d9",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontFamily: "Tondo Bold",
              fontSize: 30,
              color: "#b03a2e",
              marginBottom: 32,
              letterSpacing: 4,
              textTransform: "uppercase",
            },
            // No glyphs at all in the Tondo subset — even ★ rendered
            // as a tofu box. Pure text label keeps it bulletproof.
            children: "said out loud",
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "block",
              fontFamily: "Tondo Bold",
              fontSize,
              color: "#2a1a0a",
              lineHeight: 1.1,
              maxWidth: 880,
              textAlign: "center",
            },
            children: `“${cleaned}”`,
          },
        },
      ],
    },
  };
}
