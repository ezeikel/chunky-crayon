'use client';

import { motion } from 'framer-motion';
import cn from '@/utils/cn';

type ProgressBarProps = {
  current: number;
  total: number;
  className?: string;
};

const ProgressBar = ({ current, total, className }: ProgressBarProps) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary">
          Sticker Collection
        </span>
        <span className="text-sm font-bold text-crayon-orange">
          {current} / {total}
        </span>
      </div>

      {/* Progress bar track */}
      <div className="relative h-4 bg-paper-cream rounded-full overflow-hidden border-2 border-paper-cream-dark">
        {/* Animated progress fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={cn(
            'absolute inset-y-0 left-0',
            'bg-gradient-to-r from-crayon-orange to-crayon-yellow',
            'rounded-full',
          )}
        />

        {/* Shine effect */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
          className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      </div>

      {/* Percentage label (optional, shown when good progress) */}
      {percentage >= 25 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs text-text-muted mt-1"
        >
          {percentage >= 100
            ? 'Amazing! All stickers collected!'
            : percentage >= 75
              ? "Almost there! You're doing great!"
              : percentage >= 50
                ? 'Halfway there! Keep going!'
                : 'Great start!'}
        </motion.p>
      )}
    </div>
  );
};

export default ProgressBar;
