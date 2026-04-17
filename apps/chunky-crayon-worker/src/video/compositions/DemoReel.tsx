import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Tondo weights are embedded as base64 data URIs in a static CSS file.
// Loading via <link> avoids all HTTP font fetches during render — no
// delayRender race across Remotion's parallel tabs.
import { TONDO_FONT_CSS_URL } from "../fonts";

export type DemoReelProps = {
  /** Short mp4 of the typing phase (trimmed from the raw webm). */
  typingVideoUrl: string;
  /** Short mp4 of the reveal phase (trimmed from the raw webm). */
  revealVideoUrl: string;
  /** The prompt the user typed — kept for future caption overlays. */
  prompt?: string;
  /** Duration of the typing section in frames. */
  typingDurationFrames: number;
  /** Duration of the reveal section in frames. */
  revealDurationFrames: number;
  /** Total composition length in frames (computed by render.ts). */
  durationInFrames: number;
  /** Optional ambient music URL (ducked under everything). */
  ambientSoundUrl?: string;
  /** Optional kid voiceover — plays over the typing section. */
  kidVoiceUrl?: string;
  /** Optional adult narrator — plays over the reveal section. */
  adultVoiceUrl?: string;
  /** Optional PDF preview PNG URL — shown as a "free printable" frame. */
  pdfPreviewUrl?: string;
};

// ─── Section pacing (keep computeOutputFrames in worker/index.ts in sync) ───
export const INTRO_SECS = 2.0;
export const PDF_PREVIEW_SECS = 2.5;
export const OUTRO_SECS = 2.0;

// Brand palette (mirrors CC globals.css).
const BRAND_ORANGE = "#F86A2F";
const PAPER_CREAM = "#FFF8EF";
const CHARCOAL = "#212121";
const FONT = "Tondo, system-ui, sans-serif";

/**
 * Jump-cut edit composed from pre-trimmed source clips:
 *
 *   ┌─ intro ─┬──── typing ─────┬──── reveal ────┬─ outro ─┐
 *   0        1s    (real-time)    (real-time)               +2s
 *             KID voiceover       ADULT voiceover
 *             plays over typing   plays over reveal
 *             section             section
 *
 * Trimming happens in the worker (ffmpeg) before render so Remotion only
 * decodes the frames we'll actually use — keeps the frame cache tiny.
 */
