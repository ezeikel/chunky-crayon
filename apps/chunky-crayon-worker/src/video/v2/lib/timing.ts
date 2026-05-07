/**
 * Voice-aware beat timing for V2 demo reels (Text/Image/Voice).
 *
 * Mirrors content-reel/shared/timing.ts. The bug it solves: every V2
 * comp had hardcoded F_INPUT_DUR / F_REVEAL_DUR (180 / 240 frames),
 * with `<Audio src={kidVoiceUrl} />` mounted INSIDE
 * `<Sequence durationInFrames={F_INPUT_DUR}>`. When the voice clip
 * exceeded the beat (or even came close, given the swoosh's ~0.5s
 * pre-roll), Remotion truncated it at the sequence's end frame and
 * the viewer heard a sentence get cut mid-word.
 *
 * The two-part fix matches what content reels already do:
 *
 *   1. Beat boundaries are COMPUTED from voice durations + a 0.4s
 *      post-voice buffer. Visual beats end after the voice has space
 *      to finish naturally; the next scene doesn't pull the eye away
 *      mid-sentence.
 *
 *   2. Each <Audio> is mounted in `<Sequence from={beatStart}>` with
 *      NO durationInFrames. That shifts the audio's t=0 to the beat
 *      start, but its end is bounded only by the outer composition.
 *      Music goes at the absolute root (looped, ducked) so it wraps
 *      every beat.
 *
 * INTRO + HOOK + REVEAL + OUTRO stay fixed (visual-only beats with no
 * voice or music-driven beats). INPUT (typing/photo-upload/Q-and-A)
 * + REVEAL_VOICE-OVER (adult narrator over canvas reveal) flex with
 * voice length.
 */

export type V2BeatTimings = {
  fps: number;
  /** Total composition length in frames — drives durationInFrames. */
  totalFrames: number;

  /** ── Beat 1: brand intro card ───────────────────────────────────── */
  introStart: number;
  introDur: number;
  introEnd: number;

  /** ── Beat 2: hook card ──────────────────────────────────────────── */
  hookStart: number;
  hookDur: number;
  hookEnd: number;

  /**
   * ── Beat 3: input scene ─────────────────────────────────────────────
   * TEXT: the prompt typing scene with kid voiceover
   * IMAGE: the photo-upload scene with adult voiceover saying "look
   *        what we made from your photo"
   * VOICE: the kid Q1 + A1 + Q2 + A2 conversation. Single beat that
   *        sums the four-clip durations + buffers (caller passes the
   *        sum as `inputVoiceSeconds`).
   *
   * The early voiceover (kid for TEXT, adult for IMAGE, q1+a1+q2+a2
   * for VOICE) plays during this beat. inputDur grows with voice.
   */
  inputStart: number;
  /** Frame at which the INPUT-scene voice starts (= inputStart). */
  inputVoiceStart: number;
  inputDur: number;
  inputEnd: number;

  /**
   * ── Beat 4: canvas reveal (Magic Brush sweep + adult narrator) ──
   *
   * The adult voiceover plays here. Visually the canvas reveals at a
   * fixed stamp speed, so revealDur is the MAX of:
   *   - the fixed visual minimum (so the brush sweep completes)
   *   - the adult voice duration + 0.4s buffer
   *
   * Caller controls the visual minimum via `revealMinSecs`.
   */
  revealStart: number;
  /** Frame at which the adult voice starts (= revealStart). */
  revealVoiceStart: number;
  revealDur: number;
  revealEnd: number;

  /** ── Beat 5: outro — finished art + brand stamp + CTA ───────────── */
  outroStart: number;
  outroDur: number;
};

