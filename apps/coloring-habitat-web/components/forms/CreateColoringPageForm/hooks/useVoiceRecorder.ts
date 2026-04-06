"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { transcribeAudio } from "@/app/actions/input-processing";

// =============================================================================
// Types
// =============================================================================

export type VoiceRecorderState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "processing"
  | "complete"
  | "error";

export type VoiceRecorderError =
  | "permission_denied"
  | "not_supported"
  | "transcription_failed"
  | "recording_failed"
  | "timeout";

export type VoiceRecorderResult = {
  state: VoiceRecorderState;
  transcription: string | null;
  error: VoiceRecorderError | null;
  audioLevel: number;
  duration: number;
  maxDuration: number;
  silenceDuration: number;
  isSilenceDetected: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  reset: () => void;
  isSupported: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const MAX_RECORDING_DURATION_SECONDS = 30;
const AUDIO_LEVEL_UPDATE_INTERVAL_MS = 50;
const SILENCE_THRESHOLD = 0.05;
const SILENCE_HINT_SECONDS = 2;
const SILENCE_AUTO_STOP_SECONDS = 4;
const MIN_RECORDING_BEFORE_AUTO_STOP = 1;

// =============================================================================
// Hook
// =============================================================================

export function useVoiceRecorder(): VoiceRecorderResult {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<VoiceRecorderError | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [silenceDuration, setSilenceDuration] = useState(0);

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

  const isSupported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.MediaRecorder;

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
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
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
    silenceStartRef.current = null;
    hasSpokenRef.current = false;
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setState("idle");
    setTranscription(null);
    setError(null);
    setAudioLevel(0);
    setDuration(0);
    setSilenceDuration(0);
  }, [cleanup]);

  const processAudio = useCallback(
    async (audioBlob: Blob, recordingDuration: number) => {
      if (recordingDuration < 0.5) {
        setError("transcription_failed");
        setState("error");
        return;
      }

      const minBlobSize = 1000;
      if (audioBlob.size < minBlobSize) {
        setError("transcription_failed");
        setState("error");
        return;
      }

      setState("processing");

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const result = await transcribeAudio(formData);

        if (result.success) {
          setTranscription(result.text);
          setState("complete");
        } else {
          setError("transcription_failed");
          setState("error");
        }
      } catch {
        setError("transcription_failed");
        setState("error");
      }
    },
    [],
  );

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError("not_supported");
      setState("error");
      return;
    }

    setTranscription(null);
    setError(null);
    setAudioLevel(0);
    setDuration(0);
    setSilenceDuration(0);
    chunksRef.current = [];
    silenceStartRef.current = null;
    hasSpokenRef.current = false;

    setState("requesting_permission");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      levelIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = Math.min(average / 128, 1);
        setAudioLevel(level);

        const now = Date.now();
        const recordingTime = (now - startTimeRef.current) / 1000;

        if (level > SILENCE_THRESHOLD) {
          silenceStartRef.current = null;
          setSilenceDuration(0);
          hasSpokenRef.current = true;
        } else {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = now;
          }
          const currentSilence = (now - silenceStartRef.current) / 1000;
          setSilenceDuration(currentSilence);

          if (
            hasSpokenRef.current &&
            recordingTime >= MIN_RECORDING_BEFORE_AUTO_STOP &&
            currentSilence >= SILENCE_AUTO_STOP_SECONDS
          ) {
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state === "recording"
            ) {
              mediaRecorderRef.current.stop();
            }
          }
        }
      }, AUDIO_LEVEL_UPDATE_INTERVAL_MS);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

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
        setError("recording_failed");
        setState("error");
      };

      mediaRecorder.start(100);
      startTimeRef.current = Date.now();
      setState("recording");

      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
      }, 100);

      timeoutRef.current = setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_DURATION_SECONDS * 1000);
    } catch (err) {
      cleanup();

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("permission_denied");
      } else {
        setError("recording_failed");
      }
      setState("error");
    }
  }, [isSupported, cleanup, processAudio]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setState("idle");
    setAudioLevel(0);
    setDuration(0);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

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
