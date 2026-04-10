/**
 * Prompt templates for audio generation
 *
 * `createAmbientPrompt` asks Claude to write a scene-tailored ElevenLabs
 * Music API prompt for the coloring page. If Claude fails, falls back to a
 * simple scene-led template so generation never crashes.
 *
 * NOTE: This file imports the Anthropic provider directly rather than going
 * through `@/lib/ai/models` because the PostHog tracing wrapper in models.ts
 * tries to subclass `Anthropic.Messages` at module-load time, which breaks in
 * non-Next.js contexts (e.g. tsx scripts). The system + user prompt strings
 * still live in `@/lib/ai/prompts` so the prompt content has one source of
 * truth — only the model call is local.
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  MUSIC_PROMPT_SYSTEM,
  createMusicPromptUserPrompt,
} from '@/lib/ai/prompts';
import { MODEL_IDS } from '@one-colored-pixel/coloring-core';

/**
 * Generate a bespoke ElevenLabs music prompt for a coloring page scene.
 *
 * Uses Claude Sonnet 4.5 with a system prompt encoding ElevenLabs' own
 * music-prompting best practices (concise, evocative, specific musical
 * language, scene-driven). Returns a single-paragraph string ready for
 * `/v1/music`.
 */
export async function createAmbientPrompt(
  title: string,
  description: string,
  tags: string[],
): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic(MODEL_IDS.CLAUDE_SONNET_4_5),
      system: MUSIC_PROMPT_SYSTEM,
      prompt: createMusicPromptUserPrompt(title, description, tags),
    });

    const cleaned = stripQuotes(text.trim());
    if (cleaned.length > 0) {
      return cleaned;
    }
    // Empty response — fall through to fallback
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      '[AmbientMusicPrompt] Claude prompt generation failed, using fallback',
      error,
    );
  }

  return buildFallbackPrompt(title, description, tags);
}

/**
 * Scene-led fallback used when Claude is unreachable.
 *
 * This is a stripped-down version that still leads with the scene rather
 * than boilerplate, so the music isn't completely generic.
 */
function buildFallbackPrompt(
  title: string,
  description: string,
  tags: string[],
): string {
  const themes = [title, ...tags.slice(0, 3)]
    .filter(Boolean)
    .join(', ')
    .toLowerCase();
  const sceneHint = description?.trim() ? ` Scene: ${description.trim()}.` : '';

  return [
    `Translate this children's coloring page scene into a bespoke instrumental background loop:${sceneHint}`,
    `Use playful felt piano, music box, glockenspiel, ukulele or pizzicato strings to evoke ${themes}.`,
    'Around 70 BPM, warm major key, joyful and curious but never frantic.',
    'Instrumental only, no vocals, no drums, no harsh transitions, seamless calm loop for children.',
  ].join(' ');
}

function stripQuotes(text: string): string {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
}
