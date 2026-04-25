import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND_ORANGE, CHARCOAL, FONT, PAPER_CREAM } from "./brand";

export type IntroCardProps = {
  /** Main line rendered above the accent phrase. Pass React nodes for <br /> etc. */
  leading: React.ReactNode;
  /** Accent phrase rendered in brand orange + bold. */
  accent: string;
  /** Optional suffix rendered after the accent (e.g. "?"). */
  trailing?: React.ReactNode;
};

/**
 * Hero intro card — Colo bounces in with a spring, sways gently, then the
 * copy fades up. Shared across DemoReel + ImageDemoReel so both variants
 * share the same opening beat.
 */
export const IntroCard: React.FC<IntroCardProps> = ({
  leading,
  accent,
  trailing,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fade = Math.round(fps * 0.25);
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const coloScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.6 },
    from: 0.7,
    to: 1,
  });
  const swayStart = Math.round(fps * 0.4);
  const swayAmplitude = interpolate(
    frame,
    [swayStart, swayStart + fps * 0.5, durationInFrames],
    [0, 3, 1.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const coloTilt =
    Math.sin(((frame - swayStart) / fps) * 2 * Math.PI * 1.2) * swayAmplitude;

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
          {leading}
          <br />
          <span style={{ fontWeight: 700, color: BRAND_ORANGE }}>{accent}</span>
          {trailing}
        </div>
      </div>
    </AbsoluteFill>
  );
};
