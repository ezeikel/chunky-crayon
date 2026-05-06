'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { faHeart, faSpinner, faCheck } from '@fortawesome/pro-solid-svg-icons';
import { saveArtworkToGallery } from '@/app/actions/saved-artwork';
import Confetti from '@/components/Confetti';
import { StickerReward } from '@/components/StickerReward';
import { ColoEvolutionCelebration } from '@/components/ColoEvolutionCelebration';
import { ActionButton, useSound } from '@one-colored-pixel/coloring-ui';
import { trackEvent } from '@/utils/analytics-client';
import { trackResourceSaved } from '@/utils/pixels';
import { recordResourceSaved } from '@/app/actions/conversions';
import { TRACKING_EVENTS } from '@/constants';
import cn from '@/utils/cn';
import type { Sticker } from '@/lib/stickers';
import type { EvolutionResult } from '@/lib/colo';

type SaveToGalleryButtonProps = {
  coloringImageId: string;
  getCanvasDataUrl: () => string | null;
  className?: string;
};

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const SaveToGalleryButton = ({
  coloringImageId,
  getCanvasDataUrl,
  className,
}: SaveToGalleryButtonProps) => {
  const t = useTranslations('saveToGallery');
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

    trackEvent(TRACKING_EVENTS.SAVE_TO_GALLERY_CLICKED, {
      coloringImageId,
    });

    try {
      const dataUrl = getCanvasDataUrl();
      if (!dataUrl) {
        setState('error');
        setErrorMessage(t('errors.captureArtwork'));
        playSound('error');
        return;
      }

      const result = await saveArtworkToGallery(coloringImageId, dataUrl);

      if (result.success) {
        setState('success');
        playSound('save');

        // Canonical paid-ad lead signal — only fire on confirmed save
        // (the click event already went to PostHog above for product
        // analytics; ads care about completed value, not clicks).
        const resourceEventId = `save_${coloringImageId}_${Date.now()}`;
        trackResourceSaved({
          method: 'save',
          surface: 'gallery',
          contentType: 'image',
          eventId: resourceEventId,
        });
        void recordResourceSaved({
          method: 'save',
          surface: 'gallery',
          eventId: resourceEventId,
        });

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
      setErrorMessage(t('errors.generic'));
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
    if (state === 'saving') {
      return (
        <ActionButton
          size="tile"
          tone="secondary"
          icon={faSpinner}
          label={t('saving')}
          disabled
          className={className}
        />
      );
    }

    if (state === 'success') {
      return (
        <ActionButton
          size="tile"
          tone="success"
          icon={faCheck}
          label={t('saved')}
          disabled
          className={cn('animate-bounce-in', className)}
        />
      );
    }

    if (state === 'error') {
      return (
        <div className={cn('flex flex-col items-center gap-2', className)}>
          <ActionButton
            size="tile"
            tone="secondary"
            icon={faHeart}
            label={t('tryAgain')}
            onClick={handleSave}
          />
          {errorMessage && (
            <p className="text-sm text-crayon-pink">{errorMessage}</p>
          )}
        </div>
      );
    }

    return (
      <ActionButton
        size="tile"
        tone="secondary"
        icon={faHeart}
        label={t('idle')}
        onClick={handleSave}
        className={className}
      />
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
