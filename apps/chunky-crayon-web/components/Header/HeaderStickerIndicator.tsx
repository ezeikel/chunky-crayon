'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faStar } from '@fortawesome/pro-duotone-svg-icons';

type HeaderStickerIndicatorProps = {
  totalUnlocked: number;
  newCount: number;
  /**
   * 'pill' (default) — standalone, with its own pill chrome.
   * 'bare' — no border/bg, designed to be composed inside a shared
   * parent pill alongside the Colo indicator. Header.tsx uses this
   * for the combined progress pill.
   */
  variant?: 'pill' | 'bare';
};

const stickerStyle = {
  '--fa-primary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
  '--fa-secondary-opacity': '1',
} as React.CSSProperties;

const HeaderStickerIndicator = ({
  totalUnlocked,
  newCount,
  variant = 'pill',
}: HeaderStickerIndicatorProps) => {
  // Don't show if user has no stickers yet
  if (totalUnlocked === 0) {
    return null;
  }

  const isBare = variant === 'bare';

  return (
    <Link
      href="/account/profiles/stickers"
      className={
        isBare
          ? // Bare — Header.tsx provides the surrounding pill chrome;
            // this is just the icon+count tap target.
            'relative inline-flex items-center gap-1.5 rounded-full px-2 font-tondo font-bold transition-transform duration-200 hover:scale-105 active:scale-95'
          : 'relative flex min-h-12 min-w-32 items-center justify-center gap-3 rounded-full border-2 border-crayon-orange/30 bg-gradient-to-r from-crayon-orange/10 to-crayon-yellow/10 px-5 py-2 font-tondo font-bold transition-all duration-200 hover:scale-105 hover:border-crayon-orange/50 active:scale-95'
      }
    >
      <FontAwesomeIcon
        icon={faBookOpen}
        className={isBare ? 'text-lg' : 'text-xl'}
        style={stickerStyle}
      />
      <span
        className={
          isBare ? 'text-sm text-text-primary' : 'text-base text-text-primary'
        }
      >
        {totalUnlocked}
      </span>

      {/* NEW badge */}
      {newCount > 0 && (
        <span
          className={
            isBare
              ? 'absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-crayon-orange px-1.5 text-[10px] font-bold text-white shadow-sm'
              : 'absolute -right-2 -top-2 flex min-h-7 min-w-7 items-center justify-center gap-1 rounded-full bg-crayon-orange px-2 py-1 text-xs font-bold text-white shadow-sm'
          }
        >
          <FontAwesomeIcon
            icon={faStar}
            className={isBare ? 'text-[8px]' : 'text-[10px]'}
          />
          {newCount}
        </span>
      )}
    </Link>
  );
};

export default HeaderStickerIndicator;
