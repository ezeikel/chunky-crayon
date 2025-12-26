'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faBookOpen,
} from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';
import { getSoundManager } from '@/lib/audio';
import Confetti from '@/components/Confetti/Confetti';
import type { Sticker, StickerRarity } from '@/lib/stickers/types';

type StickerRewardProps = {
  stickers: Sticker[];
  onComplete: () => void;
  autoAdvanceDelay?: number; // ms before auto-advance to next sticker
};

// Rarity-based glow effects
const rarityGlowStyles: Record<StickerRarity, string> = {
  common: 'shadow-lg',
  uncommon: 'shadow-[0_0_30px_rgba(76,175,80,0.5)]',
  rare: 'shadow-[0_0_40px_rgba(156,39,176,0.5)]',
  legendary: 'shadow-[0_0_50px_rgba(255,193,7,0.6)]',
};

// Rarity-based ring colors
const rarityRingStyles: Record<StickerRarity, string> = {
  common: 'ring-paper-cream-dark',
  uncommon: 'ring-crayon-green',
  rare: 'ring-crayon-purple',
  legendary: 'ring-crayon-yellow',
};

// Rarity labels
const rarityLabels: Record<StickerRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

const StickerReward = ({
  stickers,
  onComplete,
  autoAdvanceDelay = 5000,
}: StickerRewardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const currentSticker = stickers[currentIndex];
  const isLastSticker = currentIndex === stickers.length - 1;
  const hasMultipleStickers = stickers.length > 1;

  // Play celebration sound on mount
  useEffect(() => {
    const soundManager = getSoundManager();
    soundManager.play('sparkle');
  }, []);

  // Play sound when changing stickers
  useEffect(() => {
    if (currentIndex > 0) {
      const soundManager = getSoundManager();
      soundManager.play('pop');
    }
  }, [currentIndex]);

  // Auto-advance timer
  useEffect(() => {
    if (!hasMultipleStickers || isLastSticker) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, autoAdvanceDelay);

    return () => clearTimeout(timer);
  }, [currentIndex, hasMultipleStickers, isLastSticker, autoAdvanceDelay]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (!isLastSticker) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, isLastSticker]);

  const handleComplete = useCallback(() => {
    const soundManager = getSoundManager();
    soundManager.play('tap');
    setIsExiting(true);
    // Delay calling onComplete to allow exit animation
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
  }, []);

  if (!currentSticker) {
    return null;
  }

  return (
    <>
      {/* Confetti Celebration */}
      <Confetti
        isActive={showConfetti}
        onComplete={handleConfettiComplete}
        duration={3000}
        pieceCount={60}
      />

      {/* Overlay */}
      <AnimatePresence>
        {!isExiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              // Only close if clicking the overlay, not the content
              if (e.target === e.currentTarget) {
                handleComplete();
              }
            }}
          >
            {/* Main Content Card */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -30 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
              className={cn(
                'relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full',
                'shadow-2xl border-4 border-crayon-yellow',
              )}
            >
              {/* Header - "New Sticker!" */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-6"
              >
                <h2 className="text-3xl font-bold font-tondo text-crayon-orange">
                  {hasMultipleStickers ? 'New Stickers!' : 'New Sticker!'}
                </h2>
                {hasMultipleStickers && (
                  <p className="text-sm text-text-secondary mt-1">
                    {currentIndex + 1} of {stickers.length}
                  </p>
                )}
              </motion.div>

              {/* Sticker Display */}
              <div className="relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSticker.id}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 10 }}
                    transition={{ type: 'spring', duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    {/* Sticker Image with Glow */}
                    <div
                      className={cn(
                        'relative w-40 h-40 bg-paper-cream rounded-2xl p-4 mb-4',
                        'ring-4',
                        rarityRingStyles[currentSticker.rarity],
                        rarityGlowStyles[currentSticker.rarity],
                      )}
                    >
                      <Image
                        src={currentSticker.imageUrl}
                        alt={currentSticker.name}
                        fill
                        className="object-contain p-2"
                      />

                      {/* Legendary sparkle effect */}
                      {currentSticker.rarity === 'legendary' && (
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          animate={{ opacity: [0.4, 0.9, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <div className="absolute top-2 left-4 w-3 h-3 bg-crayon-yellow rounded-full" />
                          <div className="absolute top-6 right-3 w-2 h-2 bg-white rounded-full" />
                          <div className="absolute bottom-4 left-6 w-2.5 h-2.5 bg-crayon-orange rounded-full" />
                          <div className="absolute bottom-6 right-5 w-2 h-2 bg-white rounded-full" />
                        </motion.div>
                      )}
                    </div>

                    {/* Sticker Name */}
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-2xl font-bold font-tondo text-text-primary mb-1"
                    >
                      {currentSticker.name}
                    </motion.h3>

                    {/* Rarity Badge */}
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium mb-3',
                        currentSticker.rarity === 'common' &&
                          'bg-gray-100 text-gray-600',
                        currentSticker.rarity === 'uncommon' &&
                          'bg-crayon-green/10 text-crayon-green-dark',
                        currentSticker.rarity === 'rare' &&
                          'bg-crayon-purple/10 text-crayon-purple-dark',
                        currentSticker.rarity === 'legendary' &&
                          'bg-gradient-to-r from-crayon-yellow/20 to-crayon-orange/20 text-crayon-orange-dark',
                      )}
                    >
                      {rarityLabels[currentSticker.rarity]}
                    </motion.span>

                    {/* Unlock Message */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center text-lg text-crayon-orange font-medium px-4"
                    >
                      {currentSticker.unlockMessage}
                    </motion.p>
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows (for multiple stickers) */}
                {hasMultipleStickers && (
                  <>
                    <button
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      className={cn(
                        'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4',
                        'w-10 h-10 rounded-full bg-paper-cream',
                        'flex items-center justify-center',
                        'transition-all duration-200',
                        currentIndex === 0
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:bg-paper-cream-dark hover:scale-110',
                      )}
                      aria-label="Previous sticker"
                    >
                      <FontAwesomeIcon
                        icon={faChevronLeft}
                        className="text-text-secondary"
                      />
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={isLastSticker}
                      className={cn(
                        'absolute right-0 top-1/2 -translate-y-1/2 translate-x-4',
                        'w-10 h-10 rounded-full bg-paper-cream',
                        'flex items-center justify-center',
                        'transition-all duration-200',
                        isLastSticker
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:bg-paper-cream-dark hover:scale-110',
                      )}
                      aria-label="Next sticker"
                    >
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        className="text-text-secondary"
                      />
                    </button>
                  </>
                )}
              </div>

              {/* Progress Dots (for multiple stickers) */}
              {hasMultipleStickers && (
                <div className="flex justify-center gap-2 mt-4">
                  {stickers.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        'w-2.5 h-2.5 rounded-full transition-all duration-200',
                        index === currentIndex
                          ? 'bg-crayon-orange scale-125'
                          : 'bg-paper-cream-dark hover:bg-crayon-orange/50',
                      )}
                      aria-label={`Go to sticker ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Action Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={handleComplete}
                className={cn(
                  'w-full mt-6 py-4 rounded-2xl',
                  'bg-gradient-to-r from-crayon-orange to-crayon-yellow',
                  'text-white font-bold text-lg',
                  'shadow-btn-primary hover:shadow-btn-primary-hover',
                  'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                  'flex items-center justify-center gap-2',
                )}
              >
                <FontAwesomeIcon icon={faBookOpen} />
                Add to Sticker Book
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StickerReward;
