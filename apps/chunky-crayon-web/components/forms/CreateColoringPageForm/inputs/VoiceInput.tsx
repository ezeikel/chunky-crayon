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
import {
  useVoiceConversation,
  type VoiceConversationError,
} from '../hooks/useVoiceConversation';

type VoiceInputProps = {
  className?: string;
  /**
   * Called when both transcripts are captured and the user is ready to
   * submit. Parent form runs the actual `createColoringImageFromVoiceConversation`
   * server action — the hook itself is transcript-only.
   */
  onComplete?: (firstAnswer: string, secondAnswer: string) => void;
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
  const handedOffRef = useRef(false);

  const {
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
  } = useVoiceConversation();

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

  // Hand off to the parent when both transcripts are ready. Refs guard
  // against double-firing if the parent re-renders this component.
  useEffect(() => {
    if (state === 'ready_to_submit' && firstAnswer && secondAnswer) {
      if (handedOffRef.current) return;
      handedOffRef.current = true;
      // VOICE_INPUT_COMPLETED schema is shared with the legacy one-shot
      // voice mode; map our two transcripts into the existing fields so
      // analytics keeps working without a schema migration.
      const transcription = `${firstAnswer} ${secondAnswer}`.trim();
      trackEvent(TRACKING_EVENTS.VOICE_INPUT_COMPLETED, {
        transcription,
        durationMs: 0,
        confidence: 'medium',
      });
      onComplete?.(firstAnswer, secondAnswer);
    }
    if (state === 'idle' || state === 'error') {
      handedOffRef.current = false;
    }
  }, [state, firstAnswer, secondAnswer, onComplete]);

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
            onClick={reset}
            variant="outline"
            className="font-tondo font-bold text-base md:text-lg border-2 border-paper-cream-dark text-text-primary hover:bg-paper-cream rounded-full py-4 h-auto flex-1"
          >
            Cancel
          </Button>
          <Button
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
        onClick={start}
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
