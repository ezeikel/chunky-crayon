'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { VOICE_Q1_AUDIO_URL } from '@/constants';

/**
 * 2-turn voice conversation hook.
 *
 * State machine:
 *
 *   idle
 *    │ user taps mic
 *    ▼
 *   q1_playing            ← cached Q1 audio plays ("Tell us what you want to colour.")
 *    │ audio ended
 *    ▼
 *   recording_a1          ← VAD-gated capture. MediaRecorder ONLY runs while
 *    │                      the user is speaking. User stops via button or
 *    │                      auto-stop on silence. On stop, the buffered
 *    │                      utterance gets POSTed to /api/voice/transcribe.
 *    ▼
 *   processing_q2         ← POST /api/voice/follow-up (moderation + Claude + TTS)
 *    │ response received
 *    ▼
 *   q2_playing            ← Q2 audio plays back
 *    │ audio ended
 *    ▼
 *   recording_a2          ← second VAD-gated cycle
 *    │ user stops OR auto-stop
 *    ▼
 *   submitting            ← parent component calls action (we hand off transcripts)
 *    │ action completes
 *    ▼
 *   done
 *
 * Error / timeout transitions: any state → `error` with a code the UI shows
 * a friendly message for. From `error`, user can `reset()` to `idle`.
 *
 * Why VAD instead of WebSocket streaming:
 *   We tried Deepgram streaming for live UX feedback, but the streaming
 *   transcript was consistently worse than prerecorded — short utterances
 *   don't give Deepgram enough audio to diarize, smart_format re-emits
 *   the same utterance at lower confidence, and 250ms WebM chunks force
 *   container re-stitching that the prerecorded API does for free with
 *   the full file. Net: streaming added no usable signal AND degraded
 *   transcript quality.
 *
 *   Prosper (sister project) uses a VAD-then-record pattern: monitor mic
 *   level, start MediaRecorder only when speech is detected, stop on
 *   silence, POST the bounded blob to prerecorded. We follow that here.
 *   The recorded blob is bounded by actual speech, not by user reaction
 *   time, which kills the "extra word at end" tail bleed AND the "first
 *   500ms is breath/click" lead-in.
 *
 *   Audio level uses time-domain RMS, not frequency-domain averages —
 *   true volume reading instead of smeared spectrum. analyser.smoothing
 *   set to 0.3 (default 0.8) for snappier response. rAF loop instead of
 *   setInterval for lower-latency UI feedback.
 *
 * Caller responsibilities:
 *   - Call `submitConversation()` when state hits `recording_a2`'s natural
 *     end (auto-stop or user-stop). The hook gives you both transcripts;
 *     you pass them to `createColoringImageFromVoiceConversation`.
 *   - Call `reset()` to fully cleanup (close WS, stop tracks, clear refs).
 *
 * See `docs/voice-mode/README.md` for the full architecture.
 */

// ============================================================================
// Types
// ============================================================================

export type VoiceConversationState =
  | 'idle'
  | 'requesting_permission'
  | 'q1_playing'
  | 'recording_a1'
  | 'processing_q2'
  | 'q2_playing'
  | 'recording_a2'
  | 'ready_to_submit'
  | 'error';

export type VoiceConversationError =
  | 'permission_denied'
  | 'not_supported'
  | 'q1_audio_failed'
  | 'stt_failed'
  | 'follow_up_failed'
  | 'follow_up_blocked' // moderation tripped on our input
  | 'q2_audio_failed'
  | 'timeout'
  | 'requires_signin';

