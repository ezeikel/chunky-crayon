'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClock, faGift } from '@fortawesome/pro-solid-svg-icons';
import cn from '@/utils/cn';
import type { ChallengeWithProgress } from '@/lib/challenges';

type ChallengeCardProps = {
  challengeData: ChallengeWithProgress;
  onClaimReward?: () => void;
  isClaimingReward?: boolean;
  className?: string;
};

const ChallengeCard = ({
  challengeData,
  onClaimReward,
  isClaimingReward = false,
  className,
}: ChallengeCardProps) => {
  const { challenge, progress, isCompleted, percentComplete, daysRemaining } =
    challengeData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-3xl p-5',
        'border-3 shadow-lg',
        // Dynamic background and border from challenge definition
        challenge.backgroundColor,
        challenge.accentColor,
        // Completed state styling
        isCompleted && 'ring-2 ring-crayon-green ring-offset-2',
        className,
      )}
    >
      {/* Completed checkmark badge */}
      {isCompleted && (
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          className={cn(
            'absolute -top-1 -right-1 z-10',
            'w-10 h-10 rounded-full bg-crayon-green',
            'flex items-center justify-center shadow-md',
          )}
        >
          <FontAwesomeIcon icon={faCheck} className="text-white text-lg" />
        </motion.div>
      )}

      {/* Header: Icon and Title */}
      <div className="flex items-start gap-4 mb-4">
        {/* Challenge Icon */}
        <motion.div
          animate={
            isCompleted ? {} : { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
          }
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className={cn(
            'flex-shrink-0 w-14 h-14 rounded-2xl',
            'bg-white/80 backdrop-blur-sm',
            'flex items-center justify-center',
            'text-3xl shadow-sm border-2 border-white',
          )}
        >
          {challenge.icon}
        </motion.div>

        {/* Title and Description */}
        <div className="flex-1 min-w-0">
          <h3 className="font-tondo font-bold text-lg text-text-primary leading-tight mb-1">
            {challenge.title}
          </h3>
          <p className="text-sm text-text-secondary line-clamp-2">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mb-4">
        {/* Progress bar track */}
        <div className="relative h-5 bg-white/60 rounded-full overflow-hidden border-2 border-white shadow-inner">
          {/* Animated progress fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentComplete}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className={cn(
              'absolute inset-y-0 left-0 rounded-full',
              isCompleted
                ? 'bg-gradient-to-r from-crayon-green to-emerald-400'
                : 'bg-gradient-to-r from-crayon-orange to-crayon-yellow',
            )}
          />

          {/* Shine effect */}
          {!isCompleted && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: 'easeInOut',
              }}
              className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          )}
        </div>

        {/* Progress text */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium text-text-secondary">
            Progress
          </span>
          <span
            className={cn(
              'text-sm font-bold',
              isCompleted ? 'text-crayon-green' : 'text-crayon-orange',
            )}
          >
            {progress} / {challenge.requirement}
          </span>
        </div>
      </div>

      {/* Footer: Days remaining and Reward */}
      <div className="flex items-center justify-between">
        {/* Days remaining */}
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={faClock}
            className={cn(
              'text-sm',
              daysRemaining <= 1 ? 'text-crayon-red' : 'text-text-muted',
            )}
          />
          <span
            className={cn(
              'text-sm font-medium',
              daysRemaining <= 1 ? 'text-crayon-red' : 'text-text-secondary',
            )}
          >
            {isCompleted
              ? 'Completed!'
              : daysRemaining === 0
                ? 'Ends today!'
                : daysRemaining === 1
                  ? '1 day left'
                  : `${daysRemaining} days left`}
          </span>
        </div>

        {/* Reward indicator or Claim button */}
        {isCompleted && onClaimReward ? (
          <motion.button
            onClick={onClaimReward}
            disabled={isClaimingReward}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full',
              'bg-crayon-green text-white font-bold text-sm',
              'shadow-md hover:shadow-lg transition-shadow',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <FontAwesomeIcon icon={faGift} className="text-sm" />
            {isClaimingReward ? 'Claiming...' : 'Claim Reward!'}
          </motion.button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-white">
            <FontAwesomeIcon
              icon={faGift}
              className="text-sm text-text-muted"
            />
            <span className="text-xs font-medium text-text-secondary">
              {challenge.rewardType === 'sticker' ? 'Sticker' : 'Accessory'}
            </span>
          </div>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10 pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-transparent transform translate-x-8 -translate-y-8" />
      </div>
    </motion.div>
  );
};

export default ChallengeCard;
