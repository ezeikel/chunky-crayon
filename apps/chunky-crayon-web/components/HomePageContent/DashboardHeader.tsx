'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSparkles,
  faPalette,
  faStar,
} from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';
import { ColoAvatar } from '@/components/ColoAvatar';
import type { ColoState } from '@/lib/colo';

type DashboardHeaderProps = {
  coloState?: ColoState | null;
};

const DashboardHeader = ({ coloState }: DashboardHeaderProps) => {
  const t = useTranslations('colo');

  // Get translated stage name if coloState exists
  const translatedStageName = coloState
    ? t(`stages.${coloState.stage}.name`)
    : '';

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <div className="text-center mb-6 md:mb-8">
      {/* Colo mascot greeting - dynamic based on evolution stage */}
      <div className="flex justify-center mb-4">
        <div className="relative animate-float">
          <ColoAvatar
            coloState={coloState}
            size="xl"
            showTooltip
            showProgress
          />
          {/* Sparkle - extra sparkle when close to evolution */}
          {coloState?.progressToNext &&
          coloState.progressToNext.percentage >= 80 ? (
            <FontAwesomeIcon
              icon={faSparkles}
              className="absolute -top-2 -right-2 text-xl text-crayon-yellow animate-bounce"
            />
          ) : (
            <FontAwesomeIcon
              icon={faSparkles}
              className="absolute -top-1 -right-1 text-lg text-crayon-yellow animate-pulse"
            />
          )}
        </div>
      </div>

      {/* Personalized greeting based on Colo stage */}
      <div className="inline-flex items-center gap-2 mb-3">
        <FontAwesomeIcon
          icon={faSparkles}
          className="text-2xl md:text-3xl"
          style={iconStyle}
        />
        <h1 className="font-tondo font-bold text-2xl md:text-3xl lg:text-4xl text-text-primary">
          {t('dashboard.greeting')}
        </h1>
        <FontAwesomeIcon
          icon={faSparkles}
          className="text-2xl md:text-3xl"
          style={iconStyle}
        />
      </div>

      {/* Colo encouragement message */}
      {coloState && (
        <p className="font-tondo text-sm text-text-muted">
          {coloState.progressToNext ? (
            <>
              {t('dashboard.wantsToGrow', {
                stageName: translatedStageName,
                count:
                  coloState.progressToNext.required -
                  coloState.progressToNext.current,
              })}{' '}
              <FontAwesomeIcon
                icon={faPalette}
                className="text-crayon-orange"
              />
            </>
          ) : (
            <>
              {t('dashboard.proudOfYou', { stageName: translatedStageName })}{' '}
              <FontAwesomeIcon icon={faStar} className="text-crayon-yellow" />
            </>
          )}
        </p>
      )}
    </div>
  );
};

export default DashboardHeader;
