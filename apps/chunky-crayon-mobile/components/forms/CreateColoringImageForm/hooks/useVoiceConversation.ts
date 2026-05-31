import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { transcribeVoice, getVoiceFollowUp } from "@/api";

/**
 * Mobile 2-turn voice conversation hook — RN port of web's
 * useVoiceConversation.ts. Same state machine + public surface so the
 * VoiceInput render layer mirrors web 1:1.
 *
 * Flow:
 *   idle → q1_playing (cached Q1 audio) → recording_a1 → (stop) →
 *   processing_q2 (POST /voice/transcribe A1, then /voice/follow-up) →
 *   q2_playing (dynamic Q2 audio) → recording_a2 → (stop) →
 *   ready_to_submit (transcribe A2; hand {a1,a2} to parent) ; or → error.
 *
 * Differs from web only in transport: web streams via Deepgram WS for live
 * bars; mobile records each turn with expo-audio and POSTs the file to the
 * prerecorded /voice/transcribe endpoint (more accurate for short kid clips,
 * no WS lifecycle — verified the m4a/AAC output transcribes directly). Live
 * bars + silence auto-stop come from the recorder's metering status.
 */

// Fixed Q1 — same cached R2 audio + copy as web (constants.ts VOICE_Q1_*).
export const VOICE_Q1_TEXT = "Tell us what you want to colour.";
export const VOICE_Q1_AUDIO_URL =
  "https://assets.chunkycrayon.com/voice-tts/fb5e5f11aab81d0a2a93632ec3e737869706515e0edd1e7494a70a4fe175cdba.mp3";

export type VoiceConversationState =
  | "idle"
  | "q1_playing"
  | "recording_a1"
  | "processing_q2"
  | "q2_playing"
  | "recording_a2"
  | "ready_to_submit"
  | "error";

export type VoiceConversationError =
  | "permission_denied"
  | "q1_audio_failed"
  | "stt_failed"
  | "follow_up_failed"
  | "follow_up_blocked"
  | "q2_audio_failed"
  | "timeout"
  | "requires_signin";

// Silence auto-stop: once speech is detected, this many ms below the speech
// threshold ends the turn. Metering is in dBFS (negative; 0 = loudest).
const SPEECH_DB = -35;
const SILENCE_HOLD_MS = 1500;
const MAX_TURN_MS = 30_000;
const NO_SPEECH_TIMEOUT_MS = 8_000;

type UseVoiceConversation = {
  state: VoiceConversationState;
  error: VoiceConversationError | null;
  firstAnswer: string;
  secondAnswer: string;
  /** 0..1 normalised mic level for the audio bars (0 when not recording). */
  audioLevel: number;
  silenceDetected: boolean;
  start: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
  fail: (code: VoiceConversationError) => void;
  restore: (firstAnswer: string, secondAnswer: string) => void;
};

// dBFS (~ -60..0) → 0..1 for the bars.
const normalizeLevel = (db: number): number => {
  if (!Number.isFinite(db)) return 0;
  const clamped = Math.max(-60, Math.min(0, db));
  return (clamped + 60) / 60;
};

