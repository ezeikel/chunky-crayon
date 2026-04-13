'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/pro-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { measureProgress } from '@one-colored-pixel/coloring-ui';
import cn from '@/utils/cn';

type ProgressIndicatorProps = {
  getCanvas: () => HTMLCanvasElement | null;
  getBoundaryCanvas: () => HTMLCanvasElement | null;
  className?: string;
};

const MILESTONE_PERCENTS = [25, 50, 75, 100] as const;

const ProgressIndicator = ({
  getCanvas,
  getBoundaryCanvas,
  className,
}: ProgressIndicatorProps) => {
  const t = useTranslations('coloringPage.progress');
  const [progress, setProgress] = useState(0);
  const [lastMilestone, setLastMilestone] = useState<number | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const lastMilestoneRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const updateProgress = useCallback(async () => {
    if (inFlightRef.current) return;
    const drawing = getCanvas();
    const boundary = getBoundaryCanvas();
    if (!drawing || !boundary) return;
    if (drawing.width === 0 || drawing.height === 0) return;

    inFlightRef.current = true;
    try {
      const { painted, paintable } = await measureProgress({
        drawing,
        boundary,
      });

      if (paintable === 0) {
        setProgress(0);
        return;
      }
      const raw = (painted / paintable) * 100;
      const next = raw >= 99 ? 100 : Math.min(100, Math.round(raw));
      setProgress(next);

      const prev = lastMilestoneRef.current;
      const milestone = MILESTONE_PERCENTS.find(
        (p) => next >= p && (prev === null || p > prev),
      );
      if (milestone && milestone !== prev) {
        lastMilestoneRef.current = milestone;
        setLastMilestone(milestone);
        setShowMilestone(true);
        setTimeout(() => setShowMilestone(false), 2000);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [getCanvas, getBoundaryCanvas]);

  // Initial tick + 5s polling safety net (catches magic-fill animations etc).
  useEffect(() => {
    updateProgress();
    const id = setInterval(updateProgress, 5000);
    return () => clearInterval(id);
  }, [updateProgress]);

  // Recompute after every stroke.
  useEffect(() => {
    const handle = () => {
      setTimeout(updateProgress, 100);
    };
    window.addEventListener('mouseup', handle);
    window.addEventListener('touchend', handle);
    return () => {
      window.removeEventListener('mouseup', handle);
      window.removeEventListener('touchend', handle);
    };
  }, [updateProgress]);

  const isDone = progress >= 100;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative flex-1 min-w-0">
        <div
          className="h-6 rounded-full overflow-hidden bg-paper-cream"
          style={{ boxShadow: 'inset 0 2px 4px rgb(0 0 0 / 0.08)' }}
        >
          <motion.div
            className={cn(
              'h-full rounded-full',
              isDone ? 'bg-crayon-green' : 'bg-crayon-orange',
            )}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <motion.div
          className={cn(
            'absolute top-1/2 right-0 -translate-y-1/2 size-9 flex items-center justify-center rounded-full',
            isDone ? 'bg-crayon-yellow' : 'bg-paper-cream',
          )}
          style={{ boxShadow: 'inset 0 2px 4px rgb(0 0 0 / 0.08)' }}
          animate={
            isDone ? { scale: [1, 1.25, 1], rotate: [0, -10, 10, -10, 0] } : {}
          }
          transition={{ duration: 0.6 }}
        >
          <FontAwesomeIcon
            icon={faStar}
            className={cn(
              'text-xl',
              isDone ? 'text-white' : 'text-crayon-orange/40',
            )}
          />
        </motion.div>

        <AnimatePresence>
          {showMilestone && lastMilestone && !isDone && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-crayon-yellow rounded-full shadow-lg z-10"
            >
              <span className="font-tondo font-bold text-base text-text-primary whitespace-nowrap">
                {t(`milestones.${lastMilestone}`)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              className="absolute -top-14 left-1/2 -translate-x-1/2 px-5 py-2 bg-crayon-green rounded-full shadow-lg z-10 flex items-center gap-2 whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faStar} className="text-white text-lg" />
              <span className="font-tondo font-bold text-lg text-white">
                {t('allDone')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProgressIndicator;
