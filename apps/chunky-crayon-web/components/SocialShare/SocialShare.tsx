'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebookF,
  faXTwitter,
  faPinterestP,
} from '@fortawesome/free-brands-svg-icons';
import { faLink, faCheck } from '@fortawesome/pro-solid-svg-icons';
import cn from '@/utils/cn';

type SocialShareProps = {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  className?: string;
};

// Kid-friendly crayon button style
const buttonBaseClass =
  'flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-all duration-150 hover:scale-110 active:scale-95 text-white font-bold';

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

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <span className="font-tondo font-bold text-lg text-text-primary">
        Share your creation!
      </span>

      <div className="flex items-center gap-4">
        {/* Facebook - Brand Blue */}
        <button
          type="button"
          onClick={() => handleShare('facebook')}
          className={cn(
            buttonBaseClass,
            'bg-social-facebook hover:bg-social-facebook-dark',
          )}
          aria-label="Share on Facebook"
          title="Share on Facebook"
        >
          <FontAwesomeIcon icon={faFacebookF} className="text-xl" />
        </button>

        {/* Twitter/X - Purple */}
        <button
          type="button"
          onClick={() => handleShare('twitter')}
          className={cn(
            buttonBaseClass,
            'bg-crayon-purple hover:bg-crayon-purple-dark',
          )}
          aria-label="Share on X (Twitter)"
          title="Share on X (Twitter)"
        >
          <FontAwesomeIcon icon={faXTwitter} className="text-xl" />
        </button>

        {/* Pinterest - Pink */}
        <button
          type="button"
          onClick={() => handleShare('pinterest')}
          className={cn(
            buttonBaseClass,
            'bg-crayon-pink hover:bg-crayon-pink-dark',
          )}
          aria-label="Share on Pinterest"
          title="Share on Pinterest"
        >
          <FontAwesomeIcon icon={faPinterestP} className="text-xl" />
        </button>

        {/* Copy Link - Orange or Green when copied */}
        <button
          type="button"
          onClick={handleCopyLink}
          className={cn(
            buttonBaseClass,
            copied
              ? 'bg-crayon-green hover:bg-crayon-green-dark'
              : 'bg-crayon-orange hover:bg-crayon-orange-dark',
          )}
          aria-label={copied ? 'Link copied!' : 'Copy link'}
          title={copied ? 'Link copied!' : 'Copy link'}
        >
          <FontAwesomeIcon
            icon={copied ? faCheck : faLink}
            className="text-xl"
          />
        </button>
      </div>
    </div>
  );
};

export default SocialShare;
