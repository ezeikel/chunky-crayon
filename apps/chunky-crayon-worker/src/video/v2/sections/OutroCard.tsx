/**
 * Demo Reel V2 — outro card.
 *
 * Closes the reel with a hero shot of the finished colored image, brand
 * mark, and a "try it" CTA pointing at chunkycrayon.com.
 */
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  Audio,
  staticFile,
} from "remotion";
import { COLORS, FONTS, FONT_WEIGHTS, RADII, SPRINGS } from "../tokens/brand";

type OutroCardProps = {
  /** URL of the finished colored image — same one CanvasReveal showed. */
  finishedImageUrl: string;
  startFrame?: number;
  durationFrames?: number;
};

export const OutroCard = ({
  finishedImageUrl,
  startFrame = 0,
  durationFrames = 90,
}: OutroCardProps) => {
  const absoluteFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = absoluteFrame - startFrame;

  const heroEntry = spring({
    frame: localFrame,
    fps,
    config: SPRINGS.bouncy,
    durationInFrames: 30,
  });
  const ctaEntry = spring({
    frame: localFrame - 18,
    fps,
    config: SPRINGS.bouncy,
    durationInFrames: 28,
  });

  const heroScale = interpolate(heroEntry, [0, 1], [0.7, 1]);

  // Once the hero has fully landed, wiggle it side-to-side like a held-up
  // sticker. ~1.5° amplitude, slow oscillation. Disabled until the entry
  // finishes so the spring lands cleanly first.
  const wiggleActive = heroEntry > 0.95;
  const wiggleRotation = wiggleActive ? Math.sin(localFrame / 14) * 1.5 : 0;
  const wigglePulse = wiggleActive ? 1 + Math.sin(localFrame / 14) * 0.01 : 1;

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
        gap: 40,
        padding: 60,
      }}
    >
      <div
        style={{
          width: 720,
          height: 720,
          borderRadius: RADII.surface,
          overflow: "hidden",
          background: COLORS.textInverted,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          transform: `scale(${heroScale * wigglePulse}) rotate(${wiggleRotation}deg)`,
          opacity: heroEntry,
        }}
      >
        <Img
          src={finishedImageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: ctaEntry,
          transform: `translateY(${interpolate(ctaEntry, [0, 1], [30, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.heading,
            fontSize: 64,
            color: COLORS.textPrimary,
            letterSpacing: "-0.01em",
          }}
        >
          Make yours
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: FONT_WEIGHTS.emphasis,
            fontSize: 40,
            color: COLORS.orange,
            letterSpacing: "0.02em",
          }}
        >
          chunkycrayon.com
        </div>
      </div>

      {/* Magical wind-chime tag on the outro — sparkly finish behind the
          "Make yours" + chunkycrayon.com CTA. Volume tuned to sit over
          the ducked ambient music without clipping. */}
      <Audio src={staticFile("v2-sfx/chime.mp3")} volume={0.7} />
    </div>
  );
};
