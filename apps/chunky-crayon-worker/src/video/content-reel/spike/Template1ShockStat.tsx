/**
 * Template 1 — Shock Stat
 *
 * Used for screen-time / attention / anxiety stats that need to scroll-stop.
 *
 * Beats (voice-aware, see ../shared/timing.ts):
 *   intro      brand mark slides in (1.0s)
 *   hook       problem-first hook narration (voice + 0.4s buffer)
 *   reveal     huge number scales up with chromatic aberration (1.5s, fixed)
 *   payoff     adult narrator delivers the resolution (voice + 0.4s buffer)
 *   outro      source attribution + CTA fade in (1.5s, fixed)
 *
 * Voice + music handling:
 *   - `<Audio>` tags live at the COMPOSITION ROOT, NOT inside `<Sequence>`.
 *     Remotion truncates audio that's a child of a bounded Sequence — that
 *     is the demo-reel cut-off bug we're avoiding here.
 *   - Beat durations are computed from voice clip durations + 0.4s buffer,
 *     so animations finish naturally and we never cut a sentence.
 *   - Background music is continuous, ducked under voice via volume.
 *
 * Effects layered:
 *   - Backbone: real GLSL plasma shader (../shared/PlasmaShader),
 *     animation-math (spring + interpolate), randomness (frame-deterministic).
 *   - Spice: chromatic aberration on the stat number (three colour-channel
 *     copies with mix-blend; HTML-in-canvas upgrade in a follow-up task),
 *     light-leak burst at reveal (radial gradient; @remotion/light-leaks
 *     upgrade in a follow-up task).
 *
 * Font: Tondo (loaded via TONDO_FONT_CSS_URL link tag).
 */

import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LightLeak } from "@remotion/light-leaks";
import { COLORS, FONTS, FONT_WEIGHTS, SPRINGS } from "../../v2/tokens/brand";
import { TONDO_FONT_CSS_URL } from "../../fonts";
import { PlasmaShader } from "../shared/PlasmaShader";
import {
  computeBeats,
  DEFAULT_HOOK_VOICE_SECONDS,
  DEFAULT_PAYOFF_VOICE_SECONDS,
} from "../shared/timing";
import type { ContentReel } from "../shared/types";

export type Template1ShockStatProps = {
  reel: ContentReel;
  /** ElevenLabs-generated narration for the hook beat. */
  hookVoiceUrl?: string;
  /** Hook voice clip length in seconds. Drives beat duration. */
  hookVoiceSeconds?: number;
  /** ElevenLabs-generated narration for the payoff beat. */
  payoffVoiceUrl?: string;
  /** Payoff voice clip length in seconds. */
  payoffVoiceSeconds?: number;
  /** Background music URL, looped + ducked across the reel. */
  backgroundMusicUrl?: string;
};

export const SHOCK_REEL_FPS = 30;

/**
 * Compute total composition duration from voice durations.
 * Studio preview + Root.tsx defaults call this with sensible defaults so
 * scrubbing works without real audio files; the worker passes real values
 * from the ElevenLabs response when rendering for production.
 */
export const computeShockReelDuration = (
  hookVoiceSeconds: number = DEFAULT_HOOK_VOICE_SECONDS,
  payoffVoiceSeconds: number = DEFAULT_PAYOFF_VOICE_SECONDS,
): number =>
  computeBeats({ fps: SHOCK_REEL_FPS, hookVoiceSeconds, payoffVoiceSeconds })
    .totalFrames;

export const SHOCK_REEL_DEFAULT_DURATION_FRAMES = computeShockReelDuration();