export type VoiceConversationResult = {
  state: VoiceConversationState;
  error: VoiceConversationError | null;

  /** Transcripts as they're being captured. Both null until each turn finishes. */
  firstAnswer: string | null;
  secondAnswer: string | null;

  /** Live audio level 0-1 for the mic visualisation during recording_*. */
  audioLevel: number;

  /** Silence-detected flag for showing a "still there?" prompt during recording_*. */
  silenceDetected: boolean;

  /**
   * After a turn ends, the prerecorded transcript. Dev overlay surfaces
   * this so we can sanity-check what the model heard. Cleared at the
   * start of the next turn.
   */
  lastPrerecordedTranscript: string;

  /** Browser supports getUserMedia + MediaRecorder + Audio. Reset can't fix this. */
  isSupported: boolean;

  /** Start the flow — plays Q1, then opens mic for A1 capture. */
  start: () => Promise<void>;

  /** Stop the current recording cycle (A1 or A2) and advance the machine. */
  stopRecording: () => void;

  /** Cancel everything and return to idle. Closes WS, stops tracks. */
  reset: () => void;

  /**
   * Push the hook into the error state from the outside. Used when the
   * parent form's submit fails (moderation block, server error) so we
   * can show the existing error UI + Try Again button instead of
   * stranding the user on "Painting your page…" forever.
   */
  fail: (code: VoiceConversationError) => void;
};

// ============================================================================
// Constants
// ============================================================================

const MAX_RECORDING_DURATION_SECONDS = 30;

// VAD thresholds (0-100 normalised RMS, same scale as prosper). Real
// readings on a Yeti at desk distance: idle ~2, speech peaks ~5-15.
// On a closer mic (built-in laptop, AirPods, headset) speech peaks
// 20-50. We tune for the quieter case and accept that hot-mic users
// might double-trigger on click/breath — recoverable.
//
// SPEECH_THRESHOLD: peak must exceed this (sustained for
// SPEECH_START_DELAY_MS) to start recording.
// SILENCE_THRESHOLD: level under this for SILENCE_AUTO_STOP_MS ends
// recording. Hysteresis (gap between the two) prevents flapping.
const SPEECH_THRESHOLD = 8;
const SILENCE_THRESHOLD = 3;

// How long of confirmed speech before we trust it isn't a click/pop.
// Below this, level spikes from typing, breathing, or a door closing
// won't trigger recording.
const SPEECH_START_DELAY_MS = 200;

// Silence window before auto-stop. Originally 2000ms which felt sluggish
// — kids finished a 4-word sentence and waited 2s for the recorder to
// react. Dropped to 800ms after testing showed the lag was the dominant
// "not responsive" feeling. False auto-stops are recoverable (kid taps
// mic again); false 2-second waits are not. Hint set just below the
// auto-stop so the "Anything else?" nudge has a brief beat to register
// before we cut.
const SILENCE_HINT_MS = 600;
const SILENCE_AUTO_STOP_MS = 800;

// Hard cap on how long we wait for speech to start. If the user taps
// the mic and never speaks, we bail out cleanly instead of leaving the
// mic open forever.
const NO_SPEECH_TIMEOUT_MS = 8000;

// ============================================================================
// Hook
// ============================================================================

