import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONT, PAPER_CREAM } from "./brand";

/**
 * Source-photo preview frame — shown BEFORE the upload clip in the
 * ImageDemoReel so viewers have a clear beat to see the input photo
 * before it flies into the app. Mirrors the PdfPreviewCard pattern at
 * the end of the reel (print-ready page).
 */
export const PhotoPreviewCard: React.FC<{ imageUrl: string }> = ({
  imageUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fade = Math.round(fps * 0.3);
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

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
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)",
          padding: 24,
          maxWidth: 820,
          maxHeight: 1400,
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
            maxHeight: 1300,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
