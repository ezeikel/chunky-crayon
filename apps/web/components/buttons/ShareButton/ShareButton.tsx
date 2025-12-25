'use client';

import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShare, faSpinner } from '@fortawesome/pro-solid-svg-icons';
import AdultGate from '@/components/AdultGate';
import SocialShare from '@/components/SocialShare/SocialShare';
import { uploadArtworkForSharing } from '@/app/actions/share-artwork';
import cn from '@/utils/cn';

type ShareButtonProps = {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  getCanvasDataUrl?: () => string | null;
  className?: string;
};

type ShareState = 'idle' | 'gate' | 'uploading' | 'sharing';

// Kid-friendly button style (matches Start Over button)
const buttonClassName =
  'flex items-center justify-center gap-x-3 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg bg-crayon-purple hover:bg-crayon-purple-dark active:scale-95 transition-all duration-150';

const ShareButton = ({
  url,
  title,
  description,
  imageUrl,
  getCanvasDataUrl,
  className,
}: ShareButtonProps) => {
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
      <button
        type="button"
        disabled
        className={cn(buttonClassName, 'cursor-wait opacity-80', className)}
      >
        <FontAwesomeIcon icon={faSpinner} className="text-2xl animate-spin" />
        Preparing...
      </button>
    );
  }

  // Show social share options after gate passed
  if (state === 'sharing') {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <SocialShare
          url={url}
          title={title}
          description={description}
          imageUrl={shareImageUrl}
        />
        <button
          type="button"
          onClick={handleClose}
          className="text-sm text-text-secondary hover:text-text-primary underline"
        >
          Done sharing
        </button>
      </div>
    );
  }

  // Default: show share button
  return (
    <button
      type="button"
      onClick={handleShareClick}
      className={cn(buttonClassName, className)}
    >
      <FontAwesomeIcon icon={faShare} className="text-2xl" />
      Share
    </button>
  );
};

export default ShareButton;
