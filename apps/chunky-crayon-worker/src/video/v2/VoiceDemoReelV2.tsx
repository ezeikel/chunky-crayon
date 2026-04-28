/**
 * Demo Reel V2 — voice variant.
 *
 * Same beat skeleton as `TextDemoReelV2` and `ImageDemoReelV2` (intro
 * 1.5s → hook 2s → input 6s → reveal 8s → outro 3s = 20.5s total) but
 * Beat 3 mocks the 2-turn voice conversation:
 *
 *   - 0.0s   mic idle (passes-through quick — viewer sees the entry state)
 *   - 0.4s   Q1 audio "plays" (mic dims, "listen" caption)
 *   - 1.4s   user speaks A1 — bars dance for ~1.5s
 *   - 2.9s   transcript bubble pops in with first answer
 *   - 3.6s   "thinking" spinner — Claude generating the follow-up
 *   - 4.3s   Q2 audio plays (mic dims, "listen")
 *   - 5.3s   user speaks A2 — bars again
 *   - 5.7s   second transcript bubble pops in
 *   - swoosh out at 6s
 *
 * Inputs from worker `/publish/v2`:
 *   - firstAnswer + secondAnswer:  the seeded conversation transcripts
 *   - q1AudioUrl + q2AudioUrl:     real Q1/Q2 audio (cached on R2)
 *   - kidVoiceUrl:                 simulated kid speaking the answers
 *   - finishedImageUrl, regionMapUrl, regionsJson, svgUrl: same as text/image
 *
 * Studio preview pulls defaults from Root.tsx with the koala fixture.
 */
import { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  delayRender,
  continueRender,
  Audio,
  staticFile,
} from "remotion";
import { COLORS, FONTS, FONT_WEIGHTS, SPRINGS } from "./tokens/brand";
import {
  VoiceConversationCard,
  type VoicePhase,
} from "./components/VoiceConversationCard";
import { Toolbar } from "./components/Toolbar";
import { PaletteRow } from "./components/PaletteRow";
import {
  CanvasReveal,
  type CanvasRevealFixture,
  makeBoustrophedonPath,
} from "./components/CanvasReveal";
import { IntroCard } from "./sections/IntroCard";
import { HookCard } from "./sections/HookCard";
import { OutroCard } from "./sections/OutroCard";
import {
  loadCanvasRevealFixture,
  type RegionStoreJson,
  type PaletteVariant,
} from "./lib/loadFixture";
import { TONDO_FONT_CSS_URL } from "../fonts";

// =============================================================================
// Beat timeline. 30fps. Voice variant has a longer Beat 3 because real
// audio durations don't compress past human speech speed — measured:
//   Q1 ≈ 2.0s, A1 ≈ 2.7s, Q2 ≈ 2.9s, A2 ≈ 5.9s.
// Sum ≈ 13.5s + thinking + tails. We pad Beat 3 to 16s so A2 plays in
// full before the cut to canvas. Total reel runs ~28.5s — still fine
// for short-form (Reels/TikTok cap is 60-90s; ideal range is 15-30s).
// =============================================================================
export const VOICE_REEL_FPS = 30;

const F_INTRO_START = 0;
const F_INTRO_DUR = 45;
const F_HOOK_START = F_INTRO_START + F_INTRO_DUR;
const F_HOOK_DUR = 60;
const F_INPUT_START = F_HOOK_START + F_HOOK_DUR;
const F_INPUT_DUR = 480; // 16s — fits A2 fully before cut to canvas
const F_REVEAL_START = F_INPUT_START + F_INPUT_DUR;
const F_REVEAL_DUR = 240;
const F_OUTRO_START = F_REVEAL_START + F_REVEAL_DUR;
const F_OUTRO_DUR = 90;

export const VOICE_REEL_DURATION_FRAMES = F_OUTRO_START + F_OUTRO_DUR;

