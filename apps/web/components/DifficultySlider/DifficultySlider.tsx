'use client';

import cn from '@/utils/cn';
import { Switch } from '@/components/ui/switch';
import { AgeGroup, Difficulty } from '@chunky-crayon/db/types';

// Age group to default difficulty mapping
const AGE_GROUP_DEFAULTS: Record<AgeGroup, Difficulty> = {
  [AgeGroup.TODDLER]: Difficulty.BEGINNER,
  [AgeGroup.CHILD]: Difficulty.BEGINNER,
  [AgeGroup.TWEEN]: Difficulty.INTERMEDIATE,
  [AgeGroup.TEEN]: Difficulty.ADVANCED,
  [AgeGroup.ADULT]: Difficulty.EXPERT,
};

const DIFFICULTY_ORDER: Difficulty[] = [
  Difficulty.BEGINNER,
  Difficulty.INTERMEDIATE,
  Difficulty.ADVANCED,
  Difficulty.EXPERT,
];

const DIFFICULTY_INFO: Record<
  Difficulty,
  {
    label: string;
    description: string;
    targetAge: string;
    color: string;
  }
> = {
  [Difficulty.BEGINNER]: {
    label: 'Beginner',
    description:
      'Large, simple shapes with thick outlines. Perfect for little hands.',
    targetAge: 'Ages 2-8',
    color: 'bg-green-500',
  },
  [Difficulty.INTERMEDIATE]: {
    label: 'Intermediate',
    description:
      'Medium-sized shapes with moderate detail. More areas to color.',
    targetAge: 'Ages 9-12',
    color: 'bg-blue-500',
  },
  [Difficulty.ADVANCED]: {
    label: 'Advanced',
    description: 'Varied sizes with detailed patterns and full scenes.',
    targetAge: 'Ages 13-17',
    color: 'bg-purple-500',
  },
  [Difficulty.EXPERT]: {
    label: 'Expert',
    description:
      'Intricate patterns and fine details. Mandala-style complexity.',
    targetAge: 'Ages 18+',
    color: 'bg-orange-500',
  },
};

type DifficultySliderProps = {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
  ageGroup: AgeGroup;
  useRecommended: boolean;
  onUseRecommendedChange: (value: boolean) => void;
  disabled?: boolean;
};

const DifficultySlider = ({
  value,
  onChange,
  ageGroup,
  useRecommended,
  onUseRecommendedChange,
  disabled = false,
}: DifficultySliderProps) => {
  const recommendedDifficulty = AGE_GROUP_DEFAULTS[ageGroup];
  const currentInfo = DIFFICULTY_INFO[value];

  const handleToggle = (checked: boolean) => {
    onUseRecommendedChange(checked);
    if (checked) {
      // Reset to age-appropriate difficulty
      onChange(recommendedDifficulty);
    }
  };

  return (
    <div className="space-y-4">
      {/* Use recommended toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <Switch
          checked={useRecommended}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
        <div>
          <span className="font-medium">Use age-appropriate difficulty</span>
          <span className="text-sm text-muted-foreground ml-2">
            (recommended)
          </span>
        </div>
      </label>

      {useRecommended ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                DIFFICULTY_INFO[recommendedDifficulty].color,
              )}
            />
            <span className="font-medium">
              {DIFFICULTY_INFO[recommendedDifficulty].label}
            </span>
            <span className="text-sm text-muted-foreground">
              ({DIFFICULTY_INFO[recommendedDifficulty].targetAge})
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {DIFFICULTY_INFO[recommendedDifficulty].description}
          </p>
        </div>
      ) : (
        <>
          {/* Difficulty selector buttons */}
          <div className="flex gap-2">
            {DIFFICULTY_ORDER.map((difficulty) => {
              const info = DIFFICULTY_INFO[difficulty];
              const isSelected = value === difficulty;

              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => onChange(difficulty)}
                  disabled={disabled}
                  className={cn(
                    'flex-1 px-3 py-3 rounded-lg border-2 transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-crayon-blue',
                    isSelected
                      ? 'border-crayon-blue bg-crayon-blue/10 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn('w-4 h-4 rounded-full', info.color)} />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isSelected ? 'text-crayon-blue' : 'text-gray-700',
                      )}
                    >
                      {info.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected difficulty info */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', currentInfo.color)} />
              <span className="font-medium">{currentInfo.label}</span>
              <span className="text-sm text-muted-foreground">
                ({currentInfo.targetAge})
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {currentInfo.description}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default DifficultySlider;
