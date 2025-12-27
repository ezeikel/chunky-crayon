'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck } from '@fortawesome/pro-solid-svg-icons';
import {
  CANVAS_STICKERS,
  STICKER_CATEGORIES,
  Sticker,
  StickerCategory,
} from '@/constants';
import { useColoringContext } from '@/contexts/coloring';
import { useSound } from '@/hooks/useSound';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-paper-cream-dark">
          <h3 className="font-tondo font-bold text-lg text-text-primary">
            Choose a Sticker
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 p-2 bg-paper-cream overflow-x-auto scrollbar-hide">
          {categories.map(([category, config]) => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryChange(category)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all',
                activeCategory === category
                  ? 'bg-crayon-purple text-white font-medium'
                  : 'bg-white text-text-secondary hover:bg-paper-cream-dark',
              )}
            >
              <span className="text-lg">{config.icon}</span>
              <span className="text-sm">{config.name}</span>
            </button>
          ))}
        </div>

        {/* Sticker Grid */}
        <div className="grid grid-cols-5 gap-2 p-4 max-h-64 overflow-y-auto">
          {filteredStickers.map((sticker) => {
            const isSelected = selectedSticker?.id === sticker.id;

            return (
              <button
                key={sticker.id}
                type="button"
                onClick={() => handleStickerSelect(sticker)}
                className={cn(
                  'relative flex items-center justify-center aspect-square rounded-xl text-3xl transition-all hover:scale-110 active:scale-95',
                  isSelected
                    ? 'bg-crayon-purple/20 ring-2 ring-crayon-purple'
                    : 'bg-paper-cream hover:bg-paper-cream-dark',
                )}
                title={sticker.name}
                aria-label={sticker.name}
              >
                {sticker.emoji}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-crayon-purple rounded-full flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="text-white text-[8px]"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected sticker preview */}
        {selectedSticker && (
          <div className="flex items-center justify-center gap-2 p-3 bg-paper-cream border-t border-paper-cream-dark">
            <span className="text-sm text-text-secondary">Selected:</span>
            <span className="text-2xl">{selectedSticker.emoji}</span>
            <span className="text-sm font-medium text-text-primary">
              {selectedSticker.name}
            </span>
          </div>
        )}

        {/* Help text */}
        <div className="p-3 bg-gradient-to-r from-crayon-purple/5 to-crayon-pink/5 border-t border-paper-cream-dark">
          <p className="text-xs text-text-muted text-center">
            Tap on the canvas to place your sticker
          </p>
        </div>
      </div>
    </div>
  );
};

export default StickerSelector;
