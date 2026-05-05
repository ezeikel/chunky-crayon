/**
 * Build the content-reel cover JPEG via Satori (HTML→SVG) + Sharp (SVG→JPEG).
 *
 * Why not Remotion's `renderStill()`?
 *   The reel frame is a moving target — number scale animates in via spring,
 *   plasma shader runs on a `frame / fps` uniform, light-leak fades during
 *   the reveal. `renderStill(frame=N)` would couple the cover to a specific
 *   frame number that drifts every time a beat changes. A Satori cover is a
 *   stable still that visually echoes the reel without re-running the whole
 *   composition pipeline (fonts, GLSL, light-leak, audio routing) just for
 *   one PNG. It also runs in pure Node — no headless Chromium, no Remotion
 *   render server — which matters for the cron path.
 *
 * Why a teaser, not a reveal?
 *   The cover that platforms show before the user taps play needs to make
 *   them WANT to tap. If we put the centre block on the cover, the
 *   punchline is delivered without a play, the watch-rate tanks, the
 *   algorithm down-ranks. So this layout is hook-forward, with the centre
 *   block present but pixelated — "you can see something's there, you
 *   can't read it yet". Source pill stays (credibility) but no payoff
 *   text — the payoff is the reward for the play.
 *
 * Compositing pipeline:
 *   1. Satori renders the BASE layer — gradient, hook, source pill, brand.
 *      Centre is empty space where the number will land.
 *   2. Satori renders the NUMBER layer separately on a transparent canvas
 *      (just the number with chromatic-aberration channels).
 *   3. Sharp pixelates the number layer: downsize to ~40px, upscale back
 *      to full size with nearest-neighbour kernel. Reads as a deliberate
 *      pixel-mosaic, not a Gaussian blur (which can read as "broken image").
 *   4. Sharp composites the pixelated number onto the base, then encodes
 *      the whole frame as JPEG.
 *
 * Output: 1080×1920 JPEG, the same aspect platforms expect for reel covers
 * (`cover_url` on IG, `cover_image_url` on Pinterest, `thumb` on FB).
 *
 * @see apps/chunky-crayon-web/components/social/FactCard.tsx for the
 *      original Satori-in-this-repo reference.
 */

import satori from "satori";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ContentReel, ContentReelTemplate } from "./types";

// Module-cached fonts. Load-once amortises a few hundred ms across the
// per-day cron path that calls this for every reel published.
let tondoBold: ArrayBuffer | null = null;
let tondoRegular: ArrayBuffer | null = null;

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
 * Per-template palette. Mirrors the GLSL plasma palettes in each spike
 * template so the cover's tone matches what the viewer sees in the reel.
 *
 * Hex (not HSL) because Satori's CSS subset is happiest with hex / rgb().
 */
const TEMPLATE_PALETTES: Record<
  ContentReelTemplate,
  {
    bgFrom: string;
    bgTo: string;
    numberPrimary: string;
    numberAberrationLeft: string;
    numberAberrationRight: string;
    text: string;
    textMuted: string;
    sourceBg: string;
    /** Tap-to-see pill colour — matches the template's brand anchor. */
    teaserPill: string;
    teaserPillText: string;
  }
> = {
  // Shock — orange-dark anchor + pink/teal aberration over warm cream→orange
  shock: {
    bgFrom: "#FAF6F1",
    bgTo: "#FFD4B8",
    numberPrimary: "#D45A1F",
    numberAberrationLeft: "#D85A7A",
    numberAberrationRight: "#E89A6A",
    text: "#3A3533",
    textMuted: "#6B6662",
    sourceBg: "rgba(255, 255, 255, 0.7)",
    teaserPill: "#D45A1F",
    teaserPillText: "#FFFFFF",
  },
  // Warm — pink-dark anchor over yellow→green soft pastel
  warm: {
    bgFrom: "#FFF5E6",
    bgTo: "#E8F0D8",
    numberPrimary: "#D85A7A",
    numberAberrationLeft: "#E89A4F",
    numberAberrationRight: "#A38ABA",
    text: "#3A3533",
    textMuted: "#6B6662",
    sourceBg: "rgba(255, 255, 255, 0.7)",
    teaserPill: "#D85A7A",
    teaserPillText: "#FFFFFF",
  },
  // Quiet — purple-dark anchor over sky→lavender
  quiet: {
    bgFrom: "#F5F0FF",
    bgTo: "#E8DCFF",
    numberPrimary: "#7E5AA8",
    numberAberrationLeft: "#D38AB0",
    numberAberrationRight: "#7AB8C9",
    text: "#3A3533",
    textMuted: "#6B6662",
    sourceBg: "rgba(255, 255, 255, 0.7)",
    teaserPill: "#7E5AA8",
    teaserPillText: "#FFFFFF",
  },
};

