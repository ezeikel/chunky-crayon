'use client';

import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faLink,
  faCopy,
  faCheck,
  faCalendarDays,
  faInfinity,
} from '@fortawesome/pro-solid-svg-icons';
import { faLockOpen, faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
import AdultGate from '@/components/AdultGate';
import { createShare } from '@/app/actions/share';
import type { ShareExpiration } from '@/lib/share';
import cn from '@/utils/cn';

type ShareArtworkModalProps = {
  artworkId: string;
  artworkTitle: string;
  isOpen: boolean;
  onClose: () => void;
};

type ModalState = 'gate' | 'options' | 'generating' | 'success';

const expirationOptions: {
  value: ShareExpiration;
  label: string;
  icon: typeof faCalendarDays;
}[] = [
  { value: '7days', label: '7 days', icon: faCalendarDays },
  { value: '30days', label: '30 days', icon: faCalendarDays },
  { value: 'never', label: 'Never expires', icon: faInfinity },
];

const ShareArtworkModal = ({
  artworkId,
  artworkTitle,
  isOpen,
  onClose,
}: ShareArtworkModalProps) => {
  const [state, setState] = useState<ModalState>('gate');
  const [selectedExpiration, setSelectedExpiration] =
    useState<ShareExpiration>('30days');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGateSuccess = useCallback(() => {
    setState('options');
  }, []);

  const handleCancel = useCallback(() => {
    setState('gate');
    setShareUrl(null);
    setError(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  const handleCreateShare = useCallback(async () => {
    setState('generating');
    setError(null);

    const result = await createShare(artworkId, selectedExpiration);

    if (result.success && result.shareUrl) {
      setShareUrl(result.shareUrl);
      setState('success');
    } else {
      setError(result.error || 'Failed to create share link');
      setState('options');
    }
  }, [artworkId, selectedExpiration]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleDone = useCallback(() => {
    setState('gate');
    setShareUrl(null);
    setError(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md">
        {state === 'gate' && (
          <AdultGate onSuccess={handleGateSuccess} onCancel={handleCancel} />
        )}

        {state === 'options' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-crayon-purple to-crayon-pink flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faLink}
                    className="text-white text-lg"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    Share Artwork
                  </h3>
                  <p className="text-sm text-text-secondary truncate max-w-[200px]">
                    {artworkTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-2 p-3 bg-paper-cream rounded-xl mb-4">
              <FontAwesomeIcon
                icon={faLockOpen}
                className="text-crayon-green mt-0.5"
                style={
                  {
                    '--fa-primary-color': 'hsl(var(--crayon-green))',
                    '--fa-secondary-color': 'hsl(var(--crayon-blue))',
                    '--fa-secondary-opacity': '0.5',
                  } as React.CSSProperties
                }
              />
              <p className="text-sm text-text-secondary">
                Anyone with this link can view this artwork. No personal
                information is shared.
              </p>
            </div>

            {/* Expiration options */}
            <div className="mb-4">
              <p className="text-sm font-medium text-text-primary mb-2">
                Link expires in:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {expirationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedExpiration(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                      selectedExpiration === option.value
                        ? 'border-crayon-purple bg-crayon-purple/5'
                        : 'border-paper-cream-dark hover:border-crayon-purple/50',
                    )}
                  >
                    <FontAwesomeIcon
                      icon={option.icon}
                      className={cn(
                        'text-lg',
                        selectedExpiration === option.value
                          ? 'text-crayon-purple'
                          : 'text-text-secondary',
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs font-medium',
                        selectedExpiration === option.value
                          ? 'text-crayon-purple'
                          : 'text-text-secondary',
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-crayon-pink text-center mb-4">
                {error}
              </p>
            )}

            {/* Create button */}
            <button
              type="button"
              onClick={handleCreateShare}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-white bg-gradient-to-r from-crayon-purple to-crayon-pink hover:opacity-90 active:scale-95 transition-all"
            >
              <FontAwesomeIcon icon={faLink} />
              Create Share Link
            </button>
          </div>
        )}

        {state === 'generating' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex flex-col items-center py-8">
              <FontAwesomeIcon
                icon={faSpinnerThird}
                className="text-4xl text-crayon-purple animate-spin mb-4"
              />
              <p className="text-text-secondary">Creating share link...</p>
            </div>
          </div>
        )}

        {state === 'success' && shareUrl && (
          <div className="bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Success header */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-crayon-green to-crayon-blue flex items-center justify-center mb-3">
                <FontAwesomeIcon
                  icon={faCheck}
                  className="text-white text-2xl"
                />
              </div>
              <h3 className="text-xl font-bold text-text-primary">
                Link Created!
              </h3>
              <p className="text-sm text-text-secondary text-center mt-1">
                Share this link with family and friends
              </p>
            </div>

            {/* Link display */}
            <div className="flex items-center gap-2 p-3 bg-paper-cream rounded-xl mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-text-primary truncate outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-all',
                  copied
                    ? 'bg-crayon-green text-white'
                    : 'bg-crayon-purple text-white hover:bg-crayon-purple-dark',
                )}
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Done button */}
            <button
              type="button"
              onClick={handleDone}
              className="w-full text-center text-sm text-text-secondary hover:text-text-primary underline"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareArtworkModal;
