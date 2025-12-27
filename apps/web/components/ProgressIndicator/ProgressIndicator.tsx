'use client';

import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/pro-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import cn from '@/utils/cn';

type ProgressIndicatorProps = {
  getCanvas: () => HTMLCanvasElement | null;
  className?: string;
};

// Progress milestones for encouragement
const MILESTONES = [
  { percent: 25, message: 'Great start!' },
  { percent: 50, message: 'Halfway there!' },
  { percent: 75, message: 'Almost done!' },
  { percent: 100, message: 'Amazing!' },
];

const calculateProgress = (canvas: HTMLCanvasElement): number => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const totalPixels = data.length / 4;

  let coloredPixels = 0;

  // Count pixels that have some color (alpha > 0)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 10) {
      // Threshold to ignore anti-aliasing artifacts
      coloredPixels++;
    }
  }

  // Calculate percentage (cap at 100%)
  // Note: We don't expect 100% coverage, so we scale it
  // A "fully colored" page might only be 40-60% pixels colored
  // We scale so that ~50% pixel coverage = 100% progress
  const rawPercent = (coloredPixels / totalPixels) * 100;
  const scaledPercent = Math.min(100, (rawPercent / 50) * 100);

  return Math.round(scaledPercent);
};

const ProgressIndicator = ({
  getCanvas,
  className,
}: ProgressIndicatorProps) => {
  const [progress, setProgress] = useState(0);
  const [lastMilestone, setLastMilestone] = useState<number | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);

  // Calculate progress periodically
  const updateProgress = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    const newProgress = calculateProgress(canvas);
    setProgress(newProgress);

    // Check for milestone achievements
    const milestone = MILESTONES.find(
      (m) =>
        newProgress >= m.percent &&
        (lastMilestone === null || m.percent > lastMilestone),
    );

    if (milestone && milestone.percent !== lastMilestone) {
      setLastMilestone(milestone.percent);
      setShowMilestone(true);
      setTimeout(() => setShowMilestone(false), 2000);
    }
  }, [getCanvas, lastMilestone]);

  // Update progress on an interval while coloring
  useEffect(() => {
    // Initial calculation
    updateProgress();

    // Set up interval for periodic updates
    const interval = setInterval(updateProgress, 2000);

    return () => clearInterval(interval);
  }, [updateProgress]);

  // Listen for canvas changes (mouse/touch up events)
  useEffect(() => {
    const handleInteractionEnd = () => {
      // Small delay to let the canvas update
      setTimeout(updateProgress, 100);
    };

    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);

    return () => {
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [updateProgress]);

  const currentMilestone = MILESTONES.find((m) => m.percent === lastMilestone);

  return (
    <div className={cn('flex items-center gap-3 w-full', className)}>
      {/* Progress bar - flexible width */}
      <div className="relative flex-1 min-w-0">
        <div className="h-3 bg-paper-cream-dark rounded-full overflow-hidden border border-paper-cream-dark/50 shadow-inner">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg,
                hsl(var(--crayon-orange)) 0%,
                hsl(var(--crayon-yellow)) 50%,
                hsl(var(--crayon-green)) 100%
              )`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* Star icons for milestones */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-1 pointer-events-none">
          {MILESTONES.map((milestone) => (
            <motion.div
              key={milestone.percent}
              className={cn(
                'w-2.5 h-2.5 flex items-center justify-center',
                progress >= milestone.percent
                  ? 'text-crayon-yellow'
                  : 'text-paper-cream-dark/60',
              )}
              animate={
                progress >= milestone.percent
                  ? { scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }
                  : {}
              }
              transition={{ duration: 0.3 }}
            >
              <FontAwesomeIcon
                icon={faStar}
                className="text-[10px] drop-shadow-sm"
              />
            </motion.div>
          ))}
        </div>

        {/* Milestone celebration popup */}
        <AnimatePresence>
          {showMilestone && currentMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-crayon-yellow rounded-full shadow-lg z-10"
            >
              <span className="font-tondo font-bold text-sm text-text-primary whitespace-nowrap">
                {currentMilestone.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress text - compact */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-tondo font-bold text-base text-text-primary">
          {progress}%
        </span>
        <span className="text-xs text-text-secondary">colored</span>
      </div>
    </div>
  );
};

export default ProgressIndicator;
