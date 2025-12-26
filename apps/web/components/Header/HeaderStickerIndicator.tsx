'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faStar } from '@fortawesome/pro-duotone-svg-icons';

type HeaderStickerIndicatorProps = {
  totalUnlocked: number;
  newCount: number;
};

const stickerStyle = {
  '--fa-primary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
  '--fa-secondary-opacity': '1',
} as React.CSSProperties;

const HeaderStickerIndicator = ({
  totalUnlocked,
  newCount,
}: HeaderStickerIndicatorProps) => {
  // Don't show if user has no stickers yet
  if (totalUnlocked === 0) {
    return null;
  }

  return (
    <Link
      href="/account/profiles/stickers"
      className="relative flex items-center gap-1 sm:gap-2 font-tondo font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-crayon-orange/10 to-crayon-yellow/10 border-2 border-crayon-orange/30 hover:border-crayon-orange/50 hover:scale-105 active:scale-95 transition-all duration-200"
    >
      <FontAwesomeIcon
        icon={faBookOpen}
        className="text-base sm:text-lg"
        style={stickerStyle}
      />
      <span className="text-text-primary text-xs sm:text-sm">
        {totalUnlocked}
      </span>

      {/* NEW badge */}
      {newCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-crayon-orange text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
          <FontAwesomeIcon icon={faStar} className="text-[8px]" />
          {newCount}
        </span>
      )}
    </Link>
  );
};

export default HeaderStickerIndicator;
