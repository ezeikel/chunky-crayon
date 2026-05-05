/**
 * Voice-aware beat timing for Content Reels.
 *
 * Hook-first scroll-stop layout: the very first frame is the hook line
 * already mid-reveal, no separate intro card. Content reels live or die on
 * frame 0 — a brand splash there costs us a scroll.
 *
 * Brand mark moves to the OUTRO beat as a "yes, we made the thing you
 * just learned" credit. Reads as the conclusion, not a preamble.
 *
 * Audio routing (the demo-reel cut-off bug we're avoiding):
 *
 *   1. <Audio> tags live at the COMPOSITION ROOT, never inside a
 *      <Sequence durationInFrames={N}>. Remotion truncates audio that's
 *      a child of a bounded Sequence — root-level audio plays its full
 *      duration.
 *
 *   2. Beat boundaries are COMPUTED from voice durations, not hardcoded.
 *      The visual beats end after the voice clip + a 0.4s buffer, so
 *      animations finish naturally and we never cut a sentence.
 *
 *   3. Music is continuous, ducked under voice via volume tags at root.
 */

export type BeatTimings = {
  fps: number;
  /** Total composition length, in frames. Drives durationInFrames. */
  totalFrames: number;

  /** ── Beat 1: hook (problem-first), starts immediately at frame 0 ─── */
  hookStart: number;
  /** Frame at which the hook voice clip plays. Equals hookStart. */
  hookVoiceStart: number;
  hookDur: number;
  hookEnd: number;

  /** ── Beat 2: number reveal (with light-leak burst) ───────────────── */
  revealStart: number;
  revealDur: number;
  revealEnd: number;

  /** ── Beat 3: payoff narration + payoff text ──────────────────────── */
  payoffStart: number;
  payoffVoiceStart: number;
  payoffDur: number;
  payoffEnd: number;

  /** ── Beat 4: outro — source attribution + CTA + brand-mark slide-in */
  outroStart: number;
  outroDur: number;
};

export type ComputeBeatsInput = {
  fps: number;
  /** Hook voice clip length in seconds. Pulled from ElevenLabs response. */
  hookVoiceSeconds: number;
  /** Payoff voice clip length in seconds. */
  payoffVoiceSeconds: number;
};

/**
 * Compute beat boundaries from voice durations.
 *
 *   hook (voice + 0.4s)     — starts at frame 0; problem-first hook
 *   reveal (1.5s, fixed)    — number scales + light-leak, no voice
 *   payoff (voice + 0.4s)   — adult narrator delivers the resolution
 *   outro (1.5s, fixed)     — source + CTA + brand-mark slides in
 *
 * The 0.4s post-voice buffer gives the speaker breathing room: their
 * sentence finishes ~0.4s before the next visual beat takes the eye
 * elsewhere.
 *
 * Reveal + outro are fixed because they're music/visual-driven, not
 * voice-driven — keeping them rigid avoids dead air mid-reel.
 */
export const computeBeats = ({
  fps,
  hookVoiceSeconds,
  payoffVoiceSeconds,
}: ComputeBeatsInput): BeatTimings => {
  const POST_VOICE_BUFFER_SECS = 0.4;
  const REVEAL_SECS = 1.5;
  const OUTRO_SECS = 1.5;

  const f = (s: number) => Math.round(s * fps);

  // No intro beat — hook starts at frame 0 to scroll-stop on first paint.
  const hookStart = 0;
  const hookDur = f(hookVoiceSeconds + POST_VOICE_BUFFER_SECS);
  const hookEnd = hookStart + hookDur;

  const revealStart = hookEnd;
  const revealDur = f(REVEAL_SECS);
  const revealEnd = revealStart + revealDur;

  const payoffStart = revealEnd;
  const payoffDur = f(payoffVoiceSeconds + POST_VOICE_BUFFER_SECS);
  const payoffEnd = payoffStart + payoffDur;

  const outroStart = payoffEnd;
  const outroDur = f(OUTRO_SECS);
  const totalFrames = outroStart + outroDur;

  return {
    fps,
    totalFrames,
    hookStart,
    hookVoiceStart: hookStart,
    hookDur,
    hookEnd,
    revealStart,
    revealDur,
    revealEnd,
    payoffStart,
    payoffVoiceStart: payoffStart,
    payoffDur,
    payoffEnd,
    outroStart,
    outroDur,
  };
};

/**
 * Default voice durations used when a real voice URL isn't supplied
 * (Studio preview without fixture audio, fallback for missing TTS).
 *
 * Tuned to match a typical ~10-12-word hook/payoff at ElevenLabs's mid
 * speaking rate. If the actual clip differs, beats stretch to fit.
 */
export const DEFAULT_HOOK_VOICE_SECONDS = 3.0;
export const DEFAULT_PAYOFF_VOICE_SECONDS = 3.2;
