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
      className="relative flex h-16 min-w-48 items-center justify-between gap-5 rounded-full border-2 border-crayon-yellow/40 bg-gradient-to-r from-crayon-yellow/10 to-crayon-orange/10 px-6 font-tondo font-bold transition-all duration-200 hover:scale-105 hover:border-crayon-orange/50 active:scale-95"
    >
      <FontAwesomeIcon
        icon={faTrophy}
        className="shrink-0 text-xl"
        style={trophyStyle}
      />

      {/* Progress ring or completion indicator */}
      <div className="relative h-12 w-12 shrink-0 rounded-full bg-white/80">
        {/* Background circle */}
        <svg className="h-12 w-12 -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="38%"
            stroke="currentColor"
            strokeWidth="3.5"
            fill="none"
            className="text-paper-cream"
          />
          {/* Progress arc - circumference = 2 * pi * r, for 40% of w=24: r=9.6, C=60.3 */}
          <circle
            cx="50%"
            cy="50%"
            r="38%"
            stroke="url(#challengeGradient)"
            strokeWidth="3.5"
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
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold leading-none text-text-primary">
          {isCompleted ? '!' : `${percentComplete}%`}
        </span>
      </div>

      {/* Reward ready badge */}
      {showRewardReady && (
        <span className="absolute -right-2 -top-2 flex min-h-7 min-w-7 items-center justify-center rounded-full bg-crayon-green px-2 py-1 text-xs font-bold text-white shadow-sm">
          <FontAwesomeIcon icon={faStar} className="text-[10px]" />
        </span>
      )}

      {/* Urgency indicator - last day */}
      {!isCompleted && daysRemaining === 0 && (
        <span className="absolute -right-2 -top-2 flex min-h-7 min-w-7 items-center justify-center rounded-full bg-crayon-red px-2 py-1 text-xs font-bold text-white shadow-sm">
          !
        </span>
      )}
    </Link>
  );
};

export default HeaderChallengeIndicator;
