'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebookF,
  faXTwitter,
  faPinterestP,
} from '@fortawesome/free-brands-svg-icons';
import { faLink, faCheck } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';

type SocialShareProps = {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  className?: string;
};

const SocialShare = ({
  url,
  title,
  description,
  imageUrl,
  className,
}: SocialShareProps) => {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || '');
  const encodedImage = encodeURIComponent(imageUrl || '');

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedTitle}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(
      shareLinks[platform],
      'share-dialog',
      'width=600,height=400,menubar=no,toolbar=no',
    );
  };

  const buttonBaseClass =
    'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 hover:scale-110 active:scale-95';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="text-sm font-medium text-text-secondary mr-1">
        Share:
      </span>

      {/* Facebook */}
      <button
        type="button"
        onClick={() => handleShare('facebook')}
        className={cn(
          buttonBaseClass,
          'bg-[#1877F2] text-white hover:bg-[#166FE5]',
        )}
        aria-label="Share on Facebook"
        title="Share on Facebook"
      >
        <FontAwesomeIcon icon={faFacebookF} className="text-sm" />
      </button>

      {/* Twitter/X */}
      <button
        type="button"
        onClick={() => handleShare('twitter')}
        className={cn(buttonBaseClass, 'bg-black text-white hover:bg-gray-800')}
        aria-label="Share on X (Twitter)"
        title="Share on X (Twitter)"
      >
        <FontAwesomeIcon icon={faXTwitter} className="text-sm" />
      </button>

      {/* Pinterest */}
      <button
        type="button"
        onClick={() => handleShare('pinterest')}
        className={cn(
          buttonBaseClass,
          'bg-[#E60023] text-white hover:bg-[#C70020]',
        )}
        aria-label="Share on Pinterest"
        title="Share on Pinterest"
      >
        <FontAwesomeIcon icon={faPinterestP} className="text-sm" />
      </button>

      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopyLink}
        className={cn(
          buttonBaseClass,
          copied
            ? 'bg-green-500 text-white'
            : 'bg-paper-cream border-2 border-paper-cream-dark text-text-secondary hover:border-crayon-orange hover:text-crayon-orange',
        )}
        aria-label={copied ? 'Link copied!' : 'Copy link'}
        title={copied ? 'Link copied!' : 'Copy link'}
      >
        <FontAwesomeIcon
          icon={copied ? faCheck : faLink}
          className="text-sm"
          style={
            !copied
              ? ({
                  '--fa-primary-color': 'currentColor',
                  '--fa-secondary-color': 'currentColor',
                  '--fa-secondary-opacity': '0.4',
                } as React.CSSProperties)
              : undefined
          }
        />
      </button>
    </div>
  );
};

export default SocialShare;
