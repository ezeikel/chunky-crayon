import { Composition } from "remotion";
import {
  DemoReel,
  type DemoReelProps,
  PDF_PREVIEW_SECS,
  INTRO_SECS,
  OUTRO_SECS,
} from "./compositions/DemoReel";
import { AdVideo, type AdVideoProps } from "./compositions/AdVideo";
import {
  ImageDemoReel,
  type ImageDemoReelProps,
  PHOTO_PREVIEW_SECS,
} from "./compositions/ImageDemoReel";
import {
  BrushPlaybackSpike,
  BRUSH_SPIKE_FPS,
  BRUSH_SPIKE_DURATION_FRAMES,
} from "./spikes/BrushPlaybackSpike";
import {
  V2ComponentShowcase,
  V2_SHOWCASE_FPS,
  V2_SHOWCASE_DURATION_FRAMES,
} from "./v2/V2ComponentShowcase";

const FPS = 30;
// Ad videos render at Seedance's native 24fps to avoid frame-resampling
// glitches when the i2v clips play inside the composition.
const AD_FPS = 24;

/**
 * Defaults are intentionally empty strings / undefined for anything that's
 * ephemeral (clip files, voice mp3s, ambient music).
 *
 * Every real render passes the per-run URLs via `inputProps` from the
 * worker's `/publish/next` handler. Remotion merges inputProps over
 * defaultProps — but an `undefined` inputProp does NOT overwrite a
 * populated default, which used to cause production renders to fall back
 * to stale /tmp URLs from a previous run when the DB had no ambient track
 * yet. Keeping these empty avoids that entire class of bug.
 *
 * For Studio previews pass the URLs via `?props=<base64(json)>` in the
 * Studio URL, or use `pnpm remotion studio --props='{...}'`.
 */

const EMPTY_PLACEHOLDER = "";

export const RemotionRoot: React.FC = () => {
  const introFrames = Math.round(INTRO_SECS * FPS);
  const outroFrames = Math.round(OUTRO_SECS * FPS);
  // Arbitrary default lengths — real render overrides via inputProps.
  const typingFrames = Math.round(4 * FPS);
  const revealFrames = Math.round(25 * FPS);
  const pdfPreviewFrames = Math.round(PDF_PREVIEW_SECS * FPS);
  const totalFrames =
    introFrames + typingFrames + revealFrames + pdfPreviewFrames + outroFrames;

  // ImageDemoReel: the upload clip is shorter than the typing clip because
  // setInputFiles bypasses the native file picker — the preview appears
  // near-instantly. Default to 5s; real render overrides via inputProps.
  const uploadFrames = Math.round(5 * FPS);
  const photoPreviewFrames = Math.round(PHOTO_PREVIEW_SECS * FPS);
  const imageTotalFrames =
    introFrames +
    photoPreviewFrames +
    uploadFrames +
    revealFrames +
    pdfPreviewFrames +
    outroFrames;

  return (
    <>
      <Composition
        id="DemoReel"
        component={DemoReel}
        durationInFrames={totalFrames}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            typingVideoUrl: EMPTY_PLACEHOLDER,
            revealVideoUrl: EMPTY_PLACEHOLDER,
            typingDurationFrames: typingFrames,
            revealDurationFrames: revealFrames,
            durationInFrames: totalFrames,
            backgroundMusicUrl: undefined,
            kidVoiceUrl: undefined,
            adultVoiceUrl: undefined,
            pdfPreviewUrl: undefined,
            prompt: "",
          } satisfies DemoReelProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: props.durationInFrames,
        })}
      />

      <Composition
        id="ImageDemoReel"
        component={ImageDemoReel}
        durationInFrames={imageTotalFrames}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            sourcePhotoUrl: undefined,
            uploadVideoUrl: EMPTY_PLACEHOLDER,
            revealVideoUrl: EMPTY_PLACEHOLDER,
            uploadDurationFrames: uploadFrames,
            revealDurationFrames: revealFrames,
            durationInFrames: imageTotalFrames,
            photoDescription: "",
            backgroundMusicUrl: undefined,
            kidVoiceUrl: undefined,
            adultVoiceUrl: undefined,
            pdfPreviewUrl: undefined,
          } satisfies ImageDemoReelProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: props.durationInFrames,
        })}
      />

      {/* Phase 0 spike — frame-deterministic brush playback validation.
          Hardcoded fixture; not used in real renders. Delete once
          BrushPlaybackSpike is ported into ImageCanvas (Phase 3). */}
      <Composition
        id="BrushPlaybackSpike"
        component={BrushPlaybackSpike}
        durationInFrames={BRUSH_SPIKE_DURATION_FRAMES}
        fps={BRUSH_SPIKE_FPS}
        width={1080}
        height={1920}
      />

      {/* Phase 2 — V2 component showcase. Mounts every V2 building block
          (palette row, prompt input card, image input card, canvas reveal)
          with token-driven brand styling for visual validation. Not part
          of any real reel; remove once V2 reel comps replace it (Phase 4). */}
      <Composition
        id="V2ComponentShowcase"
        component={V2ComponentShowcase}
        durationInFrames={V2_SHOWCASE_DURATION_FRAMES}
        fps={V2_SHOWCASE_FPS}
        width={1080}
        height={1920}
      />

      {/* Ad video composition — 15s 9:16 @24fps (matches Seedance 2 native
          output to avoid frame-resampling artifacts on b-roll). */}
      <Composition
        id="AdVideo"
        component={AdVideo}
        durationInFrames={15 * AD_FPS}
        fps={AD_FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            campaignId: "impossible-request-trex",
            headline: "",
            subhead: undefined,
            cta: "",
            logoUrl: EMPTY_PLACEHOLDER,
            lineArtUrl: EMPTY_PLACEHOLDER,
            coloredUrl: undefined,
            brollUrls: {},
            musicUrl: EMPTY_PLACEHOLDER,
            transitionSfxUrls: undefined,
            scenes: [],
          } satisfies AdVideoProps
        }
      />
    </>
  );
};
