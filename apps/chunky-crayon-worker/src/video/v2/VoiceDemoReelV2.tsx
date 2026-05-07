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
// Sum ≈ 13.5s + thinking + tails. The koala-spike fixture defaults
// pad to 16s so A2 plays in full. Real voice clips are now passed
// in as durations (q1AudioSeconds etc.) so the input beat flexes.
// =============================================================================
import { computeV2Beats, V2_DEFAULT_REVEAL_VOICE_SECONDS } from "./lib/timing";

export const VOICE_REEL_FPS = 30;

// Default per-clip durations for Studio preview / koala-spike fixture.
// Real renders override these via the worker's ffprobe pass.
const DEFAULT_Q1_SECS = 2.0;
const DEFAULT_A1_SECS = 2.7;
const DEFAULT_Q2_SECS = 2.9;
const DEFAULT_A2_SECS = 5.9;
const VOICE_THINKING_SECS = 0.8;
const VOICE_TAIL_BUFFER_SECS = 0.4;

/**
 * Sum of conversation timing for the input beat. Mirrors the V_* sub-
 * phase windows: idle + q1 + a1 + thinking + q2 + a2 + tail buffer.
 */
function totalVoiceInputSecs(
  q1: number,
  a1: number,
  q2: number,
  a2: number,
): number {
  const VOICE_IDLE_SECS = 0.6;
  return (
    VOICE_IDLE_SECS +
    q1 +
    a1 +
    VOICE_THINKING_SECS +
    q2 +
    a2 +
    VOICE_TAIL_BUFFER_SECS
  );
}

export const VOICE_REEL_DEFAULT_DURATION_FRAMES = computeV2Beats({
  fps: VOICE_REEL_FPS,
  inputVoiceSeconds: totalVoiceInputSecs(
    DEFAULT_Q1_SECS,
    DEFAULT_A1_SECS,
    DEFAULT_Q2_SECS,
    DEFAULT_A2_SECS,
  ),
  revealVoiceSeconds: V2_DEFAULT_REVEAL_VOICE_SECONDS,
}).totalFrames;

/** @deprecated kept for back-compat — see TextDemoReelV2 for rationale. */
export const VOICE_REEL_DURATION_FRAMES = VOICE_REEL_DEFAULT_DURATION_FRAMES;