// Frame windows for each conversation sub-phase, LOCAL to F_INPUT_*.
// Sized to match measured audio durations of the koala spike fixtures
// (see scripts/generate-spike-q2.ts). Real renders may need adjustment
// per-image — we'll measure durations server-side and pass them in via
// inputProps when wiring the worker (Phase 10 cron rotation).
//
// No transcript bubbles — voice mode is for kids who can't yet read.
// The conversation reads through audio + the mic/orb/spinner/bars visual.
const V_MIC_IDLE_END = 18; //   0.0-0.6s   mic idle
const V_Q1_END = 84; //   0.6-2.8s   Q1 audio (~2.0s + 0.2s tail)
const V_A1_REC_END = 174; //   2.8-5.8s   A1 recording — kid says "a koala"
const V_THINKING_END = 198; //   5.8-6.6s   short thinking spinner
const V_Q2_END = 294; //   6.6-9.8s   Q2 audio (~2.9s + tail)
// 9.8s onward (~6.2s) — A2 recording. Kid voice (~5.9s) plays in full
// then cuts to canvas at 16s.

// Reveal config — kept in sync with text/image variants.
const STAMPS_PER_ROW = 24;
const ROWS = 24;
const TOTAL_STAMPS = STAMPS_PER_ROW * ROWS;
const REVEAL_SPEED_FACTOR = TOTAL_STAMPS / F_REVEAL_DUR;
const STAMP_PATH = makeBoustrophedonPath(STAMPS_PER_ROW, ROWS);

// =============================================================================
// Input props
// =============================================================================
export type VoiceDemoReelV2Props = {
  /** Mocked first answer the kid spoke. Shows in the first transcript bubble. */
  firstAnswer: string;
  /** Mocked elaboration. Shows in the second bubble. Combined with first
   *  forms the description used for the canvas (final coloured page). */
  secondAnswer: string;
  /** Final coloured image — outro hero. */
  finishedImageUrl: string;
  regionMapUrl: string;
  regionMapWidth: number;
  regionMapHeight: number;
  regionsJson: RegionStoreJson;
  svgUrl: string;
  paletteVariant?: PaletteVariant;

  // ── Audio ──────────────────────────────────────────────────────────────
  /** Cached Q1 audio URL — same one client uses live. */
  q1AudioUrl: string;
  /** Q2 audio URL — generated per-render to match the seeded firstAnswer. */
  q2AudioUrl: string;
  /** Kid voice speaking the first answer (plays during recording_a1). */
  a1AudioUrl?: string;
  /** Kid voice speaking the second answer (plays during recording_a2). */
  a2AudioUrl?: string;
  backgroundMusicUrl?: string;
  /** Adult voiceover for the reveal/outro. */
  adultVoiceUrl?: string;
};

