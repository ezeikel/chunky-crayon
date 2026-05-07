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
import {
  TextDemoReelV2,
  TEXT_REEL_FPS,
  TEXT_REEL_DURATION_FRAMES,
  type TextDemoReelV2Props,
} from "./v2/TextDemoReelV2";
import {
  ImageDemoReelV2,
  IMAGE_REEL_FPS,
  IMAGE_REEL_DURATION_FRAMES,
  type ImageDemoReelV2Props,
} from "./v2/ImageDemoReelV2";
import {
  VoiceDemoReelV2,
  VOICE_REEL_FPS,
  VOICE_REEL_DURATION_FRAMES,
  type VoiceDemoReelV2Props,
} from "./v2/VoiceDemoReelV2";
import koalaRegionsJson from "./spikes/fixtures/koala-regions.json";
import type { RegionStoreJson } from "./v2/lib/loadFixture";
import {
  computeV2Beats,
  V2_DEFAULT_INPUT_VOICE_SECONDS,
  V2_DEFAULT_REVEAL_VOICE_SECONDS,
} from "./v2/lib/timing";
import { staticFile } from "remotion";
import {
  Template1ShockStat,
  SHOCK_REEL_FPS,
  SHOCK_REEL_DEFAULT_DURATION_FRAMES,
  computeShockReelDuration,
  type Template1ShockStatProps,
} from "./content-reel/spike/Template1ShockStat";
import {
  Template2WarmInsight,
  WARM_REEL_FPS,
  WARM_REEL_DEFAULT_DURATION_FRAMES,
  computeWarmReelDuration,
  type Template2WarmInsightProps,
} from "./content-reel/spike/Template2WarmInsight";
import {
  Template3QuietTruth,
  QUIET_REEL_FPS,
  QUIET_REEL_DEFAULT_DURATION_FRAMES,
  computeQuietReelDuration,
  type Template3QuietTruthProps,
} from "./content-reel/spike/Template3QuietTruth";
import {
  SHOCK_STAT_SAMPLE,
  WARM_STAT_SAMPLE,
  QUIET_STAT_SAMPLE,
  WARM_MYTH_SAMPLE,
} from "./content-reel/spike/sample-stats";

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

      {/* Phase 4 — V2 image variant reel. Same skeleton as TextDemoReelV2,
          with Beat 3 swapped for the photo upload flow. Defaults use a
          local Unsplash sample + the koala fixture so studio preview is
          same-origin. */}
      <Composition
        id="ImageDemoReelV2"
        component={ImageDemoReelV2}
        durationInFrames={IMAGE_REEL_DURATION_FRAMES}
        fps={IMAGE_REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            sourcePhotoUrl: staticFile("spike/sample-photo.jpg"),
            photoFilename: "puppy.jpg",
            finishedImageUrl: staticFile("spike/koala.svg"),
            regionMapUrl: staticFile("spike/koala.regions.bin.gz"),
            regionMapWidth: 1024,
            regionMapHeight: 1024,
            regionsJson: koalaRegionsJson as unknown as RegionStoreJson,
            svgUrl: staticFile("spike/koala.svg"),
            paletteVariant: "cute",
            backgroundMusicUrl: staticFile("spike/koala-ambient.mp3"),
            kidVoiceUrl: staticFile("spike/koala-kid-voice.mp3"),
            adultVoiceUrl: staticFile("spike/koala-adult-voice.mp3"),
          } satisfies ImageDemoReelV2Props
        }
        // Voice-aware total — duration grows to fit kid + adult voice
        // clips. Real worker renders pass exact ffprobe'd durations via
        // inputProps. Studio preview falls back to V2_DEFAULT_*.
        calculateMetadata={({ props }) => ({
          durationInFrames: computeV2Beats({
            fps: IMAGE_REEL_FPS,
            inputVoiceSeconds:
              props.kidVoiceSeconds ?? V2_DEFAULT_INPUT_VOICE_SECONDS,
            revealVoiceSeconds:
              props.adultVoiceSeconds ?? V2_DEFAULT_REVEAL_VOICE_SECONDS,
          }).totalFrames,
        })}
      />

      {/* Phase 4 — V2 text variant reel. Real renders pass inputProps
          from worker /publish/v2 with per-image fixture URLs; defaults
          point at the koala beach fixture so we can scrub locally. */}
      <Composition
        id="TextDemoReelV2"
        component={TextDemoReelV2}
        durationInFrames={TEXT_REEL_DURATION_FRAMES}
        fps={TEXT_REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            prompt: "a koala building a sandcastle at the beach",
            // Same-origin static fixtures keep studio preview free of CORS.
            // Real worker renders pass prod R2 URLs via inputProps; the
            // worker proxies those locally before invoking Remotion (same
            // pattern as ambient music — see worker/src/index.ts /tmp serve).
            finishedImageUrl: staticFile("spike/koala.svg"),
            regionMapUrl: staticFile("spike/koala.regions.bin.gz"),
            regionMapWidth: 1024,
            regionMapHeight: 1024,
            regionsJson: koalaRegionsJson as unknown as RegionStoreJson,
            svgUrl: staticFile("spike/koala.svg"),
            paletteVariant: "cute",
            // Same-origin audio for studio preview. Real renders pass
            // prod R2 / /tmp URLs via inputProps from the worker; the
            // worker proxies them locally before invoking Remotion.
            backgroundMusicUrl: staticFile("spike/koala-ambient.mp3"),
            kidVoiceUrl: staticFile("spike/koala-kid-voice.mp3"),
            adultVoiceUrl: staticFile("spike/koala-adult-voice.mp3"),
          } satisfies TextDemoReelV2Props
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: computeV2Beats({
            fps: TEXT_REEL_FPS,
            inputVoiceSeconds:
              props.kidVoiceSeconds ?? V2_DEFAULT_INPUT_VOICE_SECONDS,
            revealVoiceSeconds:
              props.adultVoiceSeconds ?? V2_DEFAULT_REVEAL_VOICE_SECONDS,
          }).totalFrames,
        })}
      />

      {/* Phase 9 — V2 voice variant reel. Same beat skeleton, Beat 3
          mocks the 2-turn voice conversation visually. Studio preview
          uses Q1 audio cached from prod R2 + a Q2 generated for the
          koala fixture via scripts/generate-spike-q2.ts. Real renders
          pass per-render Q1/Q2 URLs via inputProps. */}
      <Composition
        id="VoiceDemoReelV2"
        component={VoiceDemoReelV2}
        durationInFrames={VOICE_REEL_DURATION_FRAMES}
        fps={VOICE_REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            firstAnswer: "a koala",
            secondAnswer: "building a sandcastle at the beach",
            finishedImageUrl: staticFile("spike/koala.svg"),
            regionMapUrl: staticFile("spike/koala.regions.bin.gz"),
            regionMapWidth: 1024,
            regionMapHeight: 1024,
            regionsJson: koalaRegionsJson as unknown as RegionStoreJson,
            svgUrl: staticFile("spike/koala.svg"),
            paletteVariant: "cute",
            q1AudioUrl: staticFile("spike/koala-q1.mp3"),
            q2AudioUrl: staticFile("spike/koala-q2.mp3"),
            a1AudioUrl: staticFile("spike/koala-a1.mp3"),
            a2AudioUrl: staticFile("spike/koala-a2.mp3"),
            backgroundMusicUrl: staticFile("spike/koala-ambient.mp3"),
            adultVoiceUrl: staticFile("spike/koala-adult-voice.mp3"),
          } satisfies VoiceDemoReelV2Props
        }
        calculateMetadata={({ props }) => {
          // Sum the conversation: idle + q1 + a1 + thinking + q2 + a2
          // + tail buffer. Mirrors totalVoiceInputSecs() inside the
          // VoiceDemoReelV2 comp + the worker's voiceInputSecs.
          const inputVoiceSeconds =
            0.6 +
            (props.q1AudioSeconds ?? 2.0) +
            (props.a1AudioSeconds ?? 2.7) +
            0.8 +
            (props.q2AudioSeconds ?? 2.9) +
            (props.a2AudioSeconds ?? 5.9) +
            0.4;
          return {
            durationInFrames: computeV2Beats({
              fps: VOICE_REEL_FPS,
              inputVoiceSeconds,
              revealVoiceSeconds:
                props.adultVoiceSeconds ?? V2_DEFAULT_REVEAL_VOICE_SECONDS,
            }).totalFrames,
          };
        }}
      />

      {/* Phase 0 spike — Content Reel Template 1 (Shock). 9:16 @30fps,
          duration computed from voice clip lengths so animations finish
          and we never cut a sentence. See ~/.claude/plans/content-reels.md
          and ../content-reel/shared/timing.ts for the timing model.

          Studio defaults reuse the koala demo-reel fixtures so we can
          verify the cut-off bug fix without re-rendering ElevenLabs:
          - hookVoiceUrl       = koala-kid-voice.mp3   (4.99s)
          - payoffVoiceUrl     = koala-adult-voice.mp3 (3.55s)
          - backgroundMusicUrl = koala-ambient.mp3
          The words don't match the stat script — that's fine for timing
          verification. Real renders pass per-stat ElevenLabs URLs. */}
      <Composition
        id="ContentReelShockSpike"
        component={Template1ShockStat}
        durationInFrames={SHOCK_REEL_DEFAULT_DURATION_FRAMES}
        fps={SHOCK_REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            reel: SHOCK_STAT_SAMPLE,
            hookVoiceUrl: staticFile("spike/koala-kid-voice.mp3"),
            hookVoiceSeconds: 4.99,
            payoffVoiceUrl: staticFile("spike/koala-adult-voice.mp3"),
            payoffVoiceSeconds: 3.55,
            backgroundMusicUrl: staticFile("spike/koala-ambient.mp3"),
          } satisfies Template1ShockStatProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: computeShockReelDuration(
            props.hookVoiceSeconds,
            props.payoffVoiceSeconds,
          ),
        })}
      />

      {/* Phase 0 spike — Content Reel Template 2 (Warm Insight). Same beat
          structure as Template 1; different palette + softer light-leak
          for fine-motor / creativity / family-bonding stats. The yellow +
          green plasma reads as garden/morning vs Template 1's pink + teal
          evening — visibly distinct in a social-grid thumbnail. */}
      <Composition
        id="ContentReelWarmSpike"
        component={Template2WarmInsight}
        durationInFrames={WARM_REEL_DEFAULT_DURATION_FRAMES}
        fps={WARM_REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            reel: WARM_STAT_SAMPLE,
            hookVoiceUrl: staticFile("spike/koala-kid-voice.mp3"),
            hookVoiceSeconds: 4.99,
            payoffVoiceUrl: staticFile("spike/koala-adult-voice.mp3"),
            payoffVoiceSeconds: 3.55,
            backgroundMusicUrl: staticFile("spike/koala-ambient.mp3"),
          } satisfies Template2WarmInsightProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: computeWarmReelDuration(
            props.hookVoiceSeconds,
            props.payoffVoiceSeconds,
          ),
        })}
      />

      {/* Phase 0 spike — Content Reel Template 3 (Quiet Truth). Same beats
          as Templates 1 and 2; cool sky-light + purple palette, smaller
          200px number with purpleDark anchor, snappy spring (no overshoot)
          for a considered/journal feel. Plays well in rotation after the
          loud Shock template. */}
      <Composition
        id="ContentReelQuietSpike"
        component={Template3QuietTruth}
        durationInFrames={QUIET_REEL_DEFAULT_DURATION_FRAMES}
        fps={QUIET_REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            reel: QUIET_STAT_SAMPLE,
            hookVoiceUrl: staticFile("spike/koala-kid-voice.mp3"),
            hookVoiceSeconds: 4.99,
            payoffVoiceUrl: staticFile("spike/koala-adult-voice.mp3"),
            payoffVoiceSeconds: 3.55,
            backgroundMusicUrl: staticFile("spike/koala-ambient.mp3"),
          } satisfies Template3QuietTruthProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: computeQuietReelDuration(
            props.hookVoiceSeconds,
            props.payoffVoiceSeconds,
          ),
        })}
      />

      {/* Phase A2 — Myth fixture rendering through the Warm template.
          Same template, different reel.kind → reveal beat dispatches to
          VerdictStamp instead of BigNumberWithAberration. Useful for
          eyeballing the kind-aware switch in Studio. */}
      <Composition
        id="ContentReelWarmMythSpike"
        component={Template2WarmInsight}
        durationInFrames={WARM_REEL_DEFAULT_DURATION_FRAMES}
        fps={WARM_REEL_FPS}
        width={1080}
        height={1920}
        defaultProps={
          {
            reel: WARM_MYTH_SAMPLE,
            hookVoiceUrl: staticFile("spike/koala-kid-voice.mp3"),
            hookVoiceSeconds: 4.99,
            payoffVoiceUrl: staticFile("spike/koala-adult-voice.mp3"),
            payoffVoiceSeconds: 3.55,
            backgroundMusicUrl: staticFile("spike/koala-ambient.mp3"),
          } satisfies Template2WarmInsightProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: computeWarmReelDuration(
            props.hookVoiceSeconds,
            props.payoffVoiceSeconds,
          ),
        })}
      />

      {/* Ad video composition — 15s 9:16 @24fps (matches Seedance 2 native
          output to avoid frame-resampling artifacts on b-roll). Best for
          Stories, Reels, TikTok, and Pinterest video pins. */}
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
            format: "stories",
          } satisfies AdVideoProps
        }
      />

      {/* Meta-feed variant — 15s 4:5 @24fps. Required because Meta masks
          9:16 video on Mobile Feed, IG Feed, IG Explore, and IG Profile
          Feed (cropping the top + bottom 12% — kills the headline and
          URL underline). Same component, same scene logic, just renders
          at 1080×1350 with proportional sizing inside. The format prop
          flows down through scene components via getVideoDims(format). */}
      <Composition
        id="AdVideoMetaFeed"
        component={AdVideo}
        durationInFrames={15 * AD_FPS}
        fps={AD_FPS}
        width={1080}
        height={1350}
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
            format: "meta-feed",
          } satisfies AdVideoProps
        }
      />
    </>
  );
};
