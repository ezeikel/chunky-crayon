'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPencilPaintbrush,
  faPalette,
  faPenSwirl,
  faSparkles,
  faStars,
  faMagnifyingGlass,
  faGift,
  faWandMagicSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import cn from '@/utils/cn';

// Audio state for visual feedback
export type AudioState = 'idle' | 'preparing' | 'playing' | 'done';

// Keys for loading messages - mapped to translations.
// Icons + messages are paired by index so the icon visually represents
// the same idea the audio narrates, and the index cycles together.
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

// Visual alphabet for kids 3-8 who can't read the cycling messages
// fast enough. Each icon paired with the message at the same index.
// Uses FA pro-duotone — emojis read as cheap and inconsistent across OS.
const LOADING_ICONS: IconDefinition[] = [
  faPencilPaintbrush, // sharpeningCrayons — pencil + brush together
  faPalette, // mixingColors
  faPenSwirl, // drawingLines — pen with a swirl trail
  faSparkles, // addingSparkles
  faStars, // almostThere — bright + close
  faWandMagicSparkles, // creatingMasterpiece
  faMagnifyingGlass, // wavingWand reused as "checking the details" — wand isn't standard FA
  faGift, // coloringOutsideLines — final reveal feels like unwrapping
];

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
  /**
   * data:image/png;base64,... URL of the most recent partial frame from
   * the streaming SSE flow. When present, render it below Colo so the
   * kid sees the page appearing before navigation. When absent, the
   * mascot + cycling messages carry the load.
   */
  partialImageUrl?: string;
  className?: string;
};

const ColoLoading = ({
  audioUrl,
  audioState: externalAudioState = 'idle',
  description,
  isLoading,
  onAudioComplete,
  partialImageUrl,
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

  // Cycle through loading messages + matched icons. Slower cadence (4s)
  // because target audience is 3-8 — they parse the icon, not the words.
  // Stop cycling once the partial image arrives — at that point the
  // partial IS the focal point and a swap-icon would distract.
  useEffect(() => {
    if (!isLoading || isPlaying || partialImageUrl) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex(
        (prev) => (prev + 1) % LOADING_MESSAGE_KEYS.length,
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isLoading, isPlaying, partialImageUrl]);

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

  // Lock body scroll while the fullscreen overlay is visible. Without
  // this you can scroll the page underneath, which breaks the "modal"
  // illusion and lets users tap things they shouldn't be tapping
  // mid-generation. Restore on unmount/finish so we never strand the
  // page in a frozen state.
  useEffect(() => {
    if (!isLoading) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
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

        {/* Sparkle effects around Colo (hide when speaking).
            FA duotone instead of emojis — emojis read inconsistently
            across OS + feel cheap relative to the brand. */}
        {!isPlaying && (
          <>
            <FontAwesomeIcon
              icon={faSparkles}
              className="absolute -top-4 -right-4 text-2xl animate-pulse text-crayon-yellow"
              style={
                {
                  '--fa-secondary-color': 'hsl(var(--crayon-orange))',
                  '--fa-secondary-opacity': 0.9,
                } as React.CSSProperties
              }
            />
            <FontAwesomeIcon
              icon={faStars}
              className="absolute -bottom-2 -left-4 text-xl animate-pulse text-crayon-pink"
              style={
                {
                  animationDelay: '-0.5s',
                  '--fa-secondary-color': 'hsl(var(--crayon-purple))',
                  '--fa-secondary-opacity': 0.9,
                } as React.CSSProperties
              }
            />
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
          <FontAwesomeIcon
            icon={faPalette}
            className="text-crayon-orange text-xl mr-2"
          />
          <span className="font-tondo font-medium text-lg text-crayon-orange">
            {t('coloSpeaking')}
          </span>
        </div>
      )}

      {/* Cycling activity icon — kids 3-8 read the icon, not the text.
          Re-mounted with a key so the scale-in CSS animation re-fires on
          every swap. Hidden when Colo is speaking (audio narrates) and
          when the partial image has landed (the image is the focal
          point). */}
      {!isPlaying && !partialImageUrl && (
        <div
          key={`loading-icon-${currentMessageIndex}`}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg border-2 border-crayon-orange-light animate-icon-pop"
        >
          <FontAwesomeIcon
            icon={LOADING_ICONS[currentMessageIndex]}
            className="text-4xl text-crayon-orange"
            // FA duotone secondary uses --fa-secondary-* CSS vars; lean
            // pink-light to colour the back-layer warmly.
            style={{
              ['--fa-secondary-color' as string]: 'rgb(255 192 192 / 1)',
              ['--fa-secondary-opacity' as string]: 0.8,
            }}
          />
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

      {/* Partial image preview — only renders once the streaming SSE
          flow has emitted at least one partial frame from OpenAI. The
          first partial currently lands ~3 minutes into the wait, so for
          most of the load this stays absent and the mascot carries the
          UX. When it lands, render the image with a soft border so it
          reads like "your coloring page is appearing!" rather than a
          pop-up. */}
      {partialImageUrl && (
        <div className="mt-6 flex flex-col items-center gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faSparkles}
              className="text-crayon-orange text-base"
            />
            <p className="font-tondo font-medium text-sm text-crayon-orange">
              {t('partialAppearing')}
            </p>
          </div>
          {/* Plain <img> rather than next/image: the data: URL changes on
              each partial and next/image's optimization pipeline is
              wrong for that. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={partialImageUrl}
            alt="Coloring page preview"
            className="w-64 h-64 rounded-2xl shadow-xl border-4 border-white object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default ColoLoading;