const COVER_WIDTH = 1080;
const COVER_HEIGHT = 1920;

// Number layer dimensions — taller than wide so descenders / accents fit.
// Lives in the centre of the frame; the base layer leaves this region
// empty so the pixelated number reads cleanly without overlap.
const NUMBER_LAYER_WIDTH = 900;
const NUMBER_LAYER_HEIGHT = 500;
const NUMBER_LAYER_X = Math.round((COVER_WIDTH - NUMBER_LAYER_WIDTH) / 2);
const NUMBER_LAYER_Y = 760; // visually centred between hook and source pill

// Pixelate strength — downscale target. Smaller = more aggressive blocks.
// 18 produces clearly-visible chunky pixel squares (~50px each at the
// 900px output width). Tested against the Quiet template's smaller
// 200px-font number — at 24 the digits were still legible because the
// silhouette stayed defined; 18 obscures all three templates equally.
const PIXELATE_TARGET_WIDTH = 18;

type BuildContentReelCoverOptions = {
  reel: ContentReel;
  template: ContentReelTemplate;
  /** Output JPEG quality 0-100. Default 88 mirrors demo-reel cover. */
  quality?: number;
};

/**
 * Returns a 1080×1920 JPEG buffer of the content-reel cover. Throws on
 * Satori / Sharp failure — the caller decides whether to fall back to
 * a default cover or skip cover-setting on the platform call entirely.
 */
