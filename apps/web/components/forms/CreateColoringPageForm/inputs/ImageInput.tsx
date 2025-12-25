'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCameraRetro,
  faImages,
  faRotateRight,
  faSpinnerThird,
  faCheck,
  faCloudArrowUp,
} from '@fortawesome/pro-duotone-svg-icons';
import useUser from '@/hooks/useUser';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import cn from '@/utils/cn';
import { useInputMode } from './InputModeContext';
import { useImageInput } from '../hooks/useImageInput';

// =============================================================================
// Types
// =============================================================================

type ImageInputProps = {
  className?: string;
};

// =============================================================================
// Main Component
// =============================================================================

const ImageInput = ({ className }: ImageInputProps) => {
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

  const {
    state,
    previewUrl,
    description: aiDescription,
    subjects,
    isChildDrawing,
    error,
    source,
    fileSizeKb,
    openCamera,
    openFilePicker,
    processImage,
    clearImage,
    reset,
    cameraInputRef,
    fileInputRef,
    handleFileChange,
  } = useImageInput();

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Ref for auto-focusing submit button when processing completes
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Sync AI description to form description
  useEffect(() => {
    if (aiDescription) {
      setDescription(aiDescription);
    }
  }, [aiDescription, setDescription]);

  // Sync processing state
  useEffect(() => {
    setIsProcessing(state === 'processing');
  }, [state, setIsProcessing]);

  // Track image input events
  useEffect(() => {
    if (state === 'preview' && source) {
      if (source === 'camera') {
        trackEvent(TRACKING_EVENTS.IMAGE_INPUT_CAPTURED, {
          source: 'camera',
        });
      } else {
        trackEvent(TRACKING_EVENTS.IMAGE_INPUT_UPLOADED, {
          fileType: 'image',
          fileSizeKb,
        });
      }
    }
  }, [state, source, fileSizeKb]);

  useEffect(() => {
    if (state === 'complete' && aiDescription && source) {
      trackEvent(TRACKING_EVENTS.IMAGE_INPUT_PROCESSED, {
        description: aiDescription,
        subjects,
        isChildDrawing,
      });
    }
  }, [state, aiDescription, subjects, isChildDrawing, source]);

  // Auto-focus submit button when processing completes
  useEffect(() => {
    if (state === 'complete' && aiDescription && submitButtonRef.current) {
      // Small delay to ensure the button is rendered and description is synced
      const timer = setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state, aiDescription]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canInteract) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!canInteract) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      // Create a synthetic event for the handler
      const syntheticEvent = {
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(syntheticEvent, 'file_picker');
    }
  };

  const handleRetry = () => {
    reset();
  };

  // Auth/credit checks - use canGenerate which handles both signed-in and guest users
  const canInteract = canGenerate;

  const getButtonConfig = () => {
    // Can generate - show submit button
    if (canGenerate) {
      // Show remaining generations for guests
      if (isGuest) {
        return {
          text: `Generate (${guestGenerationsRemaining} free ${guestGenerationsRemaining === 1 ? 'try' : 'tries'} left)`,
          isSubmit: true,
        };
      }
      return {
        text: 'Generate coloring page',
        isSubmit: true,
      };
    }

    // Blocked - show appropriate CTA
    if (blockedReason === 'guest_limit_reached') {
      return {
        text: 'Sign up for 15 free credits',
        action: () => handleAuthAction('signin'),
        subtext: "You've seen the magic! Sign up to keep creating.",
        isSubmit: false,
      };
    }

    if (blockedReason === 'no_credits') {
      if (hasActiveSubscription) {
        return {
          text: 'Buy more credits',
          action: () => handleAuthAction('billing'),
          subtext:
            'Need more magic? Top up or upgrade to keep the creativity going!',
          isSubmit: false,
        };
      }
      return {
        text: 'View plans',
        action: () => handleAuthAction('billing'),
        subtext: 'Choose a subscription to unlock more creations',
        isSubmit: false,
      };
    }

    // Fallback
    return {
      text: 'Get started for free',
      action: () => handleAuthAction('signin'),
      subtext: "You'll get 15 free credits — enough to generate 3 pages!",
      isSubmit: false,
    };
  };

  const buttonConfig = getButtonConfig();

  // Error state
  if (state === 'error') {
    const errorMessages: Record<string, string> = {
      file_too_large:
        "That image is too big! Try one that's smaller than 10MB.",
      invalid_type:
        "I can't read that file type. Try a JPEG, PNG, or WebP image!",
      processing_failed:
        "Hmm, I couldn't understand that image. Let's try another one!",
      camera_failed: "Something went wrong with the camera. Let's try again!",
    };

    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-8', className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <div className="text-6xl mb-2">😅</div>
        <p className="text-center text-text-primary font-tondo font-bold">
          {errorMessages[error || 'processing_failed']}
        </p>
        <Button
          onClick={handleRetry}
          className="font-tondo font-bold text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-xl"
        >
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          Try again
        </Button>
      </div>
    );
  }

  // Processing state
  if (state === 'processing' || state === 'capturing') {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-8', className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
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
          {state === 'capturing'
            ? 'Getting your photo ready...'
            : 'Looking at your picture...'}
        </p>
      </div>
    );
  }

  // Preview state - show image and confirm button
  if (state === 'preview' && previewUrl) {
    return (
      <div
        className={cn('flex flex-col items-center gap-4', className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <p className="text-center text-text-primary font-tondo font-bold">
          Great picture! Is this the one you want?
        </p>

        <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-crayon-orange">
          <Image
            src={previewUrl}
            alt="Selected image preview"
            fill
            className="object-cover"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={clearImage}
            variant="outline"
            className="font-tondo font-bold border-2 border-paper-cream-dark text-text-primary hover:bg-paper-cream rounded-xl"
          >
            <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
            Pick another
          </Button>
          <Button
            onClick={processImage}
            className="font-tondo font-bold text-white bg-btn-teal shadow-btn-secondary hover:shadow-btn-secondary-hover hover:scale-105 active:scale-95 transition-all duration-200 px-8 rounded-xl"
          >
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            Use this!
          </Button>
        </div>
      </div>
    );
  }

  // Complete state - show polaroid-style image with caption and exciting CTA
  if (state === 'complete' && aiDescription) {
    // Check if description is ready (synced from aiDescription via useEffect)
    const isDescriptionReady = description.trim().length > 0;

    return (
      <div
        className={cn('flex flex-col items-center gap-5 py-4', className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        {/* Polaroid-style frame with image and caption */}
        <div className="relative w-full max-w-xs">
          <div className="bg-white border-2 border-crayon-teal rounded-2xl p-3 pb-4 shadow-lg">
            {/* Image container */}
            {previewUrl && (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3">
                <Image
                  src={previewUrl}
                  alt="Your uploaded image"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            {/* Caption showing AI description */}
            <p className="text-center text-text-primary font-tondo text-base leading-relaxed">
              {isChildDrawing ? '✏️ ' : '📸 '}
              <span className="font-bold">I see:</span> {aiDescription}
            </p>
          </div>
        </div>

        {/* Exciting CTA */}
        <div className="flex flex-col items-center gap-3 mt-2">
          {buttonConfig.isSubmit ? (
            <SubmitButton
              ref={submitButtonRef}
              text="🎨 Make my coloring page!"
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
            Not quite right? Try again
          </button>
        </div>
      </div>
    );
  }

  // Idle state - show camera and upload options
  return (
    <div
      className={cn('flex flex-col items-center gap-6 py-4', className)}
      role="tabpanel"
      id="image-input-panel"
      aria-labelledby="image-mode-tab"
    >
      <p className="text-center text-text-primary font-tondo font-bold text-lg">
        {canInteract
          ? 'Take a photo or upload a picture!'
          : blockedReason === 'guest_limit_reached'
            ? `You've used your ${maxGuestGenerations} free tries! Sign up to continue.`
            : blockedReason === 'no_credits'
              ? "You're out of credits — top up or upgrade!"
              : 'Sign in to upload images!'}
      </p>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'camera')}
        disabled={!canInteract}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'file_picker')}
        disabled={!canInteract}
      />

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={openCamera}
          disabled={!canInteract}
          className={cn(
            'flex flex-col items-center justify-center gap-2',
            'w-28 h-28 rounded-2xl',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange focus-visible:ring-offset-2',
            canInteract
              ? 'bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 cursor-pointer text-white'
              : 'bg-paper-cream-dark cursor-not-allowed text-text-muted',
          )}
          style={
            {
              '--fa-primary-color': canInteract
                ? 'white'
                : 'hsl(var(--text-muted))',
              '--fa-secondary-color': canInteract
                ? 'rgba(255, 255, 255, 0.8)'
                : 'hsl(var(--text-muted))',
              '--fa-secondary-opacity': '1',
            } as React.CSSProperties
          }
          aria-label="Take a photo"
        >
          <FontAwesomeIcon icon={faCameraRetro} className="text-3xl" />
          <span className="text-sm font-tondo font-bold">Camera</span>
        </button>

        <button
          type="button"
          onClick={openFilePicker}
          disabled={!canInteract}
          className={cn(
            'flex flex-col items-center justify-center gap-2',
            'w-28 h-28 rounded-2xl',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-teal focus-visible:ring-offset-2',
            canInteract
              ? 'bg-btn-teal shadow-btn-secondary hover:shadow-btn-secondary-hover hover:scale-105 active:scale-95 cursor-pointer text-white'
              : 'bg-paper-cream-dark cursor-not-allowed text-text-muted',
          )}
          style={
            {
              '--fa-primary-color': canInteract
                ? 'white'
                : 'hsl(var(--text-muted))',
              '--fa-secondary-color': canInteract
                ? 'rgba(255, 255, 255, 0.8)'
                : 'hsl(var(--text-muted))',
              '--fa-secondary-opacity': '1',
            } as React.CSSProperties
          }
          aria-label="Upload an image"
        >
          <FontAwesomeIcon icon={faImages} className="text-3xl" />
          <span className="text-sm font-tondo font-bold">Upload</span>
        </button>
      </div>

      {/* Drop zone for desktop */}
      {canInteract && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'w-full py-6 px-4 border-2 border-dashed rounded-xl',
            'transition-all duration-200',
            'flex flex-col items-center gap-2',
            isDragging
              ? 'border-crayon-orange bg-crayon-orange-light/20 scale-102'
              : 'border-paper-cream-dark hover:border-crayon-teal',
          )}
        >
          <FontAwesomeIcon
            icon={faCloudArrowUp}
            className="text-2xl transition-colors"
            style={
              {
                '--fa-primary-color': isDragging
                  ? 'hsl(var(--crayon-orange))'
                  : 'hsl(var(--text-muted))',
                '--fa-secondary-color': isDragging
                  ? 'hsl(var(--crayon-teal))'
                  : 'hsl(var(--text-muted))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
          <p className="font-tondo text-sm text-text-muted text-center">
            {isDragging ? 'Drop it here!' : 'Or drag and drop an image here'}
          </p>
        </div>
      )}

      <p className="font-tondo text-sm text-text-muted text-center">
        Share a drawing or any picture you want to color!
      </p>

      {!canInteract && (
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

export default ImageInput;
