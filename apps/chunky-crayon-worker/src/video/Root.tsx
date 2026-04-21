import { Composition } from "remotion";
import { staticFile } from "remotion";
import {
  DemoReel,
  type DemoReelProps,
  PDF_PREVIEW_SECS,
} from "./compositions/DemoReel";
import { AdVideo, type AdVideoProps } from "./compositions/AdVideo";

const FPS = 30;
// Ad videos render at Seedance's native 24fps to avoid frame-resampling
// glitches when the i2v clips play inside the composition.
const AD_FPS = 24;

// Pacing constants — keep in sync with DemoReel + worker/index.ts.
const INTRO_SECS = 1.0;
const OUTRO_SECS = 2.0;

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
            ambientSoundUrl: undefined,
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
