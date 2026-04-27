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
 *   recording_a1          ← Deepgram STT, audio level + silence detection
 *    │ user stops OR auto-stop on silence
 *    ▼
 *   processing_q2         ← POST /api/voice/follow-up (moderation + Claude + TTS)
 *    │ response received
 *    ▼
 *   q2_playing            ← Q2 audio plays back
 *    │ audio ended
 *    ▼
 *   recording_a2          ← second STT cycle
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
 * Deepgram WS lifecycle:
 *   - Mint a fresh ephemeral token via /api/voice/deepgram-token at the
 *     start of EACH recording cycle (tokens are 30s-lived).
 *   - Open WS, send PCM frames as we capture them, accumulate the final
 *     transcript on `is_final` results, close cleanly when recording stops.
 *   - On any WS error, surface as state='error' with code='stt_failed'.
 *
 * Audio playback uses HTMLAudioElement directly — simple, well-supported,
 * fires `ended` cleanly. Auto-advances the state machine on each `ended`.
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

  /** Browser supports getUserMedia + WebSocket + Audio. Reset can't fix this. */
  isSupported: boolean;

  /** Start the flow — plays Q1, then opens mic for A1 capture. */
  start: () => Promise<void>;

  /** Stop the current recording cycle (A1 or A2) and advance the machine. */
  stopRecording: () => void;

  /** Cancel everything and return to idle. Closes WS, stops tracks. */
  reset: () => void;
};

// ============================================================================
// Constants
// ============================================================================

const MAX_RECORDING_DURATION_SECONDS = 30;

// Silence detection — same shape as `useVoiceRecorder`. Tighter
// SILENCE_AUTO_STOP_SECONDS than text mode because the conversation has
// momentum; long silences feel awkward in a 2-turn flow.
const SILENCE_THRESHOLD = 0.05;
const SILENCE_HINT_SECONDS = 1.5;
const SILENCE_AUTO_STOP_SECONDS = 3;
const MIN_RECORDING_BEFORE_AUTO_STOP = 1;

