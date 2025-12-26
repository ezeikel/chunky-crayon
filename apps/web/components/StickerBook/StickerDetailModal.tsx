'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
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

// Rarity display names and colors
const rarityConfig: Record<
  StickerRarity,
  { label: string; bgClass: string; textClass: string }
> = {
  common: {
    label: 'Common',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
  },
  uncommon: {
    label: 'Uncommon',
    bgClass: 'bg-crayon-green/10',
    textClass: 'text-crayon-green-dark',
  },
  rare: {
    label: 'Rare',
    bgClass: 'bg-crayon-purple/10',
    textClass: 'text-crayon-purple-dark',
  },
  legendary: {
    label: 'Legendary',
    bgClass: 'bg-gradient-to-r from-crayon-yellow/20 to-crayon-orange/20',
    textClass: 'text-crayon-orange-dark',
  },
};

// Rarity-based glow for the sticker image
const rarityGlowStyles: Record<StickerRarity, string> = {
  common: '',
  uncommon: 'drop-shadow-[0_0_8px_rgba(76,175,80,0.4)]',
  rare: 'drop-shadow-[0_0_12px_rgba(156,39,176,0.4)]',
  legendary: 'drop-shadow-[0_0_20px_rgba(255,193,7,0.6)]',
};

const StickerDetailModal = ({
  sticker,
  isUnlocked,
  unlockedAt,
  isOpen,
  onClose,
}: StickerDetailModalProps) => {
  if (!sticker) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {isUnlocked ? sticker.name : '???'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isUnlocked ? sticker.description : 'This sticker is still locked!'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Sticker Image */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className={cn(
              'relative w-32 h-32 rounded-2xl p-4',
              isUnlocked ? 'bg-paper-cream' : 'bg-gray-100',
            )}
          >
            {isUnlocked ? (
              <Image
                src={sticker.imageUrl}
                alt={sticker.name}
                fill
                className={cn(
                  'object-contain p-2',
                  rarityGlowStyles[sticker.rarity],
                )}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl text-gray-300">?</span>
              </div>
            )}

            {/* Legendary sparkle overlay */}
            {isUnlocked && sticker.rarity === 'legendary' && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="absolute top-2 left-3 w-2 h-2 bg-crayon-yellow rounded-full" />
                <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-white rounded-full" />
                <div className="absolute bottom-3 left-5 w-2 h-2 bg-crayon-orange rounded-full opacity-70" />
                <div className="absolute bottom-5 right-3 w-1.5 h-1.5 bg-white rounded-full" />
              </motion.div>
            )}
          </motion.div>

          {/* Rarity Badge */}
          <span
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              rarityConfig[sticker.rarity].bgClass,
              rarityConfig[sticker.rarity].textClass,
            )}
          >
            {rarityConfig[sticker.rarity].label}
          </span>

          {/* Unlock info or hint */}
          {isUnlocked ? (
            <div className="text-center space-y-2">
              {/* Unlock message */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-medium text-crayon-orange"
              >
                {sticker.unlockMessage}
              </motion.p>

              {/* Unlock date */}
              {unlockedAt && (
                <p className="text-sm text-text-muted">
                  Unlocked on {formatDate(unlockedAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center space-y-2 px-4">
              <p className="text-sm text-text-secondary font-medium">
                How to unlock:
              </p>
              <p className="text-base text-text-primary">
                {sticker.unlockCondition.type === 'artwork_count' &&
                  `Save ${sticker.unlockCondition.value} artworks to your gallery`}
                {sticker.unlockCondition.type === 'first_category' &&
                  `Color your first ${sticker.unlockCondition.category} page`}
                {sticker.unlockCondition.type === 'category_count' &&
                  `Color ${sticker.unlockCondition.value} ${sticker.unlockCondition.category} pages`}
                {sticker.unlockCondition.type === 'special' &&
                  `Explore ${sticker.unlockCondition.value} different categories`}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StickerDetailModal;
