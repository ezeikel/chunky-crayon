'use client';

import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophoneLines,
  faStop,
  faRotateRight,
  faSpinnerThird,
  faFaceDizzy,
  faMicrophoneSlash,
} from '@fortawesome/pro-duotone-svg-icons';
import useUser from '@/hooks/useUser';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { useInputMode } from './InputModeContext';
import { useParentalGate } from '@/components/ParentalGate';
import {
  useVoiceConversation,
  type VoiceConversationError,
} from '../hooks/useVoiceConversation';

// localStorage key — one-tap gate sticks for the session, but uses
// `sessionStorage` semantics: cleared on tab close. Voice mode is a
// foot-gun for kid safety so we make parents re-verify each session.
const VOICE_GATE_PASSED_KEY = 'voice_mode_gate_passed';

type VoiceInputProps = {
  className?: string;
  /**
   * Called when both transcripts are captured and the user is ready to
   * submit. Parent form runs the actual `createPendingColoringImage`
   * server action — the hook itself is transcript-only.
   *
   * Return a `VoiceConversationError` code if the submission fails so
   * the user sees the matching error UI (e.g. moderation_blocked →
   * "Let's try a different idea!"). Returning void/undefined means
   * success — the parent will handle navigation.
   */
  onComplete?: (
    firstAnswer: string,
    secondAnswer: string,
  ) => Promise<VoiceConversationError | void> | VoiceConversationError | void;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const AudioLevelIndicator = ({ level }: { level: number }) => {
  const bars = Array.from({ length: 5 }, (_, i) => {
    const threshold = (i + 1) / 5;
    const isActive = level >= threshold * 0.7;
    return (
      <div
        key={i}
        className={cn(
          'w-2 rounded-full transition-all duration-100',
          isActive ? 'bg-crayon-orange' : 'bg-paper-cream-dark',
        )}
        style={{
          height: `${20 + i * 8}px`,
          transform: isActive ? `scaleY(${0.8 + level * 0.4})` : 'scaleY(1)',
        }}
      />
    );
  });
  return <div className="flex items-end gap-1.5 h-12">{bars}</div>;
};

// Friendly error copy. We deliberately don't echo the moderation
// `code` — kids see "let's try a different idea" not "blocklisted".
const ERROR_COPY: Record<VoiceConversationError, string> = {
  permission_denied: 'I need permission to use your microphone.',
  not_supported: "Voice mode doesn't work on this browser.",
  q1_audio_failed: 'Couldn’t play the question. Try again?',
  stt_failed: "I couldn’t hear you clearly. Let's try again.",
  follow_up_failed: 'Something went wrong. Try again?',
  follow_up_blocked: "Let's try a different idea!",
  q2_audio_failed: 'Couldn’t play the question. Try again?',
  timeout: 'Took too long! Let’s start over.',
  requires_signin: 'Sign in to use voice mode.',
};

// ─── Component ──────────────────────────────────────────────────────────────

const VoiceInput = ({ className, onComplete }: VoiceInputProps) => {
  const { canGenerate } = useUser();
  const { setDescription, setIsProcessing, setIsBusy } = useInputMode();
  const { openGate } = useParentalGate();
  const handedOffRef = useRef(false);

  const {
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
  } = useVoiceConversation();

  // Wraps `start()` with a one-time-per-session parental gate. Once the
  // gate is passed, the flag persists in sessionStorage so subsequent
  // voice taps in the same tab don't re-prompt. Closing the tab clears
  // the flag — a fresh visit re-prompts.
  const startWithGate = () => {
    let alreadyPassed = false;
    try {
      alreadyPassed = sessionStorage.getItem(VOICE_GATE_PASSED_KEY) === 'true';
    } catch {
      // sessionStorage can be unavailable (private browsing, etc.) — fall
      // through to gating every time, which is the safer default.
    }

    if (alreadyPassed) {
      void start();
      return;
    }

    openGate({
      onSuccess: () => {
        try {
          sessionStorage.setItem(VOICE_GATE_PASSED_KEY, 'true');
        } catch {
          /* see above — non-fatal */
        }
        void start();
      },
    });
  };

  // Mirror combined description into InputModeContext so the loading
  // overlay (parent form's <ColoLoading>) shows what the user said.
  useEffect(() => {
    if (firstAnswer && secondAnswer) {
      setDescription(`${firstAnswer} ${secondAnswer}`.trim());
    } else if (firstAnswer) {
      setDescription(firstAnswer);
    }
  }, [firstAnswer, secondAnswer, setDescription]);

  // Tell the parent form we're busy so the bottom CTA hides during the
  // conversation. The hook owns the entire submit flow; the global CTA
  // would just confuse things mid-conversation.
  useEffect(() => {
    const busy = state !== 'idle' && state !== 'error';
    setIsBusy(busy);
    setIsProcessing(state === 'processing_q2');
    return () => {
      setIsBusy(false);
      setIsProcessing(false);
    };
  }, [state, setIsBusy, setIsProcessing]);

  // Track when voice mode is actually used.
  useEffect(() => {
    if (state === 'recording_a1') {
      trackEvent(TRACKING_EVENTS.VOICE_INPUT_STARTED, {
        location: 'create_form',
      });
    }
  }, [state]);

  // Hand off to the parent when both transcripts are ready. On success
  // we reset back to idle (the parent has navigated away by then; this
  // just clears stale state in case the form stays mounted in Next.js's
  // client router cache). On failure (moderation block, server error)
  // the parent returns an error code and we flip the hook into the
  // matching error state so the user sees "Let's try a different idea!"
  // / "Try again?" copy with a Try Again button. Refs guard against
  // double-firing.
  useEffect(() => {
    if (state === 'ready_to_submit' && firstAnswer && secondAnswer) {
      if (handedOffRef.current) return;
      handedOffRef.current = true;
      const transcription = `${firstAnswer} ${secondAnswer}`.trim();
      trackEvent(TRACKING_EVENTS.VOICE_INPUT_COMPLETED, {
        transcription,
        durationMs: 0,
        confidence: 'medium',
      });
      void Promise.resolve(onComplete?.(firstAnswer, secondAnswer)).then(
        (result) => {
          if (result) {
            // Parent reported a failure — show the matching error UI.
            fail(result);
          } else {
            // Success — reset state. Parent has navigated away.
            reset();
          }
        },
      );
    }
    if (state === 'idle' || state === 'error') {
      handedOffRef.current = false;
    }
  }, [state, firstAnswer, secondAnswer, onComplete, reset, fail]);

  // ── Render branches by state ─────────────────────────────────────────────

  if (!isSupported) {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-4', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <FontAwesomeIcon
          icon={faMicrophoneSlash}
          size="4x"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-teal))',
              '--fa-secondary-opacity': '1',
            } as React.CSSProperties
          }
        />
        <p className="text-center text-text-primary font-tondo font-bold text-xl md:text-2xl">
          {ERROR_COPY.not_supported}
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        className={cn('flex flex-col items-center gap-5 py-4', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <FontAwesomeIcon
          icon={faFaceDizzy}
          size="4x"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
              '--fa-secondary-opacity': '1',
            } as React.CSSProperties
          }
        />
        <p className="text-center text-text-primary font-tondo font-bold text-xl md:text-2xl">
          {error ? ERROR_COPY[error] : ERROR_COPY.timeout}
        </p>
        <Button
          type="button"
          onClick={reset}
          className="font-tondo font-bold text-base md:text-lg text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-full px-8 py-4 h-auto"
        >
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  // ── Q1 / Q2 audio playing — passive, just a soft indicator ──────────────
  if (state === 'q1_playing' || state === 'q2_playing') {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-6', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <div className="relative">
          <FontAwesomeIcon
            icon={faMicrophoneLines}
            size="4x"
            className="opacity-50"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-opacity': '0.6',
              } as React.CSSProperties
            }
          />
        </div>
        <p className="text-center text-text-primary font-tondo font-bold text-lg">
          Listen…
        </p>
      </div>
    );
  }

  // Dev-only transcript readout. With the streaming WS gone there's
  // only one transcript per turn (prerecorded), so this just confirms
  // what the server heard. Hidden in production.
  const transcriptComparison =
    process.env.NODE_ENV !== 'production' && lastPrerecordedTranscript ? (
      <div className="w-full flex flex-col gap-2 px-4 py-3 bg-paper-cream/60 border-2 border-dashed border-paper-cream-dark rounded-xl">
        <p className="font-mono text-xs text-text-muted uppercase tracking-wide">
          dev · last transcript
        </p>
        <p className="font-tondo text-sm text-text-primary break-words">
          {lastPrerecordedTranscript}
        </p>
      </div>
    ) : null;

  // ── processing_q2 — dynamic Q2 generation in flight ─────────────────────
  if (state === 'processing_q2') {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-6', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <FontAwesomeIcon
          icon={faSpinnerThird}
          className="text-5xl animate-spin"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-teal))',
              '--fa-secondary-opacity': '0.6',
            } as React.CSSProperties
          }
        />
        <p className="text-center text-text-primary font-tondo font-bold">
          Hmm, let me think…
        </p>
        {transcriptComparison}
      </div>
    );
  }

  // ── recording_a1 / recording_a2 — mic active, audio bars + countdown ────
  if (state === 'recording_a1' || state === 'recording_a2') {
    return (
      <div
        className={cn('flex flex-col items-center gap-5 py-4', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <p
          className={cn(
            'text-center font-tondo font-bold text-lg transition-all duration-300',
            silenceDetected ? 'text-crayon-teal' : 'text-text-primary',
          )}
        >
          {silenceDetected ? 'Anything else?' : 'Listening…'}
        </p>

        <AudioLevelIndicator level={audioLevel} />

        <div className="flex gap-3 w-full">
          <Button
            type="button"
            onClick={reset}
            variant="outline"
            className="font-tondo font-bold text-base md:text-lg border-2 border-paper-cream-dark text-text-primary hover:bg-paper-cream rounded-full py-4 h-auto flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={stopRecording}
            className={cn(
              'font-tondo font-bold text-base md:text-lg text-white rounded-full py-4 h-auto flex-[2] transition-all duration-300 hover:scale-105 active:scale-95',
              silenceDetected
                ? 'bg-btn-teal shadow-btn-secondary animate-pulse'
                : 'bg-btn-orange shadow-btn-primary',
            )}
          >
            <FontAwesomeIcon icon={faStop} className="mr-2" />
            {silenceDetected ? 'I’m done' : 'Done talking'}
          </Button>
        </div>
      </div>
    );
  }

  // ── ready_to_submit — handed off to parent; show a hold message ─────────
  if (state === 'ready_to_submit') {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-6', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <FontAwesomeIcon
          icon={faSpinnerThird}
          className="text-5xl animate-spin"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-pink))',
              '--fa-secondary-opacity': '0.6',
            } as React.CSSProperties
          }
        />
        <p className="text-center text-text-primary font-tondo font-bold">
          Painting your page…
        </p>
        {transcriptComparison}
      </div>
    );
  }

  // ── idle — the entry point. Big bouncy mic, tap to start. ───────────────
  return (
    <div
      className={cn('flex flex-col items-center gap-5 py-2', className)}
      role="tabpanel"
      id="voice-input-panel"
      aria-labelledby="voice-mode-tab"
    >
      <p className="text-center text-text-primary font-tondo font-bold text-xl md:text-2xl">
        Tap to chat
      </p>

      <button
        type="button"
        onClick={startWithGate}
        disabled={!canGenerate}
        className={cn(
          'w-24 h-24 rounded-full flex items-center justify-center',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange focus-visible:ring-offset-2',
          canGenerate
            ? 'bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-110 active:scale-95 cursor-pointer'
            : 'bg-paper-cream-dark cursor-not-allowed',
        )}
        style={
          {
            '--fa-primary-color': canGenerate
              ? 'white'
              : 'hsl(var(--text-muted))',
            '--fa-secondary-color': canGenerate
              ? 'rgba(255, 255, 255, 0.8)'
              : 'hsl(var(--text-muted))',
            '--fa-secondary-opacity': '1',
          } as React.CSSProperties
        }
        aria-label="Start voice conversation"
      >
        <FontAwesomeIcon
          icon={faMicrophoneLines}
          size="3x"
          className={cn(canGenerate && 'animate-pulse')}
        />
      </button>
    </div>
  );
};

export default VoiceInput;
