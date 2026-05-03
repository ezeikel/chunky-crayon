'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { faShare, faSpinner } from '@fortawesome/pro-duotone-svg-icons';
import { ActionButton } from '@one-colored-pixel/coloring-ui';
import AdultGate from '@/components/AdultGate';
import Portal from '@/components/Portal';
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

  // Always render the button so the action-row slot stays filled when
  // an overlay is open. Overlays are rendered alongside via Portal so
  // they escape the sidebar's containing block (a parent backdrop-blur
  // ancestor was previously trapping `position: fixed` to the sidebar
  // column). The button itself reflects the current state.
  return (
    <>
      <ActionButton
        size="tile"
        tone="tool"
        icon={state === 'uploading' ? faSpinner : faShare}
        label={state === 'uploading' ? t('preparing') : t('idle')}
        onClick={handleShareClick}
        disabled={
          state === 'uploading' || state === 'gate' || state === 'sharing'
        }
        className={className}
      />

      {state === 'gate' && (
        <Portal>
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
        </Portal>
      )}

      {state === 'sharing' && (
        <Portal>
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
        </Portal>
      )}
    </>
  );
};

export default ShareButton;
