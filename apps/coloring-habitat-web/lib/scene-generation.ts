import { generateText, Output } from "ai";
import { models } from "@/lib/ai/models";
import { sceneDescriptionSchema } from "@/lib/ai/schemas";
import {
  SCENE_DESCRIPTION_SYSTEM,
  createDailyScenePrompt,
} from "@/lib/ai/prompts";
import { getUpcomingEvents, getCurrentSeason } from "@/lib/seasonal-calendar";
import { getRandomDescriptionSmart } from "@/utils/random";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";

// =============================================================================
// Deduplication — keyword similarity check
// =============================================================================

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "from",
  "by",
  "as",
  "into",
  "through",
  "during",
  "while",
  "about",
  "between",
  "after",
  "before",
  "above",
  "below",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "again",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "because",
  "scene",
]);

function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

function keywordSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

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
// Recent prompts from DB (brand-scoped)
// =============================================================================

async function getRecentPrompts(): Promise<string[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentImages = await db.coloringImage.findMany({
      where: {
        brand: BRAND,
        generationType: "DAILY",
        sourcePrompt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { sourcePrompt: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    return recentImages
      .map((img) => img.sourcePrompt)
      .filter((p): p is string => p !== null);
  } catch (error) {
    console.warn("[SceneGen] Could not fetch recent prompts:", error);
    return [];
  }
}

// =============================================================================
// Scene generation with validation
// =============================================================================

const MAX_ATTEMPTS = 3;

async function attemptGeneration(prompt: string): Promise<string | null> {
  // Attempt 1: structured output
  try {
    const { output } = await generateText({
      model: models.search,
      output: Output.object({ schema: sceneDescriptionSchema }),
      system: SCENE_DESCRIPTION_SYSTEM,
      prompt,
      temperature: 0.7,
      providerOptions: {
        perplexity: {
          search_recency_filter: "week",
        },
      },
    });

    console.log("[SceneGen] structured output succeeded:", {
      character: output!.character,
      activity: output!.activity,
      setting: output!.setting,
      seasonalContext: output!.seasonalContext,
    });

    return output!.fullDescription;
  } catch (error) {
    console.warn(
      "[SceneGen] structured output failed, trying generateText:",
      error,
    );
  }

  // Attempt 2: plain text + manual parse
  try {
    const { text } = await generateText({
      model: models.search,
      system: `${SCENE_DESCRIPTION_SYSTEM}\n\nIMPORTANT: Respond with valid JSON matching this schema: { character: string, activity: string, setting: string, seasonalContext: string | null, fullDescription: string }`,
      prompt,
      temperature: 0.7,
      providerOptions: {
        perplexity: {
          search_recency_filter: "week",
        },
      },
    });

    const parsed = sceneDescriptionSchema.parse(JSON.parse(text));

    console.log("[SceneGen] generateText + JSON parse succeeded:", {
      character: parsed.character,
      setting: parsed.setting,
    });

    return parsed.fullDescription;
  } catch (error) {
    console.warn("[SceneGen] generateText fallback failed:", error);
  }

  return null;
}

/**
 * Generate a daily scene description using Perplexity Sonar (web search-augmented).
 *
 * Includes:
 * - Keyword similarity deduplication against last 30 days
 * - Up to 3 generation attempts before falling back to static
 */
export async function generateDailyScene(): Promise<string> {
  const now = new Date();
  const currentDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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
    "[SceneGen] All attempts failed, using static fallback:",
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
    console.error("[SceneGen] Unexpected error in getAIDescription:", error);
    return getRandomDescriptionSmart();
  }
}
