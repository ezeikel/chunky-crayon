'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSparkles,
  faTrophy,
  faHelmetSafety,
  faCrown,
  faScarf,
  faHatCowboy,
  faPalette,
  faMask,
  faGlasses,
  faDinosaur,
  faFlower,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ColoAvatar } from '@/components/ColoAvatar';
import type { ColoState } from '@/lib/colo';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import cn from '@/utils/cn';

const getAccessoryIcon = (accessoryId: string): IconDefinition | null => {
  if (accessoryId.includes('helmet')) return faHelmetSafety;
  if (accessoryId.includes('crown')) return faCrown;
  if (accessoryId.includes('scarf')) return faScarf;
  if (accessoryId.includes('hat')) return faHatCowboy;
  if (accessoryId.includes('beret')) return faPalette;
  if (accessoryId.includes('cape')) return faMask;
  if (accessoryId.includes('glasses')) return faGlasses;
  if (accessoryId.includes('spikes')) return faDinosaur;
  if (accessoryId.includes('flower')) return faFlower;
  return null;
};

type HeaderColoIndicatorProps = {
  coloState: ColoState | null;
  className?: string;
};

const HeaderColoIndicator = ({
  coloState,
  className,
}: HeaderColoIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('colo');

  // Don't render if no Colo state
  if (!coloState) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative p-1 rounded-full',
            'hover:bg-paper-cream transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange',
            className,
          )}
          aria-label={`Colo: ${t(`stages.${coloState.stage}.name`)}`}
        >
          <ColoAvatar
            coloState={coloState}
            size="sm"
            showProgress
            enableTapReactions={false}
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
                const accessoryIcon = getAccessoryIcon(accessoryId);
                return (
                  <span
                    key={accessoryId}
                    className="w-6 h-6 rounded-full bg-crayon-orange-light/20 flex items-center justify-center text-xs"
                    title={accessoryId}
                  >
                    {accessoryIcon && (
                      <FontAwesomeIcon
                        icon={accessoryIcon}
                        className="text-crayon-orange"
                      />
                    )}
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
