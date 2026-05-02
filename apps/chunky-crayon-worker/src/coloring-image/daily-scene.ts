/**
 * Daily scene generation for the worker's daily-image cron.
 *
 * Mirrors apps/chunky-crayon-web/lib/scene-generation.ts. Worker-side copy
 * so the daily-image cron pipeline doesn't have to import the web app's
 * Next-bound helpers. Same logic: Perplexity Sonar with structured output,
 * content safety blocklist, keyword similarity dedup against last 30 days
 * of DAILY rows, fall back to a small inline list if all attempts fail.
 *
 * The fallback list is intentionally tiny (~12 items) — the user-facing
 * static catalog (SETTINGS × CHARACTERS × ACTIVITIES × LOCATIONS in
 * apps/chunky-crayon-web/constants.ts) is ~2000 lines of brand seed data
 * that's only used if Perplexity dies 3× in a row. Not worth porting.
 */

import { generateText, Output } from "ai";
import { perplexity } from "@ai-sdk/perplexity";
import {
  sceneDescriptionSchema,
  SCENE_DESCRIPTION_SYSTEM,
  createDailyScenePrompt,
  getUpcomingEvents,
  getCurrentSeason,
} from "@one-colored-pixel/coloring-core";
import { db, Brand } from "@one-colored-pixel/db";

const perplexityModel = perplexity("sonar");

// =============================================================================
// Content safety blocklist — duplicated from web for worker-side enforcement
// =============================================================================

const BLOCKED_WORDS = [
  // Violence & weapons
  "weapon",
  "sword",
  "gun",
  "knife",
  "fight",
  "fighting",
  "battle",
  "war",
  "attack",
  "kill",
  "murder",
  "blood",
  "wound",
  "punch",
  "kick",
  "shoot",
  "stab",
  "slash",
  "arrow",
  "bomb",
  "explode",
  "explosion",
  "destroy",
  // Scary / horror
  "scary",
  "horror",
  "terrifying",
  "nightmare",
  "scream",
  "creepy",
  "zombie",
  "skeleton",
  "skull",
  "ghost",
  "vampire",
  "werewolf",
  "demon",
  "monster",
  "graveyard",
  "cemetery",
  "coffin",
  "haunted",
  "possessed",
  // Death & danger
  "death",
  "dead",
  "die",
  "dying",
  "corpse",
  "funeral",
  "fire",
  "burning",
  "drown",
  "poison",
  "toxic",
  // Adult themes
  "alcohol",
  "beer",
  "wine",
  "drunk",
  "drug",
  "smoking",
  "cigarette",
  "sexy",
  "naked",
  "romance",
  "kiss",
  "dating",
  // Negative emotions
  "angry",
  "rage",
  "furious",
  "crying",
  "depressed",
  "sad",
  "lonely",
  "afraid",
  "terrified",
  "anxious",
  // Other inappropriate
  "toilet",
  "poop",
  "vomit",
  "underwear",
  "political",
  "politician",
  "protest",
  "riot",
];

function findBlockedContent(description: string): string | null {
  const lower = description.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    if (regex.test(lower)) return word;
  }
  return null;
}

// =============================================================================
// Keyword-similarity dedup
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
// Recent prompts from DB (last 30 days of DAILY images)
// =============================================================================

async function getRecentPrompts(): Promise<string[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent = await db.coloringImage.findMany({
      where: {
        brand: Brand.CHUNKY_CRAYON,
        generationType: "DAILY",
        sourcePrompt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { sourcePrompt: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    return recent
      .map((r) => r.sourcePrompt)
      .filter((p): p is string => p !== null);
  } catch (err) {
    console.warn("[daily-scene] could not fetch recent prompts:", err);
    return [];
  }
}

// =============================================================================
// Static fallback — small list, only used if Perplexity fails 3× in a row
// =============================================================================

const STATIC_FALLBACK_SCENES = [
  "A friendly dragon with rounded scales sitting in a magical forest beside a bubbling stream.",
  "A curious astronaut floating gently in space surrounded by stars and a small smiling moon.",
  "A unicorn with a flowing mane galloping across a meadow filled with large flowers.",
  "A penguin family waddling on an ice floe with a snowy mountain in the background.",
  "A cheerful chef baking a giant cake in a cozy kitchen with rolling pins and mixing bowls.",
  "A panda eating bamboo high up in a tree with butterflies flying nearby.",
  "A dolphin leaping from the ocean with a rainbow arching across the sky.",
  "A kid pirate steering a wooden ship across calm waves with seagulls overhead.",
  "A robot watering plants in a small greenhouse with clay pots and a watering can.",
  "A fairy hovering above a giant mushroom with sparkles trailing behind her wings.",
  "A turtle reading a book on a beach with a bucket and spade beside it.",
  "A fox playing with a kite in a field of tall grass with clouds shaped like animals overhead.",
];

function pickStaticFallback(): string {
  return STATIC_FALLBACK_SCENES[
    Math.floor(Math.random() * STATIC_FALLBACK_SCENES.length)
  ];
}

// =============================================================================
// Generation attempts with content safety + dedup
// =============================================================================

const MAX_ATTEMPTS = 3;

async function attemptGeneration(prompt: string): Promise<string | null> {
  // Attempt 1: structured output
  try {
    const { output } = await generateText({
      model: perplexityModel,
      output: Output.object({ schema: sceneDescriptionSchema }),
      system: SCENE_DESCRIPTION_SYSTEM,
      prompt,
      temperature: 0.7,
      providerOptions: {
        perplexity: { search_recency_filter: "week" },
      },
    });
    if (output?.fullDescription) return output.fullDescription;
  } catch (err) {
    console.warn(
      "[daily-scene] structured output failed, trying generateText:",
      err,
    );
  }

  // Attempt 2: plain generateText + manual JSON parse
  try {
    const { text } = await generateText({
      model: perplexityModel,
      system: `${SCENE_DESCRIPTION_SYSTEM}\n\nIMPORTANT: Respond with valid JSON matching this schema: { character: string, activity: string, setting: string, seasonalContext: string | null, fullDescription: string }`,
      prompt,
      temperature: 0.7,
      providerOptions: {
        perplexity: { search_recency_filter: "week" },
      },
    });
    const parsed = sceneDescriptionSchema.parse(JSON.parse(text));
    return parsed.fullDescription;
  } catch (err) {
    console.warn("[daily-scene] generateText fallback failed:", err);
  }

  return null;
}

/**
 * Generate a daily scene description. Mirrors the web's generateDailyScene.
 * Returns the scene string for image generation.
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
        `[daily-scene] attempt ${attempt}/${MAX_ATTEMPTS}: generation failed`,
      );
      continue;
    }

    const blocked = findBlockedContent(description);
    if (blocked) {
      console.warn(
        `[daily-scene] attempt ${attempt}/${MAX_ATTEMPTS}: blocked word "${blocked}" in: "${description}"`,
      );
      continue;
    }

    if (isTooSimilar(description, recentPrompts)) {
      console.warn(
        `[daily-scene] attempt ${attempt}/${MAX_ATTEMPTS}: too similar to recent: "${description}"`,
      );
      continue;
    }

    console.log(
      `[daily-scene] accepted on attempt ${attempt}: "${description}"`,
    );
    return description;
  }

  const fallback = pickStaticFallback();
  console.log(`[daily-scene] all attempts failed, using static: "${fallback}"`);
  return fallback;
}
