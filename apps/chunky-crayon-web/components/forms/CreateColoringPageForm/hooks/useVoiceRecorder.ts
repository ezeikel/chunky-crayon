'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '@/app/actions/input-processing';

// =============================================================================
// Types
// =============================================================================

export type VoiceRecorderState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error';

export type VoiceRecorderError =
  | 'permission_denied'
  | 'not_supported'
  | 'transcription_failed'
  | 'recording_failed'
  | 'timeout';

export type VoiceRecorderResult = {
  state: VoiceRecorderState;
  /** Transcribed text after successful recording */
  transcription: string | null;
  /** Error message if state is 'error' */
  error: VoiceRecorderError | null;
  /** Audio level 0-1 for visualization */
  audioLevel: number;
  /** Recording duration in seconds */
  duration: number;
  /** Maximum recording duration in seconds */
  maxDuration: number;
  /** Seconds of continuous silence detected */
  silenceDuration: number;
  /** Whether silence has been detected long enough to show a hint */
  isSilenceDetected: boolean;
  /** Start recording - will request mic permission if needed */
  startRecording: () => Promise<void>;
  /** Stop recording and start transcription */
  stopRecording: () => void;
  /** Cancel recording and reset state */
  cancelRecording: () => void;
  /** Reset to idle state */
  reset: () => void;
  /** Whether browser supports voice recording */
  isSupported: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const MAX_RECORDING_DURATION_SECONDS = 30;
const AUDIO_LEVEL_UPDATE_INTERVAL_MS = 50;

// Silence detection settings
const SILENCE_THRESHOLD = 0.05; // Audio level below this is considered silence
const SILENCE_HINT_SECONDS = 2; // Show "tap when done" hint after this many seconds of silence
const SILENCE_AUTO_STOP_SECONDS = 4; // Auto-stop recording after this many seconds of silence
const MIN_RECORDING_BEFORE_AUTO_STOP = 1; // Don't auto-stop until at least 1 second of recording

// =============================================================================
// Hook
// =============================================================================

export function useVoiceRecorder(): VoiceRecorderResult {
  // State
  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<VoiceRecorderError | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [silenceDuration, setSilenceDuration] = useState(0);

  // Refs for cleanup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const hasSpokenRef = useRef<boolean>(false);

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.MediaRecorder;

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Clear intervals and timeouts
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset recorder
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
    silenceStartRef.current = null;
    hasSpokenRef.current = false;
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setTranscription(null);
    setError(null);
    setAudioLevel(0);
    setDuration(0);
    setSilenceDuration(0);
  }, [cleanup]);

  // Process recorded audio
  const processAudio = useCallback(
    async (audioBlob: Blob, recordingDuration: number) => {
      console.log('[VoiceRecorder] Processing audio:', {
        size: audioBlob.size,
        type: audioBlob.type,
        durationSeconds: recordingDuration,
      });

      // Skip transcription if recording is too short (< 0.5 seconds)
      if (recordingDuration < 0.5) {
        console.log(
          '[VoiceRecorder] Recording too short, skipping transcription',
        );
        setError('transcription_failed');
        setState('error');
        return;
      }

      // Skip transcription if audio blob is too small (likely silence)
      const minBlobSize = 1000; // 1KB
      if (audioBlob.size < minBlobSize) {
        console.log(
          '[VoiceRecorder] Audio blob too small, likely empty:',
          audioBlob.size,
          'bytes',
        );
        setError('transcription_failed');
        setState('error');
        return;
      }

      setState('processing');

      try {
        // Create FormData with audio file
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const result = await transcribeAudio(formData);

        console.log('[VoiceRecorder] Transcription result:', result);

        if (result.success) {
          console.log('[VoiceRecorder] Transcription success:', result.text);
          setTranscription(result.text);
          setState('complete');
        } else {
          console.log('[VoiceRecorder] Transcription failed:', result.error);
          setError('transcription_failed');
          setState('error');
        }
      } catch (err) {
        console.error('[VoiceRecorder] Transcription error:', err);
        setError('transcription_failed');
        setState('error');
      }
    },
    [],
  );

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('not_supported');
      setState('error');
      return;
    }

    // Reset state
    setTranscription(null);
    setError(null);
    setAudioLevel(0);
    setDuration(0);
    setSilenceDuration(0);
    chunksRef.current = [];
    silenceStartRef.current = null;
    hasSpokenRef.current = false;

    setState('requesting_permission');

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Set up audio analysis for level visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Update audio level periodically and detect silence
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      levelIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = Math.min(average / 128, 1);
        setAudioLevel(level);

        const now = Date.now();
        const recordingTime = (now - startTimeRef.current) / 1000;

        // Check if user is speaking (above threshold)
        if (level > SILENCE_THRESHOLD) {
          // User is speaking - reset silence tracking
          silenceStartRef.current = null;
          setSilenceDuration(0);
          hasSpokenRef.current = true;
        } else {
          // Silence detected
          if (silenceStartRef.current === null) {
            silenceStartRef.current = now;
          }
          const currentSilence = (now - silenceStartRef.current) / 1000;
          setSilenceDuration(currentSilence);

          // Auto-stop if:
          // 1. User has spoken at least once (we have some audio)
          // 2. Minimum recording time has passed
          // 3. Silence has exceeded the auto-stop threshold
          if (
            hasSpokenRef.current &&
            recordingTime >= MIN_RECORDING_BEFORE_AUTO_STOP &&
            currentSilence >= SILENCE_AUTO_STOP_SECONDS
          ) {
            console.log('[VoiceRecorder] Auto-stopping due to silence');
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state === 'recording'
            ) {
              mediaRecorderRef.current.stop();
            }
          }
        }
      }, AUDIO_LEVEL_UPDATE_INTERVAL_MS);

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const recordingDuration = (Date.now() - startTimeRef.current) / 1000;
        cleanup();
        processAudio(audioBlob, recordingDuration);
      };

      mediaRecorder.onerror = () => {
        cleanup();
        setError('recording_failed');
        setState('error');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setState('recording');

      // Update duration every 100ms
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 100);

      // Auto-stop after max duration
      timeoutRef.current = setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === 'recording'
        ) {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_DURATION_SECONDS * 1000);
    } catch (err) {
      cleanup();
      console.error('Recording error:', err);

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('permission_denied');
      } else {
        setError('recording_failed');
      }
      setState('error');
    }
  }, [isSupported, cleanup, processAudio]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      // Remove onstop handler to prevent processing
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setState('idle');
    setAudioLevel(0);
    setDuration(0);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Compute whether silence has been detected long enough to show hint
  const isSilenceDetected = silenceDuration >= SILENCE_HINT_SECONDS;

  return {
    state,
    transcription,
    error,
    audioLevel,
    duration,
    maxDuration: MAX_RECORDING_DURATION_SECONDS,
    silenceDuration,
    isSilenceDetected,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    isSupported,
  };
}

export default useVoiceRecorder;
