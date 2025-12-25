'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faStars,
  faCrown,
  faMedal,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import cn from '@/lib/utils';

// Define Difficulty locally to avoid importing from @chunky-crayon/db in client component
// This must match the Difficulty enum from the database
const Difficulty = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  EXPERT: 'EXPERT',
} as const;

type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

type DifficultyFilterProps = {
  currentDifficulty?: Difficulty | null;
  counts?: Record<Difficulty, number>;
  className?: string;
};

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    label: string;
    shortLabel: string;
    icon: IconDefinition;
    color: string;
    bgColor: string;
    hoverBg: string;
    activeBg: string;
  }
> = {
  [Difficulty.BEGINNER]: {
    label: 'Beginner',
    shortLabel: 'Easy',
    icon: faStar,
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
    hoverBg: 'hover:bg-crayon-green/20',
    activeBg: 'bg-crayon-green text-white',
  },
  [Difficulty.INTERMEDIATE]: {
    label: 'Intermediate',
    shortLabel: 'Medium',
    icon: faStars,
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
    hoverBg: 'hover:bg-crayon-orange/20',
    activeBg: 'bg-crayon-orange text-white',
  },
  [Difficulty.ADVANCED]: {
    label: 'Advanced',
    shortLabel: 'Hard',
    icon: faMedal,
    color: 'text-crayon-blue',
    bgColor: 'bg-crayon-blue/10',
    hoverBg: 'hover:bg-crayon-blue/20',
    activeBg: 'bg-crayon-blue text-white',
  },
  [Difficulty.EXPERT]: {
    label: 'Expert',
    shortLabel: 'Expert',
    icon: faCrown,
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
    hoverBg: 'hover:bg-crayon-purple/20',
    activeBg: 'bg-crayon-purple text-white',
  },
};

const DifficultyFilter = ({
  currentDifficulty,
  counts,
  className,
}: DifficultyFilterProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleDifficultyChange = (difficulty: Difficulty | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (difficulty) {
      params.set('difficulty', difficulty.toLowerCase());
    } else {
      params.delete('difficulty');
    }

    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.push(newUrl, { scroll: false });
  };

  const isActive = (difficulty: Difficulty | null) => {
    return currentDifficulty === difficulty;
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {/* All button */}
      <button
        type="button"
        onClick={() => handleDifficultyChange(null)}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
          'border border-paper-cream-dark',
          isActive(null)
            ? 'bg-text-primary text-white border-text-primary'
            : 'bg-white text-text-secondary hover:bg-paper-cream hover:border-text-tertiary',
        )}
      >
        All
        {counts && (
          <span className="text-xs opacity-70">
            ({Object.values(counts).reduce((a, b) => a + b, 0)})
          </span>
        )}
      </button>

      {/* Difficulty buttons */}
      {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => {
        const difficulty = key as Difficulty;
        const count = counts?.[difficulty] || 0;
        const active = isActive(difficulty);

        return (
          <button
            key={difficulty}
            type="button"
            onClick={() => handleDifficultyChange(difficulty)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
              'border',
              active
                ? cn(config.activeBg, 'border-transparent')
                : cn(
                    'bg-white border-paper-cream-dark',
                    config.hoverBg,
                    'hover:border-transparent',
                  ),
            )}
          >
            <FontAwesomeIcon
              icon={config.icon}
              className={cn('text-sm', active ? 'text-white' : config.color)}
            />
            <span className="hidden sm:inline">{config.label}</span>
            <span className="sm:hidden">{config.shortLabel}</span>
            {count > 0 && (
              <span
                className={cn('text-xs', active ? 'opacity-80' : 'opacity-60')}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DifficultyFilter;
