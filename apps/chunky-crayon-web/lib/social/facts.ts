/**
 * Fact categories and types for social media fact cards
 */

export interface FactCategory {
  name: string;
  emoji: string;
  weight: number; // Higher weight = more likely to be selected
  description: string; // Used in AI prompt
}

export const FACT_CATEGORIES: FactCategory[] = [
  {
    name: 'Coloring Benefit',
    emoji: '🎨',
    weight: 30,
    description:
      'benefits of coloring for children, such as motor skills, focus, relaxation, or creativity',
  },
  {
    name: 'Child Development',
    emoji: '🧒',
    weight: 25,
    description:
      'child development facts related to art, learning through play, or cognitive growth',
  },
  {
    name: 'Creativity Tip',
    emoji: '💡',
    weight: 20,
    description:
      'tips for encouraging creativity in children or making coloring more fun',
  },
  {
    name: 'Fun Trivia',
    emoji: '✨',
    weight: 15,
    description:
      'fun and surprising facts about coloring, crayons, art history, or colors',
  },
  {
    name: 'Parent Tip',
    emoji: '👨‍👩‍👧',
    weight: 10,
    description:
      'tips for parents on how to engage with their children during coloring activities',
  },
];

export interface GeneratedFact {
  fact: string;
  category: string;
  emoji: string;
}

/**
 * Select a random category based on weights
 */
export function selectRandomCategory(): FactCategory {
  const totalWeight = FACT_CATEGORIES.reduce((sum, cat) => sum + cat.weight, 0);
  let random = Math.random() * totalWeight;

  for (const category of FACT_CATEGORIES) {
    random -= category.weight;
    if (random <= 0) {
      return category;
    }
  }

  // Fallback to first category
  return FACT_CATEGORIES[0];
}

/**
 * Get all category names for display
 */
export function getCategoryNames(): string[] {
  return FACT_CATEGORIES.map((cat) => cat.name);
}
