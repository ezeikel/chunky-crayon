import { generateObject, generateText } from 'ai';
import { models } from '@/lib/ai/models';
import { sceneDescriptionSchema } from '@/lib/ai/schemas';
import {
  SCENE_DESCRIPTION_SYSTEM,
  createDailyScenePrompt,
} from '@/lib/ai/prompts';
import { getUpcomingEvents, getCurrentSeason } from '@/lib/seasonal-calendar';
import { getRandomDescriptionSmart } from '@/utils/random';
import { db } from '@chunky-crayon/db';

// =============================================================================
// Content Safety — blocklist validation
// =============================================================================

const BLOCKED_WORDS = [
  // Violence & weapons
  'weapon',
  'sword',
  'gun',
  'knife',
  'fight',
  'fighting',
  'battle',
  'war',
  'attack',
  'kill',
  'murder',
  'blood',
  'wound',
  'punch',
  'kick',
  'shoot',
  'stab',
  'slash',
  'arrow',
  'bomb',
  'explode',
  'explosion',
  'destroy',
  // Scary / horror
  'scary',
  'horror',
  'terrifying',
  'nightmare',
  'scream',
  'creepy',
  'zombie',
  'skeleton',
  'skull',
  'ghost',
  'vampire',
  'werewolf',
  'demon',
  'monster',
  'graveyard',
  'cemetery',
  'coffin',
  'haunted',
  'possessed',
  // Death & danger
  'death',
  'dead',
  'die',
  'dying',
  'corpse',
  'funeral',
  'fire',
  'burning',
  'drown',
  'poison',
  'toxic',
  // Adult themes
  'alcohol',
  'beer',
  'wine',
  'drunk',
  'drug',
  'smoking',
  'cigarette',
  'sexy',
  'naked',
  'romance',
  'kiss',
  'dating',
  // Negative emotions
  'angry',
  'rage',
  'furious',
  'crying',
  'depressed',
  'sad',
  'lonely',
  'afraid',
  'terrified',
  'anxious',
  // Other inappropriate
  'toilet',
  'poop',
  'vomit',
  'underwear',
  'political',
  'politician',
  'protest',
  'riot',
];

/**
 * Check if a scene description contains any blocked words.
 * Returns the first blocked word found, or null if safe.
 */
function findBlockedContent(description: string): string | null {
  const lower = description.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    // Match whole words only (avoid false positives like "sword" in "swordfish")
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return word;
    }
  }
  return null;
}

// =============================================================================
// Deduplication — keyword similarity check
// =============================================================================

/**
 * Extract significant keywords from a description (skip common stop words).
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'from',
  'by',
  'as',
  'into',
  'through',
  'during',
  'while',
  'about',
  'between',
  'after',
  'before',
  'above',
  'below',
  'up',
  'down',
  'out',
  'off',
  'over',
  'under',
  'again',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'because',
  'scene',
]);

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

/**
 * Calculate Jaccard similarity between two keyword sets (0 to 1).
 */
function keywordSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check if a description is too similar to any recent prompt.
 * Returns true if similarity exceeds threshold (0.4 = 40% keyword overlap).
 */
function isTooSimilar(
  description: string,
  recentPrompts: string[],
  threshold: number = 0.4,
): boolean {
  const newKeywords = extractKeywords(description);
  for (const recent of recentPrompts) {
    const recentKeywords = extractKeywords(recent);
    if (keywordSimilarity(newKeywords, recentKeywords) >= threshold) {
      return true;
    }
  }
  return false;
}

// =============================================================================
// Recent prompts from DB
// =============================================================================

/**
 * Fetch recent DAILY image sourcePrompt values for deduplication.
 * Returns up to 15 most recent prompts from the last 30 days.
 * (Trimmed from 30 to save context window in the AI prompt.)
 */
