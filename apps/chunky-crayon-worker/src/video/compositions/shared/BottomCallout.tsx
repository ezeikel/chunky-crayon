import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND_ORANGE, FONT } from "./brand";

export const BottomCallout: React.FC<{ text: string }> = ({ text }) => {
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