export function useVoiceConversation(): VoiceConversationResult {
  const [state, setState] = useState<VoiceConversationState>('idle');
  const [error, setError] = useState<VoiceConversationError | null>(null);
  const [firstAnswer, setFirstAnswer] = useState<string | null>(null);
  const [secondAnswer, setSecondAnswer] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceDetected, setSilenceDetected] = useState(false);

  // Last completed turn's prerecorded transcript — surfaced for the
  // dev-only debug overlay.
  const [lastPrerecordedTranscript, setLastPrerecordedTranscript] =
    useState('');

  // ── Refs (lifecycle resources we need to clean up) ──────────────────────
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Recording window timing — used for hard duration cap.
  const recordingStartedAtRef = useRef<number>(0);

  // VAD timing.
  const speechStartCandidateAtRef = useRef<number>(0); // first frame above threshold
  const silenceStartedAtRef = useRef<number | null>(null); // first frame below threshold AFTER speech began
  const isSpeakingRef = useRef<boolean>(false);
  const monitoringStartedAtRef = useRef<number>(0); // when VAD analyse loop began
  const isMonitoringRef = useRef<boolean>(false);
  const isManualStopRef = useRef<boolean>(false);

  // Buffered chunks of the entire utterance for the prerecorded API on
  // stop. MediaRecorder doesn't start until speech is detected, so this
  // contains real speech bounded by speech-start..stop, not the full
  // mic-open window.
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedMimeRef = useRef<string>('audio/webm');

  // We keep the active turn (1 or 2) in a ref because the state-machine
  // transitions need to know which transcript to write into without
  // racing the React state update.
  const activeTurnRef = useRef<1 | 2>(1);

  // Promise resolvers held across the rAF loop. Keeps the top-level
  // turn async function shaped the same as before.
  const turnResolveRef = useRef<((transcript: string) => void) | null>(null);
  const turnRejectRef = useRef<((err: Error) => void) | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    typeof Audio !== 'undefined';

  // ──────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────────────────────────────────

  const cleanupRecording = useCallback(() => {
    isMonitoringRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    setAudioLevel(0);
    setSilenceDetected(false);
    speechStartCandidateAtRef.current = 0;
    silenceStartedAtRef.current = null;
    isSpeakingRef.current = false;
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanupRecording();
    stopAudioPlayback();
    setState('idle');
    setError(null);
    setFirstAnswer(null);
    setSecondAnswer(null);
    setLastPrerecordedTranscript('');
    recordedChunksRef.current = [];
    activeTurnRef.current = 1;
    turnResolveRef.current = null;
    turnRejectRef.current = null;
    isManualStopRef.current = false;
  }, [cleanupRecording, stopAudioPlayback]);

  const fail = useCallback(
    (code: VoiceConversationError) => {
      cleanupRecording();
      stopAudioPlayback();
      setError(code);
      setState('error');
    },
    [cleanupRecording, stopAudioPlayback],
  );

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      cleanupRecording();
      stopAudioPlayback();
    };
  }, [cleanupRecording, stopAudioPlayback]);

  // ──────────────────────────────────────────────────────────────────────────
  // Audio playback (Q1 cached / Q2 dynamic)
  // ──────────────────────────────────────────────────────────────────────────

  const playAudio = useCallback(
    (url: string): Promise<void> =>
      new Promise((resolve, reject) => {
        stopAudioPlayback();
        const audio = new Audio(url);
        audioElementRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () =>
          reject(new Error(`audio playback failed: ${url}`));
        audio.play().catch(reject);
      }),
    [stopAudioPlayback],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Recording — VAD monitors mic, MediaRecorder runs only while speaking.
  // ──────────────────────────────────────────────────────────────────────────

  const startRecording = useCallback(async (): Promise<string> => {
    recordedChunksRef.current = [];
    setLastPrerecordedTranscript('');
    isManualStopRef.current = false;
    isSpeakingRef.current = false;
    speechStartCandidateAtRef.current = 0;
    silenceStartedAtRef.current = null;

    // 1. Get mic stream. noiseSuppression OFF: WebRTC's RNNoise is
    // tuned for cheap laptop mics and tends to over-suppress signal
    // from quality USB cardioids (Yeti etc.) — speech reads as low as
    // 2-5 RMS even with the mic 6 inches from the user's mouth.
    // echoCancellation also off: same processor chain, same risk;
    // we're not playing audio through speakers during recording (Q1
    // already finished) so AEC has nothing to do.
    // autoGainControl ON: still helps with quiet mics without the
    // suppression artifacts.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw new Error('permission_denied');
      }
      throw new Error('not_supported');
    }
    mediaStreamRef.current = stream;

    if (process.env.NODE_ENV !== 'production') {
      const track = stream.getAudioTracks()[0];
      const settings = track?.getSettings?.();
      // eslint-disable-next-line no-console
      console.log('[voice] mic acquired', {
        label: track?.label,
        sampleRate: settings?.sampleRate,
        channelCount: settings?.channelCount,
        // The browser does not always honour requested constraints —
        // surfacing the actually-applied values lets us spot when our
        // "off" requests got silently re-enabled.
        echoCancellation: settings?.echoCancellation,
        noiseSuppression: settings?.noiseSuppression,
        autoGainControl: settings?.autoGainControl,
      });
    }

    // 2. Audio analyser. smoothingTimeConstant 0.3 (vs default 0.8)
    // gives a faster response to speech onset; default 0.8 lags ~150ms.
    const audioCtx = new AudioContext();
    audioContextRef.current = audioCtx;
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser);
    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(
      analyser.fftSize,
    ) as Uint8Array<ArrayBuffer>;

    // 3. Start MediaRecorder immediately. Originally we waited for VAD
    // speech-confirmation (200ms) before starting — but that meant the
    // first 200ms of speech ("a dog" → "Eating sushi") was never in
    // the blob. Now we record continuously from mic-acquired and use
    // VAD only to decide whether to KEEP or DISCARD the captured audio
    // when the turn ends (silence auto-stop or user tap = keep;
    // no-speech timeout = discard).
    //
    // Pre-creating means we don't miss the first ~50ms of speech to
    // recorder construction either.
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;
    recordedMimeRef.current = mimeType;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const chunks = recordedChunksRef.current;
      const resolveFn = turnResolveRef.current;
      const rejectFn = turnRejectRef.current;
      turnResolveRef.current = null;
      turnRejectRef.current = null;

      if (!resolveFn) return;

      if (chunks.length === 0) {
        // No speech captured — could be a silent room, a muted track,
        // or a no-speech timeout.
        resolveFn('');
        return;
      }

      try {
        const blob = new Blob(chunks, { type: recordedMimeRef.current });
        const formData = new FormData();
        formData.append('audio', blob, 'turn.webm');
        const resp = await fetch('/api/voice/transcribe', {
          method: 'POST',
          body: formData,
        });
        if (!resp.ok) {
          throw new Error(`prerecorded ${resp.status}`);
        }
        const data = (await resp.json()) as {
          transcript: string;
          fullTranscript?: string;
          confidence?: number;
          durationMs?: number;
        };
        const prerecorded = data.transcript?.trim() ?? '';
        setLastPrerecordedTranscript(prerecorded);

        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[voice] transcript', {
            prerecorded,
            full: data.fullTranscript,
            confidence: data.confidence,
            blobSizeBytes: blob.size,
            chunkCount: chunks.length,
            prerecordedDurationMs: data.durationMs,
          });
        }

        resolveFn(prerecorded);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[voice] prerecorded failed', err);
        rejectFn?.(new Error('stt_failed'));
      }
    };

    // 4. Recorder is wired up — start it now (after onstop is bound).
    // Recorder runs continuously from this point; the VAD loop decides
    // whether to keep or discard the buffer when the turn ends.
    try {
      mediaRecorder.start(100);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[voice] recorder start failed', err);
      throw new Error('stt_failed');
    }

    // 5. Kick off VAD loop. Recorder is already running; the loop
    // watches for speech-confirmed → silence-auto-stop, or duration
    // cap, or no-speech-timeout (which discards the buffer).
    return new Promise<string>((resolveFinal, rejectFinal) => {
      turnResolveRef.current = resolveFinal;
      turnRejectRef.current = rejectFinal;

      monitoringStartedAtRef.current = Date.now();
      recordingStartedAtRef.current = 0;
      isMonitoringRef.current = true;

      // Dev-only level diagnostic: log peak level once per second so we
      // can see where the user's actual mic sits relative to the VAD
      // thresholds. Different mics (built-in, AirPods, iPhone via
      // Continuity) have wildly different signal levels; static
      // thresholds need to be tuned against real data.
      // Tracks raw RMS too so we can sanity-check the multiplier
      // (currently ×300) — if peak raw RMS is ~0.3 but we're seeing
      // peakLevel=2 then the multiplier is wrong, not the mic.
      let peakThisSecond = 0;
      let peakRawThisSecond = 0;
      let secondStartedAt = Date.now();
      const isDev = process.env.NODE_ENV !== 'production';

      const analyse = () => {
        if (!isMonitoringRef.current) return;
        const a = analyserRef.current;
        const data = dataArrayRef.current;
        if (!a || !data) return;

        // Time-domain waveform → RMS. Each byte is a sample 0-255 with
        // 128 = silence; subtract 128, divide by 128 to get -1..1.
        a.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        const normalisedLevel = Math.min(100, rms * 300);
        // Surface as 0-1 for the existing AudioLevelIndicator UI.
        setAudioLevel(normalisedLevel / 100);

        const now = Date.now();

        if (isDev) {
          peakThisSecond = Math.max(peakThisSecond, normalisedLevel);
          peakRawThisSecond = Math.max(peakRawThisSecond, rms);
          if (now - secondStartedAt >= 1000) {
            // eslint-disable-next-line no-console
            console.log(
              `[voice] +${((now - monitoringStartedAtRef.current) / 1000).toFixed(1)}s peakLevel=${peakThisSecond.toFixed(1)} peakRaw=${peakRawThisSecond.toFixed(3)} speechT=${SPEECH_THRESHOLD} silenceT=${SILENCE_THRESHOLD} speaking=${isSpeakingRef.current}`,
            );
            peakThisSecond = 0;
            peakRawThisSecond = 0;
            secondStartedAt = now;
          }
        }

        if (normalisedLevel > SPEECH_THRESHOLD) {
          // Above speech threshold.
          if (!isSpeakingRef.current) {
            // Need to confirm sustained speech before flipping the
            // "isSpeaking" flag — single spikes from a click or door
            // slam shouldn't count. Recorder is already running in the
            // background; this just gates the silence-detection logic
            // and the keep-vs-discard decision on stop.
            if (speechStartCandidateAtRef.current === 0) {
              speechStartCandidateAtRef.current = now;
            } else if (
              now - speechStartCandidateAtRef.current >=
              SPEECH_START_DELAY_MS
            ) {
              isSpeakingRef.current = true;
              recordingStartedAtRef.current = now;
              if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.log(
                  '[voice] speech confirmed (recorder already running)',
                );
              }
            }
          }
          // Whether monitoring or recording, an above-threshold sample
          // resets any pending silence countdown.
          silenceStartedAtRef.current = null;
          setSilenceDetected(false);
        } else if (normalisedLevel < SILENCE_THRESHOLD) {
          // Below silence threshold.
          if (isSpeakingRef.current) {
            if (silenceStartedAtRef.current === null) {
              silenceStartedAtRef.current = now;
            }
            const silenceMs = now - silenceStartedAtRef.current;
            if (silenceMs >= SILENCE_HINT_MS) {
              setSilenceDetected(true);
            }
            if (silenceMs >= SILENCE_AUTO_STOP_MS) {
              if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.log('[voice] silence auto-stop');
              }
              stopRecordingInternal();
              return;
            }
          } else {
            // Still waiting for first speech — reset the candidate.
            speechStartCandidateAtRef.current = 0;
          }
        }
        // In the hysteresis band (silence < x < speech) we leave whatever
        // state we're in alone. Prevents flapping at the boundary.

        // Hard duration cap — counted from speech-confirmed timestamp.
        // The mic-open window is bounded by NO_SPEECH_TIMEOUT_MS otherwise.
        if (isSpeakingRef.current && recordingStartedAtRef.current > 0) {
          const recElapsed = now - recordingStartedAtRef.current;
          if (recElapsed >= MAX_RECORDING_DURATION_SECONDS * 1000) {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.log('[voice] hit max recording duration');
            }
            stopRecordingInternal();
            return;
          }
        } else {
          // No speech yet — bail if we've waited too long. We need to
          // discard the buffer here since the recorder has been running
          // since mic-acquired and the chunks are just background noise.
          const monitoringElapsed = now - monitoringStartedAtRef.current;
          if (monitoringElapsed >= NO_SPEECH_TIMEOUT_MS) {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.log('[voice] no-speech timeout — discarding buffer');
            }
            isMonitoringRef.current = false;
            // Drop chunks BEFORE cleanup stops the recorder. cleanup
            // resolves the promise via onstop with whatever's in the
            // buffer; we want it empty so the caller sees stt_failed.
            recordedChunksRef.current = [];
            // Resolve directly here; cleanupRecording will stop the
            // recorder which would otherwise call onstop and resolve
            // with empty (still correct) but this is more explicit.
            const resolveFn = turnResolveRef.current;
            turnResolveRef.current = null;
            turnRejectRef.current = null;
            cleanupRecording();
            resolveFn?.('');
            return;
          }
        }

        rafRef.current = requestAnimationFrame(analyse);
      };

      rafRef.current = requestAnimationFrame(analyse);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Internal stopRecording — called both by the public `stopRecording` and
  // by the silence/duration auto-stop loop. Mutes the mic FIRST so the
  // last MediaRecorder chunk is silence, not whatever the user said
  // between "I'm done" and the chunk boundary. Without this the
  // prerecorded API would happily transcribe the trailing audio and
  // we'd get "a cat doing karate. Okay." where "Okay" is the user
  // reacting to the stop button, not part of their answer.
  const stopRecordingInternal = useCallback(() => {
    isManualStopRef.current = true;
    isMonitoringRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // Public — start the whole flow
  // ──────────────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (!isSupported) {
      setError('not_supported');
      setState('error');
      return;
    }

    setError(null);
    setFirstAnswer(null);
    setSecondAnswer(null);

    // 1. Q1 — cached audio (no API call, just play the R2 URL).
    setState('q1_playing');
    try {
      await playAudio(VOICE_Q1_AUDIO_URL);
    } catch (err) {
      console.error('[useVoiceConversation] Q1 playback failed', err);
      setError('q1_audio_failed');
      setState('error');
      return;
    }

    // 2. A1 — VAD-gated capture for first transcript.
    activeTurnRef.current = 1;
    setState('recording_a1');
    let a1: string;
    try {
      a1 = await startRecording();
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[voice] A1 transcript:', JSON.stringify(a1));
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : 'stt_failed';
      cleanupRecording();
      setError(
        (code === 'permission_denied' ||
        code === 'not_supported' ||
        code === 'requires_signin'
          ? code
          : 'stt_failed') as VoiceConversationError,
      );
      setState('error');
      return;
    }
    cleanupRecording();
    setFirstAnswer(a1);

    if (!a1) {
      setError('stt_failed');
      setState('error');
      return;
    }

    // 3. Q2 — server-side moderation + Claude + TTS.
    setState('processing_q2');
    let followUpAudioUrl: string;
    try {
      const resp = await fetch('/api/voice/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstAnswer: a1 }),
      });
      if (!resp.ok) {
        if (resp.status === 401) {
          setError('requires_signin');
        } else if (resp.status === 400) {
          setError('follow_up_blocked');
        } else {
          setError('follow_up_failed');
        }
        setState('error');
        return;
      }
      const data = (await resp.json()) as {
        followUpText: string;
        followUpAudioUrl: string;
      };
      followUpAudioUrl = data.followUpAudioUrl;
    } catch (err) {
      console.error('[useVoiceConversation] follow-up call failed', err);
      setError('follow_up_failed');
      setState('error');
      return;
    }

    // 4. Q2 audio playback.
    setState('q2_playing');
    try {
      await playAudio(followUpAudioUrl);
    } catch (err) {
      console.error('[useVoiceConversation] Q2 playback failed', err);
      setError('q2_audio_failed');
      setState('error');
      return;
    }

    // 5. A2 — second VAD-gated cycle.
    activeTurnRef.current = 2;
    setState('recording_a2');
    let a2: string;
    try {
      a2 = await startRecording();
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[voice] A2 transcript:', JSON.stringify(a2));
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : 'stt_failed';
      cleanupRecording();
      setError(
        (code === 'permission_denied' ||
        code === 'not_supported' ||
        code === 'requires_signin'
          ? code
          : 'stt_failed') as VoiceConversationError,
      );
      setState('error');
      return;
    }
    cleanupRecording();
    setSecondAnswer(a2);

    if (!a2) {
      setError('stt_failed');
      setState('error');
      return;
    }

    // 6. Done — caller hooks `state === 'ready_to_submit'` and calls the
    // server action with both transcripts.
    setState('ready_to_submit');
  }, [isSupported, playAudio, startRecording, cleanupRecording]);

  const stopRecording = useCallback(() => {
    if (state === 'recording_a1' || state === 'recording_a2') {
      stopRecordingInternal();
    }
  }, [state, stopRecordingInternal]);

  return {
    state,
    error,
    firstAnswer,
    secondAnswer,
    audioLevel,
    silenceDetected,
    lastPrerecordedTranscript,
    isSupported,
    start,
    stopRecording,
    reset,
    fail,
  };
}
