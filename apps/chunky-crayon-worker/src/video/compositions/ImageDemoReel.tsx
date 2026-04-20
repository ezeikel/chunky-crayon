import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  useVideoConfig,
} from "remotion";

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
  PhotoPreviewCard,
} from "./shared";

/** Seconds to hold on the source-photo preview card before the upload clip. */
export const PHOTO_PREVIEW_SECS = 2.0;

export type ImageDemoReelProps = {
  /** URL of the ORIGINAL source photo. Shown on a preview card before
   *  the upload clip so viewers can register the input before it's
   *  consumed by the app. */
  sourcePhotoUrl?: string;
  /** Short mp4 of the upload phase — photo mode tab → preview → AI description. */
  uploadVideoUrl: string;
  /** Short mp4 of the reveal phase — identical capture to text variant. */
  revealVideoUrl: string;
  /** Duration of the upload section in frames. */
  uploadDurationFrames: number;
  /** Duration of the reveal section in frames. */
  revealDurationFrames: number;
  /** Total composition length in frames (computed by render.ts). */
  durationInFrames: number;
  /** Optional AI-generated image description captured during recording. */
  photoDescription?: string;
  /** Optional ambient music URL (ducked under everything). */
  ambientSoundUrl?: string;
  /** Optional kid voiceover — plays over the upload section. */
  kidVoiceUrl?: string;
  /** Optional adult narrator — plays over the reveal section. */
  adultVoiceUrl?: string;
  /** Optional PDF preview PNG URL — shown as a "free printable" frame. */
  pdfPreviewUrl?: string;
};

/**
 * Image-mode variant of DemoReel:
 *
 *   ┌─ intro ─┬──── upload ─────┬──── reveal ────┬─ pdf ─┬─ outro ─┐
 *
 * Intro asks "What happens when you upload any photo...", upload clip
 * shows the user picking photo mode + choosing a photo + the AI
 * describing it, reveal clip is identical to the text variant (Magic
 * Brush sweep).
 *
 * Input videos are pre-trimmed by ffmpeg in the worker — Remotion only
 * decodes the frames it needs.
 */
export const ImageDemoReel: React.FC<ImageDemoReelProps> = ({
  sourcePhotoUrl,
  uploadVideoUrl,
  revealVideoUrl,
  uploadDurationFrames,
  revealDurationFrames,
  ambientSoundUrl,
  kidVoiceUrl,
  adultVoiceUrl,
  pdfPreviewUrl,
}) => {
  const { fps } = useVideoConfig();
  const introFrames = Math.round(INTRO_SECS * fps);
  const photoPreviewFrames = sourcePhotoUrl
    ? Math.round(PHOTO_PREVIEW_SECS * fps)
    : 0;
  const pdfPreviewFrames = pdfPreviewUrl
    ? Math.round(PDF_PREVIEW_SECS * fps)
    : 0;
  const outroFrames = Math.round(OUTRO_SECS * fps);
  const photoStart = introFrames;
  const uploadStart = photoStart + photoPreviewFrames;
  const revealStart = uploadStart + uploadDurationFrames;
  const pdfStart = revealStart + revealDurationFrames;
  const outroStart = pdfStart + pdfPreviewFrames;

  return (
    <AbsoluteFill style={{ background: PAPER_CREAM }}>
      <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />

      {/* 0 — Intro card */}
      <Sequence from={0} durationInFrames={introFrames}>
        <IntroCard
          leading="What happens when a kid's photo"
          accent="becomes a coloring page"
          trailing="?"
        />
      </Sequence>

      {/* 0.5 — Source photo preview (gives viewers a clear beat to see the
          input before it's consumed by the app). Mirrors the PDF preview
          card at the end. */}
      {sourcePhotoUrl && photoPreviewFrames > 0 && (
        <Sequence from={photoStart} durationInFrames={photoPreviewFrames}>
          <PhotoPreviewCard imageUrl={sourcePhotoUrl} />
          <BottomCallout text="Start with any photo" />
        </Sequence>
      )}

      {/* 1 — Upload clip (kid voice overlay) */}
      <Sequence from={uploadStart} durationInFrames={uploadDurationFrames}>
        {uploadVideoUrl ? (
          <OffthreadVideo src={uploadVideoUrl} style={fillStyle} />
        ) : (
          <AbsoluteFill
            style={{
              background: "#e0e0e0",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: 40, color: CHARCOAL }}>
              Upload clip placeholder
            </div>
          </AbsoluteFill>
        )}
        <BottomCallout text="Any photo" />
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

      {/* 3 — PDF preview */}
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