export const DemoReel: React.FC<DemoReelProps> = ({
  typingVideoUrl,
  revealVideoUrl,
  typingDurationFrames,
  revealDurationFrames,
  ambientSoundUrl,
  kidVoiceUrl,
  adultVoiceUrl,
  pdfPreviewUrl,
}) => {
  const { fps } = useVideoConfig();
  const introFrames = Math.round(INTRO_SECS * fps);
  const pdfPreviewFrames = pdfPreviewUrl
    ? Math.round(PDF_PREVIEW_SECS * fps)
    : 0;
  const outroFrames = Math.round(OUTRO_SECS * fps);
  const typingStart = introFrames;
  const revealStart = typingStart + typingDurationFrames;
  const pdfStart = revealStart + revealDurationFrames;
  const outroStart = pdfStart + pdfPreviewFrames;

  return (
    <AbsoluteFill style={{ background: PAPER_CREAM }}>
      {/* Tondo fonts embedded as base64 in a static CSS file — no HTTP
          font fetches, no delayRender race across render tabs. */}
      <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />

      {/* 0 — Intro card */}
      <Sequence from={0} durationInFrames={introFrames}>
        <IntroCard />
      </Sequence>

      {/* 1 — Typing clip (kid voice overlay) */}
      <Sequence from={typingStart} durationInFrames={typingDurationFrames}>
        {typingVideoUrl ? (
          <OffthreadVideo src={typingVideoUrl} style={fillStyle} />
        ) : (
          <AbsoluteFill
            style={{
              background: "#e0e0e0",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: 40, color: CHARCOAL }}>
              Typing clip placeholder
            </div>
          </AbsoluteFill>
        )}
        <BottomCallout text="Any idea" />
        {kidVoiceUrl ? <Audio src={kidVoiceUrl} volume={1} /> : null}
      </Sequence>

      {/* 2 — Reveal clip (adult narrator overlay) */}
      <Sequence from={revealStart} durationInFrames={revealDurationFrames}>
        {revealVideoUrl ? (
          <OffthreadVideo src={revealVideoUrl} style={fillStyle} />
        ) : (
          <AbsoluteFill
            style={{
              background: "#d0d0d0",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: 40, color: CHARCOAL }}>
              Reveal clip placeholder
            </div>
          </AbsoluteFill>
        )}
        <BottomCallout text="Watch it come to life" />
        {adultVoiceUrl ? <Audio src={adultVoiceUrl} volume={1} /> : null}
      </Sequence>

      {/* 3 — PDF preview (free printable) */}
      {pdfPreviewUrl && pdfPreviewFrames > 0 && (
        <Sequence from={pdfStart} durationInFrames={pdfPreviewFrames}>
          <PdfPreviewCard imageUrl={pdfPreviewUrl} />
          <BottomCallout text="Print it. Color it for real." />
        </Sequence>
      )}

      {/* 4 — Outro card */}
      <Sequence from={outroStart} durationInFrames={outroFrames}>
        <OutroCard />
      </Sequence>

      {/* Ducked ambient music across the full composition */}
      {ambientSoundUrl ? (
        <Audio src={ambientSoundUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};

const fillStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const BottomCallout: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fadeIn = Math.round(fps * 0.3);
  const fadeOut = Math.round(fps * 0.4);
  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );
  const rise = interpolate(frame, [0, fadeIn], [20, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 160,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 56,
          color: "white",
          background: BRAND_ORANGE,
          padding: "20px 36px",
          borderRadius: 999,
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
          opacity,
          transform: `translateY(${rise}px)`,
          textAlign: "center",
          maxWidth: 860,
          letterSpacing: -0.5,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const IntroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Overall card fade in/out.
  const fade = Math.round(fps * 0.25);
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Colo bounces in with a spring, then sways gently like it's saying hi.
  // The spring snaps from 0.7 → 1 with a little overshoot; feels bouncy.
  const coloScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.6 },
    from: 0.7,
    to: 1,
  });
  // Gentle 3° sway that settles — starts swaying once the bounce is mostly done.
  const swayStart = Math.round(fps * 0.4);
  const swayAmplitude = interpolate(
    frame,
    [swayStart, swayStart + fps * 0.5, durationInFrames],
    [0, 3, 1.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const coloTilt =
    Math.sin(((frame - swayStart) / fps) * 2 * Math.PI * 1.2) * swayAmplitude;

  // Copy fades up after Colo has landed.
  const copyDelay = Math.round(fps * 0.5);
  const copyFade = Math.round(fps * 0.35);
  const copyOpacity = interpolate(
    frame,
    [copyDelay, copyDelay + copyFade],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const copyLift = interpolate(
    frame,
    [copyDelay, copyDelay + copyFade],
    [16, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: PAPER_CREAM,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT,
        opacity,
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 48,
        }}
      >
        <Img
          src={staticFile("/logos/colo.svg")}
          style={{
            width: 520,
            height: "auto",
            maxHeight: 520,
            transform: `scale(${coloScale}) rotate(${coloTilt}deg)`,
            transformOrigin: "center bottom",
          }}
        />
        <div
          style={{
            fontWeight: 400,
            fontSize: 64,
            color: CHARCOAL,
            letterSpacing: -1,
            lineHeight: 1.2,
            maxWidth: 880,
            opacity: copyOpacity,
            transform: `translateY(${copyLift}px)`,
          }}
        >
          What happens when you ask a kid
          <br />
          to{" "}
          <span style={{ fontWeight: 700, color: BRAND_ORANGE }}>
            color anything
          </span>
          ?
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fade = Math.round(fps * 0.35);
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // URL gently grows in for emphasis.
  const urlScale = interpolate(frame, [0, fade], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: PAPER_CREAM,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT,
        opacity,
        textAlign: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          fontWeight: 400,
          fontSize: 56,
          color: CHARCOAL,
          letterSpacing: -0.5,
          opacity: 0.85,
        }}
      >
        Try yours, for{" "}
        <span style={{ fontWeight: 700, color: BRAND_ORANGE }}>FREE</span> at
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 104,
          color: BRAND_ORANGE,
          marginTop: 12,
          letterSpacing: -2.5,
          transform: `scale(${urlScale})`,
        }}
      >
        chunkycrayon.com
      </div>
    </AbsoluteFill>
  );
};

const PdfPreviewCard: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in/out
  const fade = Math.round(fps * 0.3);
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Spring scale-up: the PDF "page" springs in from slightly small.
  const scale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.7 },
    from: 0.82,
    to: 1,
  });

  return (
    <AbsoluteFill
      style={{
        background: PAPER_CREAM,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT,
        opacity,
      }}
    >
      {/* "Paper" frame with shadow — looks like a printed page */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)",
          padding: 24,
          maxWidth: 700,
          maxHeight: 1200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Img
          src={imageUrl}
          style={{
            width: "100%",
            height: "auto",
            borderRadius: 8,
            objectFit: "contain",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
