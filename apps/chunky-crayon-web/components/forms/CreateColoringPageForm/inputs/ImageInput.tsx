'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCameraRetro,
  faImages,
  faRotateRight,
  faSpinnerThird,
  faCheck,
  faCloudArrowUp,
  faFaceDizzy,
  faPencil,
  faCamera,
} from '@fortawesome/pro-duotone-svg-icons';
import useUser from '@/hooks/useUser';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { useInputMode } from './InputModeContext';
import { useImageInput } from '../hooks/useImageInput';

type ImageInputProps = {
  className?: string;
};

const ImageInput = ({ className }: ImageInputProps) => {
  const t = useTranslations('createForm');
  const { canGenerate } = useUser();
  const { setDescription, setImageBase64, setIsProcessing, setIsBusy } =
    useInputMode();

  const {
    state,
    previewUrl,
    imageBase64,
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

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (aiDescription) setDescription(aiDescription);
  }, [aiDescription, setDescription]);

  useEffect(() => {
    setImageBase64(imageBase64);
  }, [imageBase64, setImageBase64]);

  useEffect(() => {
    setIsProcessing(state === 'processing');
  }, [state, setIsProcessing]);

  // Hide the global FormCTA while the image UX owns the flow (capturing,
  // processing, confirming preview, or showing an error).
  useEffect(() => {
    const busy =
      state === 'capturing' ||
      state === 'processing' ||
      state === 'preview' ||
      state === 'error';
    setIsBusy(busy);
    return () => setIsBusy(false);
  }, [state, setIsBusy]);

  useEffect(() => {
    if (state === 'preview' && source) {
      if (source === 'camera') {
        trackEvent(TRACKING_EVENTS.IMAGE_INPUT_CAPTURED, { source: 'camera' });
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canGenerate) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canGenerate) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const syntheticEvent = {
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(syntheticEvent, 'file_picker');
    }
  };

  const handleRetry = () => {
    reset();
  };

  if (state === 'error') {
    const errorMessageKeys: Record<string, string> = {
      file_too_large: 'imageInput.errors.fileTooLarge',
      invalid_type: 'imageInput.errors.invalidType',
      processing_failed: 'imageInput.errors.processingFailed',
      camera_failed: 'imageInput.errors.cameraFailed',
    };
    const errorKey = errorMessageKeys[error || 'processing_failed'];

    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-6', className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <FontAwesomeIcon
          icon={faFaceDizzy}
          className="text-6xl"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-teal))',
              '--fa-secondary-opacity': '0.6',
            } as React.CSSProperties
          }
        />
        <p className="text-center text-text-primary font-tondo font-bold text-lg">
          {t(errorKey)}
        </p>
        <Button
          onClick={handleRetry}
          className="font-tondo font-bold text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-coloring-card"
        >
          <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
          {t('imageInput.tryAgain')}
        </Button>
      </div>
    );
  }

  if (state === 'processing' || state === 'capturing') {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-6', className)}
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
            ? t('imageInput.capturing')
            : t('imageInput.processing')}
        </p>
      </div>
    );
  }

  if (state === 'preview' && previewUrl) {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-2', className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <p className="text-center text-text-primary font-tondo font-bold text-lg">
          {t('imageInput.greatPicture')}
        </p>

        <div className="relative w-48 h-48 rounded-coloring-card overflow-hidden shadow-lg border-4 border-crayon-orange">
          <Image
            src={previewUrl}
            alt={t('imageInput.altImagePreview')}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={clearImage}
            variant="outline"
            className="font-tondo font-bold border-2 border-paper-cream-dark text-text-primary hover:bg-paper-cream rounded-coloring-card"
          >
            <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
            {t('imageInput.pickAnother')}
          </Button>
          <Button
            onClick={processImage}
            className="font-tondo font-bold text-white bg-btn-teal shadow-btn-secondary hover:shadow-btn-secondary-hover hover:scale-105 active:scale-95 transition-all duration-200 px-8 rounded-coloring-card"
          >
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            {t('imageInput.useThis')}
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'complete' && aiDescription) {
    return (
      <div
        className={cn('flex flex-col items-center gap-4 py-2', className)}
        role="tabpanel"
        id="image-input-panel"
        aria-labelledby="image-mode-tab"
      >
        <div className="relative w-full max-w-xs">
          <div className="bg-white border-2 border-crayon-teal rounded-coloring-card p-3 pb-4 shadow-lg">
            {previewUrl && (
              <div className="relative w-full aspect-square rounded-coloring-card overflow-hidden mb-3">
                <Image
                  src={previewUrl}
                  alt={t('imageInput.altUploadedImage')}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <p className="text-center text-text-primary font-tondo text-base leading-relaxed">
              <FontAwesomeIcon
                icon={isChildDrawing ? faPencil : faCamera}
                className="mr-2"
                style={
                  {
                    '--fa-primary-color': 'hsl(var(--crayon-orange))',
                    '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                    '--fa-secondary-opacity': '0.6',
                  } as React.CSSProperties
                }
              />
              <span className="font-bold">{t('imageInput.iSee')}</span>{' '}
              {aiDescription}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          className="font-tondo text-sm text-text-muted hover:text-text-primary underline underline-offset-2 transition-colors"
        >
          {t('imageInput.notQuiteRight')}
        </button>
      </div>
    );
  }

  // Idle
  return (
    <div
      className={cn('flex flex-col items-center gap-5 py-2', className)}
      role="tabpanel"
      id="image-input-panel"
      aria-labelledby="image-mode-tab"
    >
      <p className="text-center text-text-primary font-tondo font-bold text-xl md:text-2xl">
        {t('imageInput.takePhotoOrUpload')}
      </p>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'camera')}
        disabled={!canGenerate}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'file_picker')}
        disabled={!canGenerate}
      />

      <div className="flex gap-4">
        <button
          type="button"
          onClick={openCamera}
          disabled={!canGenerate}
          className={cn(
            'flex flex-col items-center justify-center gap-2 w-28 h-28 rounded-coloring-card',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange focus-visible:ring-offset-2',
            canGenerate
              ? 'bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 cursor-pointer text-white'
              : 'bg-paper-cream-dark cursor-not-allowed text-text-muted',
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
          aria-label={t('imageInput.takePhoto')}
        >
          <FontAwesomeIcon icon={faCameraRetro} size="2x" />
          <span className="text-sm font-tondo font-bold">
            {t('imageInput.camera')}
          </span>
        </button>

        <button
          type="button"
          onClick={openFilePicker}
          disabled={!canGenerate}
          className={cn(
            'flex flex-col items-center justify-center gap-2 w-28 h-28 rounded-coloring-card',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-teal focus-visible:ring-offset-2',
            canGenerate
              ? 'bg-btn-teal shadow-btn-secondary hover:shadow-btn-secondary-hover hover:scale-105 active:scale-95 cursor-pointer text-white'
              : 'bg-paper-cream-dark cursor-not-allowed text-text-muted',
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
          aria-label={t('imageInput.uploadImage')}
        >
          <FontAwesomeIcon icon={faImages} size="2x" />
          <span className="text-sm font-tondo font-bold">
            {t('imageInput.upload')}
          </span>
        </button>
      </div>

      {/* Drop zone for desktop */}
      {canGenerate && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'w-full py-4 px-4 border-2 border-dashed rounded-coloring-card',
            'transition-all duration-200 flex flex-col items-center gap-2',
            isDragging
              ? 'border-crayon-orange bg-crayon-orange-light/20 scale-[1.02]'
              : 'border-paper-cream-dark hover:border-crayon-teal',
          )}
        >
          <FontAwesomeIcon
            icon={faCloudArrowUp}
            className="text-2xl"
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
            {isDragging
              ? t('imageInput.dropHere')
              : t('imageInput.dragAndDrop')}
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageInput;