async function getRecentPrompts(): Promise<string[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentImages = await db.coloringImage.findMany({
      where: {
        generationType: 'DAILY',
        sourcePrompt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { sourcePrompt: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    return recentImages
      .map((img) => img.sourcePrompt)
      .filter((p): p is string => p !== null);
  } catch (error) {
    // Gracefully handle if sourcePrompt column doesn't exist yet
    console.warn('[SceneGen] Could not fetch recent prompts:', error);
    return [];
  }
}

// =============================================================================
// Scene generation with validation
// =============================================================================

/** Maximum attempts before falling back to static generation */
const MAX_ATTEMPTS = 3;

/**
 * Attempt a single scene generation via Perplexity Sonar.
 * Returns the fullDescription string or null on failure.
 */
async function attemptGeneration(prompt: string): Promise<string | null> {
  // Attempt 1: generateObject with structured output
  try {
    const { object } = await generateObject({
      model: models.search,
      schema: sceneDescriptionSchema,
      system: SCENE_DESCRIPTION_SYSTEM,
      prompt,
      temperature: 0.7,
      providerOptions: {
        perplexity: {
          search_recency_filter: 'week',
        },
      },
    });

    console.log('[SceneGen] generateObject succeeded:', {
      character: object.character,
      activity: object.activity,
      setting: object.setting,
      seasonalContext: object.seasonalContext,
    });

    return object.fullDescription;
  } catch (error) {
    console.warn(
      '[SceneGen] generateObject failed, trying generateText:',
      error,
    );
  }

  // Attempt 2: generateText + manual JSON parse
  try {
    const { text } = await generateText({
      model: models.search,
      system: `${SCENE_DESCRIPTION_SYSTEM}\n\nIMPORTANT: Respond with valid JSON matching this schema: { character: string, activity: string, setting: string, seasonalContext: string | null, fullDescription: string }`,
      prompt,
      temperature: 0.7,
      providerOptions: {
        perplexity: {
          search_recency_filter: 'week',
        },
      },
    });

    const parsed = sceneDescriptionSchema.parse(JSON.parse(text));

    console.log('[SceneGen] generateText + JSON parse succeeded:', {
      character: parsed.character,
      setting: parsed.setting,
    });

    return parsed.fullDescription;
  } catch (error) {
    console.warn('[SceneGen] generateText fallback failed:', error);
  }

  return null;
}

/**
 * Generate a daily scene description using Perplexity Sonar (web search-augmented).
 *
 * Includes:
 * - Content safety blocklist validation
 * - Keyword similarity deduplication against last 30 days
 * - Up to 3 generation attempts before falling back to static
 * - Triple fallback per attempt: generateObject → generateText → retry/static
 *
 * @returns The scene description string for image generation
 */
export async function generateDailyScene(): Promise<string> {
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const upcomingEvents = getUpcomingEvents(now, 7);
  const currentSeason = getCurrentSeason(now);
  const recentPrompts = await getRecentPrompts();

  const prompt = createDailyScenePrompt(
    currentDate,
    upcomingEvents.map((e) => ({
      name: e.name,
      themes: e.themes,
      childFriendlyDescription: e.childFriendlyDescription,
    })),
    currentSeason,
    recentPrompts,
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const description = await attemptGeneration(prompt);

    if (!description) {
      console.warn(
        `[SceneGen] Attempt ${attempt}/${MAX_ATTEMPTS}: generation failed`,
      );
      continue;
    }

    // Content safety check
    const blockedWord = findBlockedContent(description);
    if (blockedWord) {
      console.warn(
        `[SceneGen] Attempt ${attempt}/${MAX_ATTEMPTS}: blocked word "${blockedWord}" found in: "${description}"`,
      );
      continue;
    }

    // Deduplication check
    if (isTooSimilar(description, recentPrompts)) {
      console.warn(
        `[SceneGen] Attempt ${attempt}/${MAX_ATTEMPTS}: too similar to recent scene: "${description}"`,
      );
      continue;
    }

    console.log(
      `[SceneGen] Scene accepted on attempt ${attempt}:`,
      description,
    );
    return description;
  }

  // All attempts failed — fall back to static random
  const fallback = getRandomDescriptionSmart();
  console.log(
    '[SceneGen] All attempts failed, using static fallback:',
    fallback,
  );
  return fallback;
}

/**
 * Get an AI-generated scene description for daily coloring page generation.
 * Wraps generateDailyScene with a catch-all fallback to static random.
 */
export async function getAIDescription(): Promise<string> {
  try {
    return await generateDailyScene();
  } catch (error) {
    console.error('[SceneGen] Unexpected error in getAIDescription:', error);
    return getRandomDescriptionSmart();
  }
}
