'use client';

import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faSpinner, faCheck } from '@fortawesome/pro-solid-svg-icons';
import { saveArtworkToGallery } from '@/app/actions/saved-artwork';
import Confetti from '@/components/Confetti';
import { StickerReward } from '@/components/StickerReward';
import { ColoEvolutionCelebration } from '@/components/ColoEvolutionCelebration';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';
import type { Sticker } from '@/lib/stickers';
import type { EvolutionResult } from '@/lib/colo';

type SaveToGalleryButtonProps = {
  coloringImageId: string;
  getCanvasDataUrl: () => string | null;
  className?: string;
};

type SaveState = 'idle' | 'saving' | 'success' | 'error';

// Kid-friendly button style
// Responsive: icon-only on mobile (44px touch target), icon+text on desktop
const buttonClassName =
  'flex items-center justify-center gap-x-2 md:gap-x-3 text-white font-tondo font-bold text-base md:text-lg size-11 md:size-auto md:px-8 md:py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200';

const SaveToGalleryButton = ({
  coloringImageId,
  getCanvasDataUrl,
  className,
}: SaveToGalleryButtonProps) => {
  const [state, setState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedStickers, setUnlockedStickers] = useState<Sticker[]>([]);
  const [showStickerReward, setShowStickerReward] = useState(false);
  const [evolutionResult, setEvolutionResult] =
    useState<EvolutionResult | null>(null);
  const [showEvolutionCelebration, setShowEvolutionCelebration] =
    useState(false);
  const { playSound } = useSound();

  const handleSave = useCallback(async () => {
    setState('saving');
    setErrorMessage(null);

    try {
      const dataUrl = getCanvasDataUrl();
      if (!dataUrl) {
        setState('error');
        setErrorMessage('Could not capture your artwork');
        playSound('error');
        return;
      }

      const result = await saveArtworkToGallery(coloringImageId, dataUrl);

      if (result.success) {
        setState('success');
        playSound('save');

        // Store evolution result if Colo evolved or got new accessories
        const hasEvolution =
          result.evolutionResult &&
          (result.evolutionResult.evolved ||
            result.evolutionResult.newAccessories.length > 0);
        if (hasEvolution) {
          setEvolutionResult(result.evolutionResult);
        }

        // Check if any stickers were unlocked
        if (result.newStickers && result.newStickers.length > 0) {
          // Show sticker reward celebration first
          setUnlockedStickers(result.newStickers);
          setShowStickerReward(true);
          // Evolution celebration will show after sticker reward is dismissed
        } else if (hasEvolution) {
          // No stickers but have evolution - show evolution celebration
          setShowEvolutionCelebration(true);
        } else {
          // No stickers or evolution - show confetti and reset after 3 seconds
          setShowConfetti(true);
          setTimeout(() => setState('idle'), 3000);
        }
      } else {
        setState('error');
        setErrorMessage(result.error);
        playSound('error');
      }
    } catch {
      setState('error');
      setErrorMessage('Something went wrong. Please try again.');
      playSound('error');
    }
  }, [coloringImageId, getCanvasDataUrl, playSound]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const handleStickerRewardComplete = useCallback(() => {
    setShowStickerReward(false);
    setUnlockedStickers([]);

    // Check if there's a pending evolution celebration to show
    if (
      evolutionResult &&
      (evolutionResult.evolved || evolutionResult.newAccessories.length > 0)
    ) {
      setShowEvolutionCelebration(true);
    } else {
      setState('idle');
    }
  }, [evolutionResult]);

  const handleEvolutionCelebrationComplete = useCallback(() => {
    setShowEvolutionCelebration(false);
    setEvolutionResult(null);
    setState('idle');
  }, []);

  const renderButton = () => {
    // Saving state
    if (state === 'saving') {
      return (
        <button
          type="button"
          disabled
          className={cn(
            buttonClassName,
            'bg-crayon-pink cursor-wait',
            className,
          )}
        >
          <FontAwesomeIcon
            icon={faSpinner}
            className="text-xl md:text-2xl animate-spin"
          />
          <span className="hidden md:inline">Saving...</span>
        </button>
      );
    }

    // Success state
    if (state === 'success') {
      return (
        <button
          type="button"
          disabled
          className={cn(
            buttonClassName,
            'bg-crayon-green cursor-default animate-bounce-in',
            className,
          )}
        >
          <FontAwesomeIcon icon={faCheck} className="text-xl md:text-2xl" />
          <span className="hidden md:inline">Saved!</span>
        </button>
      );
    }

    // Error state
    if (state === 'error') {
      return (
        <div className={cn('flex flex-col items-center gap-2', className)}>
          <button
            type="button"
            onClick={handleSave}
            className={cn(
              buttonClassName,
              'bg-crayon-pink hover:bg-crayon-pink-dark active:scale-95',
            )}
          >
            <FontAwesomeIcon icon={faHeart} className="text-xl md:text-2xl" />
            <span className="hidden md:inline">Try Again</span>
          </button>
          {errorMessage && (
            <p className="text-sm text-crayon-pink">{errorMessage}</p>
          )}
        </div>
      );
    }

    // Default idle state
    return (
      <button
        type="button"
        onClick={handleSave}
        className={cn(
          buttonClassName,
          'bg-crayon-pink hover:bg-crayon-pink-dark active:scale-95',
          className,
        )}
      >
        <FontAwesomeIcon icon={faHeart} className="text-xl md:text-2xl" />
        <span className="hidden md:inline">Save to Gallery</span>
      </button>
    );
  };

  return (
    <>
      {/* Confetti for saves without new stickers */}
      <Confetti
        isActive={showConfetti}
        onComplete={handleConfettiComplete}
        duration={3000}
        pieceCount={60}
      />

      {/* Sticker reward celebration for new unlocks */}
      {showStickerReward && unlockedStickers.length > 0 && (
        <StickerReward
          stickers={unlockedStickers}
          onComplete={handleStickerRewardComplete}
        />
      )}

      {/* Colo evolution celebration */}
      <ColoEvolutionCelebration
        evolutionResult={showEvolutionCelebration ? evolutionResult : null}
        onDismiss={handleEvolutionCelebrationComplete}
      />

      {renderButton()}
    </>
  );
};

export default SaveToGalleryButton;