// =============================================================================
// Composition
// =============================================================================
export const VoiceDemoReelV2: React.FC<VoiceDemoReelV2Props> = ({
  firstAnswer,
  secondAnswer,
  finishedImageUrl,
  regionMapUrl,
  regionMapWidth,
  regionMapHeight,
  regionsJson,
  svgUrl,
  paletteVariant = "cute",
  q1AudioUrl,
  q2AudioUrl,
  a1AudioUrl,
  a2AudioUrl,
  backgroundMusicUrl,
  adultVoiceUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: vWidth } = useVideoConfig();

  const [fixture, setFixture] = useState<CanvasRevealFixture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<number | null>(null);

  useEffect(() => {
    if (handleRef.current !== null) return;
    handleRef.current = delayRender("loading voice reel fixture");
    let cancelled = false;
    loadCanvasRevealFixture({
      regionMapUrl,
      regionMapWidth,
      regionMapHeight,
      regionsJson,
      svgUrl,
      paletteVariant,
    })
      .then((f) => {
        if (cancelled) return;
        setFixture(f);
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        if (handleRef.current !== null) {
          continueRender(handleRef.current);
          handleRef.current = null;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    regionMapUrl,
    regionMapWidth,
    regionMapHeight,
    regionsJson,
    svgUrl,
    paletteVariant,
  ]);

  if (error) {
    return (
      <AbsoluteFill style={{ background: "#fee", padding: 40 }}>
        <div style={{ color: "#900", fontFamily: "monospace" }}>
          reel error: {error}
        </div>
      </AbsoluteFill>
    );
  }
  if (!fixture) {
    return (
      <AbsoluteFill
        style={{
          background: COLORS.bgCream,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.body,
          fontWeight: FONT_WEIGHTS.body,
          fontSize: 32,
          color: COLORS.textMuted,
        }}
      >
        loading…
      </AbsoluteFill>
    );
  }

  // ── Voice scene phase + intensity (frame-local within F_INPUT_*) ───────
  const inputLocal = frame - F_INPUT_START;
  let phase: VoicePhase;
  if (inputLocal < V_MIC_IDLE_END) phase = "mic_idle";
  else if (inputLocal < V_Q1_END) phase = "q1_playing";
  else if (inputLocal < V_A1_REC_END) phase = "recording_a1";
  else if (inputLocal < V_THINKING_END) phase = "thinking";
  else if (inputLocal < V_Q2_END) phase = "q2_playing";
  else phase = "recording_a2";

  // Audio-bar intensity — sine wave centred so it dances naturally during
  // the recording phases. 0 elsewhere.
  let intensity = 0;
  if (phase === "recording_a1") {
    const t = (inputLocal - V_Q1_END) / (V_A1_REC_END - V_Q1_END);
    intensity = 0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI * 4));
  } else if (phase === "recording_a2") {
    const t = (inputLocal - V_Q2_END) / (F_INPUT_DUR - V_Q2_END);
    intensity = 0.4 + 0.6 * Math.abs(Math.sin(t * Math.PI * 3));
  }

  // Thinking spinner rotation — driven off frame so it's deterministic.
  const thinkingProgress =
    phase === "thinking"
      ? (inputLocal - V_A1_REC_END) / (V_THINKING_END - V_A1_REC_END)
      : 0;

  // Orb pulse — 0..1 sawtooth that resets each "ripple". One ripple every
  // ~30 frames (1s). Drives the AI-speaking orb's halo expansion + the
  // inner orb's gentle breathing.
  let orbPulse = 0;
  if (phase === "q1_playing") {
    orbPulse = ((inputLocal - V_MIC_IDLE_END) / 30) % 1;
  } else if (phase === "q2_playing") {
    orbPulse = ((inputLocal - V_THINKING_END) / 30) % 1;
  }

  // ── Beat 4 reveal — same as text/image variants ────────────────────────
  const toolbarLocal = frame - F_REVEAL_START;
  const toolbarEntry = spring({
    frame: toolbarLocal,
    fps,
    config: SPRINGS.snappy,
    durationInFrames: 18,
  });
  const magicSelectionPop = spring({
    frame: toolbarLocal - 8,
    fps,
    config: SPRINGS.bouncy,
    durationInFrames: 24,
  });
  const revealLocal = frame - F_REVEAL_START;
  const stampCount = Math.max(
    0,
    Math.min(TOTAL_STAMPS, Math.floor(revealLocal * REVEAL_SPEED_FACTOR)),
  );

  return (
    <AbsoluteFill style={{ background: COLORS.bgCream }}>
      {/* Tondo fonts embedded as base64 in a static CSS file — no HTTP
          font fetches, no delayRender race across render tabs. */}
      <link rel="stylesheet" href={TONDO_FONT_CSS_URL} />

      {/* ── Beats 1 + 2 — identical to text/image variants ──────────── */}
      <Sequence from={F_INTRO_START} durationInFrames={F_INTRO_DUR}>
        <IntroCard durationFrames={F_INTRO_DUR} />
      </Sequence>

      <Sequence from={F_HOOK_START} durationInFrames={F_HOOK_DUR}>
        <HookCard
          line1="Just say what you want"
          line2="to color"
          durationFrames={F_HOOK_DUR}
        />
      </Sequence>

      {/* ── Beat 3 — voice conversation scene ───────────────────────── */}
      <Sequence from={F_INPUT_START} durationInFrames={F_INPUT_DUR}>
        <AbsoluteFill
          style={{
            background: COLORS.bgCream,
            padding: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: vWidth - 120 }}>
            <VoiceConversationCard
              phase={phase}
              intensity={intensity}
              thinkingProgress={thinkingProgress}
              orbPulse={orbPulse}
            />
          </div>
        </AbsoluteFill>

        {/* Q1 — adult question. Plays during the q1_playing phase. */}
        <Sequence
          from={V_MIC_IDLE_END}
          durationInFrames={V_Q1_END - V_MIC_IDLE_END}
        >
          <Audio src={q1AudioUrl} volume={1} />
        </Sequence>

        {/* A1 — kid's first answer. Plays during recording_a1. Bounded
            sequence so it doesn't bleed into the bubble/thinking phases. */}
        {a1AudioUrl && (
          <Sequence from={V_Q1_END} durationInFrames={V_A1_REC_END - V_Q1_END}>
            <Audio src={a1AudioUrl} volume={1} />
          </Sequence>
        )}

        {/* Q2 — adult follow-up. Plays during the q2_playing phase. */}
        <Sequence
          from={V_THINKING_END}
          durationInFrames={V_Q2_END - V_THINKING_END}
        >
          <Audio src={q2AudioUrl} volume={1} />
        </Sequence>

        {/* A2 — kid's elaboration. Plays during recording_a2 and trails
            slightly into the second transcript bubble (kid voice can
            naturally finish over the bubble pop-in). */}
        {a2AudioUrl && (
          <Sequence from={V_Q2_END} durationInFrames={F_INPUT_DUR - V_Q2_END}>
            <Audio src={a2AudioUrl} volume={1} />
          </Sequence>
        )}
      </Sequence>

      {/* ── Beat 4: canvas + toolbar + palette — identical to other variants ── */}
      <Sequence from={F_REVEAL_START} durationInFrames={F_REVEAL_DUR}>
        <AbsoluteFill
          style={{
            background: COLORS.bgCream,
            padding: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <CanvasReveal
            fixture={fixture}
            stampCount={stampCount}
            totalStamps={TOTAL_STAMPS}
            stampsPerRow={STAMPS_PER_ROW}
            brushRadius={
              Math.max(
                fixture.canvasW / STAMPS_PER_ROW,
                fixture.canvasH / ROWS,
              ) * 0.85
            }
            stampPath={STAMP_PATH}
            size={Math.min(vWidth - 120, 880)}
          />
          <div
            style={{
              width: Math.min(vWidth - 120, 880),
              opacity: toolbarEntry,
              transform: `translateY(${(1 - toolbarEntry) * 40}px)`,
            }}
          >
            <Toolbar
              activeToolId="magic-reveal"
              selectionPop={magicSelectionPop}
            />
          </div>
          <div
            style={{
              width: Math.min(vWidth - 120, 880),
              opacity: toolbarEntry,
            }}
          >
            <PaletteRow selectedIndex={null} limit={12} />
          </div>
        </AbsoluteFill>

        <Audio src={staticFile("v2-sfx/swish.mp3")} volume={0.6} />
        <Audio src={staticFile("v2-sfx/kids-yay.mp3")} volume={0.6} />
        <Sequence from={20} durationInFrames={F_REVEAL_DUR - 20}>
          <Audio src={staticFile("v2-sfx/draw.mp3")} volume={0.45} loop />
        </Sequence>
        {adultVoiceUrl ? <Audio src={adultVoiceUrl} volume={1} /> : null}
      </Sequence>

      {/* ── Beat 5: outro ─────────────────────────────────────────────── */}
      <Sequence from={F_OUTRO_START} durationInFrames={F_OUTRO_DUR}>
        <OutroCard
          finishedImageUrl={finishedImageUrl}
          durationFrames={F_OUTRO_DUR}
        />
      </Sequence>

      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};
