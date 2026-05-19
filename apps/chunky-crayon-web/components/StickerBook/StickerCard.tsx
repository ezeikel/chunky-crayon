'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faStar } from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';
import cn from '@/utils/cn';
import type { Sticker, StickerRarity } from '@/lib/stickers';

type StickerCardProps = {
  sticker: Sticker;
  isUnlocked: boolean;
  isNew?: boolean;
  unlockedAt?: Date;
  onClick: () => void;
};

// Rarity-based ring + soft background. Kids read color, not labels.
const rarityRing: Record<StickerRarity, string> = {
  common: 'border-paper-cream-dark bg-white',
  uncommon: 'border-crayon-green bg-crayon-green/5',
  rare: 'border-crayon-purple bg-crayon-purple/5',
  legendary: 'border-crayon-yellow bg-crayon-yellow/10',
};

// Soft tint behind the dimmed art on locked cards.
const lockedTint: Record<StickerRarity, string> = {
  common: 'bg-paper-cream',
  uncommon: 'bg-crayon-green/5',
  rare: 'bg-crayon-purple/5',
  legendary: 'bg-crayon-yellow/5',
};

const StickerCard = ({
  sticker,
  isUnlocked,
  isNew,
  onClick,
}: StickerCardProps) => {
  const t = useTranslations('stickerBook');
  const tCatalog = useTranslations('stickerCatalog');
  const stickerName = tCatalog(`${sticker.id}.name`);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        'group relative aspect-square w-full rounded-3xl border-4 p-3',
        'flex flex-col items-center justify-center gap-1.5',
        'cursor-pointer transition-shadow duration-200',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-crayon-orange/50',
        // Big, chunky tap target for little hands
        'min-h-[112px] shadow-[0_4px_0_0_hsl(var(--paper-cream-dark))]',
        'active:shadow-[0_1px_0_0_hsl(var(--paper-cream-dark))] active:translate-y-[3px]',
        isUnlocked
          ? rarityRing[sticker.rarity]
          : 'border-dashed border-3 border-paper-cream-dark',
        !isUnlocked && lockedTint[sticker.rarity],
      )}
      aria-label={
        isUnlocked
          ? t('card.viewSticker', { name: stickerName })
          : t('card.lockedSticker', { name: stickerName })
      }
    >
      {/* Sticker art — full color when unlocked, dimmed grayscale when locked */}
      <div className="relative w-full flex-1 min-h-0">
        <Image
          src={sticker.imageUrl}
          alt={stickerName}
          fill
          sizes="160px"
          className={cn(
            'object-contain transition-all duration-200',
            isUnlocked
              ? 'p-1 drop-shadow-sm'
              : 'p-2 grayscale opacity-30 blur-[0.5px]',
          )}
        />
      </div>

      {/* Name — always shown, short, big enough for early readers */}
      <span
        className={cn(
          'w-full text-center font-tondo font-bold leading-tight line-clamp-2',
          'text-[13px] sm:text-sm',
          isUnlocked ? 'text-text-primary' : 'text-text-muted',
        )}
      >
        {stickerName}
      </span>

      {/* Lock badge — locked only, big and obvious, no text */}
      {!isUnlocked && (
        <span
          className={cn(
            'absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center',
            'rounded-full bg-white border-3 border-paper-cream-dark shadow-md',
          )}
        >
          <FontAwesomeIcon
            icon={faLock}
            className="text-lg"
            style={
              {
                '--fa-primary-color': 'hsl(var(--text-muted))',
                '--fa-secondary-color': 'hsl(var(--paper-cream-dark))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
        </span>
      )}

      {/* NEW star badge — freshly unlocked */}
      {isUnlocked && isNew && (
        <motion.span
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: -12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 14 }}
          className={cn(
            'absolute -top-3 -right-3 flex h-11 w-11 items-center justify-center',
            'rounded-full bg-crayon-orange border-3 border-white shadow-md',
          )}
          aria-hidden
        >
          <FontAwesomeIcon
            icon={faStar}
            className="text-lg text-white animate-pulse"
          />
        </motion.span>
      )}
    </motion.button>
  );
};

export default StickerCard;
