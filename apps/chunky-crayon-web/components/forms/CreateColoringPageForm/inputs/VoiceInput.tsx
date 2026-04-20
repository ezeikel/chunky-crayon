'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

type VoiceInputProps = {
  className?: string;
};

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

const VoiceInput = ({ className }: VoiceInputProps) => {
  const t = useTranslations('createForm');
  const { canGenerate } = useUser();
  const { setDescription, setIsProcessing, setIsBusy } = useInputMode();

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

  useEffect(() => {
    if (transcription) setDescription(transcription);
  }, [transcription, setDescription]);

  useEffect(() => {
    setIsProcessing(state === 'processing');
  }, [state, setIsProcessing]);

  // Hide the global FormCTA while the voice UX owns the flow.
  useEffect(() => {
    const busy =
      state === 'recording' ||
      state === 'processing' ||
      state === 'requesting_permission' ||
      state === 'error';
    setIsBusy(busy);
    return () => setIsBusy(false);
  }, [state, setIsBusy]);

  useEffect(() => {
    if (state === 'recording') {
      trackEvent(TRACKING_EVENTS.VOICE_INPUT_STARTED, {
        location: 'create_form',
      });
    }
  }, [state]);

  // Fire VOICE_INPUT_COMPLETED when the transcription actually arrives.
  // Firing it inside handleStopRecording captures a stale closure value
  // (always empty) because transcription happens asynchronously in
  // useVoiceRecorder after stopRecording() is called.
  useEffect(() => {
    if (state === 'complete' && transcription) {
      trackEvent(TRACKING_EVENTS.VOICE_INPUT_COMPLETED, {
        transcription,
        durationMs: duration * 1000,
        confidence: 'medium',
      });
    }
  }, [state, transcription, duration]);

  const handleStartRecording = async () => {
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
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
          {t('voiceInput.notSupported')}
        </p>
      </div>
    );
  }

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
          {t(errorKey)}
        </p>
        <Button
          onClick={handleRetry}
          className="font-tondo font-bold text-base md:text-lg text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-full px-8 py-4 h-auto"
        >
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          {t('voiceInput.tryAgain')}
        </Button>
      </div>
    );
  }

  if (state === 'recording') {
    const autoStopCountdown = isSilenceDetected
      ? Math.max(0, Math.ceil(4 - silenceDuration))
      : null;

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
            isSilenceDetected ? 'text-crayon-teal' : 'text-text-primary',
          )}
        >
          {isSilenceDetected
            ? t('voiceInput.allDone', { countdown: autoStopCountdown ?? 0 })
            : t('voiceInput.listening')}
        </p>

        <AudioLevelIndicator level={audioLevel} />
        <CountdownTimer duration={duration} maxDuration={maxDuration} />

        <div className="flex gap-3 w-full">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="font-tondo font-bold text-base md:text-lg border-2 border-paper-cream-dark text-text-primary hover:bg-paper-cream rounded-full py-4 h-auto flex-1"
          >
            {t('voiceInput.cancel')}
          </Button>
          <Button
            onClick={handleStopRecording}
            className={cn(
              'font-tondo font-bold text-base md:text-lg text-white rounded-full py-4 h-auto flex-[2] transition-all duration-300 hover:scale-105 active:scale-95',
              isSilenceDetected
                ? 'bg-btn-teal shadow-btn-secondary animate-pulse'
                : 'bg-btn-orange shadow-btn-primary',
            )}
          >
            <FontAwesomeIcon icon={faStop} className="mr-2" />
            {isSilenceDetected
              ? t('voiceInput.imDone')
              : t('voiceInput.doneTalking')}
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'processing' || state === 'requesting_permission') {
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
          {state === 'requesting_permission'
            ? t('voiceInput.gettingMicReady')
            : t('voiceInput.understanding')}
        </p>
      </div>
    );
  }

  if (state === 'complete' && transcription) {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-2', className)}
        role="tabpanel"
        id="voice-input-panel"
        aria-labelledby="voice-mode-tab"
      >
        <div className="relative w-full max-w-sm">
          <div className="bg-crayon-teal-light/30 border-2 border-crayon-teal rounded-coloring-card px-5 py-4 text-center">
            <p className="text-text-primary font-tondo text-lg leading-relaxed">
              &ldquo;{transcription}&rdquo;
            </p>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-crayon-teal-light/30 border-b-2 border-r-2 border-crayon-teal rotate-45" />
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="font-tondo text-sm text-text-muted hover:text-text-primary underline underline-offset-2 transition-colors"
        >
          {t('voiceInput.notQuiteRight')}
        </button>
      </div>
    );
  }

  // Idle
  return (
    <div
      className={cn('flex flex-col items-center gap-5 py-2', className)}
      role="tabpanel"
      id="voice-input-panel"
      aria-labelledby="voice-mode-tab"
    >
      <p className="text-center text-text-primary font-tondo font-bold text-xl md:text-2xl">
        {t('voiceInput.tapToRecord')}
      </p>

      <button
        type="button"
        onClick={handleStartRecording}
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
        aria-label={t('voiceInput.startRecording')}
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
