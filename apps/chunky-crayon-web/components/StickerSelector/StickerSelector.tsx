'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faHandPointer } from '@fortawesome/pro-duotone-svg-icons';
import {
  CANVAS_STICKERS,
  STICKER_CATEGORIES,
  Sticker,
  StickerCategory,
} from '@/constants';
import {
  useColoringContext,
  useSound,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@one-colored-pixel/coloring-ui';
import cn from '@/utils/cn';

type StickerSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
};

const StickerSelector = ({ isOpen, onClose }: StickerSelectorProps) => {
  const { selectedSticker, setSelectedSticker } = useColoringContext();
  const { playSound } = useSound();
  const [activeCategory, setActiveCategory] =
    useState<StickerCategory>('stars');

  const categories = Object.entries(STICKER_CATEGORIES) as [
    StickerCategory,
    (typeof STICKER_CATEGORIES)[StickerCategory],
  ][];

  const filteredStickers = CANVAS_STICKERS.filter(
    (sticker) => sticker.category === activeCategory,
  );

  const handleStickerSelect = (sticker: Sticker) => {
    setSelectedSticker(sticker);
    playSound('pop');
    onClose();
  };

  const handleCategoryChange = (category: StickerCategory) => {
    setActiveCategory(category);
    playSound('tap');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Built on the shared Dialog primitive (same as ParentalGateModal /
          StickerDetailModal): cream 2px border, rounded-coloring-card, soft
          shadow, zoom+fade entrance, and the circular faXmark close button —
          no more hand-rolled flat card. */}
      <DialogContent className="max-w-md gap-5">
        <DialogHeader>
          <DialogTitle>Choose a Sticker</DialogTitle>
        </DialogHeader>

        {/* Category tabs — orange selected state (brand accent, matching the
            other modals) instead of the old purple. */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {categories.map(([category, config]) => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryChange(category)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap transition-all',
                'font-coloring-body text-sm',
                activeCategory === category
                  ? 'bg-coloring-accent text-white font-bold shadow-sm'
                  : 'bg-coloring-surface text-coloring-text-secondary hover:bg-coloring-surface-dark',
              )}
            >
              <span className="text-base">{config.icon}</span>
              <span>{config.name}</span>
            </button>
          ))}
        </div>

        {/* Sticker grid — real transparent PNGs (web parity with the canvas
            tool), not emoji glyphs. Inner scroll keeps tabs + help pinned. */}
        <div className="grid grid-cols-4 gap-2.5 max-h-72 overflow-y-auto -mx-1 px-1">
          {filteredStickers.map((sticker) => {
            const isSelected = selectedSticker?.id === sticker.id;

            return (
              <button
                key={sticker.id}
                type="button"
                onClick={() => handleStickerSelect(sticker)}
                className={cn(
                  'relative flex items-center justify-center aspect-square rounded-2xl p-2 transition-all hover:scale-105 active:scale-95',
                  isSelected
                    ? 'bg-coloring-accent/10 ring-2 ring-coloring-accent'
                    : 'bg-coloring-surface hover:bg-coloring-surface-dark',
                )}
                title={sticker.name}
                aria-label={sticker.name}
              >
                <Image
                  src={sticker.imageUrl}
                  alt={sticker.name}
                  width={64}
                  height={64}
                  className="h-full w-full object-contain"
                />
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-coloring-accent">
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="text-[10px] text-white"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Two-step hint — the thing kids miss: picking ≠ placing. */}
        <div className="flex items-center justify-center gap-2 font-coloring-body text-sm font-bold text-coloring-text-secondary">
          <FontAwesomeIcon
            icon={faHandPointer}
            className="text-coloring-accent"
          />
          <span>Now tap your picture to place it!</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StickerSelector;
