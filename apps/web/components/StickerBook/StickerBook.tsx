'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faStar } from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';
import cn from '@/utils/cn';
import { STICKER_CATALOG, TOTAL_STICKERS } from '@/lib/stickers/catalog';
import type { Sticker, StickerCategory } from '@/lib/stickers/types';
import { markStickersViewed } from '@/app/actions/stickers';
import StickerCard from './StickerCard';
import StickerDetailModal from './StickerDetailModal';
import ProgressBar from './ProgressBar';

type UnlockedStickerData = {
  stickerId: string;
  unlockedAt: Date;
  isNew: boolean;
};

type StickerBookProps = {
  unlockedStickers: UnlockedStickerData[];
  className?: string;
};

// Filter tabs - using StickerCategory with 'all' option
type FilterTab = 'all' | StickerCategory;

// Translation keys for filter tabs
const filterTabKeys: { id: FilterTab; translationKey: string }[] = [
  { id: 'all', translationKey: 'all' },
  { id: 'milestone', translationKey: 'milestones' },
  { id: 'category', translationKey: 'categories' },
  { id: 'exploration', translationKey: 'explore' },
  { id: 'special', translationKey: 'special' },
];

const StickerBook = ({ unlockedStickers, className }: StickerBookProps) => {
  const t = useTranslations('stickerBook');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create a map for quick lookup of unlocked stickers
  const unlockedMap = useMemo(() => {
    const map = new Map<string, UnlockedStickerData>();
    unlockedStickers.forEach((s) => map.set(s.stickerId, s));
    return map;
  }, [unlockedStickers]);

  // Filter stickers based on active tab
  const filteredStickers = useMemo(() => {
    if (activeFilter === 'all') return STICKER_CATALOG;
    return STICKER_CATALOG.filter((s) => s.category === activeFilter);
  }, [activeFilter]);

  // Sort: unlocked first, then by rarity (legendary first)
  const sortedStickers = useMemo(() => {
    const rarityOrder: Record<Sticker['rarity'], number> = {
      legendary: 0,
      rare: 1,
      uncommon: 2,
      common: 3,
    };

    return [...filteredStickers].sort((a, b) => {
      const aUnlocked = unlockedMap.has(a.id);
      const bUnlocked = unlockedMap.has(b.id);

      // Unlocked stickers first
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;

      // If both unlocked or both locked, sort by rarity
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  }, [filteredStickers, unlockedMap]);

  const handleStickerClick = useCallback((sticker: Sticker) => {
    setSelectedSticker(sticker);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Delay clearing selected sticker for exit animation
    setTimeout(() => setSelectedSticker(null), 200);
  }, []);

  // Mark new stickers as viewed when the component mounts
  useEffect(() => {
    const newStickerIds = unlockedStickers
      .filter((s) => s.isNew)
      .map((s) => s.stickerId);

    if (newStickerIds.length > 0) {
      // Mark as viewed after a short delay to let the user see the NEW badges
      const timer = setTimeout(() => {
        markStickersViewed(newStickerIds);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [unlockedStickers]);

  const unlockedCount = unlockedStickers.length;
  const newCount = unlockedStickers.filter((s) => s.isNew).length;

  return (
    <div className={cn('w-full max-w-4xl mx-auto', className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FontAwesomeIcon
          icon={faBookOpen}
          className="text-3xl text-crayon-orange"
        />
        <div>
          <h2 className="text-2xl font-bold font-tondo text-text-primary">
            {t('title')}
          </h2>
          <p className="text-sm text-text-secondary">
            {t('subtitle')}
          </p>
        </div>
        {newCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto flex items-center gap-1.5 bg-crayon-orange text-white px-3 py-1 rounded-full"
          >
            <FontAwesomeIcon icon={faStar} className="text-sm" />
            <span className="text-sm font-bold">{t('newBadge', { count: newCount })}</span>
          </motion.div>
        )}
      </div>

      {/* Progress Bar */}
      <ProgressBar
        current={unlockedCount}
        total={TOTAL_STICKERS}
        className="mb-6"
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterTabKeys.map((tab) => {
          const isActive = activeFilter === tab.id;
          const count =
            tab.id === 'all'
              ? unlockedCount
              : unlockedStickers.filter((s) => {
                  const sticker = STICKER_CATALOG.find(
                    (cat) => cat.id === s.stickerId,
                  );
                  return sticker?.category === tab.id;
                }).length;
          const total =
            tab.id === 'all'
              ? TOTAL_STICKERS
              : STICKER_CATALOG.filter((s) => s.category === tab.id).length;

          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                'focus:outline-none focus:ring-2 focus:ring-crayon-orange focus:ring-offset-2',
                // Min touch target for kids
                'min-h-[44px]',
                isActive
                  ? 'bg-crayon-orange text-white shadow-btn-primary'
                  : 'bg-paper-cream text-text-secondary hover:bg-paper-cream-dark',
              )}
            >
              {t(`filters.${tab.translationKey}`)}
              <span
                className={cn(
                  'ml-1.5 text-xs',
                  isActive ? 'text-white/80' : 'text-text-muted',
                )}
              >
                {t('countFormat', { count, total })}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Sticker Grid */}
      <motion.div
        layout
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
      >
        <AnimatePresence mode="popLayout">
          {sortedStickers.map((sticker, index) => {
            const unlockData = unlockedMap.get(sticker.id);
            const isUnlocked = !!unlockData;

            return (
              <motion.div
                key={sticker.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.03 }}
              >
                <StickerCard
                  sticker={sticker}
                  isUnlocked={isUnlocked}
                  isNew={unlockData?.isNew}
                  unlockedAt={unlockData?.unlockedAt}
                  onClick={() => handleStickerClick(sticker)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty state for filtered view */}
      {filteredStickers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-muted">{t('emptyState')}</p>
        </div>
      )}

      {/* Sticker Detail Modal */}
      <StickerDetailModal
        sticker={selectedSticker}
        isUnlocked={
          selectedSticker ? unlockedMap.has(selectedSticker.id) : false
        }
        unlockedAt={
          selectedSticker
            ? unlockedMap.get(selectedSticker.id)?.unlockedAt
            : undefined
        }
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default StickerBook;