// Reveal config — kept in sync with text/image variants. Stamp speed
// fixed; reveal beat duration grows with adult-voice length.
const STAMPS_PER_ROW = 24;
const ROWS = 24;
const TOTAL_STAMPS = STAMPS_PER_ROW * ROWS;
const STAMP_PATH = makeBoustrophedonPath(STAMPS_PER_ROW, ROWS);
const REVEAL_REFERENCE_FRAMES = 240;
const REVEAL_SPEED_FACTOR = TOTAL_STAMPS / REVEAL_REFERENCE_FRAMES;

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
  /** Per-clip durations in seconds — drive sub-phase windows so each
   *  audio clip plays in full before the next phase. Probed by the
   *  worker via ffprobe; defaults are tuned to the koala-spike fixtures
   *  for Studio preview. */
  q1AudioSeconds?: number;
  a1AudioSeconds?: number;
  q2AudioSeconds?: number;
  a2AudioSeconds?: number;
  adultVoiceSeconds?: number;
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
  q1AudioSeconds = DEFAULT_Q1_SECS,
  a1AudioSeconds = DEFAULT_A1_SECS,
  q2AudioSeconds = DEFAULT_Q2_SECS,
  a2AudioSeconds = DEFAULT_A2_SECS,
  adultVoiceSeconds = V2_DEFAULT_REVEAL_VOICE_SECONDS,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: vWidth } = useVideoConfig();

  // Outer-beat boundaries (intro/hook/input/reveal/outro) — input beat
  // sums all four conversation clips + thinking + buffer, reveal flexes
  // for adult voice. See ./lib/timing.ts for shared math.
  const inputVoiceSeconds = totalVoiceInputSecs(
    q1AudioSeconds,
    a1AudioSeconds,
    q2AudioSeconds,
    a2AudioSeconds,
  );
  const beats = computeV2Beats({
    fps,
    inputVoiceSeconds,
    revealVoiceSeconds: adultVoiceSeconds,
  });

  // Sub-phase boundaries within the input beat — drive the visual
  // mic-idle / Q-orb-pulse / A-recording-bars transitions so the
  // graphic phases stay in sync with the actual audio playback.
  const fSec = (s: number) => Math.round(s * fps);
  const V_MIC_IDLE_END = fSec(0.6);
  const V_Q1_END = V_MIC_IDLE_END + fSec(q1AudioSeconds + 0.2);
  const V_A1_REC_END = V_Q1_END + fSec(a1AudioSeconds + 0.3);
  const V_THINKING_END = V_A1_REC_END + fSec(VOICE_THINKING_SECS);
  const V_Q2_END = V_THINKING_END + fSec(q2AudioSeconds + 0.2);

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
  const inputLocal = frame - beats.inputStart;
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
    const t = (inputLocal - V_Q2_END) / (beats.inputDur - V_Q2_END);
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
  const toolbarLocal = frame - beats.revealStart;
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
  const revealLocal = frame - beats.revealStart;
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
      <Sequence from={beats.introStart} durationInFrames={beats.introDur}>
        <IntroCard durationFrames={beats.introDur} />
      </Sequence>

      <Sequence from={beats.hookStart} durationInFrames={beats.hookDur}>
        <HookCard
          line1="Just say what you want"
          line2="to color"
          durationFrames={beats.hookDur}
        />
      </Sequence>

      {/* ── Beat 3 — voice conversation scene (visual only — voice
              audio mounts at the composition root below) ───────────── */}
      <Sequence from={beats.inputStart} durationInFrames={beats.inputDur}>
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
      </Sequence>

      {/* ── Beat 4: canvas + toolbar + palette — identical to other variants ── */}
      <Sequence from={beats.revealStart} durationInFrames={beats.revealDur}>
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
      </Sequence>

      {/* ── Beat 5: outro ─────────────────────────────────────────────── */}
      <Sequence from={beats.outroStart} durationInFrames={beats.outroDur}>
        <OutroCard
          finishedImageUrl={finishedImageUrl}
          durationFrames={beats.outroDur}
        />
      </Sequence>

      {/* ===========================================================
          AUDIO — voice + SFX live at COMPOSITION ROOT, never inside
          a bounded <Sequence durationInFrames=…>. Same fix as
          TextDemoReelV2 — see the audio-routing comment there.

          Sub-phase boundaries are computed from per-clip ffprobe'd
          durations (V_*_END), so a longer-than-default Q1 still gets
          enough air before A1 begins. Without this, longer Q1 clips
          got cut off mid-question — the bug we're fixing.
          =========================================================== */}

      {/* Q1 — adult question. */}
      <Sequence from={beats.inputStart + V_MIC_IDLE_END}>
        <Audio src={q1AudioUrl} volume={1} />
      </Sequence>

      {/* A1 — kid's first answer. */}
      {a1AudioUrl && (
        <Sequence from={beats.inputStart + V_Q1_END}>
          <Audio src={a1AudioUrl} volume={1} />
        </Sequence>
      )}

      {/* Q2 — adult follow-up. */}
      <Sequence from={beats.inputStart + V_THINKING_END}>
        <Audio src={q2AudioUrl} volume={1} />
      </Sequence>

      {/* A2 — kid's elaboration. */}
      {a2AudioUrl && (
        <Sequence from={beats.inputStart + V_Q2_END}>
          <Audio src={a2AudioUrl} volume={1} />
        </Sequence>
      )}

      {/* Beat 4 (canvas reveal): swish + kids "yay" on entrance, pencil
          draw loop, adult narrator. */}
      <Sequence from={beats.revealStart}>
        <Audio src={staticFile("v2-sfx/swish.mp3")} volume={0.6} />
      </Sequence>
      <Sequence from={beats.revealStart}>
        <Audio src={staticFile("v2-sfx/kids-yay.mp3")} volume={0.6} />
      </Sequence>
      <Sequence
        from={beats.revealStart + 20}
        durationInFrames={beats.revealDur - 20}
      >
        <Audio src={staticFile("v2-sfx/draw.mp3")} volume={0.45} loop />
      </Sequence>
      {adultVoiceUrl ? (
        <Sequence from={beats.revealVoiceStart}>
          <Audio src={adultVoiceUrl} volume={1} />
        </Sequence>
      ) : null}

      {backgroundMusicUrl ? (
        <Audio src={backgroundMusicUrl} volume={0.18} loop />
      ) : null}
    </AbsoluteFill>
  );
};
