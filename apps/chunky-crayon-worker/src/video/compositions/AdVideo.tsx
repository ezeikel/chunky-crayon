import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { measureText } from "@remotion/layout-utils";
import { useMemo } from "react";
import { RoughGenerator } from "roughjs/bin/generator";
import { TONDO_FONT_CSS_URL } from "../fonts";

// ==========================================================================
// Types — mirror lib/ads/schema.ts from the web app. Keep in sync.
// ==========================================================================

export type AdSceneKind =
  | "text-reveal"
  | "phone-mockup"
  | "line-art-draw"
  | "brand-outro"
  | "broll";

export type AdScene = {
  start: number;
  duration: number;
  label: string;
  kind: AdSceneKind;
  caption?: string;
  broll?: {
    prompt: string;
    imageUrl?: string;
    clipDuration: 5 | 10;
  };
};

/**
 * Per-platform aspect ratios. `stories` matches Seedance's native i2v
 * output (1080×1920) so b-roll plays full-bleed. `meta-feed` is Meta's
 * tallest non-9:16 placement spec (4:5 = 1080×1350) — required for the
 * mobile feed + Explore + Profile placements that mask 9:16 video.
 *
 * Adding a new format = one row in VIDEO_DIMS + a Composition entry in
 * Root.tsx + a FORMATS row in scripts/render-ad-videos.ts. The scene
 * components scale around the format prop automatically.
 */
export type AdVideoFormat = "stories" | "meta-feed";

export const VIDEO_DIMS: Record<AdVideoFormat, { w: number; h: number }> = {
  stories: { w: 1080, h: 1920 },
  "meta-feed": { w: 1080, h: 1350 },
};

export const getVideoDims = (format: AdVideoFormat) => VIDEO_DIMS[format];

export type AdVideoProps = {
  /** Campaign id — used for the asset filename lookups. */
  campaignId: string;
  /**
   * Which platform this render targets. Drives the canvas dimensions
   * and the proportional sizing inside each scene. Defaults to `stories`
   * (9:16) since that's where most of our impressions live.
   */
  format?: AdVideoFormat;
  /** Kid-quote / pain-point headline. Used by text-reveal scenes. */
  headline: string;
  /** Optional subhead under the headline. Used by text-reveal scenes. */
  subhead?: string;
  /** CTA button text. Used by brand-outro scene. */
  cta: string;
  /** URL to the brand logo svg (no-bg variant). */
  logoUrl: string;
  /** URL to the coloring page webp (used by line-art-draw + phone-mockup). */
  lineArtUrl: string;
  /** URL to colored variant — used by brand-outro + phone-mockup for cross-fade. */
  coloredUrl?: string;
  /** URLs for each broll scene in order (empty if scene is not broll). */
  brollUrls: Record<number, string>;
  /** Music track url. */
  musicUrl: string;
  /**
   * Optional transition whoosh SFX URLs — one per scene boundary. The
   * render pipeline picks a random one from the pool per boundary so
   * back-to-back transitions sound varied.
   * Sourced from Epidemic Sound via PTP's library, stored in R2.
   */
  transitionSfxUrls?: string[];
  /** Scene list from campaign.video.scenes. */
  scenes: AdScene[];
};

// ==========================================================================
// Brand tokens — duplicated from /dev/ads primitives. Keep in sync.
// ==========================================================================

const CC = {
  orange: "hsl(12 75% 58%)",
  orangeDark: "hsl(12 72% 48%)",
  pink: "hsl(355 65% 72%)",
  yellow: "hsl(42 95% 62%)",
  yellowDark: "hsl(38 85% 50%)",
  green: "hsl(85 35% 52%)",
  surface: "#FDF6E3",
  ink: "#2a1d10",
  muted: "#6b5a47",
} as const;

const TONDO = "Tondo, ui-rounded, system-ui, sans-serif";
// Rooney Sans isn't shipped in the worker's fonts — use Tondo regular for
// body copy too. Good enough visually for 15s ads.
const ROONEY = "Tondo, ui-rounded, system-ui, sans-serif";

// ==========================================================================
// Shared primitives
// ==========================================================================

