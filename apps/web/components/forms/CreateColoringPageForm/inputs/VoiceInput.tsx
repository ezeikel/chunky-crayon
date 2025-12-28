'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophoneLines,
  faStop,
  faRotateRight,
  faSpinnerThird,
} from '@fortawesome/pro-duotone-svg-icons';
import useUser from '@/hooks/useUser';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import cn from '@/utils/cn';
import { useInputMode } from './InputModeContext';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

// =============================================================================
// Types
// =============================================================================

type VoiceInputProps = {
  className?: string;
};

// =============================================================================
// Helper Components
// =============================================================================

const AudioLevelIndicator = ({ level }: { level: number }) => {
  // Create 5 bars for visualization
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

const CountdownTimer = ({
  duration,
  maxDuration,
}: {
  duration: number;
  maxDuration: number;
}) => {
  const remaining = maxDuration - duration;
  const percentage = (duration / maxDuration) * 100;
  const isLow = remaining <= 5;

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cn(
          'text-2xl font-tondo font-bold tabular-nums',
          isLow ? 'text-crayon-pink animate-pulse' : 'text-text-primary',
        )}
      >
        {remaining}s
      </span>
      <div className="w-32 h-2.5 bg-paper-cream-dark rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-100',
            isLow ? 'bg-crayon-pink' : 'bg-crayon-orange',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const VoiceInput = ({ className }: VoiceInputProps) => {
  const t = useTranslations('createForm');
  const {
    canGenerate,
    blockedReason,
    hasActiveSubscription,
    handleAuthAction,
    isGuest,
    guestGenerationsRemaining,
    maxGuestGenerations,
  } = useUser();

  const { description, setDescription, setIsProcessing } = useInputMode();

  // Ref for auto-focusing submit button when transcription completes
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const {
    state,
    transcription,
    error,
    audioLevel,
    duration,
    maxDuration,
    silenceDuration,
    isSilenceDetected,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    isSupported,
  } = useVoiceRecorder();

  // Sync transcription to form description
  useEffect(() => {
    if (transcription) {
      setDescription(transcription);
    }
  }, [transcription, setDescription]);

  // Sync processing state
  useEffect(() => {
    setIsProcessing(state === 'processing');
  }, [state, setIsProcessing]);

  // Track recording events
  useEffect(() => {
    if (state === 'recording') {
      trackEvent(TRACKING_EVENTS.VOICE_INPUT_STARTED, {
        location: 'create_form',
      });
    }
  }, [state]);

  // Auto-focus submit button when transcription completes
  useEffect(() => {
    if (state === 'complete' && transcription && submitButtonRef.current) {
      // Small delay to ensure the button is rendered and description is synced
      const timer = setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state, transcription]);

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    trackEvent(TRACKING_EVENTS.VOICE_INPUT_COMPLETED, {
      transcription: transcription || '',
      durationMs: duration * 1000,
      confidence: 'medium', // TODO: Get from transcription result
    });
  };

  const handleCancel = () => {
    cancelRecording();
    trackEvent(TRACKING_EVENTS.VOICE_INPUT_CANCELLED, {
      durationMs: duration * 1000,
      reason: 'user_cancelled',
    });
  };

  const handleRetry = () => {
    reset();
  };

  // Handle description edit
  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setDescription(e.target.value);
  };

  // Auth/credit checks - use canGenerate which handles both signed-in and guest users
  const canRecord = canGenerate;

  const getButtonConfig = () => {
    // Can generate - show submit button
    if (canGenerate) {
      // Show remaining generations for guests
      if (isGuest) {
        return {
          text: t('buttonCreateGuest', { remaining: guestGenerationsRemaining }),
          isSubmit: true,
        };
      }
      return {
        text: t('buttonCreate'),
        isSubmit: true,
      };
    }

    // Blocked - show appropriate CTA
    if (blockedReason === 'guest_limit_reached') {
      return {
        text: t('buttonSignUp'),
        action: () => handleAuthAction('signin'),
        subtext: t('subtextGuestLimit'),
        isSubmit: false,
      };
    }

    if (blockedReason === 'no_credits') {
      if (hasActiveSubscription) {
        return {
          text: t('buttonBuyCredits'),
          action: () => handleAuthAction('billing'),
          subtext: t('subtextNoCreditsSubscribed'),
          isSubmit: false,
        };
      }
      return {
        text: t('buttonViewPlans'),
        action: () => handleAuthAction('billing'),
        subtext: t('subtextNoCreditsNoSubscription'),
        isSubmit: false,
      };
    }

    // Fallback
    return {
      text: t('buttonGetStarted'),
      action: () => handleAuthAction('signin'),
      subtext: t('subtextFallback'),
      isSubmit: false,
    };
  };

  const buttonConfig = getButtonConfig();

  // Browser doesn't support voice recording
  if (!isSupported) {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-8', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <div className="text-5xl mb-2">🎤</div>
        <p className="text-center text-text-secondary font-tondo font-bold">
          {t('voiceInput.notSupported')}
        </p>
        <p className="text-center text-sm text-text-muted">
          {t('voiceInput.notSupportedHint')}
        </p>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    const errorMessageKeys: Record<string, string> = {
      permission_denied: 'voiceInput.errors.permissionDenied',
      not_supported: 'voiceInput.errors.notSupported',
      transcription_failed: 'voiceInput.errors.transcriptionFailed',
      recording_failed: 'voiceInput.errors.recordingFailed',
      timeout: 'voiceInput.errors.timeout',
    };

    const errorKey = errorMessageKeys[error || 'recording_failed'];

    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-8', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <div className="text-6xl mb-2">😅</div>
        <p className="text-center text-text-primary font-tondo font-bold">
          {t(errorKey)}
        </p>
        <Button
          onClick={handleRetry}
          className="font-tondo font-bold text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-xl"
        >
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          {t('voiceInput.tryAgain')}
        </Button>
      </div>
    );
  }

  // Recording state
  if (state === 'recording') {
    // Calculate auto-stop countdown (starts at 4 seconds of silence)
    const autoStopCountdown = isSilenceDetected
      ? Math.max(0, Math.ceil(4 - silenceDuration))
      : null;

    return (
      <div
        className={cn('flex flex-col items-center gap-6 py-4', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <p
          className={cn(
            'text-center font-tondo font-bold text-lg transition-all duration-300',
            isSilenceDetected ? 'text-crayon-teal' : 'text-text-primary',
          )}
        >
          {isSilenceDetected
            ? t('voiceInput.allDone', { countdown: autoStopCountdown ?? 0 })
            : t('voiceInput.listening')}
        </p>

        <AudioLevelIndicator level={audioLevel} />

        <CountdownTimer duration={duration} maxDuration={maxDuration} />

        <div className="flex gap-3">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="font-tondo font-bold border-2 border-paper-cream-dark text-text-primary hover:bg-paper-cream rounded-xl"
          >
            {t('voiceInput.cancel')}
          </Button>
          <Button
            onClick={handleStopRecording}
            className={cn(
              'font-tondo font-bold text-white px-8 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95',
              isSilenceDetected
                ? 'bg-btn-teal shadow-btn-secondary animate-pulse'
                : 'bg-btn-orange shadow-btn-primary',
            )}
          >
            <FontAwesomeIcon icon={faStop} className="mr-2" />
            {isSilenceDetected ? t('voiceInput.imDone') : t('voiceInput.doneTalking')}
          </Button>
        </div>
      </div>
    );
  }

  // Processing state
  if (state === 'processing' || state === 'requesting_permission') {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-8', className)}
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
          {state === 'requesting_permission'
            ? t('voiceInput.gettingMicReady')
            : t('voiceInput.understanding')}
        </p>
      </div>
    );
  }

  // Complete state - show transcription as speech bubble with exciting CTA
  if (state === 'complete' && transcription) {
    // Check if description is ready (synced from transcription via useEffect)
    // This prevents submitting before the context is updated
    const isDescriptionReady = description.trim().length > 0;

    return (
      <div
        className={cn('flex flex-col items-center gap-5 py-4', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        {/* Speech bubble showing what was heard */}
        <div className="relative w-full max-w-sm">
          <div className="bg-crayon-teal-light/30 border-2 border-crayon-teal rounded-2xl px-5 py-4 text-center">
            <p className="text-text-primary font-tondo text-lg leading-relaxed">
              &ldquo;{transcription}&rdquo;
            </p>
          </div>
          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-crayon-teal-light/30 border-b-2 border-r-2 border-crayon-teal rotate-45" />
        </div>

        {/* Exciting CTA */}
        <div className="flex flex-col items-center gap-3 mt-2">
          {buttonConfig.isSubmit ? (
            <SubmitButton
              ref={submitButtonRef}
              text={t('voiceInput.makeMyColoringPage')}
              className="font-tondo font-bold text-lg text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover px-8 py-6 rounded-xl hover:scale-105 active:scale-95 transition-all duration-200"
              disabled={!isDescriptionReady}
            />
          ) : (
            <Button
              onClick={buttonConfig.action}
              className="font-tondo font-bold text-lg text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover px-8 py-6 rounded-xl hover:scale-105 active:scale-95 transition-all duration-200 h-auto"
              type="button"
            >
              {buttonConfig.text}
            </Button>
          )}

          {buttonConfig.subtext && (
            <p className="font-tondo text-sm text-center text-text-muted">
              {buttonConfig.subtext}
            </p>
          )}

          {/* Subtle retry option */}
          <button
            type="button"
            onClick={handleRetry}
            className="font-tondo text-sm text-text-muted hover:text-text-primary underline underline-offset-2 transition-colors"
          >
            {t('voiceInput.notQuiteRight')}
          </button>
        </div>
      </div>
    );
  }

  // Idle state - show record button
  return (
    <div
      className={cn('flex flex-col items-center gap-6 py-4', className)}
      role="tabpanel"
      id="voice-input-panel"
      aria-labelledby="voice-mode-tab"
    >
      <p className="text-center text-text-primary font-tondo font-bold text-lg">
        {canRecord
          ? t('voiceInput.tapToRecord')
          : blockedReason === 'guest_limit_reached'
            ? t('subtextGuestLimit')
            : blockedReason === 'no_credits'
              ? t('subtextNoCredits')
              : t('voiceInput.signInToRecord')}
      </p>

      <button
        type="button"
        onClick={handleStartRecording}
        disabled={!canRecord}
        className={cn(
          'w-24 h-24 rounded-full flex items-center justify-center',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange focus-visible:ring-offset-2',
          canRecord
            ? 'bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-110 active:scale-95 cursor-pointer'
            : 'bg-paper-cream-dark cursor-not-allowed',
        )}
        style={
          {
            '--fa-primary-color': canRecord
              ? 'white'
              : 'hsl(var(--text-muted))',
            '--fa-secondary-color': canRecord
              ? 'rgba(255, 255, 255, 0.8)'
              : 'hsl(var(--text-muted))',
            '--fa-secondary-opacity': '1',
          } as React.CSSProperties
        }
        aria-label={t('voiceInput.startRecording')}
      >
        <FontAwesomeIcon
          icon={faMicrophoneLines}
          className={cn('text-4xl', canRecord && 'animate-pulse')}
        />
      </button>

      <p className="font-tondo text-sm text-text-muted text-center">
        {t('voiceInput.maxDuration', { seconds: maxDuration })}
      </p>

      {!canRecord && (
        <>
          {buttonConfig.isSubmit ? null : (
            <Button
              onClick={buttonConfig.action}
              className="font-tondo font-bold text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-xl"
              type="button"
            >
              {buttonConfig.text}
            </Button>
          )}
          {buttonConfig.subtext && (
            <p className="font-tondo text-sm text-center text-text-muted">
              {buttonConfig.subtext}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default VoiceInput;
