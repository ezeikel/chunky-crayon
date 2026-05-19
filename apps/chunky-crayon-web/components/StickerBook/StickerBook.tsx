'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMedal,
  faPaw,
  faCompass,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
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

// Sections shown in catalog order — no filtering, just scroll. Each gets a
// big kid header with its own coloured duotone icon (varied, not mono-orange).
const SECTIONS: {
  category: StickerCategory;
  translationKey: string;
  icon: IconDefinition;
  primary: string;
  secondary: string;
}[] = [
  {
    category: 'milestone',
    translationKey: 'milestones',
    icon: faMedal,
    primary: 'hsl(var(--crayon-orange))',
    secondary: 'hsl(var(--crayon-yellow))',
  },
  {
    category: 'category',
    translationKey: 'categories',
    icon: faPaw,
    primary: 'hsl(var(--crayon-green))',
    secondary: 'hsl(var(--crayon-yellow))',
  },
  {
    category: 'exploration',
    translationKey: 'explore',
    icon: faCompass,
    primary: 'hsl(var(--crayon-purple))',
    secondary: 'hsl(var(--crayon-pink))',
  },
  {
    category: 'special',
    translationKey: 'special',
    icon: faSparkles,
    primary: 'hsl(var(--crayon-yellow))',
    secondary: 'hsl(var(--crayon-orange))',
  },
];

const StickerBook = ({ unlockedStickers, className }: StickerBookProps) => {
  const t = useTranslations('stickerBook');
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const unlockedMap = useMemo(() => {
    const map = new Map<string, UnlockedStickerData>();
    unlockedStickers.forEach((s) => map.set(s.stickerId, s));
    return map;
  }, [unlockedStickers]);

  // Group by section ONCE in stable catalog order. No unlocked-first
  // re-sort, no layout animation — so clicking a sticker never reflows
  // or reorders the grid (this was the "jumps around" bug).
  const sections = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        stickers: STICKER_CATALOG.filter(
          (s) => s.category === section.category,
        ),
      })).filter((s) => s.stickers.length > 0),
    [],
  );

  const handleStickerClick = useCallback((sticker: Sticker) => {
    setSelectedSticker(sticker);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedSticker(null), 200);
  }, []);

  // Mark new stickers viewed shortly after mount (lets the NEW badges show).
  useEffect(() => {
    const newStickerIds = unlockedStickers
      .filter((s) => s.isNew)
      .map((s) => s.stickerId);
    if (newStickerIds.length > 0) {
      const timer = setTimeout(() => markStickersViewed(newStickerIds), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [unlockedStickers]);

  const unlockedCount = unlockedStickers.length;

  return (
    <div className={cn('mx-auto w-full max-w-4xl', className)}>
      {/* Title — kid-warm, matches the breadcrumb + tab title */}
      <h1 className="font-tondo text-3xl font-bold text-crayon-orange sm:text-4xl">
        {t('title')}
      </h1>
      <p className="mt-1 font-tondo text-base text-text-secondary">
        {t('subtitle')}
      </p>

      {/* Progress — same visual language as the in-canvas progress bar */}
      <ProgressBar
        current={unlockedCount}
        total={TOTAL_STICKERS}
        className="mt-6"
      />

      {/* Sectioned scroll — no tabs. Kid just scrolls and sees everything. */}
      <div className="mt-8 space-y-10">
        {sections.map((section) => {
          const earned = section.stickers.filter((s) =>
            unlockedMap.has(s.id),
          ).length;

          return (
            <section key={section.category}>
              {/* Big friendly header: coloured icon + name + earned count */}
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-cream">
                  <FontAwesomeIcon
                    icon={section.icon}
                    className="text-2xl"
                    style={
                      {
                        '--fa-primary-color': section.primary,
                        '--fa-secondary-color': section.secondary,
                        '--fa-secondary-opacity': '1',
                      } as React.CSSProperties
                    }
                  />
                </span>
                <div className="min-w-0">
                  <h2 className="font-tondo text-xl font-bold text-text-primary sm:text-2xl">
                    {t(`filters.${section.translationKey}`)}
                  </h2>
                  <p className="font-tondo text-sm font-bold text-text-muted">
                    {earned} / {section.stickers.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
                {section.stickers.map((sticker) => {
                  const unlockData = unlockedMap.get(sticker.id);
                  return (
                    <div key={sticker.id}>
                      <StickerCard
                        sticker={sticker}
                        isUnlocked={!!unlockData}
                        isNew={unlockData?.isNew}
                        unlockedAt={unlockData?.unlockedAt}
                        onClick={() => handleStickerClick(sticker)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

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
