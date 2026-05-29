/**
 * Template 4 — News Beat
 *
 * For the organic NEWS engine. News stories rarely have one clean hero
 * number, so the stat-style giant CenterReveal ("Both sides", "7+ hrs")
 * reads as cryptic. This template keeps the same voice-aware beat skeleton
 * + audio routing as Templates 1-3, but the middle beat shows the single
 * most striking fact as a READABLE key-detail card (medium font, sits in a
 * soft panel), not a 240px hero word.
 *
 * Beats (voice-aware, see ../shared/timing.ts):
 *   hook        headline-style hook narration, types in word-by-word
 *   keyDetail   the striking fact as a readable line in a soft card (reuses
 *               the "reveal" beat slot; NO giant hero word)
 *   payoff      the open, practical question
 *   outro       source attribution + "Read more" CTA + brand mark
 *
 * `reel.centerBlock` is repurposed for news as the key-detail line (a full
 * readable phrase, written by the news script prompt), not a 1-3 word
 * reveal. `reel.kind` is always "fact" for organic posts; this template
 * ignores it (no kind-aware CenterReveal dispatch).
 *
 * Palette: a calm blue+green plasma to read as "informative / news",
 * distinct from the warm yellow (insight) and pink (shock) templates.
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
import { COLORS, FONTS, FONT_WEIGHTS, SPRINGS } from "../../v2/tokens/brand";
import { TONDO_FONT_CSS_URL } from "../../fonts";
import { PlasmaShader } from "../shared/PlasmaShader";
import {
  computeBeats,
  DEFAULT_HOOK_VOICE_SECONDS,
  DEFAULT_PAYOFF_VOICE_SECONDS,
} from "../shared/timing";
import type { ContentReel } from "../shared/types";

export type Template4NewsBeatProps = {
  reel: ContentReel;
  hookVoiceUrl?: string;
  hookVoiceSeconds?: number;
  payoffVoiceUrl?: string;
  payoffVoiceSeconds?: number;
  backgroundMusicUrl?: string;
};

export const NEWS_REEL_FPS = 30;

export const computeNewsReelDuration = (
  hookVoiceSeconds: number = DEFAULT_HOOK_VOICE_SECONDS,
  payoffVoiceSeconds: number = DEFAULT_PAYOFF_VOICE_SECONDS,
): number =>
  computeBeats({ fps: NEWS_REEL_FPS, hookVoiceSeconds, payoffVoiceSeconds })
    .totalFrames;

export const NEWS_REEL_DEFAULT_DURATION_FRAMES = computeNewsReelDuration();

export const Template4NewsBeat: React.FC<Template4NewsBeatProps> = ({
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

  // Brand mark springs in at the outro (same "we made this" credit pattern).
  const brandSpring = spring({
    frame: frame - beats.outroStart,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 24,
  });
  const brandOpacity = brandSpring;
  const brandScale = interpolate(brandSpring, [0, 1], [0.8, 1]);

  // Hook types in word-by-word across ~70% of the hook beat.
  const hookWords = reel.hook.split(" ");
  const hookRevealFrames = Math.floor(beats.hookDur * 0.7);
  const framesPerWord = Math.max(
    4,
    Math.floor(hookRevealFrames / Math.max(1, hookWords.length)),
  );
  const hookFadeOut = interpolate(
    frame,
    [beats.hookEnd - 8, beats.hookEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Key-detail card — slides up + fades in at the reveal beat, then stays.
  const detailLocal = frame - beats.revealStart;
  const detailSpring = spring({
    frame: detailLocal,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 20,
  });
  const detailOpacity = interpolate(detailLocal, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const detailY = interpolate(detailSpring, [0, 1], [40, 0]);
  // Card fades out at the outro so source/CTA own the lower third.
  const detailOutroFade = interpolate(
    frame,
    [beats.outroStart, beats.outroStart + 12],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Payoff question fades in at the payoff beat.
  const payoffOpacity = interpolate(
    frame,
    [beats.payoffStart, beats.payoffStart + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const outroOpacity = interpolate(
    frame,
    [beats.outroStart, beats.outroStart + 18],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bgCream }}>
      <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />

      {/* Calm blue + green plasma — reads as "informative", distinct from
          the warm/shock templates on a social grid. */}
      <PlasmaShader
        colorBg={COLORS.bgCream}
        colorWarm={COLORS.green}
        colorCool={COLORS.skyLight}
        colorTint={COLORS.teal}
      />

      {/* Paper-grain texture (static) */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, rgba(0,0,0,0.012) 0px, rgba(0,0,0,0.012) 1px, transparent 1px, transparent 4px)`,
          mixBlendMode: "multiply",
          opacity: 0.7,
        }}
      />

      {/* ===== Hook — headline-style, types in, fades out before key detail */}
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 80,
          right: 80,
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.heading,
          fontSize: 76,
          lineHeight: 1.12,
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
          return (
            <span
              key={i}
              style={{
                opacity: wordOpacity,
                transform: `translate3d(0, ${wordY}px, 0)`,
                display: "inline-block",
                marginRight: 14,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* ===== Key-detail card — the striking fact as a READABLE line.
          This is the news answer to the cryptic hero word. Medium font in
          a soft translucent panel, top-anchored in the upper-middle so a
          long multi-line card keeps a clear gap above the payoff text
          below (rather than centering and nearly touching it). Visible
          from the reveal beat through the payoff, fades at outro. */}
      {frame >= beats.revealStart && (
        <div
          style={{
            position: "absolute",
            top: 640,
            left: 80,
            right: 80,
            display: "flex",
            justifyContent: "center",
            opacity: detailOpacity * detailOutroFade,
          }}
        >
          <div
            style={{
              maxWidth: 880,
              padding: "48px 56px",
              borderRadius: 36,
              backgroundColor: "rgba(255,255,255,0.82)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.10)",
              transform: `translateY(${detailY}px)`,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.heading,
              fontSize: 56,
              lineHeight: 1.2,
              color: COLORS.textPrimary,
              textAlign: "center",
            }}
          >
            {reel.centerBlock}
          </div>
        </div>
      )}

      {/* ===== Outro brand mark ===== */}
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
              width: 260,
              height: "auto",
              transform: `scale(${brandScale})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* ===== Payoff question ===== */}
      <div
        style={{
          position: "absolute",
          bottom: 360,
          left: 80,
          right: 80,
          fontFamily: FONTS.body,
          fontWeight: FONT_WEIGHTS.emphasis,
          fontSize: 46,
          lineHeight: 1.25,
          color: COLORS.textPrimary,
          textAlign: "center",
          opacity: payoffOpacity,
        }}
      >
        {reel.payoff}
      </div>

      {/* ===== Source attribution ===== */}
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

      {/* ===== CTA ===== */}
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
          color: COLORS.green,
          opacity: outroOpacity,
        }}
      >
        chunkycrayon.com
      </div>

      {/* ===== Audio routing — root-level, never inside a bounded Sequence
          (the demo-reel cut-off bug). Beats are computed to outlast voice. */}
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
      {/* Soft swish as the key-detail card lands. */}
      <Sequence from={beats.revealStart}>
        <Audio src={staticFile("v2-sfx/swish.mp3")} volume={0.4} />
      </Sequence>
      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};
