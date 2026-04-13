'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { faShare, faSpinner } from '@fortawesome/pro-solid-svg-icons';
import { ActionButton } from '@one-colored-pixel/coloring-ui';
import AdultGate from '@/components/AdultGate';
import SocialShare from '@/components/SocialShare/SocialShare';
import { uploadArtworkForSharing } from '@/app/actions/share-artwork';

type ShareButtonProps = {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  getCanvasDataUrl?: () => string | null;
  className?: string;
};

type ShareState = 'idle' | 'gate' | 'uploading' | 'sharing';

const ShareButton = ({
  url,
  title,
  description,
  imageUrl,
  getCanvasDataUrl,
  className,
}: ShareButtonProps) => {
  const t = useTranslations('shareButton');
  const [state, setState] = useState<ShareState>('idle');
  const [shareImageUrl, setShareImageUrl] = useState<string | undefined>(
    imageUrl,
  );

  const handleShareClick = useCallback(() => {
    setState('gate');
  }, []);

  const handleGateSuccess = useCallback(async () => {
    // If we have canvas access, upload the colored artwork
    if (getCanvasDataUrl) {
      setState('uploading');

      const dataUrl = getCanvasDataUrl();
      if (dataUrl) {
        const result = await uploadArtworkForSharing(dataUrl);
        if (result.success) {
          setShareImageUrl(result.imageUrl);
        }
        // Fall back to original image if upload fails
      }
    }

    setState('sharing');
  }, [getCanvasDataUrl]);

  const handleCancel = useCallback(() => {
    setState('idle');
  }, []);

  const handleClose = useCallback(() => {
    setState('idle');
    // Reset share image to original
    setShareImageUrl(imageUrl);
  }, [imageUrl]);

  // Show adult gate modal
  if (state === 'gate') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleCancel}
          aria-hidden="true"
        />
        {/* Gate */}
        <AdultGate
          onSuccess={handleGateSuccess}
          onCancel={handleCancel}
          className="relative z-10"
        />
      </div>
    );
  }

  // Show uploading state
  if (state === 'uploading') {
    return (
      <ActionButton
        size="tile"
        tone="accent"
        icon={faSpinner}
        label={t('preparing')}
        disabled
        className={className}
      />
    );
  }

  // Show social share options after gate passed - as modal overlay
  if (state === 'sharing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />
        {/* Share panel */}
        <div className="relative z-10 bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
          <SocialShare
            url={url}
            title={title}
            description={description}
            imageUrl={shareImageUrl}
          />
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 w-full text-center text-sm text-text-secondary hover:text-text-primary underline"
          >
            {t('doneSharing')}
          </button>
        </div>
      </div>
    );
  }

  // Default: show share button
  return (
    <ActionButton
      size="tile"
      tone="accent"
      icon={faShare}
      label={t('idle')}
      onClick={handleShareClick}
      className={className}
    />
  );
};

export default ShareButton;
