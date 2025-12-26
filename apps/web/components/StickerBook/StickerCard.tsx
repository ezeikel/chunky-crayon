'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import cn from '@/utils/cn';
import type { Sticker, StickerRarity } from '@/lib/stickers';

type StickerCardProps = {
  sticker: Sticker;
  isUnlocked: boolean;
  isNew?: boolean;
  unlockedAt?: Date;
  onClick: () => void;
};

// Rarity-based glow colors
const rarityGlowClasses: Record<StickerRarity, string> = {
  common: 'shadow-md hover:shadow-lg',
  uncommon:
    'shadow-[0_0_15px_rgba(76,175,80,0.3)] hover:shadow-[0_0_20px_rgba(76,175,80,0.5)]',
  rare: 'shadow-[0_0_20px_rgba(156,39,176,0.3)] hover:shadow-[0_0_25px_rgba(156,39,176,0.5)]',
  legendary:
    'shadow-[0_0_25px_rgba(255,193,7,0.4)] hover:shadow-[0_0_35px_rgba(255,193,7,0.6)]',
};

// Rarity-based border colors
const rarityBorderClasses: Record<StickerRarity, string> = {
  common: 'border-paper-cream-dark',
  uncommon: 'border-crayon-green',
  rare: 'border-crayon-purple',
  legendary: 'border-crayon-yellow',
};

// Rarity-based background for locked state hint
const rarityBgHintClasses: Record<StickerRarity, string> = {
  common: 'bg-gray-100',
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
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: isUnlocked ? 1.05 : 1.02 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative aspect-square rounded-2xl p-2 transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-crayon-orange focus:ring-offset-2',
        // Large tap targets for kids (min 44px, we're using much larger)
        'min-h-[80px] min-w-[80px]',
        isUnlocked
          ? cn(
              'bg-white border-3 cursor-pointer',
              rarityBorderClasses[sticker.rarity],
              rarityGlowClasses[sticker.rarity],
            )
          : cn(
              'border-2 border-dashed border-gray-300 cursor-pointer',
              rarityBgHintClasses[sticker.rarity],
            ),
      )}
      aria-label={
        isUnlocked
          ? `View ${sticker.name} sticker`
          : `Locked sticker: ${sticker.name}`
      }
    >
      {/* Sticker Image or Locked Placeholder */}
      <div className="relative w-full h-full flex items-center justify-center">
        {isUnlocked ? (
          <Image
            src={sticker.imageUrl}
            alt={sticker.name}
            fill
            className="object-contain p-1"
          />
        ) : (
          // Locked state - silhouette with question mark
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="text-3xl text-gray-300">?</div>
            <span className="text-[10px] text-gray-400 text-center px-1 line-clamp-2">
              {/* Show hint based on unlock condition */}
              {sticker.unlockCondition.type === 'artwork_count' &&
                `Save ${sticker.unlockCondition.value} artworks`}
              {sticker.unlockCondition.type === 'first_category' &&
                `Color a ${sticker.unlockCondition.category} page`}
              {sticker.unlockCondition.type === 'category_count' &&
                `Color ${sticker.unlockCondition.value} ${sticker.unlockCondition.category} pages`}
              {sticker.unlockCondition.type === 'special' && 'Keep exploring!'}
            </span>
          </div>
        )}
      </div>

      {/* NEW Badge */}
      {isUnlocked && isNew && (
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: -12 }}
          className={cn(
            'absolute -top-2 -right-2 z-10',
            'bg-crayon-orange text-white',
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            'shadow-md animate-pulse',
          )}
        >
          NEW!
        </motion.div>
      )}

      {/* Rarity indicator for unlocked stickers */}
      {isUnlocked && sticker.rarity !== 'common' && (
        <div
          className={cn(
            'absolute bottom-1 right-1 w-3 h-3 rounded-full',
            sticker.rarity === 'uncommon' && 'bg-crayon-green',
            sticker.rarity === 'rare' && 'bg-crayon-purple',
            sticker.rarity === 'legendary' &&
              'bg-gradient-to-r from-crayon-yellow to-crayon-orange animate-pulse',
          )}
        />
      )}

      {/* Legendary sparkle effect */}
      {isUnlocked && sticker.rarity === 'legendary' && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full" />
          <div className="absolute top-3 right-2 w-1 h-1 bg-white rounded-full" />
          <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-white rounded-full" />
        </motion.div>
      )}
    </motion.button>
  );
};

export default StickerCard;
