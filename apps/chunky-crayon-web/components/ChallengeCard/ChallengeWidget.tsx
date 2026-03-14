'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faArrowRight,
  faGift,
  faClock,
  faCheck,
} from '@fortawesome/pro-solid-svg-icons';
import cn from '@/utils/cn';
import type { ChallengeWithProgress } from '@/lib/challenges';
import { claimMyChallengeReward } from '@/app/actions/challenges';

type ChallengeWidgetProps = {
  challengeData: ChallengeWithProgress | null;
  weeklyChallengeId?: string;
  className?: string;
};

/**
 * Compact challenge widget for embedding in pages like my-artwork
 * Shows current challenge progress with a link to full challenge page
 */
const ChallengeWidget = ({
  challengeData,
  weeklyChallengeId,
  className,
}: ChallengeWidgetProps) => {
  const [isPending, startTransition] = useTransition();
  const [showRewardClaimed, setShowRewardClaimed] = useState(false);
  const [hasClaimedReward, setHasClaimedReward] = useState(
    challengeData?.rewardClaimed ?? false,
  );

  // No active challenge
  if (!challengeData) {
    return null;
  }

  const { challenge, progress, isCompleted, percentComplete, daysRemaining } =
    challengeData;

  const handleClaimReward = () => {
    if (!weeklyChallengeId || isPending || hasClaimedReward) return;

    startTransition(async () => {
      const result = await claimMyChallengeReward(weeklyChallengeId);
      if (result.success) {
        setHasClaimedReward(true);
        setShowRewardClaimed(true);
        // Hide the celebration after 3 seconds
        setTimeout(() => setShowRewardClaimed(false), 3000);
      }
    });
  };

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        'relative p-4 md:p-6 rounded-2xl border-2 transition-all',
        challenge.backgroundColor,
        isCompleted
          ? 'border-crayon-green/50'
          : 'border-paper-cream-dark hover:border-crayon-orange/40',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
          {isCompleted ? (
            <FontAwesomeIcon
              icon={faCheck}
              className="text-2xl md:text-3xl text-crayon-green"
            />
          ) : (
            <span className="text-2xl md:text-3xl">{challenge.icon}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FontAwesomeIcon
              icon={faTrophy}
              className="text-sm"
              style={iconStyle}
            />
            <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Weekly Challenge
            </span>
          </div>
          <h3 className="font-tondo font-bold text-text-primary mb-1 truncate">
            {challenge.title}
          </h3>

          {/* Progress bar */}
          <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-1.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentComplete}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                isCompleted
                  ? 'bg-crayon-green'
                  : 'bg-gradient-to-r from-crayon-orange to-crayon-yellow',
              )}
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">
              {progress} / {challenge.requirement}
            </span>
            <span
              className={cn(
                'flex items-center gap-1',
                daysRemaining <= 1 ? 'text-crayon-red' : 'text-text-muted',
              )}
            >
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              {isCompleted
                ? 'Done!'
                : daysRemaining === 0
                  ? 'Ends today'
                  : `${daysRemaining}d left`}
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="shrink-0">
          {isCompleted && weeklyChallengeId && !hasClaimedReward ? (
            <motion.button
              onClick={handleClaimReward}
              disabled={isPending || showRewardClaimed}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full',
                showRewardClaimed
                  ? 'bg-crayon-green'
                  : 'bg-crayon-green hover:bg-crayon-green-dark',
                'text-white shadow-md transition-colors',
                'disabled:opacity-50',
              )}
            >
              <FontAwesomeIcon
                icon={showRewardClaimed ? faCheck : faGift}
                className="text-lg"
              />
            </motion.button>
          ) : isCompleted && hasClaimedReward ? (
            // Reward already claimed - show check
            <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-crayon-green/20 text-crayon-green">
              <FontAwesomeIcon icon={faCheck} className="text-lg" />
            </div>
          ) : (
            <Link
              href="/account/challenges"
              className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/60 hover:bg-white text-text-muted hover:text-crayon-orange transition-colors"
            >
              <FontAwesomeIcon icon={faArrowRight} className="text-lg" />
            </Link>
          )}
        </div>
      </div>

      {/* Reward claimed celebration overlay */}
      <AnimatePresence>
        {showRewardClaimed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-crayon-green/90 rounded-2xl"
          >
            <div className="text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-4xl mb-2"
              >
                {challenge.rewardType === 'sticker' ? '🌟' : '🎁'}
              </motion.div>
              <p className="font-tondo font-bold text-lg">Reward Claimed!</p>
              <p className="text-sm text-white/80">
                Check your{' '}
                {challenge.rewardType === 'sticker'
                  ? 'sticker book'
                  : 'Colo accessories'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChallengeWidget;