function ChunkyCta({
  text,
  startFrame = 0,
}: {
  text: string;
  startFrame?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring entrance, delayed to startFrame so the outro can sequence
  // coloured page → logo → CTA → URL underline instead of everything
  // landing at once.
  const scale = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 10, mass: 0.8, stiffness: 200 },
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 72px",
        background: CC.orange,
        color: "#fff",
        fontFamily: TONDO,
        fontWeight: 700,
        fontSize: 72,
        letterSpacing: "-0.01em",
        borderRadius: 48,
        boxShadow: `0 14px 0 0 ${CC.orangeDark}`,
        lineHeight: 1,
      }}
    >
      {text}
    </div>
  );
}

// Word-stagger reveal with spring physics. Each word rises from below and
// bounces into place — subtle overshoot + settle, matches the brand's
// "chunky" button physics. Keeps natural line wrapping.
function StaggerText({
  text,
  fontSize = 96,
  color = CC.ink,
  lineHeight = 1.02,
  maxWidth = 900,
  startFrame = 0,
  perWordFrames = 3,
  font = TONDO,
  fontWeight = 700,
}: {
  text: string;
  fontSize?: number;
  color?: string;
  lineHeight?: number;
  maxWidth?: number;
  startFrame?: number;
  perWordFrames?: number;
  font?: string;
  fontWeight?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Split on whitespace but keep it as tokens so layout reflows naturally.
  const tokens = text.split(/(\s+)/);

  return (
    <div
      style={{
        fontFamily: font,
        fontWeight,
        fontSize,
        color,
        lineHeight,
        maxWidth,
        letterSpacing: "-0.02em",
      }}
    >
      {tokens.map((token, i) => {
        // Skip whitespace tokens — render them inline without animation.
        if (/^\s+$/.test(token)) {
          return <span key={i}>{token}</span>;
        }
        const wordIndex = tokens
          .slice(0, i)
          .filter((t) => !/^\s+$/.test(t)).length;
        const tokenFrame = startFrame + wordIndex * perWordFrames;

        // Spring-bounce entrance per word. damping:12 + stiffness:120 gives
        // a small overshoot that reads as playful without being silly.
        const s = spring({
          frame: frame - tokenFrame,
          fps,
          config: { damping: 12, mass: 0.9, stiffness: 120 },
          durationInFrames: 20,
        });
        const opacity = Math.min(1, Math.max(0, s));
        const translateY = (1 - s) * 32;
        const scale = 0.92 + s * 0.08;

        return (
          <span
            key={i}
            style={{
              opacity,
              display: "inline-block",
              transform: `translateY(${translateY}px) scale(${scale})`,
              transformOrigin: "center bottom",
            }}
          >
            {token}
          </span>
        );
      })}
    </div>
  );
}

// ==========================================================================
// Scene renderers
// ==========================================================================

/**
 * Auto-size a headline so it fits comfortably within maxWidth. Starts at a
 * target size and shrinks by 6px increments until the longest word fits.
 * Used by TextRevealScene so short headlines read as big + short ones
 * don't overflow.
 */
function autoHeadlineSize(
  text: string,
  maxWidth: number,
  targetSize = 108,
  minSize = 56,
): number {
  const words = text.split(/\s+/).filter(Boolean);
  const longest = words.reduce(
    (acc, w) => (w.length > acc.length ? w : acc),
    "",
  );
  for (let size = targetSize; size >= minSize; size -= 6) {
    const { width } = measureText({
      text: longest,
      fontFamily: "Tondo, ui-rounded, system-ui, sans-serif",
      fontSize: size,
      fontWeight: "700",
      letterSpacing: "-0.02em",
    });
    if (width <= maxWidth) return size;
  }
  return minSize;
}

function TextRevealScene({
  caption,
  background,
  color,
  subhead,
  format,
}: {
  caption: string;
  background: string;
  color: string;
  /** Deprecated: underline sweep was dropped. Kept for backward compat. */
  highlightColor?: string;
  subhead?: string;
  format: AdVideoFormat;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { w: canvasWidth } = getVideoDims(format);
  // Headline width = canvas width minus 80px padding each side.
  // 1080w → 920, 1080w (4:5) → 920 same, but keeps the formula honest if
  // we add a narrower format like square later.
  const maxLineWidth = canvasWidth - 160;
  const headlineSize = autoHeadlineSize(caption, maxLineWidth);

  // Subhead springs in after the headline has mostly landed — 0.6s at 24fps
  // = frame 14 per word × ~12 words typical. So start at frame 28 (≈1.2s).
  const subheadSpring = spring({
    frame: frame - 28,
    fps,
    config: { damping: 14, mass: 0.7, stiffness: 100 },
    durationInFrames: 18,
  });
  const subheadOpacity = Math.min(1, Math.max(0, subheadSpring));
  const subheadY = (1 - subheadSpring) * 16;

  return (
    <AbsoluteFill
      style={{
        background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 80,
        gap: 56,
      }}
    >
      <StaggerText
        text={caption}
        color={color}
        fontSize={headlineSize}
        lineHeight={1.06}
        maxWidth={maxLineWidth}
        perWordFrames={3}
      />
      {subhead && (
        <div
          style={{
            fontFamily: TONDO,
            fontWeight: 500,
            fontSize: 42,
            lineHeight: 1.28,
            color,
            maxWidth: maxLineWidth - 40,
            opacity: subheadOpacity * 0.85,
            transform: `translateY(${subheadY}px)`,
          }}
        >
          {subhead}
        </div>
      )}
    </AbsoluteFill>
  );
}

function LineArtDrawScene({
  svgUrl,
  caption,
  format,
}: {
  svgUrl: string;
  caption: string;
  format: AdVideoFormat;
}) {
  const frame = useCurrentFrame();
  const { h: canvasHeight } = getVideoDims(format);
  // Card scales with canvas height — was 720 on a 1920 canvas (~37.5%).
  // On 4:5 / 1350 that gives ~506, which leaves room for the caption
  // below without crowding the bottom edge.
  const cardSize = Math.round(canvasHeight * 0.375);
  // Fake a draw-on effect: fade+scale the image in, caption overlays at end
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 30], [0.92, 1], {
    extrapolateRight: "clamp",
  });
  // Note: true stroke-reveal requires loading SVG inline and animating
  // stroke-dashoffset. For now, fade+scale reveal — swap later if this
  // feels too simple.
  return (
    <AbsoluteFill
      style={{
        background: CC.surface,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 48,
      }}
    >
      <div
        style={{
          width: cardSize,
          height: cardSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <Img
          src={svgUrl}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      {/* Headline timing: scene is 3s = 72 frames @ 24fps. Each word's
          spring takes 20 frames to settle. With startFrame=25 and
          perWordFrames=3, last of 6 words starts at frame 40 and settles
          at frame 60 — leaving ~0.5s read time before the b-roll cut. */}
      <StaggerText
        text={caption}
        color={CC.ink}
        fontSize={56}
        startFrame={25}
        perWordFrames={3}
      />
    </AbsoluteFill>
  );
}

function PhoneMockupScene({
  lineArtUrl,
  coloredUrl,
  durationSeconds,
  format,
}: {
  lineArtUrl: string;
  coloredUrl?: string;
  durationSeconds: number;
  format: AdVideoFormat;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { h: canvasHeight } = getVideoDims(format);
  // Phone scales with canvas height. Originally 720×1200 on a 1920 canvas
  // (~62.5% height, 0.6 aspect). Keeping the 0.6 aspect and scaling height
  // means the phone always fills ~62.5% of canvas vertically — leaves a
  // safe-zone band top + bottom. On 4:5 (1350h): 843×507.
  const phoneHeight = Math.round(canvasHeight * 0.625);
  const phoneWidth = Math.round(phoneHeight * 0.6);
  const totalFrames = Math.round(durationSeconds * fps);

  // Phone frame itself fades/scales in over the first 0.6s.
  const phoneOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const phoneScale = interpolate(frame, [0, 18], [0.96, 1], {
    extrapolateRight: "clamp",
  });

  // After the phone settles, cross-fade from the line-art to the coloured
  // page over the middle of the scene. Start at 30% through, end at 80%.
  // The overlap sells "a kid is colouring this page in the app".
  const fadeStart = Math.round(totalFrames * 0.3);
  const fadeEnd = Math.round(totalFrames * 0.8);
  const colourMix = coloredUrl
    ? interpolate(frame, [fadeStart, fadeEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: CC.orange,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: phoneWidth,
          height: phoneHeight,
          background: "#1a0f08",
          borderRadius: 72,
          padding: 24,
          boxShadow: "0 40px 0 rgba(0,0,0,0.2), 0 60px 120px rgba(0,0,0,0.3)",
          opacity: phoneOpacity,
          transform: `scale(${phoneScale})`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: CC.surface,
            borderRadius: 48,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 24,
              background: "#fff",
              borderRadius: 32,
              padding: 24,
              overflow: "hidden",
            }}
          >
            {/* Line-art layer (always rendered, fades out as colour fades in) */}
            <Img
              src={lineArtUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                position: "absolute",
                inset: 24,
                opacity: 1 - colourMix * 0.9,
              }}
            />
            {/* Coloured layer — cross-fades over the middle of the scene */}
            {coloredUrl && (
              <Img
                src={coloredUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  position: "absolute",
                  inset: 24,
                  opacity: colourMix,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/**
 * Hand-drawn squiggle underline using the same roughjs config as the
 * marketing-site CrayonScribble component (bowing 3, roughness 2.4,
 * strokeWidth 4). Computes the SVG path string once via RoughGenerator's
 * pure-JS API — no DOM dependency, safe inside Remotion's headless render.
 *
 * `revealPct` (0..1) clips the squiggle left-to-right via SVG clipPath so
 * the caller can drive the sweep-in animation with a single interpolated
 * value (mirroring the old flat-bar's expanding-width behaviour).
 */
function RoughUnderline({
  width,
  height = 18,
  revealPct,
  seed = 7,
  color,
}: {
  width: number;
  height?: number;
  revealPct: number;
  seed?: number;
  color: string;
}) {
  // Memoised so we don't re-run the rough generator every frame; the
  // path is deterministic for a given seed + dimensions.
  const pathData = useMemo(() => {
    const generator = new RoughGenerator();
    const drawable = generator.line(2, height - 9, width - 2, height - 7, {
      bowing: 3,
      roughness: 2.4,
      strokeWidth: 4,
      seed,
    });
    // Each Drawable holds multiple "ops" (one per overlapping pass). Merge
    // them into a single path string — strokes will overlap visually,
    // which is what gives the crayon-like double-line effect.
    return drawable.sets.map((opSet) => generator.opsToPath(opSet)).join(" ");
  }, [width, height, seed]);
  const clipId = `rough-underline-clip-${seed}`;
  const filterId = `rough-underline-grain-${seed}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* Subtle paper-grain turbulence — matches CrayonScribble */}
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            seed={seed}
          />
          <feDisplacementMap in="SourceGraphic" scale="0.8" />
        </filter>
        {/* Animated reveal — clipRect grows left-to-right with revealPct */}
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width * revealPct} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} filter={`url(#${filterId})`}>
        <path
          d={pathData}
          stroke={color}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function BrandOutroScene({
  cta,
  logoUrl,
  coloredUrl,
  format,
}: {
  cta: string;
  logoUrl: string;
  coloredUrl?: string;
  format: AdVideoFormat;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { h: canvasHeight } = getVideoDims(format);
  // Colored card scales with canvas height. Originally 520 on a 1920
  // canvas (~27%). On 4:5 (1350h) that's ~365 — leaves room for the
  // logo, CTA, and underlined URL stack underneath without crowding.
  const cardSize = Math.round(canvasHeight * 0.27);

  // Staggered entrances so the scene reads as a sequence, not a freeze:
  //   0.0s — colored page fades+scales in
  //   0.4s — logo + wordmark spring in
  //   0.9s — CTA springs in (handled by <ChunkyCta />)
  //   1.6s — URL underline starts sweeping in
  //   throughout — subtle breathing on the CTA so the hold never feels static
  const pageSpring = spring({
    frame: frame - 0,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 100 },
    durationInFrames: 24,
  });
  const pageOpacity = Math.min(1, Math.max(0, pageSpring));
  const pageScale = 0.92 + pageSpring * 0.08;

  const logoSpring = spring({
    frame: frame - Math.round(fps * 0.4),
    fps,
    config: { damping: 12, mass: 0.8, stiffness: 120 },
    durationInFrames: 20,
  });
  const logoOpacity = Math.min(1, Math.max(0, logoSpring));
  const logoY = (1 - logoSpring) * 16;

  // URL underline sweeps in from 1.6s, takes ~0.8s. revealPct drives
  // RoughUnderline's clipPath left-to-right reveal.
  const underlineStart = Math.round(fps * 1.6);
  const underlineEnd = underlineStart + Math.round(fps * 0.8);
  const underlineRevealPct = interpolate(
    frame,
    [underlineStart, underlineEnd],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill
      style={{
        background: CC.surface,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        padding: 80,
      }}
    >
      {coloredUrl && (
        <div
          style={{
            width: cardSize,
            height: cardSize,
            background: "#fff",
            borderRadius: 32,
            boxShadow:
              "0 20px 0 rgba(0,0,0,0.08), 0 40px 80px rgba(0,0,0,0.12)",
            padding: 24,
            opacity: pageOpacity,
            transform: `scale(${pageScale})`,
          }}
        >
          <Img
            src={coloredUrl}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: logoOpacity,
          transform: `translateY(${logoY}px)`,
        }}
      >
        <Img src={logoUrl} style={{ width: 120, height: 120 }} />
        <div
          style={{
            fontFamily: TONDO,
            fontWeight: 700,
            fontSize: 64,
            color: CC.ink,
            letterSpacing: "-0.01em",
          }}
        >
          chunkycrayon
        </div>
      </div>
      {/* CTA enters at ~0.9s via <ChunkyCta> spring; subtle 2s breathing
          keeps the rest of the hold from feeling static. */}
      <BreathingWrap>
        <ChunkyCta text={cta} startFrame={Math.round(fps * 0.9)} />
      </BreathingWrap>
      <div style={{ position: "relative" }}>
        <div
          style={{
            fontFamily: ROONEY,
            fontSize: 32,
            color: CC.muted,
          }}
        >
          chunkycrayon.com
        </div>
        {/* Hand-drawn crayon-orange squiggle underline — same roughjs
            config as the marketing-site CrayonScribble. revealPct drives
            the sweep-in over 0.8s starting at 1.6s. */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: -14,
            transform: "translateX(-50%)",
          }}
        >
          <RoughUnderline
            width={260}
            revealPct={underlineRevealPct}
            color={CC.orange}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Wraps children in a gentle sinusoidal scale breathe so the CTA never
 *  holds completely static. Imperceptible on its own, but kills the
 *  "frozen final screen" feel. */
function BreathingWrap({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // One full breath every 2.4 seconds, ±1% scale
  const period = fps * 2.4;
  const scale = 1 + Math.sin((frame / period) * Math.PI * 2) * 0.01;
  return (
    <div style={{ transform: `scale(${scale})`, display: "inline-block" }}>
      {children}
    </div>
  );
}

function BrollScene({ videoUrl }: { videoUrl: string }) {
  // OffthreadVideo instead of Video — the DOM <video> seeking used by
  // Remotion's Video component produces micro-jitter on AI-generated
  // clips whose PTS timing isn't perfectly CFR. OffthreadVideo uses
  // ffmpeg to extract frames, which is seek-accurate. Same fix AM's
  // ProductReel landed on for identical symptoms.
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo
        src={videoUrl}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
}

// ==========================================================================
// Root composition
// ==========================================================================

export function AdVideo(props: AdVideoProps) {
  const { fps } = useVideoConfig();
  const {
    scenes,
    headline,
    subhead,
    cta,
    logoUrl,
    lineArtUrl,
    coloredUrl,
    brollUrls,
    musicUrl,
    transitionSfxUrls,
    campaignId,
    format = "stories",
  } = props;

  // Background + highlight colours for text-reveal scenes by campaign.
  const textRevealBg: Record<
    string,
    { bg: string; color: string; highlight?: string }
  > = {
    "impossible-request-trex": {
      bg: CC.surface,
      color: CC.ink,
      highlight: CC.orange,
    },
    "five-pm-rescue-foxes": {
      bg: CC.orange,
      color: "#fff",
      highlight: CC.yellow,
    },
    "dream-it-dragon": { bg: CC.surface, color: CC.ink, highlight: CC.orange },
  };

  // TransitionSeries timeline = sum(sequences) - sum(transitions). Each
  // transition eats TRANSITION_FRAMES out of the NEXT sequence. So to keep
  // every sequence's on-screen time equal to scene.duration, we pad each
  // non-first sequence by TRANSITION_FRAMES.
  // 15 frames @ 24fps = ~625ms — PTP's number. Long enough to register
  // as a deliberate transition, short enough not to feel slow.
  const TRANSITION_FRAMES = 15;

  /**
   * Picks a transition presentation for each scene boundary.
   *
   * We use `fade()` everywhere. Slide into b-roll pulled the clip's opening
   * still frame into view while the text was still on screen, which read
   * as the text getting cut off mid-breath. A fade reads as a beat
   * between scenes instead of an interruption.
   */
  const pickPresentation = (_fromKind: string, _toKind: string) => {
    return fade();
  };

  const renderSceneContent = (scene: AdScene, i: number): React.ReactNode => {
    switch (scene.kind) {
      case "text-reveal": {
        const style = textRevealBg[campaignId] ?? {
          bg: CC.surface,
          color: CC.ink,
        };
        return (
          <TextRevealScene
            caption={scene.caption ?? headline}
            background={style.bg}
            color={style.color}
            highlightColor={style.highlight}
            subhead={subhead}
            format={format}
          />
        );
      }
      case "line-art-draw":
        return (
          <LineArtDrawScene
            svgUrl={lineArtUrl}
            caption={scene.caption ?? "They dream it. We draw it."}
            format={format}
          />
        );
      case "phone-mockup":
        return (
          <PhoneMockupScene
            lineArtUrl={lineArtUrl}
            coloredUrl={coloredUrl}
            durationSeconds={scene.duration}
            format={format}
          />
        );
      case "broll":
        return <BrollScene videoUrl={brollUrls[i] ?? ""} />;
      case "brand-outro":
        return (
          <BrandOutroScene
            cta={cta}
            logoUrl={logoUrl}
            coloredUrl={coloredUrl}
            format={format}
          />
        );
    }
  };

  // Build TransitionSeries children inline, PTP-style: alternating
  // <Sequence> and <Transition> elements. No flatMap, no index arithmetic.
  const children: React.ReactNode[] = [];
  scenes.forEach((scene, i) => {
    const sceneFrames = Math.round(scene.duration * fps);
    // Pad every sequence after the first with TRANSITION_FRAMES so its
    // on-screen duration (after the transition eats into its front) equals
    // the intended scene.duration.
    const seqFrames = i === 0 ? sceneFrames : sceneFrames + TRANSITION_FRAMES;

    if (i > 0) {
      const prevKind = scenes[i - 1].kind;
      const currKind = scene.kind;
      children.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
          presentation={pickPresentation(prevKind, currKind)}
        />,
      );
    }
    children.push(
      <TransitionSeries.Sequence key={`s-${i}`} durationInFrames={seqFrames}>
        {renderSceneContent(scene, i)}
      </TransitionSeries.Sequence>,
    );
  });

  // Scene-boundary frame positions (in the final 15s timeline). Used to
  // place the transition SFX ~5 frames before each boundary so the whoosh
  // leads the visual cross-fade.
  const boundaryFrames: number[] = [];
  let cursor = 0;
  scenes.forEach((scene, i) => {
    cursor += Math.round(scene.duration * fps);
    if (i < scenes.length - 1) boundaryFrames.push(cursor);
  });

  return (
    <AbsoluteFill>
      {/* Tondo font (base64-inlined CSS — no HTTP fetch, no delayRender race) */}
      <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />
      <TransitionSeries>{children}</TransitionSeries>

      {musicUrl && (
        <Sequence>
          {/* Music at 0.15 matches PTP — quiet bed so transition SFX punch
              through and the ad doesn't feel over-scored. */}
          <Audio src={musicUrl} volume={0.15} />
        </Sequence>
      )}

      {/* Transition SFX — one short whoosh at each scene boundary. Each
          boundary picks its own URL from the passed array (render
          script randomises the pool for variety). Volume 0.4 so the
          whoosh reads CLEARLY above the 0.15 music bed. */}
      {transitionSfxUrls &&
        transitionSfxUrls.length > 0 &&
        boundaryFrames.map((boundary, i) => (
          <Sequence
            key={`sfx-${i}`}
            from={Math.max(boundary - 5, 0)}
            durationInFrames={30}
          >
            <Audio
              src={transitionSfxUrls[i % transitionSfxUrls.length]}
              volume={0.4}
            />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
}
