/**
 * Demo Reel V2 — "what if you could…" hook card.
 *
 * 2.0s pre-action: a punchy line lands the value prop before the reel
 * shows the actual create flow. Two variants — one per input mode.
 */
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS, FONT_WEIGHTS, SPRINGS } from "../tokens/brand";

type HookCardProps = {
  startFrame?: number;
  durationFrames?: number;
  line1: string;
  line2: string;
};

export const HookCard = ({
  startFrame = 0,
  durationFrames = 60,
  line1,
  line2,
}: HookCardProps) => {
  const absoluteFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = absoluteFrame - startFrame;

  const line1Entry = spring({
    frame: localFrame,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 24,
  });
  const line2Entry = spring({
    frame: localFrame - 12,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 24,
  });

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
        gap: 16,
        padding: "0 80px",
        textAlign: "center",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.heading,
          fontSize: 72,
          color: COLORS.textPrimary,
          letterSpacing: "-0.01em",
          opacity: line1Entry,
          transform: `translateY(${interpolate(line1Entry, [0, 1], [40, 0])}px)`,
          lineHeight: 1.1,
        }}
      >
        {line1}
      </div>
      <div
        style={{
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.heading,
          fontSize: 84,
          color: COLORS.orange,
          letterSpacing: "-0.01em",
          opacity: line2Entry,
          transform: `translateY(${interpolate(line2Entry, [0, 1], [40, 0])}px)`,
          lineHeight: 1.05,
        }}
      >
        {line2}
      </div>
    </div>
  );
};
