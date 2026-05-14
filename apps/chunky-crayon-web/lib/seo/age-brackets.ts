import { Difficulty } from '@one-colored-pixel/db';

export type AgeBracket =
  | 'for-toddlers'
  | 'for-kids'
  | 'for-tweens'
  | 'for-adults';

export type AgeBracketDef = {
  slug: AgeBracket;
  label: string;
  difficulty: Difficulty;
  ageRangeLabel: string;
};

export const AGE_BRACKETS: AgeBracketDef[] = [
  {
    slug: 'for-toddlers',
    label: 'Toddlers',
    difficulty: Difficulty.BEGINNER,
    ageRangeLabel: 'Ages 2-4',
  },
  {
    slug: 'for-kids',
    label: 'Kids',
    difficulty: Difficulty.INTERMEDIATE,
    ageRangeLabel: 'Ages 5-8',
  },
  {
    slug: 'for-tweens',
    label: 'Tweens',
    difficulty: Difficulty.ADVANCED,
    ageRangeLabel: 'Ages 9-12',
  },
  {
    slug: 'for-adults',
    label: 'Adults',
    difficulty: Difficulty.EXPERT,
    ageRangeLabel: 'Adults',
  },
];

export type SpecificAge = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type SpecificAgeDef = {
  age: SpecificAge;
  slug: string;
  label: string;
  difficulty: Difficulty;
  ageBracket: AgeBracket;
};

export const SPECIFIC_AGES: SpecificAgeDef[] = [
  {
    age: 2,
    slug: '2-year-olds',
    label: '2 Year Olds',
    difficulty: Difficulty.BEGINNER,
    ageBracket: 'for-toddlers',
  },
  {
    age: 3,
    slug: '3-year-olds',
    label: '3 Year Olds',
    difficulty: Difficulty.BEGINNER,
    ageBracket: 'for-toddlers',
  },
  {
    age: 4,
    slug: '4-year-olds',
    label: '4 Year Olds',
    difficulty: Difficulty.BEGINNER,
    ageBracket: 'for-toddlers',
  },
  {
    age: 5,
    slug: '5-year-olds',
    label: '5 Year Olds',
    difficulty: Difficulty.INTERMEDIATE,
    ageBracket: 'for-kids',
  },
  {
    age: 6,
    slug: '6-year-olds',
    label: '6 Year Olds',
    difficulty: Difficulty.INTERMEDIATE,
    ageBracket: 'for-kids',
  },
  {
    age: 7,
    slug: '7-year-olds',
    label: '7 Year Olds',
    difficulty: Difficulty.INTERMEDIATE,
    ageBracket: 'for-kids',
  },
  {
    age: 8,
    slug: '8-year-olds',
    label: '8 Year Olds',
    difficulty: Difficulty.INTERMEDIATE,
    ageBracket: 'for-kids',
  },
  {
    age: 9,
    slug: '9-year-olds',
    label: '9 Year Olds',
    difficulty: Difficulty.ADVANCED,
    ageBracket: 'for-tweens',
  },
  {
    age: 10,
    slug: '10-year-olds',
    label: '10 Year Olds',
    difficulty: Difficulty.ADVANCED,
    ageBracket: 'for-tweens',
  },
  {
    age: 11,
    slug: '11-year-olds',
    label: '11 Year Olds',
    difficulty: Difficulty.ADVANCED,
    ageBracket: 'for-tweens',
  },
  {
    age: 12,
    slug: '12-year-olds',
    label: '12 Year Olds',
    difficulty: Difficulty.ADVANCED,
    ageBracket: 'for-tweens',
  },
];

export const getAgeBracketBySlug = (slug: string): AgeBracketDef | undefined =>
  AGE_BRACKETS.find((a) => a.slug === slug);

export const getSpecificAgeBySlug = (
  slug: string,
): SpecificAgeDef | undefined => SPECIFIC_AGES.find((a) => a.slug === slug);
