'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import cn from '@/utils/cn';

// Audio state for visual feedback
export type AudioState = 'idle' | 'preparing' | 'playing' | 'done';

// Keys for loading messages - mapped to translations
const LOADING_MESSAGE_KEYS = [
  'sharpeningCrayons',
  'mixingColors',
  'drawingLines',
  'addingSparkles',
  'almostThere',
  'creatingMasterpiece',
  'wavingWand',
  'coloringOutsideLines',
] as const;

type ColoLoadingProps = {
  /** Audio URL to play (from ElevenLabs) */
  audioUrl?: string;
  /** Current audio generation/playback state */
  audioState?: AudioState;
  /** Description being generated (for fallback message) */
  description?: string;
  /** Whether the loading is active */
  isLoading: boolean;
  /** Callback when audio finishes playing */
  onAudioComplete?: () => void;
  className?: string;
};

const ColoLoading = ({
  audioUrl,
  audioState: externalAudioState = 'idle',
  description,
  isLoading,
  onAudioComplete,
  className,
}: ColoLoadingProps) => {
  const t = useTranslations('coloLoading');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Derive the actual audio state from what we know internally
  // This is more reliable than depending on parent prop updates
  const audioState: AudioState = (() => {
    if (isPlaying) return 'playing';
    if (hasPlayedAudio) return 'done';
    // If loading but no audio yet, we're preparing (waiting for audio to generate)
    if (isLoading && !audioUrl) return 'preparing';
    // Use external state as fallback
    return externalAudioState;
  })();

  // Cycle through loading messages (only when not speaking)
  useEffect(() => {
    if (!isLoading || isPlaying) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex(
        (prev) => (prev + 1) % LOADING_MESSAGE_KEYS.length,
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoading, isPlaying]);

  // Play audio when URL is available
  useEffect(() => {
    if (audioUrl && audioRef.current && !hasPlayedAudio && isLoading) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch((err) => {
        // eslint-disable-next-line no-console
        console.log('[ColoLoading] Audio autoplay blocked:', err);
      });
      setHasPlayedAudio(true);
      setIsPlaying(true);
    }
  }, [audioUrl, hasPlayedAudio, isLoading]);

  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
    onAudioComplete?.();
  };

  // Reset state when loading stops
  useEffect(() => {
    if (!isLoading) {
      setHasPlayedAudio(false);
      setIsPlaying(false);
      setCurrentMessageIndex(0);
    }
  }, [isLoading]);

  // Determine what message to show based on audio state
  const getMessage = () => {
    // If we're playing audio, show nothing - let Colo speak
    if (audioState === 'playing') {
      return null;
    }
    // Show "waking up" message while waiting for audio
    if (audioState === 'preparing') {
      return t('audioStates.preparing');
    }
    // After audio finished, cycle through fun messages
    const messageKey = LOADING_MESSAGE_KEYS[currentMessageIndex];
    return t(`messages.${messageKey}`);
  };

  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-gradient-to-b from-paper-cream via-white to-paper-cream',
        'backdrop-blur-sm',
        className,
      )}
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={handleAudioEnded} preload="auto" />

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-crayon-orange-light/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-20 w-40 h-40 bg-crayon-teal-light/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '-2s' }}
        />
        <div
          className="absolute top-1/2 left-1/4 w-24 h-24 bg-crayon-pink-light/20 rounded-full blur-2xl animate-float"
          style={{ animationDelay: '-1s' }}
        />
      </div>

      {/* Colo mascot with float animation */}
      <div className="relative animate-float mb-8">
        <Image
          src="/images/colo.svg"
          alt="Colo the friendly crayon mascot"
          width={200}
          height={200}
          className={cn(
            'drop-shadow-xl transition-transform duration-300',
            // Slight scale when speaking for emphasis
            isPlaying && 'scale-105',
          )}
          priority
        />

        {/* Sparkle effects around Colo (hide when speaking) */}
        {!isPlaying && (
          <>
            <div className="absolute -top-4 -right-4 text-2xl animate-pulse">
              ✨
            </div>
            <div
              className="absolute -bottom-2 -left-4 text-xl animate-pulse"
              style={{ animationDelay: '-0.5s' }}
            >
              🌟
            </div>
          </>
        )}

        {/* Sound waves when Colo is speaking */}
        {isPlaying && (
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1">
            {/* Animated sound wave bars */}
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1.5 bg-crayon-orange rounded-full animate-sound-wave"
                  style={{
                    height: `${12 + i * 6}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Speech bubble when Colo is speaking */}
      {isPlaying && (
        <div className="mb-4 px-6 py-3 bg-white rounded-2xl shadow-lg border-2 border-crayon-orange-light relative">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l-2 border-t-2 border-crayon-orange-light rotate-45" />
          <p className="font-tondo font-medium text-lg text-crayon-orange text-center">
            🎨 {t('coloSpeaking')} 🎨
          </p>
        </div>
      )}

      {/* Loading message */}
      <div className="text-center max-w-md px-6">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-gradient-orange mb-3">
          {isPlaying ? t('titleSpeaking') : t('title')}
        </h2>
        {getMessage() && (
          <p className="font-tondo text-lg text-text-primary mb-4 transition-all duration-500">
            {getMessage()}
          </p>
        )}
        {description && !isPlaying && (
          <p className="font-tondo text-sm text-text-muted italic">
            &ldquo;{description.slice(0, 60)}
            {description.length > 60 ? '...' : ''}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
};

export default ColoLoading;