const AUDIO_LEVEL_UPDATE_INTERVAL_MS = 50;

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

  // ── Refs (lifecycle resources we need to clean up) ──────────────────────
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const silenceStartedAtRef = useRef<number | null>(null);
  const hasSpokenRef = useRef<boolean>(false);
  const transcriptAccumRef = useRef<string>('');

  // We keep the active turn (1 or 2) in a ref because the state-machine
  // transitions need to know which transcript to write into without
  // racing the React state update.
  const activeTurnRef = useRef<1 | 2>(1);

  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof WebSocket !== 'undefined' &&
    typeof Audio !== 'undefined';

  // ──────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ──────────────────────────────────────────────────────────────────────────

  const cleanupRecording = useCallback(() => {
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
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
      mediaRecorderRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setSilenceDetected(false);
    silenceStartedAtRef.current = null;
    hasSpokenRef.current = false;
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
    transcriptAccumRef.current = '';
    activeTurnRef.current = 1;
  }, [cleanupRecording, stopAudioPlayback]);

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
  // Recording — opens mic + Deepgram WS for one turn, accumulates transcript.
  //
  // Resolves with the final transcript when the caller stops or silence
  // auto-stops. Rejects on any failure.
  // ──────────────────────────────────────────────────────────────────────────

  const startRecording = useCallback(async (): Promise<string> => {
    transcriptAccumRef.current = '';

    // 1. Mint a fresh Deepgram ephemeral token. 30s TTL, scoped usage:write.
    const tokenResp = await fetch('/api/voice/deepgram-token', {
      method: 'POST',
    });
    if (!tokenResp.ok) {
      if (tokenResp.status === 401) {
        throw new Error('requires_signin');
      }
      throw new Error('stt_failed');
    }
    const { key: deepgramToken } = (await tokenResp.json()) as {
      key: string;
    };

    // 2. Get mic stream.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
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

    // 3. Audio level analyser for the visualiser + silence detection.
    const audioCtx = new AudioContext();
    audioContextRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    // 4. Open Deepgram WS. We use the `sec-websocket-protocol` trick to
    // pass auth — browsers can't set Authorization headers on WS, but
    // Deepgram accepts `['token', '<key>']` as sub-protocols.
    //
    // Model nova-3, encoding linear16 @ 16kHz (matches the captured
    // stream params above). interim_results lets us show the transcript
    // forming live; smart_format gives us punctuation + capitalisation.
    const wsUrl =
      'wss://api.deepgram.com/v1/listen?model=nova-3&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&smart_format=true';
    const ws = new WebSocket(wsUrl, ['token', deepgramToken]);
    wsRef.current = ws;

    return new Promise<string>((resolveFinal, rejectFinal) => {
      let finalised = false;
      const finaliseWith = (transcript: string) => {
        if (finalised) return;
        finalised = true;
        resolveFinal(transcript);
      };
      const failWith = (code: string) => {
        if (finalised) return;
        finalised = true;
        rejectFinal(new Error(code));
      };

      ws.onopen = () => {
        // 5. Start MediaRecorder once WS is open. We pump audio chunks into
        // the WS as they arrive. Deepgram accepts opus and webm too, but
        // we asked for 16kHz mono PCM via constraints — webm/opus is what
        // MediaRecorder defaults to. Browsers transcode on the way out.
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm',
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (
            event.data &&
            event.data.size > 0 &&
            ws.readyState === WebSocket.OPEN
          ) {
            ws.send(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          // Tell Deepgram we're done so it sends final results.
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'CloseStream' }));
            } catch {
              /* ignore */
            }
          }
        };

        mediaRecorder.start(250); // emit a chunk every 250ms

        recordingStartedAtRef.current = Date.now();
        silenceStartedAtRef.current = null;
        hasSpokenRef.current = false;
        setSilenceDetected(false);

        // Audio level + silence detection loop.
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        levelIntervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length / 255;
          setAudioLevel(avg);

          const now = Date.now();
          const elapsedSec = (now - recordingStartedAtRef.current) / 1000;

          if (avg >= SILENCE_THRESHOLD) {
            hasSpokenRef.current = true;
            silenceStartedAtRef.current = null;
            setSilenceDetected(false);
          } else if (hasSpokenRef.current) {
            // Track silence only after the user has spoken at least once.
            if (silenceStartedAtRef.current === null) {
              silenceStartedAtRef.current = now;
            }
            const silenceSec = (now - silenceStartedAtRef.current) / 1000;
            if (silenceSec >= SILENCE_HINT_SECONDS) {
              setSilenceDetected(true);
            }
            if (
              silenceSec >= SILENCE_AUTO_STOP_SECONDS &&
              elapsedSec >= MIN_RECORDING_BEFORE_AUTO_STOP
            ) {
              // Auto-stop. Same code path as user-driven stop.
              stopRecordingInternal();
            }
          }

          // Hard cap on recording duration.
          if (elapsedSec >= MAX_RECORDING_DURATION_SECONDS) {
            stopRecordingInternal();
          }
        }, AUDIO_LEVEL_UPDATE_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        try {
          const msg = JSON.parse(event.data) as {
            type?: string;
            is_final?: boolean;
            channel?: {
              alternatives?: Array<{ transcript?: string }>;
            };
          };
          if (msg.type !== 'Results') return;
          const transcript = msg.channel?.alternatives?.[0]?.transcript ?? '';
          if (msg.is_final && transcript) {
            // Concatenate final results — Deepgram delivers final segments
            // in order; interim results are throwaways for live feedback.
            transcriptAccumRef.current = (
              transcriptAccumRef.current +
              ' ' +
              transcript
            ).trim();
          }
        } catch {
          /* malformed messages are ignored */
        }
      };

      ws.onerror = () => failWith('stt_failed');
      ws.onclose = () => {
        // Once the WS closes, whatever transcript we accumulated is final.
        finaliseWith(transcriptAccumRef.current.trim());
      };
    });
  }, []);

  // Internal stopRecording — called both by the public `stopRecording` and
  // by the silence/duration auto-stop loop. Triggers the MediaRecorder to
  // flush, which closes the WS, which resolves the recording promise.
  const stopRecordingInternal = useCallback(() => {
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
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
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

    // 2. A1 — open mic + Deepgram WS for first transcript.
    activeTurnRef.current = 1;
    setState('recording_a1');
    let a1: string;
    try {
      a1 = await startRecording();
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
          // Moderation block — UI shows a friendly "let's try a different idea"
          // and bounces the user back to idle.
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

    // 5. A2 — second recording cycle.
    activeTurnRef.current = 2;
    setState('recording_a2');
    let a2: string;
    try {
      a2 = await startRecording();
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
    // Only meaningful in recording_a1 / recording_a2; other states ignore.
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
    isSupported,
    start,
    stopRecording,
    reset,
  };
}
