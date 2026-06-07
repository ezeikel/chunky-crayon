'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faLock,
  faPartyHorn,
} from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import cn from '@/utils/cn';
import type { Sticker, StickerRarity } from '@/lib/stickers';

type StickerDetailModalProps = {
  sticker: Sticker | null;
  isUnlocked: boolean;
  unlockedAt?: Date;
  isOpen: boolean;
  onClose: () => void;
};

// Rarity = number of filled stars (kids count stars, they don't read "rare").
const rarityStars: Record<StickerRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  legendary: 4,
};

const rarityGlow: Record<StickerRarity, string> = {
  common: '',
  uncommon: 'drop-shadow-[0_0_10px_rgba(76,175,80,0.45)]',
  rare: 'drop-shadow-[0_0_14px_rgba(156,39,176,0.45)]',
  legendary: 'drop-shadow-[0_0_22px_rgba(255,193,7,0.6)]',
};

const StickerDetailModal = ({
  sticker,
  isUnlocked,
  unlockedAt,
  isOpen,
  onClose,
}: StickerDetailModalProps) => {
  const t = useTranslations('stickerBook');
  const tCatalog = useTranslations('stickerCatalog');

  if (!sticker) return null;

  const name = tCatalog(`${sticker.id}.name`);
  const stars = rarityStars[sticker.rarity];

  const unlockHint = (() => {
    const { type, value, category } = sticker.unlockCondition;
    if (type === 'artwork_count')
      return t('detail.unlockConditions.artworkCount', { count: value });
    if (type === 'first_category')
      return t('detail.unlockConditions.firstCategory', {
        category: category ?? '',
      });
    if (type === 'category_count')
      return t('detail.unlockConditions.categoryCount', {
        count: value,
        category: category ?? '',
      });
    return t('detail.unlockConditions.special', { count: value });
  })();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center font-tondo text-2xl font-bold text-text-primary">
            {isUnlocked ? name : t('detail.lockedName')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isUnlocked
              ? tCatalog(`${sticker.id}.description`)
              : t('detail.lockedDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2 pb-1">
          {/* Big sticker — full colour unlocked, dimmed grayscale locked */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className={cn(
              'relative h-44 w-44 rounded-3xl p-3',
              isUnlocked ? 'bg-paper-cream' : 'bg-gray-100',
            )}
          >
            <Image
              src={sticker.imageUrl}
              alt={name}
              fill
              sizes="176px"
              className={cn(
                'object-contain p-2',
                isUnlocked
                  ? rarityGlow[sticker.rarity]
                  : 'grayscale opacity-30 blur-[1px]',
              )}
            />
            {!isUnlocked && (
              <span className="absolute -top-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full border-3 border-paper-cream-dark bg-white shadow-md">
                <FontAwesomeIcon
                  icon={faLock}
                  className="text-xl [--fa-primary-color:hsl(var(--text-muted))] [--fa-secondary-color:hsl(var(--paper-cream-dark))] [--fa-secondary-opacity:1]"
                />
              </span>
            )}
          </motion.div>

          {/* Rarity = a row of stars, not a text label */}
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <FontAwesomeIcon
                key={i}
                icon={faStar}
                className={cn(
                  'text-xl',
                  i < stars ? 'text-crayon-yellow' : 'text-paper-cream-dark',
                )}
              />
            ))}
          </div>

          {isUnlocked ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-crayon-orange/10">
                <FontAwesomeIcon
                  icon={faPartyHorn}
                  className="text-2xl [--fa-primary-color:hsl(var(--crayon-orange))] [--fa-secondary-color:hsl(var(--crayon-yellow))] [--fa-secondary-opacity:1]"
                />
              </span>
              <p className="font-tondo text-lg font-bold text-crayon-orange">
                {tCatalog(`${sticker.id}.unlockMessage`)}
              </p>
              {unlockedAt && (
                <p className="font-tondo text-sm text-text-muted">
                  {t('detail.unlockedOn', {
                    date: new Intl.DateTimeFormat('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(unlockedAt),
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-paper-cream px-4 py-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-crayon-purple/10">
                <FontAwesomeIcon
                  icon={faLock}
                  className="text-lg [--fa-primary-color:hsl(var(--crayon-purple))] [--fa-secondary-color:hsl(var(--crayon-pink))] [--fa-secondary-opacity:1]"
                />
              </span>
              <p className="font-tondo text-base font-bold text-text-primary">
                {unlockHint}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StickerDetailModal;
