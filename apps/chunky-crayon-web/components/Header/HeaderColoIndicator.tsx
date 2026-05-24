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
    // Wrapper DropdownMenu in @/components/ui/dropdown-menu defaults
    // `modal={false}` — non-blocking peek behaviour for every dropdown
    // in the app. No body scroll-lock, no right-edge gap on open.
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

      {/* Dropdown body — redesigned for 3-8yo readers.
          Old version had six text blocks (name, description, "Next:
          X", fraction, progress bar, "Save N more artworks" sentence,
          "Accessories (N)" header + icons). For a kid that's a wall.
          New version: avatar + stage name + visual progress bar +
          a single smart status line ("Ready to grow!" when capped at
          threshold, max-stage trophy otherwise), then the accessory
          icons with no count header. */}
      <DropdownMenuContent align="end" className="w-64 p-4">
        {/* Avatar + stage name in one row. Avatar carries identity,
            name is the only line of text. */}
        <div className="flex flex-col items-center gap-3 text-center">
          <ColoAvatar
            coloState={coloState}
            size="lg"
            enableTapReactions={false}
          />
          <h3 className="font-tondo text-xl font-bold text-crayon-orange">
            {t(`stages.${coloState.stage}.name`)}
          </h3>
        </div>

        {/* Progress bar — visual only, no fraction text. The cap in
            getColoState already clamps `current` at `required`, so the
            bar can hit 100% but never overshoot. */}
        {coloState.progressToNext && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-paper-cream">
              <div
                className="h-full rounded-full bg-crayon-orange transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, coloState.progressToNext.percentage))}%`,
                }}
              />
            </div>
            {/* Ready-to-grow celebration only when the bar's at 100%
                (evolution is queued). Skips the awkward "Save 0 more
                artworks to evolve!" copy. */}
            {coloState.progressToNext.percentage >= 100 && (
              <p className="mt-2 text-center font-tondo text-sm font-bold text-crayon-orange">
                <FontAwesomeIcon icon={faSparkles} className="mr-1" />
                {t('indicator.readyToGrow')}
              </p>
            )}
          </div>
        )}

        {/* Max stage — replace bar + status with a trophy badge. */}
        {!coloState.nextStage && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <FontAwesomeIcon
              icon={faTrophy}
              className="text-3xl text-crayon-yellow"
            />
          </div>
        )}

        {/* Accessories — icons only, no count header. */}
        {coloState.accessories.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {coloState.accessories.slice(0, 6).map((accessoryId) => {
              const accessory = getAccessory(accessoryId);
              if (!accessory) return null;
              return (
                <span
                  key={accessoryId}
                  className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-crayon-orange-light/20"
                  title={accessory.name}
                >
                  <Image
                    src={accessory.imagePath}
                    alt={accessory.name}
                    width={24}
                    height={24}
                    className="size-full object-contain p-0.5"
                  />
                </span>
              );
            })}
            {coloState.accessories.length > 6 && (
              <span className="flex size-7 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">
                +{coloState.accessories.length - 6}
              </span>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderColoIndicator;
