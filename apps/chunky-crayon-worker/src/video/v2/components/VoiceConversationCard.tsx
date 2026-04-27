/**
 * Demo Reel V2 — voice conversation card.
 *
 * Beat 3 component for the voice variant. Mocks the live `<VoiceInput>`
 * 2-turn flow visually — there's no real STT/Claude/TTS at render time;
 * the reel choreography drives all motion off `useCurrentFrame()`.
 *
 * Visual states (driven by props):
 *   - 'mic_idle'         — big orange mic, tap-to-start ring
 *   - 'q1_playing'       — mic dimmed, "listen" caption
 *   - 'recording_a1'     — mic pulses, audio bars visualise speech
 *   - 'transcript_a1'    — bubble shows what the user said
 *   - 'thinking'         — small spinner + "hmm..." copy
 *   - 'q2_playing'       — mic dimmed, "listen" caption
 *   - 'recording_a2'     — mic pulses again
 *   - 'transcript_a2'    — second bubble shows the elaborated answer
 *
 * The reel passes a single `phase` prop and a 0..1 `intensity` for the
 * audio-bars animation when recording. Visual mirror of the live UI in
 * `apps/chunky-crayon-web/components/forms/CreateColoringPageForm/inputs/VoiceInput.tsx`.
 */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMicrophoneLines,
  faSpinnerThird,
} from "@fortawesome/pro-duotone-svg-icons";
import { COLORS, RADII, SHADOWS } from "../tokens/brand";

export type VoicePhase =
  | "mic_idle"
  | "q1_playing"
  | "recording_a1"
  | "thinking"
  | "q2_playing"
  | "recording_a2"
  | "settled";

type VoiceConversationCardProps = {
  phase: VoicePhase;
  /**
   * 0..1 — fake audio level for the bars during recording_*.
   * Reel choreography drives this off a sine wave so the bars dance
   * naturally without real audio. Ignored in non-recording phases.
   */
  intensity?: number;
  /**
   * 0..1 — phase progression for the thinking spinner. Reel passes
   * `(currentFrame - thinkingStart) / thinkingDuration` so the spinner
   * rotates frame-deterministically (Remotion pre-renders, no CSS animation).
   */
  thinkingProgress?: number;
  /**
   * 0..1 — orb pulse phase for q1_playing / q2_playing. Reel drives this
   * off a sine wave so the orb breathes while the AI is talking.
   * Mirrors the design pattern in OpenAI / Anthropic / Apple voice modes:
   * a glowing orb represents "AI is speaking", visually distinct from
   * the mic icon (which represents "you are speaking / can speak").
   */
  orbPulse?: number;
};

