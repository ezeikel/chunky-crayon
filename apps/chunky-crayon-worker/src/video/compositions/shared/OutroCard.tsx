import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND_ORANGE, CHARCOAL, FONT, PAPER_CREAM } from "./brand";

export const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fade = Math.round(fps * 0.35);
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
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