export async function buildContentReelCover(
  opts: BuildContentReelCoverOptions,
): Promise<Buffer> {
  const { reel, template } = opts;
  const quality = opts.quality ?? 88;
  const palette = TEMPLATE_PALETTES[template];
  const fonts = await loadFonts();

  // Auto-size the centre block — same logic as the reel's reveal frame,
  // sized so 4-char ("-15%") through 6-char ("7+ hrs") strings all fit
  // cleanly on one line. The pixelate pass compresses sub-character
  // detail anyway, but we still want the silhouette to be roughly the
  // same scale as the eventual reel reveal so the cover and the play
  // are visually continuous.
  //
  // Phase A2 note: the auto-size table is calibrated for stat-kind
  // numeric strings. Fact/tip/myth phrasing may need different scaling
  // — handled when those kinds get their own reveal-beat treatment.
  const blockLen = reel.centerBlock.length;
  const numberFontSize =
    blockLen <= 3 ? 360 : blockLen <= 4 ? 280 : blockLen <= 6 ? 220 : 180;
  const aberrationOffset = Math.round(numberFontSize * 0.025);

  const fontConfig = [
    {
      name: "Tondo",
      data: fonts.tondoRegular,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Tondo",
      data: fonts.tondoBold,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];

  // ── Base layer ──────────────────────────────────────────────────────
  // Background gradient + hook + source pill + brand. Centre region is
  // intentionally empty so the pixelated number layer composites in
  // cleanly without pushing other elements around.
  const baseSvg = await satori(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        backgroundImage: `linear-gradient(180deg, ${palette.bgFrom} 0%, ${palette.bgTo} 100%)`,
        padding: 80,
        fontFamily: "Tondo",
      }}
    >
      {/* Hook — top of the frame. The teaser cover leans on this hard:
          if the line doesn't make the user want to know the centre block,
          the pixelated mosaic won't save it. Prefer `coverTeaser` (the
          question-shaped string Claude generates at write-time) over the
          declarative `hook` — the cover and the reel intentionally use
          different framings, since the reel's voiceover narrates the
          declarative line and the cover needs to provoke a tap. */}
      <div
        style={{
          display: "flex",
          fontFamily: "Tondo",
          fontWeight: 700,
          fontSize: 64,
          lineHeight: 1.1,
          color: palette.text,
          marginTop: 80,
        }}
      >
        {reel.coverTeaser ?? reel.hook}
      </div>

      {/* Spacer pushes everything below to the bottom; the number layer
          composites in over the empty middle region. */}
      <div style={{ display: "flex", flex: 1 }} />

      {/* Tap-to-see pill — sits BELOW where the pixelated number will land,
          tells the viewer the obscured block is a deliberate "press play
          to find out" hook, not a broken thumbnail. The pill colour
          matches the template's anchor so it ties the page together. The
          play triangle is a CSS shape (border trick), not a unicode glyph
          — Tondo doesn't include U+25B6 and Satori renders missing
          glyphs as tofu. */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: palette.teaserPill,
            color: palette.teaserPillText,
            paddingTop: 18,
            paddingBottom: 18,
            paddingLeft: 36,
            paddingRight: 36,
            borderRadius: 9999,
            fontFamily: "Tondo",
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: 0.5,
          }}
        >
          {/* Inline SVG triangle — Satori supports basic SVG; the CSS
              border-trick triangle didn't survive Sharp's rasterisation
              (renders as a small square). */}
          <svg
            width={28}
            height={28}
            viewBox="0 0 28 28"
            style={{ marginRight: 14 }}
          >
            <polygon points="6,4 24,14 6,24" fill={palette.teaserPillText} />
          </svg>
          Tap to see the number
        </div>
      </div>

      {/* Source pill — frosted-glass over the gradient, anchors credibility.
          Stays on the cover even though we hide the centre block, because
          the source name signals "this is research, not noise". Skipped
          for tips, where `sourceTitle` is optional — they read as advice,
          not findings, and a "Source" label reads weird without one. */}
      {reel.sourceTitle ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: palette.sourceBg,
            borderRadius: 24,
            paddingTop: 20,
            paddingBottom: 20,
            paddingLeft: 32,
            paddingRight: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Tondo",
              fontWeight: 400,
              fontSize: 24,
              color: palette.textMuted,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Source
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Tondo",
              fontWeight: 700,
              fontSize: 28,
              color: palette.text,
              textAlign: "center",
            }}
          >
            {reel.sourceTitle}
          </div>
        </div>
      ) : null}

      {/* Brand wordmark — tiny, bottom of frame. The reel's logo reveal
          carries the brand moment in motion; the cover is a still so a
          subtle wordmark suffices. */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontFamily: "Tondo",
          fontWeight: 700,
          fontSize: 28,
          color: palette.numberPrimary,
          letterSpacing: -0.5,
          marginTop: 40,
        }}
      >
        chunkycrayon.com
      </div>
    </div>,
    { width: COVER_WIDTH, height: COVER_HEIGHT, fonts: fontConfig },
  );

  // ── Number layer (transparent) ──────────────────────────────────────
  // Just the chromatic-aberration number block on a transparent canvas.
  // We render it at full size, then Sharp pixelates it before composite.
  const numberSvg = await satori(
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        width: NUMBER_LAYER_WIDTH,
        height: NUMBER_LAYER_HEIGHT,
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Tondo",
          fontWeight: 700,
          fontSize: numberFontSize,
          color: palette.numberAberrationLeft,
          opacity: 0.85,
          whiteSpace: "nowrap",
          transform: `translateX(${-aberrationOffset}px)`,
        }}
      >
        {reel.centerBlock}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Tondo",
          fontWeight: 700,
          fontSize: numberFontSize,
          color: palette.numberAberrationRight,
          opacity: 0.85,
          whiteSpace: "nowrap",
          transform: `translateX(${aberrationOffset}px)`,
        }}
      >
        {reel.centerBlock}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Tondo",
          fontWeight: 700,
          fontSize: numberFontSize,
          color: palette.numberPrimary,
          whiteSpace: "nowrap",
        }}
      >
        {reel.centerBlock}
      </div>
    </div>,
    {
      width: NUMBER_LAYER_WIDTH,
      height: NUMBER_LAYER_HEIGHT,
      fonts: fontConfig,
    },
  );

  // Pixelate the number layer in two passes via an intermediate buffer.
  // Sharp can't reliably chain resize-down then resize-up on SVG input
  // in a single pipeline (it folds the resizes against the source SVG
  // viewport, producing a sharp output). Going through a small PNG
  // forces the second resize to operate on the rasterised low-res
  // bitmap, so the nearest-neighbour upscale produces hard pixel blocks.
  const tinyNumberPng = await sharp(Buffer.from(numberSvg))
    .resize(PIXELATE_TARGET_WIDTH, undefined, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  const pixelatedNumberPng = await sharp(tinyNumberPng)
    .resize(NUMBER_LAYER_WIDTH, NUMBER_LAYER_HEIGHT, {
      kernel: "nearest",
      fit: "fill",
    })
    .png()
    .toBuffer();

  // ── Composite: base + pixelated number → JPEG ───────────────────────
  const composed = await sharp(Buffer.from(baseSvg))
    .composite([
      {
        input: pixelatedNumberPng,
        top: NUMBER_LAYER_Y,
        left: NUMBER_LAYER_X,
      },
    ])
    .jpeg({ quality })
    .toBuffer();

  return composed;
}