export function useVoiceConversation(): UseVoiceConversation {
  const [state, setState] = useState<VoiceConversationState>("idle");
  const [error, setErrorState] = useState<VoiceConversationError | null>(null);
  const [firstAnswer, setFirstAnswer] = useState("");
  const [secondAnswer, setSecondAnswer] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceDetected, setSilenceDetected] = useState(false);

  // Which turn the recorder is currently capturing, so the shared status
  // listener routes the finished clip to the right handler.
  const turnRef = useRef<"a1" | "a2" | null>(null);
  const speechSeenRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);
  const turnStartedAtRef = useRef(0);
  const stoppingRef = useRef(false);
  // Run/generation token. Bumped on every start() and reset(). Each async
  // continuation in start() captures the token at entry and bails if it no
  // longer matches — so a cancelled (reset) conversation can't resume itself
  // via a late-resolving recorder/fetch and clobber the idle state.
  const runIdRef = useRef(0);
  // Resolver for the in-flight recordTurn() promise. Declared here (not lower)
  // so reset() can resolve+clear it to unwind a stranded start().
  const turnResolveRef = useRef<((uri: string | null) => void) | null>(null);

  // Metering must be enabled for `state.metering` to populate (drives the
  // bars + silence auto-stop). Poll at 100ms for responsive bars.
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 100);

  // Q1 (cached) + Q2 (dynamic) playback. Q2 source is swapped in before play.
  const q1Player = useAudioPlayer(VOICE_Q1_AUDIO_URL);
  const q2Player = useAudioPlayer();

  const setError = useCallback((code: VoiceConversationError) => {
    setErrorState(code);
    setState("error");
    turnRef.current = null;
  }, []);

  const fail = useCallback(
    (code: VoiceConversationError) => setError(code),
    [setError],
  );

  const reset = useCallback(() => {
    // Invalidate the current run so any late recorder/fetch continuation bails.
    runIdRef.current += 1;
    turnRef.current = null;
    speechSeenRef.current = false;
    silenceSinceRef.current = null;
    stoppingRef.current = false;
    // Unwind a stranded recordTurn() awaiter (Cancel mid-recording) and clear
    // the resolver so a late stopRecording IIFE can't fire it.
    const pending = turnResolveRef.current;
    turnResolveRef.current = null;
    pending?.(null);
    // Stop the native recorder so the mic doesn't stay hot after Cancel.
    recorder.stop().catch(() => {});
    setFirstAnswer("");
    setSecondAnswer("");
    setAudioLevel(0);
    setSilenceDetected(false);
    setErrorState(null);
    setState("idle");
  }, [recorder]);

  const restore = useCallback((a1: string, a2: string) => {
    setFirstAnswer(a1);
    setSecondAnswer(a2);
    setState("ready_to_submit");
  }, []);

  // Play an audio URL to completion (or reject on failure). Used for Q1/Q2.
  const playToEnd = useCallback(
    (player: ReturnType<typeof useAudioPlayer>, url?: string) =>
      new Promise<void>((resolve, reject) => {
        try {
          if (url) player.replace(url);
          player.seekTo(0);
          const sub = player.addListener("playbackStatusUpdate", (s) => {
            if (s.didJustFinish) {
              sub.remove();
              resolve();
            }
          });
          player.play();
        } catch (err) {
          reject(err instanceof Error ? err : new Error("audio_failed"));
        }
      }),
    [],
  );

  // Record one turn: prepare → record → resolves with the file URI when the
  // metering loop (or the user) stops it.
  const recordTurn = useCallback(async (): Promise<string | null> => {
    speechSeenRef.current = false;
    silenceSinceRef.current = null;
    stoppingRef.current = false;
    turnStartedAtRef.current = Date.now();
    setSilenceDetected(false);
    await recorder.prepareToRecordAsync();
    // If the turn was cancelled (reset/Cancel) during the async prepare —
    // before the resolver below was installed — don't open the mic on a dead
    // run. reset()'s recorder.stop() raced ahead of record() in that window.
    if (turnRef.current == null) return null;
    recorder.record();
    return new Promise<string | null>((resolve) => {
      turnResolveRef.current = resolve;
    });
  }, [recorder]);

  const stopRecording = useCallback(() => {
    if (stoppingRef.current || turnRef.current == null) return;
    stoppingRef.current = true;
    void (async () => {
      try {
        await recorder.stop();
      } catch {
        /* stop after already-stopped is non-fatal */
      }
      setAudioLevel(0);
      const uri = recorder.uri ?? null;
      const resolve = turnResolveRef.current;
      turnResolveRef.current = null;
      resolve?.(uri);
    })();
  }, [recorder]);

  // Stable ref so the metering effect can call the latest stopRecording.
  const stopRecordingRef = useRef(stopRecording);
  stopRecordingRef.current = stopRecording;

  // Metering loop — runs while a turn is recording. Drives the bars, the
  // "Anything else?" silence hint, silence auto-stop, and the hard caps.
  useEffect(() => {
    if (turnRef.current == null || !recorderState.isRecording) return;
    const db = recorderState.metering ?? -160;
    setAudioLevel(normalizeLevel(db));

    const now = Date.now();
    if (db > SPEECH_DB) {
      speechSeenRef.current = true;
      silenceSinceRef.current = null;
      setSilenceDetected(false);
    } else if (speechSeenRef.current) {
      if (silenceSinceRef.current == null) silenceSinceRef.current = now;
      const silentFor = now - silenceSinceRef.current;
      setSilenceDetected(silentFor > SILENCE_HOLD_MS / 2);
      if (silentFor > SILENCE_HOLD_MS) stopRecordingRef.current();
    }

    if (now - turnStartedAtRef.current > MAX_TURN_MS) {
      stopRecordingRef.current();
    } else if (
      !speechSeenRef.current &&
      now - turnStartedAtRef.current > NO_SPEECH_TIMEOUT_MS
    ) {
      stopRecordingRef.current();
    }
    // `durationMillis` is monotonic and changes every 100ms poll, so this
    // effect re-runs unconditionally while recording — the silence/no-speech/
    // max-turn timers keep advancing even when `metering` is a flat floor
    // (e.g. a silent room, or the Android emulator's constant -160 dB).
  }, [
    recorderState.metering,
    recorderState.durationMillis,
    recorderState.isRecording,
  ]);

  const start = useCallback(async () => {
    // New run — invalidate any prior conversation's late continuations.
    const runId = (runIdRef.current += 1);
    // True iff this invocation is still the live run (not cancelled/restarted).
    const live = () => runIdRef.current === runId;

    setErrorState(null);
    setFirstAnswer("");
    setSecondAnswer("");

    // Mic permission must be granted BEFORE Q1 plays, or the first utterance
    // is lost (doc pitfall #2).
    const perm = await requestRecordingPermissionsAsync();
    if (!live()) return;
    if (!perm.granted) {
      setError("permission_denied");
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true });
    if (!live()) return;

    // ── Q1 ──
    setState("q1_playing");
    try {
      await playToEnd(q1Player);
    } catch {
      if (live()) setError("q1_audio_failed");
      return;
    }
    if (!live()) return;

    // ── A1 ──
    setState("recording_a1");
    turnRef.current = "a1";
    const a1Uri = await recordTurn();
    turnRef.current = null;
    if (!live()) return;
    if (!a1Uri) {
      setError("stt_failed");
      return;
    }

    // ── transcribe A1 + generate Q2 ──
    setState("processing_q2");
    let a1Text: string;
    try {
      const { transcript } = await transcribeVoice(a1Uri);
      if (!live()) return;
      a1Text = transcript.trim();
      if (!a1Text) {
        setError("stt_failed");
        return;
      }
      setFirstAnswer(a1Text);
    } catch {
      if (live()) setError("stt_failed");
      return;
    }

    let q2Url: string;
    try {
      const { followUpAudioUrl } = await getVoiceFollowUp(a1Text);
      if (!live()) return;
      q2Url = followUpAudioUrl;
    } catch (err) {
      if (!live()) return;
      // 4xx moderation block vs generic failure — branch like web.
      const code = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(
        code === "blocklisted" ||
          code === "moderation_flagged" ||
          code === "too_long"
          ? "follow_up_blocked"
          : "follow_up_failed",
      );
      return;
    }

    // ── Q2 ──
    setState("q2_playing");
    try {
      await playToEnd(q2Player, q2Url);
    } catch {
      if (live()) setError("q2_audio_failed");
      return;
    }
    if (!live()) return;

    // ── A2 ──
    setState("recording_a2");
    turnRef.current = "a2";
    const a2Uri = await recordTurn();
    turnRef.current = null;
    if (!live()) return;
    if (!a2Uri) {
      // No second answer is acceptable — Q1 alone is a valid description.
      setState("ready_to_submit");
      return;
    }

    try {
      const { transcript } = await transcribeVoice(a2Uri);
      if (!live()) return;
      setSecondAnswer(transcript.trim());
    } catch {
      // A2 transcription failed, but we still have A1 — proceed.
      if (!live()) return;
    }
    setState("ready_to_submit");
  }, [playToEnd, q1Player, q2Player, recordTurn, setError]);

  // Cleanup on unmount: stop any in-flight recording.
  useEffect(
    () => () => {
      if (turnRef.current) {
        recorder.stop().catch(() => {});
      }
    },
    [recorder],
  );

  return {
    state,
    error,
    firstAnswer,
    secondAnswer,
    audioLevel,
    silenceDetected,
    start,
    stopRecording,
    reset,
    fail,
    restore,
  };
}
