/**
 * Demo Reel V2 — intro card.
 *
 * 1.5s opening: brand title + tagline animate in with bouncy spring.
 * Sets the tone before the "what if you could…" hook lands.
 */
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS, FONT_WEIGHTS, SPRINGS } from "../tokens/brand";

type IntroCardProps = {
  /** Frame at which this card's local timeline begins (within the parent). */
  startFrame?: number;
  /** Total duration in frames the card stays on screen before fade-out. */
  durationFrames?: number;
};

export const IntroCard = ({
  startFrame = 0,
  durationFrames = 45,
}: IntroCardProps) => {
  const absoluteFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = absoluteFrame - startFrame;

  // Title: bouncy spring entrance from below.
  const titleEntry = spring({
    frame: localFrame,
    fps,
    config: SPRINGS.bouncy,
    durationInFrames: 30,
  });
  const titleY = interpolate(titleEntry, [0, 1], [60, 0]);

  // Tagline: lags title by 8 frames.
  const taglineEntry = spring({
    frame: localFrame - 8,
    fps,
    config: SPRINGS.bouncy,
    durationInFrames: 28,
  });

  // Fade-out near the end of the card.
  const fadeOut = interpolate(
    localFrame,
    [durationFrames - 8, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COLORS.bgCream,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.heading,
          fontSize: 96,
          color: COLORS.orange,
          letterSpacing: "-0.02em",
          transform: `translateY(${titleY}px)`,
          opacity: titleEntry,
        }}
      >
        Chunky Crayon
      </div>
      <div
        style={{
          fontFamily: FONTS.body,
          fontWeight: FONT_WEIGHTS.body,
          fontSize: 36,
          color: COLORS.textSecondary,
          opacity: taglineEntry,
          textAlign: "center",
          maxWidth: 700,
          padding: "0 40px",
        }}
      >
        Coloring pages, made just for you
      </div>
    </div>
  );
};
