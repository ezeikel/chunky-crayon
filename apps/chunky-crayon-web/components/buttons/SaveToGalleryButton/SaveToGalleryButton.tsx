'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { faHeart } from '@fortawesome/pro-solid-svg-icons';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
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
    setErrorMessage(null);

    trackEvent(TRACKING_EVENTS.SAVE_TO_GALLERY_CLICKED, {
      coloringImageId,
    });

    const dataUrl = getCanvasDataUrl();
    if (!dataUrl) {
      setState('error');
      setErrorMessage(t('errors.captureArtwork'));
      playSound('error');
      return;
    }

    // Optimistic flip: the button shows "saved" (filled heart) the
    // instant the kid taps — the server roundtrip is several seconds
    // (sharp resize → R2 upload → DB insert → sticker check → colo
    // evolution → revalidate) and waiting feels unresponsive. We
    // revert + toast on actual failure below. Confetti / sticker /
    // colo celebrations still fire only on real success — we don't
    // want to celebrate a phantom save.
    setState('success');
    playSound('save');

    try {
      const result = await saveArtworkToGallery(coloringImageId, dataUrl);

      if (result.success) {
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
          // No stickers or evolution — fire confetti and stay in
          // the success state. Reverting to 'idle' (the old behaviour)
          // makes the filled-pink heart go back to a black outline a
          // few seconds after save, which reads as "save failed". The
          // button is the persistent saved-state signal now; the kid
          // sees pink heart = saved until they navigate away.
          setShowConfetti(true);
        }
      } else {
        // Server returned an error — revert the optimistic flip and
        // surface the reason. Toast so the parent sees what failed
        // even after the inline error chrome fades.
        setState('error');
        setErrorMessage(result.error);
        playSound('error');
        toast.error(result.error ?? t('errors.generic'));
      }
    } catch {
      setState('error');
      setErrorMessage(t('errors.generic'));
      playSound('error');
      toast.error(t('errors.generic'));
    }
  }, [coloringImageId, getCanvasDataUrl, playSound, t]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const handleStickerRewardComplete = useCallback(() => {
    setShowStickerReward(false);
    setUnlockedStickers([]);

    // Check if there's a pending evolution celebration to show.
    // The button stays in 'success' (filled pink heart) either way —
    // we don't revert to 'idle' or the kid thinks the save failed.
    if (
      evolutionResult &&
      (evolutionResult.evolved || evolutionResult.newAccessories.length > 0)
    ) {
      setShowEvolutionCelebration(true);
    }
  }, [evolutionResult]);

  const handleEvolutionCelebrationComplete = useCallback(() => {
    setShowEvolutionCelebration(false);
    setEvolutionResult(null);
    // Stay in 'success' — the pink heart is the persistent saved-state
    // signal; reverting reads as save-undone.
  }, []);

  // Visual rule: chrome stays uniform with sibling action buttons
  // (StartOver / Print / Save) — same white-with-thin-border tile,
  // same size. Only the icon + colour signals the state change. No
  // tone morphs (no pink outline at rest, no green pill on success)
  // — those make the heart button look out of family.
  const renderButton = () => {
    if (state === 'saving') {
      return (
        <ActionButton
          size="tile"
          tone="tool"
          icon={faSpinnerThird}
          label={t('saving')}
          disabled
          // FA's pro-duotone faSpinnerThird is static SVG — the icon
          // alone won't rotate. `[&_svg]:animate-spin` applies the
          // Tailwind spin keyframes to the rendered svg child.
          className={cn('[&_svg]:animate-spin text-crayon-pink', className)}
        />
      );
    }

    if (state === 'success') {
      return (
        <ActionButton
          size="tile"
          tone="tool"
          icon={faHeart}
          label={t('saved')}
          disabled
          // Saved-state signal = filled pink heart inside the same
          // white tile chrome. Bounce-in is fine but no colour wash.
          className={cn(
            'animate-bounce-in [&_svg]:text-crayon-pink',
            className,
          )}
        />
      );
    }

    if (state === 'error') {
      return (
        <div className={cn('flex flex-col items-center gap-2', className)}>
          <ActionButton
            size="tile"
            tone="tool"
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
        tone="tool"
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