export const Template1ShockStat: React.FC<Template1ShockStatProps> = ({
  reel,
  hookVoiceUrl,
  hookVoiceSeconds = DEFAULT_HOOK_VOICE_SECONDS,
  payoffVoiceUrl,
  payoffVoiceSeconds = DEFAULT_PAYOFF_VOICE_SECONDS,
  backgroundMusicUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beats = computeBeats({ fps, hookVoiceSeconds, payoffVoiceSeconds });

  // ===== Brand-mark outro — at outroStart, the number fades out and a
  //       large centre C logo springs in as the closing credit. No
  //       persistent top-left brand stamp during the body — hook-first
  //       reels need the first frame to be the hook line, not a logo,
  //       so the brand reveal is held entirely for the outro.
  const brandSpring = spring({
    frame: frame - beats.outroStart,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 24,
  });
  const brandOpacity = brandSpring;
  const brandScale = interpolate(brandSpring, [0, 1], [0.8, 1]);

  // Number fades out at the outro hand-off so the centre real-estate
  // belongs to the logo, not the stat the viewer has already absorbed.
  const numberOutroFade = interpolate(
    frame,
    [beats.outroStart, beats.outroStart + 12],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ===== Hook text — types in word-by-word during the hook beat =====
  const hookWords = reel.hook.split(" ");
  // Reveal happens across the first ~70% of the hook beat so the visual
  // settles slightly before the voice trails off.
  const hookRevealFrames = Math.floor(beats.hookDur * 0.7);
  const framesPerWord = Math.max(
    4,
    Math.floor(hookRevealFrames / hookWords.length),
  );

  // ===== Stat reveal — number scales up with chromatic aberration =====
  const revealLocalFrame = frame - beats.revealStart;
  // Scale runs across the first ~70% of the reveal beat
  const numberScale = spring({
    frame: revealLocalFrame,
    fps,
    config: SPRINGS.bouncy,
    durationInFrames: Math.floor(beats.revealDur * 0.7),
  });
  // Chromatic aberration: spike at snap, settle to zero. Film-grain
  // flicker layer carries ongoing motion so no frame reads as static.
  const aberrationStrength = interpolate(
    revealLocalFrame,
    [0, Math.floor(beats.revealDur * 0.27), Math.floor(beats.revealDur * 0.83)],
    [0, 12, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // (Light-leak animation is handled by @remotion/light-leaks — see the
  // <LightLeak> below. The package self-animates within the duration we
  // pass it; we don't need a manual opacity envelope.)

  // ===== Payoff text — fades in at the payoff beat, stays put through
  //       outro. Sits well above source/CTA so no overlap. =====
  const payoffOpacity = interpolate(
    frame,
    [beats.payoffStart, beats.payoffStart + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ===== Source + CTA — fade in at outro start, hold to end =====
  const outroOpacity = interpolate(
    frame,
    [beats.outroStart, beats.outroStart + 18],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Hook-visual stays on screen until reveal starts, then fades out fast.
  const hookFadeOut = interpolate(
    frame,
    [beats.hookEnd - 8, beats.hookEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Number stays on screen at full size from reveal start through the
  // entire reel — source/CTA fade in below at outro without disturbing
  // the number's position. No outro shrink-and-slide animation; the eye
  // shouldn't be drawn back to the number once payoff is delivered.

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgCream }}>
      {/* Tondo font — base64-inlined, no fetch */}
      <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />

      {/* ===== Plasma background — real GLSL shader ===== */}
      <PlasmaShader
        colorBg={COLORS.bgCream}
        colorWarm={COLORS.pink}
        colorCool={COLORS.teal}
        colorTint={COLORS.skyLight}
      />

      {/* Subtle paper-grain texture for tactile warmth (static layer) */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            rgba(0,0,0,0.012) 0px,
            rgba(0,0,0,0.012) 1px,
            transparent 1px,
            transparent 4px
          )`,
          mixBlendMode: "multiply",
          opacity: 0.7,
        }}
      />

      {/* Film-grain flicker — re-randomises every 2 frames (15Hz). Keeps
          the whole composition feeling subtly alive even when nothing
          else is animating. */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(
            -30deg,
            rgba(0,0,0,0.018) 0px,
            rgba(0,0,0,0.018) 1px,
            transparent 1px,
            transparent 5px
          )`,
          mixBlendMode: "multiply",
          opacity: 0.55,
          transform: `translate(${(random(`grain-x-${Math.floor(frame / 2)}`) - 0.5) * 6}px, ${(random(`grain-y-${Math.floor(frame / 2)}`) - 0.5) * 6}px)`,
        }}
      />

      {/* ===== Light-leak burst — real WebGL streak via @remotion/light-leaks.
          Tuned for "flash at the reveal moment" not "wash the whole reel."
          The package's full-strength effect bathes the entire frame, which
          obliterates the plasma + foreground text. We dial it back hard:
          - Duration shortened to half the reveal beat so it's a brief
            sweep rather than a sustained glow.
          - Wrapped in opacity 0.35 so the foreground stays readable.
          - Sequence ends BEFORE the payoff beat so payoff text fades in
            against a clean background.
          seed=3 picks one streak variant; rotate per stat-category later. */}
      <Sequence
        from={beats.revealStart}
        durationInFrames={Math.floor(beats.revealDur * 0.6)}
      >
        <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.35 }}>
          <LightLeak
            durationInFrames={Math.floor(beats.revealDur * 0.6)}
            seed={3}
            hueShift={0}
          />
        </AbsoluteFill>
      </Sequence>

      {/* ===== Hook text — visible during hook beat, fades out at end ===== */}
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 80,
          right: 80,
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.heading,
          fontSize: 80,
          lineHeight: 1.1,
          color: COLORS.textPrimary,
          opacity: hookFadeOut,
        }}
      >
        {hookWords.map((word, i) => {
          const wordStartFrame = beats.hookStart + i * framesPerWord;
          const wordOpacity = interpolate(
            frame,
            [wordStartFrame, wordStartFrame + 6],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const wordY = interpolate(
            frame,
            [wordStartFrame, wordStartFrame + 8],
            [12, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          // Subtle per-word entry glitch
          const glitchSeed = random(`hook-${i}-${Math.floor(frame / 3)}`);
          const glitchX =
            frame < wordStartFrame + 10 ? (glitchSeed - 0.5) * 4 : 0;
          return (
            <span
              key={i}
              style={{
                opacity: wordOpacity,
                transform: `translate3d(${glitchX}px, ${wordY}px, 0)`,
                display: "inline-block",
                marginRight: 14,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* ===== Stat reveal — huge number with chromatic aberration =====
          Visible from reveal start through the payoff beat, then fades
          out at outro start to hand the centre over to the C logo. */}
      {frame >= beats.revealStart && (
        <AbsoluteFill
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: numberOutroFade,
          }}
        >
          {/* Three brand-coloured copies offset for chromatic aberration:
              base orangeDark sits on top, pink + teal ghost-trail behind. */}
          <div
            style={{
              position: "relative",
              transform: `scale(${numberScale})`,
            }}
          >
            {/* Pink channel offset (left) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                fontFamily: FONTS.heading,
                fontWeight: 900,
                fontSize: 280,
                color: COLORS.pinkDark,
                opacity: 0.85,
                transform: `translate(${-aberrationStrength}px, 0)`,
              }}
            >
              {reel.centerBlock}
            </div>
            {/* Teal channel offset (right) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                fontFamily: FONTS.heading,
                fontWeight: 900,
                fontSize: 280,
                color: COLORS.tealDark,
                opacity: 0.85,
                transform: `translate(${aberrationStrength}px, 0)`,
              }}
            >
              {reel.centerBlock}
            </div>
            {/* Brand-orange base — focal point */}
            <div
              style={{
                position: "relative",
                fontFamily: FONTS.heading,
                fontWeight: 900,
                fontSize: 280,
                color: COLORS.orangeDark,
              }}
            >
              {reel.centerBlock}
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ===== Outro brand reveal — large C logo replaces the number at
          outro, sits in the same centre real-estate as the closing credit. */}
      {frame >= beats.outroStart && (
        <AbsoluteFill
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: brandOpacity,
          }}
        >
          <Img
            src={staticFile("/logos/cc-logo-no-bg.svg")}
            style={{
              width: 280,
              height: "auto",
              transform: `scale(${brandScale})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* ===== Payoff text — fades in at the start of the payoff beat,
          stays visible through the outro. Static text, no captions —
          the viewer reads the script themselves; word-highlight on top
          of script they're already reading is busy and confuses watch. */}
      <div
        style={{
          position: "absolute",
          bottom: 360,
          left: 80,
          right: 80,
          fontFamily: FONTS.body,
          fontWeight: FONT_WEIGHTS.emphasis,
          fontSize: 48,
          lineHeight: 1.25,
          color: COLORS.textPrimary,
          textAlign: "center",
          opacity: payoffOpacity,
        }}
      >
        {reel.payoff}
      </div>

      {/* ===== Source attribution — outro fade.
          textSecondary (not textMuted) so it stays legible against the
          warm plasma background. Skipped when `sourceTitle` is missing
          (tips usually don't have one — common parenting wisdom). */}
      {reel.sourceTitle ? (
        <div
          style={{
            position: "absolute",
            bottom: 200,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: FONTS.body,
            fontWeight: FONT_WEIGHTS.emphasis,
            fontSize: 28,
            color: COLORS.textSecondary,
            opacity: outroOpacity,
            letterSpacing: 1,
          }}
        >
          Source: {reel.sourceTitle}
        </div>
      ) : null}

      {/* ===== CTA — outro fade ===== */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONTS.body,
          fontWeight: FONT_WEIGHTS.emphasis,
          fontSize: 32,
          color: COLORS.orange,
          opacity: outroOpacity,
        }}
      >
        chunkycrayon.com
      </div>

      {/* ===========================================================
          Audio routing — voice never gets cut off.

          The demo-reel cut-off bug came from putting <Audio> inside
          <Sequence durationInFrames={N}>. Remotion truncates audio at
          the sequence's end frame, so a voice longer than its beat got
          chopped mid-sentence.

          The fix:
            1. Total composition frames are COMPUTED from voice
               durations + buffers (computeBeats above), so the
               composition itself outlasts every voice.
            2. Each voice is mounted in <Sequence from={beatStart}>
               WITHOUT durationInFrames. That shifts the audio's t=0
               to the beat start, but its end is bounded only by the
               outer composition (the AbsoluteFill we're returning),
               which by design is long enough.
            3. Background music is at the absolute root, looped, so it
               wraps the whole reel without any beat boundary.
          ========================================================== */}

      {hookVoiceUrl ? (
        <Sequence from={beats.hookVoiceStart}>
          <Audio src={hookVoiceUrl} volume={1} />
        </Sequence>
      ) : null}

      {payoffVoiceUrl ? (
        <Sequence from={beats.payoffVoiceStart}>
          <Audio src={payoffVoiceUrl} volume={1} />
        </Sequence>
      ) : null}

      {/* SFX — Shock template uses the punchier swoosh + pop pair on
          the stat reveal, and a distinct swish on the logo reveal so
          the two beats don't sound identical.
          Stat reveal: swoosh carries the chromatic-aberration spike,
          pop punctuates the snap on the same frame.
          Logo reveal: swish (softer/different texture) tags the C-mark. */}
      <Sequence from={beats.revealStart}>
        <Audio src={staticFile("v2-sfx/textbox-swoosh.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={beats.revealStart}>
        <Audio src={staticFile("v2-sfx/pop.mp3")} volume={0.65} />
      </Sequence>
      <Sequence from={beats.outroStart}>
        <Audio src={staticFile("v2-sfx/swish.mp3")} volume={0.5} />
      </Sequence>

      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};