export type ComputeV2BeatsInput = {
  fps: number;
  /**
   * Voice-clip duration during the INPUT scene. For TEXT this is the
   * kid voice; for IMAGE it's the early adult line; for VOICE it's
   * the sum of q1+a1+q2+a2 (with the conversation gaps already added
   * by the caller).
   */
  inputVoiceSeconds: number;
  /**
   * Seconds the input voice waits AFTER the input scene starts before
   * actually playing. IMAGE delays the early voice by ~2s so the photo
   * can drop-in before the narrator reacts. Without accounting for
   * this, computeV2Beats sizes the input beat for `voice + buffer` —
   * but the voice doesn't start until `inputStart + leadIn`, so the
   * scene cuts the voice off after `inputDur - leadIn` seconds.
   *
   * TEXT: 0 (voice starts at inputStart).
   * IMAGE: 2.0 (60-frame photo drop-in delay).
   * VOICE: 0 (sub-phase windows already account for sequencing).
   *
   * Default 0.
   */
  inputVoiceLeadInSecs?: number;
  /**
   * Voice-clip duration during the REVEAL scene (adult narrator).
   */
  revealVoiceSeconds: number;
  /**
   * Floor for the reveal beat in seconds. The brush stamp sweep needs
   * at least this much time to draw the full canvas. revealDur =
   * max(revealMinSecs, revealVoiceSeconds + buffer). Default 8s
   * matches the original F_REVEAL_DUR=240 at fps=30.
   */
  revealMinSecs?: number;
};

export const V2_INTRO_SECS = 1.5; // 45 frames at 30fps
export const V2_HOOK_SECS = 2.0; // 60 frames at 30fps
export const V2_OUTRO_SECS = 3.0; // 90 frames at 30fps
export const V2_REVEAL_DEFAULT_MIN_SECS = 8.0; // 240 frames at 30fps
const V2_POST_VOICE_BUFFER_SECS = 0.4;
/**
 * Floor for the input beat. Even with a short 2s voice clip the
 * scene needs time to: card slide-in, swoosh, typing animation, settle.
 * 6s matches the original F_INPUT_DUR=180 at 30fps.
 */
export const V2_INPUT_DEFAULT_MIN_SECS = 6.0;

export function computeV2Beats({
  fps,
  inputVoiceSeconds,
  inputVoiceLeadInSecs = 0,
  revealVoiceSeconds,
  revealMinSecs = V2_REVEAL_DEFAULT_MIN_SECS,
}: ComputeV2BeatsInput): V2BeatTimings {
  const f = (s: number) => Math.round(s * fps);

  const introStart = 0;
  const introDur = f(V2_INTRO_SECS);
  const introEnd = introStart + introDur;

  const hookStart = introEnd;
  const hookDur = f(V2_HOOK_SECS);
  const hookEnd = hookStart + hookDur;

  // Input beat flexes with voice length, accounting for any pre-voice
  // lead-in (e.g. IMAGE's 2s photo drop-in delay before the narrator
  // reacts). Floor stays at V2_INPUT_DEFAULT_MIN_SECS for the visual
  // animation chain (card slide-in + swoosh + tween + settle).
  const inputDurSecs = Math.max(
    V2_INPUT_DEFAULT_MIN_SECS,
    inputVoiceLeadInSecs + inputVoiceSeconds + V2_POST_VOICE_BUFFER_SECS,
  );
  const inputStart = hookEnd;
  const inputDur = f(inputDurSecs);
  const inputEnd = inputStart + inputDur;

  // Reveal beat: brush sweep at fixed stamp speed needs at least
  // revealMinSecs to draw the canvas. If the adult voice is longer,
  // the beat extends so the narration finishes on screen.
  const revealDurSecs = Math.max(
    revealMinSecs,
    revealVoiceSeconds + V2_POST_VOICE_BUFFER_SECS,
  );
  const revealStart = inputEnd;
  const revealDur = f(revealDurSecs);
  const revealEnd = revealStart + revealDur;

  const outroStart = revealEnd;
  const outroDur = f(V2_OUTRO_SECS);
  const totalFrames = outroStart + outroDur;

  return {
    fps,
    totalFrames,
    introStart,
    introDur,
    introEnd,
    hookStart,
    hookDur,
    hookEnd,
    inputStart,
    inputVoiceStart: inputStart,
    inputDur,
    inputEnd,
    revealStart,
    revealVoiceStart: revealStart,
    revealDur,
    revealEnd,
    outroStart,
    outroDur,
  };
}

/**
 * Default voice durations for Studio preview / fallback when ffprobe
 * is unavailable. Tuned to match the typical ElevenLabs output for
 * the V2 reel scripts we generate (~10-15-word line).
 */
export const V2_DEFAULT_INPUT_VOICE_SECONDS = 4.0;
export const V2_DEFAULT_REVEAL_VOICE_SECONDS = 5.0;
