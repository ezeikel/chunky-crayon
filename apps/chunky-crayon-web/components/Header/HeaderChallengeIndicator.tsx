'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faStar } from '@fortawesome/pro-duotone-svg-icons';
import type { ChallengeWithProgress } from '@/lib/challenges';

type HeaderChallengeIndicatorProps = {
  challengeData: ChallengeWithProgress | null;
};

const trophyStyle = {
  '--fa-primary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
  '--fa-secondary-opacity': '1',
} as React.CSSProperties;

const HeaderChallengeIndicator = ({
  challengeData,
}: HeaderChallengeIndicatorProps) => {
  // Don't show if no active challenge
  if (!challengeData) {
    return null;
  }

  const { percentComplete, isCompleted, rewardClaimed, daysRemaining } =
    challengeData;

  // Determine status display
  const showRewardReady = isCompleted && !rewardClaimed;

  return (
    <Link
      href="/account/challenges"
      className="relative flex items-center gap-1 sm:gap-2 font-tondo font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-crayon-yellow/10 to-crayon-orange/10 border-2 border-crayon-yellow/30 hover:border-crayon-orange/50 hover:scale-105 active:scale-95 transition-all duration-200"
    >
      <FontAwesomeIcon
        icon={faTrophy}
        className="text-base sm:text-lg"
        style={trophyStyle}
      />

      {/* Progress ring or completion indicator */}
      <div className="relative w-5 h-5 sm:w-6 sm:h-6">
        {/* Background circle */}
        <svg className="w-5 h-5 sm:w-6 sm:h-6 -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="40%"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-paper-cream"
          />
          {/* Progress arc - circumference = 2 * pi * r, for 40% of w=24: r=9.6, C=60.3 */}
          <circle
            cx="50%"
            cy="50%"
            r="40%"
            stroke="url(#challengeGradient)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${percentComplete * 0.5} 50`}
            className={isCompleted ? 'text-crayon-green' : ''}
          />
          <defs>
            <linearGradient
              id="challengeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="hsl(var(--crayon-orange))" />
              <stop offset="100%" stopColor="hsl(var(--crayon-yellow))" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center text */}
        <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-text-primary">
          {isCompleted ? '!' : `${percentComplete}%`}
        </span>
      </div>

      {/* Reward ready badge */}
      {showRewardReady && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-crayon-green text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
          <FontAwesomeIcon icon={faStar} className="text-[8px]" />
        </span>
      )}

      {/* Urgency indicator - last day */}
      {!isCompleted && daysRemaining === 0 && (
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-crayon-red text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
          !
        </span>
      )}
    </Link>
  );
};

export default HeaderChallengeIndicator;
