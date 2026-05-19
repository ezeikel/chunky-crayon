'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/pro-solid-svg-icons';
import { useTranslations } from 'next-intl';
import cn from '@/utils/cn';

type ProgressBarProps = {
  current: number;
  total: number;
  className?: string;
};

/**
 * Visually matches the in-canvas ProgressIndicator: h-6 inset track,
 * solid crayon-orange fill (green when complete), and a circular star
 * puck at the right end that pops + spins at 100%. Kids learn one
 * "progress = orange bar + star" language across the whole app.
 */
const ProgressBar = ({ current, total, className }: ProgressBarProps) => {
  const t = useTranslations('stickerBook');
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isDone = percentage >= 100;

  const message = isDone
    ? t('progress.complete')
    : percentage >= 75
      ? t('progress.almostThere')
      : percentage >= 50
        ? t('progress.halfway')
        : t('progress.greatStart');

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-tondo text-base font-bold text-text-primary">
          {t('progress.label')}
        </span>
        <span
          className={cn(
            'font-tondo text-lg font-bold',
            isDone ? 'text-crayon-green' : 'text-crayon-orange',
          )}
        >
          {current} / {total}
        </span>
      </div>

      <div className="relative pr-2">
        <div
          className="h-6 overflow-hidden rounded-full bg-paper-cream"
          style={{ boxShadow: 'inset 0 2px 4px rgb(0 0 0 / 0.08)' }}
        >
          <motion.div
            className={cn(
              'h-full rounded-full',
              isDone ? 'bg-crayon-green' : 'bg-crayon-orange',
            )}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
          />
        </div>

        <motion.div
          className={cn(
            'absolute right-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full',
            isDone ? 'bg-crayon-yellow' : 'bg-paper-cream',
          )}
          style={{ boxShadow: 'inset 0 2px 4px rgb(0 0 0 / 0.08)' }}
          animate={
            isDone ? { scale: [1, 1.25, 1], rotate: [0, -10, 10, -10, 0] } : {}
          }
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <FontAwesomeIcon
            icon={faStar}
            className={cn(
              'text-2xl',
              isDone ? 'text-white' : 'text-crayon-orange/40',
            )}
          />
        </motion.div>
      </div>

      <p
        className={cn(
          'mt-2 text-center font-tondo text-sm font-bold',
          isDone ? 'text-crayon-green' : 'text-text-muted',
        )}
      >
        {message}
      </p>
    </div>
  );
};

export default ProgressBar;
