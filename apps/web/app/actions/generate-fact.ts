'use server';

import { generateText, models } from '@/lib/ai';
import {
  selectRandomCategory,
  type GeneratedFact,
  type FactCategory,
} from '@/lib/social/facts';

/**
 * System prompt for generating engaging facts for social media fact cards.
 */
const FACT_GENERATION_SYSTEM = `You are a content creator for Chunky Crayon, a children's coloring app. Your task is to generate a single, engaging fact for social media.

Target audience: Parents of children aged 3-8.

Requirements:
- The fact must be between 50-80 characters (this is CRITICAL - count carefully!)
- Use simple, accessible language
- Be positive and encouraging
- Make it memorable and shareable
- End with proper punctuation (period or exclamation mark)
- Do NOT include quotation marks around the fact
- Do NOT start with "Did you know" or similar phrases - just state the fact directly

Good examples:
- "Coloring helps children develop fine motor skills!"
- "Kids who color regularly show improved focus."
- "Art activities boost creativity and self-expression."

Bad examples (too long or complex):
- "Studies have shown that children who engage in coloring activities on a regular basis tend to demonstrate significantly improved concentration and focus."
- "Did you know that coloring can help your child develop better hand-eye coordination?"

Respond with ONLY the fact text, nothing else.`;

/**
 * Create a prompt for generating a fact in a specific category.
 */
function createFactGenerationPrompt(category: FactCategory): string {
  return `Generate a short, engaging fact about ${category.description}.

Category: ${category.name}
Maximum length: 80 characters
Remember: State the fact directly without preamble. Count the characters carefully.`;
}

/**
 * Generate a random fact using AI.
 * Selects a random category based on weights and generates an appropriate fact.
 */
export async function generateFact(): Promise<GeneratedFact> {
  const category = selectRandomCategory();

  const { text } = await generateText({
    model: models.creative,
    system: FACT_GENERATION_SYSTEM,
    prompt: createFactGenerationPrompt(category),
  });

  // Clean up the response - remove quotes if present, trim whitespace
  let fact = text.trim();
  if (
    (fact.startsWith('"') && fact.endsWith('"')) ||
    (fact.startsWith("'") && fact.endsWith("'"))
  ) {
    fact = fact.slice(1, -1);
  }

  return {
    fact,
    category: category.name,
    emoji: category.emoji,
  };
}

/**
 * Generate a fact for a specific category.
 */
export async function generateFactForCategory(
  categoryName: string,
): Promise<GeneratedFact> {
  const { FACT_CATEGORIES } = await import('@/lib/social/facts');
  const category =
    FACT_CATEGORIES.find((c) => c.name === categoryName) || FACT_CATEGORIES[0];

  const { text } = await generateText({
    model: models.creative,
    system: FACT_GENERATION_SYSTEM,
    prompt: createFactGenerationPrompt(category),
  });

  // Clean up the response
  let fact = text.trim();
  if (
    (fact.startsWith('"') && fact.endsWith('"')) ||
    (fact.startsWith("'") && fact.endsWith("'"))
  ) {
    fact = fact.slice(1, -1);
  }

  return {
    fact,
    category: category.name,
    emoji: category.emoji,
  };
}
