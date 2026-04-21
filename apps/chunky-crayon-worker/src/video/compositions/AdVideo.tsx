import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
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

export type AdVideoProps = {
  /** Campaign id — used for the asset filename lookups. */
  campaignId: string;
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
   * Optional transition whoosh SFX. Plays at each scene boundary via
   * short <Sequence>s. TODO: replace with curated Epidemic Sound clips.
   */
  transitionSfxUrl?: string;
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

function ChunkyCta({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring entrance in first 18 frames (~0.6s @30fps)
  const scale = spring({
    frame,
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

// Word-stagger reveal. Each word fades+rises in sequence — keeps natural
// line wrapping and hyphenation (unlike per-char which blocks ligatures).
function StaggerText({
  text,
  fontSize = 96,
  color = CC.ink,
  lineHeight = 1.02,
  maxWidth = 900,
  startFrame = 0,
  perWordFrames = 3,
  font = TONDO,
}: {
  text: string;
  fontSize?: number;
  color?: string;
  lineHeight?: number;
  maxWidth?: number;
  startFrame?: number;
  perWordFrames?: number;
  font?: string;
}) {
  const frame = useCurrentFrame();
  // Split on whitespace but keep it as tokens so layout reflows naturally.
  const tokens = text.split(/(\s+)/);

  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: 700,
        fontSize,
        color,
        lineHeight,
        maxWidth,
        letterSpacing: "-0.02em",
        wordSpacing: "0em",
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
        const opacity = interpolate(
          frame,
          [tokenFrame, tokenFrame + 8],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        const translateY = interpolate(
          frame,
          [tokenFrame, tokenFrame + 8],
          [16, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        return (
          <span
            key={i}
            style={{
              opacity,
              display: "inline-block",
              transform: `translateY(${translateY}px)`,
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

function TextRevealScene({
  caption,
  background,
  color,
  highlightColor,
  subhead,
}: {
  caption: string;
  background: string;
  color: string;
  highlightColor?: string;
  subhead?: string;
}) {
  const frame = useCurrentFrame();
  // Subhead appears after headline finishes typing (~frame 50)
  const subheadOpacity = interpolate(frame, [50, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 80,
        gap: 48,
      }}
    >
      <div style={{ position: "relative", maxWidth: 920 }}>
        <StaggerText
          text={caption}
          color={color}
          fontSize={76}
          lineHeight={1.08}
          maxWidth={920}
          perWordFrames={3}
        />
        {/* Crayon-orange underline sweep lands around frame 70 */}
        {highlightColor && <UnderlineSweep color={highlightColor} />}
      </div>
      {subhead && (
        <div
          style={{
            fontFamily: TONDO,
            fontWeight: 400,
            fontSize: 36,
            lineHeight: 1.3,
            color,
            maxWidth: 880,
            opacity: subheadOpacity * 0.8,
          }}
        >
          {subhead}
        </div>
      )}
    </AbsoluteFill>
  );
}

function UnderlineSweep({ color }: { color: string }) {
  const frame = useCurrentFrame();
  // Sweep appears ~frame 60, animates width over 18 frames
  const width = interpolate(frame, [60, 78], [0, 620], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 140,
        bottom: "44%",
        height: 16,
        width,
        background: color,
        borderRadius: 8,
        transform: "rotate(-1deg)",
        opacity: 0.85,
      }}
    />
  );
}

function LineArtDrawScene({
  svgUrl,
  caption,
}: {
  svgUrl: string;
  caption: string;
}) {
  const frame = useCurrentFrame();
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
          width: 720,
          height: 720,
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
      <StaggerText
        text={caption}
        color={CC.ink}
        fontSize={56}
        startFrame={45}
        perWordFrames={4}
      />
    </AbsoluteFill>
  );
}

function PhoneMockupScene({
  lineArtUrl,
  coloredUrl,
  durationSeconds,
}: {
  lineArtUrl: string;
  coloredUrl?: string;
  durationSeconds: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
          width: 720,
          height: 1200,
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

function BrandOutroScene({
  cta,
  logoUrl,
  coloredUrl,
}: {
  cta: string;
  logoUrl: string;
  coloredUrl?: string;
}) {
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
            width: 520,
            height: 520,
            background: "#fff",
            borderRadius: 32,
            boxShadow:
              "0 20px 0 rgba(0,0,0,0.08), 0 40px 80px rgba(0,0,0,0.12)",
            padding: 24,
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
      <ChunkyCta text={cta} />
      <div
        style={{
          fontFamily: ROONEY,
          fontSize: 32,
          color: CC.muted,
        }}
      >
        chunkycrayon.com
      </div>
    </AbsoluteFill>
  );
}

function BrollScene({ videoUrl }: { videoUrl: string }) {
  // Trim first / last ~6 frames to skip Seedance's "settling" moments.
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video
        src={videoUrl}
        startFrom={6}
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
    transitionSfxUrl,
    campaignId,
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
  const TRANSITION_FRAMES = 6;

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
          />
        );
      }
      case "line-art-draw":
        return (
          <LineArtDrawScene
            svgUrl={lineArtUrl}
            caption={scene.caption ?? "They dream it. We draw it."}
          />
        );
      case "phone-mockup":
        return (
          <PhoneMockupScene
            lineArtUrl={lineArtUrl}
            coloredUrl={coloredUrl}
            durationSeconds={scene.duration}
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
      children.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
          presentation={fade()}
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
          <Audio src={musicUrl} volume={0.3} />
        </Sequence>
      )}

      {/* Transition SFX — one short whoosh at each scene boundary. PTP
          pattern: volume ~0.25 so it punctuates without drowning the
          music. */}
      {transitionSfxUrl &&
        boundaryFrames.map((boundary, i) => (
          <Sequence
            key={`sfx-${i}`}
            from={Math.max(boundary - 5, 0)}
            durationInFrames={30}
          >
            <Audio src={transitionSfxUrl} volume={0.25} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
}
