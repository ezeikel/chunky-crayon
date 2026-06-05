/**
 * Shared types for character-aware prompts. Split from the impl module so
 * server actions can import the type without pulling in the (Phase 5) impl
 * before it's wired up.
 */

import type { Difficulty } from '@one-colored-pixel/db';

export type CharacterForPrompt = {
  name: string;
  species: string;
  traits: readonly string[];
  signatureDetails: readonly string[];
};

export type CharacterPromptInput = {
  /** The kid's typed/voiced/photo-described scene. */
  description: string;
  /** Locale used for any localised cue language in the prompt body. */
  locale: string;
  /** Difficulty bucket (BEGINNER … EXPERT) — gates detail density. */
  difficulty?: Difficulty;
  /**
   * The recurring character(s) that must appear in the scene. v1 capped at
   * one; now up to MAX_SUBJECTS (2) — any mix of the kid's saved characters.
   * Each one's portrait is conditioned via the worker's referenceImageUrls.
   */
  characters: readonly CharacterForPrompt[];
};