export const VoiceConversationCard = ({
  phase,
  intensity = 0,
  thinkingProgress = 0,
  orbPulse = 0,
}: VoiceConversationCardProps) => {
  const isRecording = phase === "recording_a1" || phase === "recording_a2";
  const isPlaying = phase === "q1_playing" || phase === "q2_playing";
  const isThinking = phase === "thinking";
  const isMic = !isPlaying && !isThinking;

  // Mic scale — subtle pulse while recording.
  const baseMicScale = isRecording ? 1 + 0.04 * intensity : 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        padding: 32,
        borderRadius: RADII.card,
        background: COLORS.textInverted,
        border: `2px solid ${COLORS.borderLight}`,
        boxShadow: SHADOWS.surface,
        alignItems: "center",
        minHeight: 480,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 480,
          height: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* ── AI-speaking orb — replaces the mic when Q1 or Q2 plays ─── */}
        {isPlaying && <SpeakingOrb pulse={orbPulse} />}

        {/* ── Mic + bars — only shown when the user can/is speaking ──── */}
        {isMic && (
          <div
            style={{
              position: "relative",
              width: 160,
              height: 160,
              borderRadius: RADII.pill,
              background: COLORS.orange,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${baseMicScale})`,
              boxShadow: isRecording
                ? `0 0 0 ${16 * intensity}px ${COLORS.orange}33, 0 8px 24px rgba(0,0,0,0.15)`
                : `0 8px 24px rgba(0,0,0,0.15)`,
            }}
          >
            <FontAwesomeIcon
              icon={faMicrophoneLines}
              style={{ fontSize: 80, color: COLORS.textInverted }}
            />

            {/* Audio bars — anchored to the mic, positioned OUTSIDE its
                outer glow so they don't overlap. Hidden in non-recording. */}
            {isRecording && (
              <>
                <div
                  style={{
                    position: "absolute",
                    right: "100%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    marginRight: 48,
                    pointerEvents: "none",
                  }}
                >
                  <AudioBars intensity={intensity} mirror />
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: "100%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    marginLeft: 48,
                    pointerEvents: "none",
                  }}
                >
                  <AudioBars intensity={intensity} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Thinking spinner — replaces the mic between Q1 → Q2 ─────── */}
        {isThinking && (
          <div style={{ transform: `rotate(${thinkingProgress * 720}deg)` }}>
            <FontAwesomeIcon
              icon={faSpinnerThird}
              style={{ fontSize: 120, color: COLORS.orange }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AI-speaking orb ─────────────────────────────────────────────────────
//
// Visual pattern adopted by OpenAI ChatGPT voice, Anthropic Claude voice,
// Apple Siri, Google Assistant: a glowing shape that's distinctly NOT a
// mic represents "the AI is speaking now". Lets viewers immediately tell
// who's talking without reading any caption.
//
// We use a soft orange-to-pink radial gradient with two layers of pulse:
// the inner orb scales subtly, and outer halos expand outward in waves.
// `pulse` is 0..1 driven by frame so the breath is deterministic.
const SpeakingOrb = ({ pulse }: { pulse: number }) => {
  // Two outer halos at different phases — gives a "ripple" effect.
  const halo1Scale = 1 + 0.5 * pulse;
  const halo1Opacity = 0.4 * (1 - pulse);
  const halo2Scale = 1 + 0.5 * Math.max(0, pulse - 0.3);
  const halo2Opacity = 0.3 * Math.max(0, 1 - (pulse - 0.3) / 0.7);

  // Inner orb breathes gently around 1.0 scale.
  const orbScale = 1 + 0.05 * Math.sin(pulse * Math.PI * 2);

  return (
    <div
      style={{
        position: "relative",
        width: 200,
        height: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer halo 1 */}
      <div
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.orange}66 0%, transparent 70%)`,
          transform: `scale(${halo1Scale})`,
          opacity: halo1Opacity,
        }}
      />
      {/* Outer halo 2 (phased) */}
      <div
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.pink}55 0%, transparent 70%)`,
          transform: `scale(${halo2Scale})`,
          opacity: halo2Opacity,
        }}
      />
      {/* The orb itself — orange→pink gradient, drop shadow for depth */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${COLORS.orangeLight}, ${COLORS.orange} 60%, ${COLORS.pink} 100%)`,
          transform: `scale(${orbScale})`,
          boxShadow: `0 0 40px ${COLORS.orange}55, 0 8px 24px rgba(0,0,0,0.15)`,
        }}
      />
    </div>
  );
};

// ─── Internal — the side audio bars (5 bars, sine-driven heights) ────────
const AudioBars = ({
  intensity,
  mirror = false,
}: {
  intensity: number;
  mirror?: boolean;
}) => {
  const bars = Array.from({ length: 5 }, (_, i) => {
    // Each bar gets a slightly phased intensity so they don't all rise
    // and fall in lockstep — gives the dancing-bars look.
    const phase = i / 5;
    const animated =
      Math.max(0, Math.sin((intensity + phase) * Math.PI * 2)) * 0.7 + 0.3;
    const height = 24 + 56 * animated * intensity;
    return (
      <div
        key={i}
        style={{
          width: 8,
          height,
          borderRadius: 999,
          background: COLORS.orange,
          opacity: 0.85,
        }}
      />
    );
  });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: mirror ? "row-reverse" : "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      {bars}
    </div>
  );
};
