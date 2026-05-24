'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSparkles, faTrophy } from '@fortawesome/pro-duotone-svg-icons';
import { ColoAvatar } from '@/components/ColoAvatar';
import { getAccessory } from '@/lib/colo';
import type { ColoState } from '@/lib/colo';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import cn from '@/utils/cn';

type HeaderColoIndicatorProps = {
  coloState: ColoState | null;
  className?: string;
  /**
   * 'pill' (default) — standalone, renders its own pill chrome
   * (border, bg, padding). The original shape, still useful when
   * the indicator stands alone.
   * 'bare' — drops the pill chrome so this trigger can be composed
   * inside a shared parent pill alongside another indicator. Used
   * by the combined Colo+Sticker pill in Header.tsx.
   */
  variant?: 'pill' | 'bare';
};

const HeaderColoIndicator = ({
  coloState,
  className,
  variant = 'pill',
}: HeaderColoIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('colo');

  // Don't render if no Colo state
  if (!coloState) {
    return null;
  }

  const isBare = variant === 'bare';

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            isBare
              ? // Bare trigger — no border, no bg. Shared parent pill
                // in Header.tsx owns the chrome. Sized snug around
                // the avatar so it matches the sticker icon's height.
                'relative flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange focus-visible:ring-offset-1'
              : 'relative flex h-16 min-w-48 items-center justify-center rounded-full border-2 border-paper-cream-dark bg-white/80 px-6 shadow-sm transition-all duration-200 hover:scale-105 hover:border-crayon-orange hover:shadow-[0_0_0_4px_hsl(var(--crayon-yellow)/0.28)] active:scale-95 focus:outline-none focus-visible:shadow-[0_0_0_4px_hsl(var(--crayon-orange)),0_0_0_9px_hsl(var(--crayon-yellow)/0.4)]',
            className,
          )}
          aria-label={`Colo: ${t(`stages.${coloState.stage}.name`)}`}
        >
          <ColoAvatar
            coloState={coloState}
            size="header"
            showProgress
            enableTapReactions={false}
            progressStrokeWidth={5}
          />
          {/* Evolution sparkle indicator when close to next stage */}
          {coloState.progressToNext &&
            coloState.progressToNext.percentage >= 80 && (
              <FontAwesomeIcon
                icon={faSparkles}
                className="absolute -top-1 -right-1 text-xs text-crayon-yellow animate-pulse"
              />
            )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 p-4">
        <div className="flex items-start gap-4">
          {/* Larger Colo avatar */}
          <ColoAvatar coloState={coloState} size="lg" showProgress />

          {/* Stage info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-tondo font-bold text-lg text-crayon-orange">
              {t(`stages.${coloState.stage}.name`)}
            </h3>
            <p className="font-tondo text-sm text-text-muted mt-1">
              {t(`stages.${coloState.stage}.description`)}
            </p>
          </div>
        </div>

        {/* Progress to next stage */}
        {coloState.progressToNext && coloState.nextStage && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="font-tondo text-sm text-text-muted">
                {t('indicator.next', {
                  stageName: t(`stages.${coloState.nextStage.stage}.name`),
                })}
              </span>
              <span className="font-tondo text-sm font-bold text-crayon-orange">
                {coloState.progressToNext.current}/
                {coloState.progressToNext.required}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-crayon-orange to-crayon-orange-light rounded-full transition-all duration-500"
                style={{ width: `${coloState.progressToNext.percentage}%` }}
              />
            </div>
            <p className="font-tondo text-xs text-text-muted mt-2 text-center">
              {t('indicator.saveToEvolve', {
                count:
                  coloState.progressToNext.required -
                  coloState.progressToNext.current,
              })}
            </p>
          </div>
        )}

        {/* Max stage message */}
        {!coloState.nextStage && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <FontAwesomeIcon
              icon={faTrophy}
              className="text-2xl text-crayon-yellow"
            />
            <p className="font-tondo text-sm text-text-muted mt-1">
              {t('indicator.maxStage')}
            </p>
          </div>
        )}

        {/* Accessories section (if any unlocked) */}
        {coloState.accessories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="font-tondo text-xs text-text-muted mb-2">
              {t('indicator.accessories', {
                count: coloState.accessories.length,
              })}
            </p>
            <div className="flex flex-wrap gap-1">
              {coloState.accessories.slice(0, 6).map((accessoryId) => {
                const accessory = getAccessory(accessoryId);
                if (!accessory) return null;
                return (
                  <span
                    key={accessoryId}
                    className="w-6 h-6 rounded-full bg-crayon-orange-light/20 flex items-center justify-center overflow-hidden"
                    title={accessory.name}
                  >
                    <Image
                      src={accessory.imagePath}
                      alt={accessory.name}
                      width={24}
                      height={24}
                      className="w-full h-full object-contain p-0.5"
                    />
                  </span>
                );
              })}
              {coloState.accessories.length > 6 && (
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  +{coloState.accessories.length - 6}
                </span>
              )}
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderColoIndicator;
