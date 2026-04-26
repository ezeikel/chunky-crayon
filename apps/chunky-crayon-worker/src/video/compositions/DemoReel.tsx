import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  useVideoConfig,
} from "remotion";

// Tondo weights are embedded as base64 data URIs in a static CSS file.
// Loading via <link> avoids all HTTP font fetches during render — no
// delayRender race across Remotion's parallel tabs.
import { TONDO_FONT_CSS_URL } from "../fonts";
import {
  BottomCallout,
  CHARCOAL,
  FONT,
  INTRO_SECS,
  IntroCard,
  OUTRO_SECS,
  OutroCard,
  PAPER_CREAM,
  PDF_PREVIEW_SECS,
  PdfPreviewCard,
} from "./shared";

// Re-export so worker/index.ts can keep importing PDF_PREVIEW_SECS from
// DemoReel without needing to know about the shared folder.
export { PDF_PREVIEW_SECS, INTRO_SECS, OUTRO_SECS };

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
  backgroundMusicUrl?: string;
  /** Optional kid voiceover — plays over the typing section. */
  kidVoiceUrl?: string;
  /** Optional adult narrator — plays over the reveal section. */
  adultVoiceUrl?: string;
  /** Optional PDF preview PNG URL — shown as a "free printable" frame. */
  pdfPreviewUrl?: string;
};

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
  backgroundMusicUrl,
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
        <IntroCard
          leading="What happens when you ask a kid"
          accent="color anything"
          trailing="?"
        />
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
      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};

const fillStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};
