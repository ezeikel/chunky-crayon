'use client';

import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faSpinner, faCheck } from '@fortawesome/pro-solid-svg-icons';
import { saveArtworkToGallery } from '@/app/actions/saved-artwork';
import Confetti from '@/components/Confetti';
import { useSound } from '@/hooks/useSound';
import cn from '@/utils/cn';

type SaveToGalleryButtonProps = {
  coloringImageId: string;
  getCanvasDataUrl: () => string | null;
  className?: string;
};

type SaveState = 'idle' | 'saving' | 'success' | 'error';

// Kid-friendly button style
const buttonClassName =
  'flex items-center justify-center gap-x-3 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg transition-all duration-150';

const SaveToGalleryButton = ({
  coloringImageId,
  getCanvasDataUrl,
  className,
}: SaveToGalleryButtonProps) => {
  const [state, setState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
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
        setShowConfetti(true);
        playSound('save');
        // Reset to idle after 3 seconds
        setTimeout(() => setState('idle'), 3000);
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
          <FontAwesomeIcon icon={faSpinner} className="text-2xl animate-spin" />
          Saving...
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
          <FontAwesomeIcon icon={faCheck} className="text-2xl" />
          Saved!
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
            <FontAwesomeIcon icon={faHeart} className="text-2xl" />
            Try Again
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
        <FontAwesomeIcon icon={faHeart} className="text-2xl" />
        Save to Gallery
      </button>
    );
  };

  return (
    <>
      <Confetti
        isActive={showConfetti}
        onComplete={handleConfettiComplete}
        duration={3000}
        pieceCount={60}
      />
      {renderButton()}
    </>
  );
};

export default SaveToGalleryButton;
