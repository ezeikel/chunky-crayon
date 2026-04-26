/**
 * Prompt templates for audio generation (Coloring Habitat — SERVER-ONLY)
 *
 * `createMusicPrompt` asks Claude to write a scene-tailored ElevenLabs
 * Music API prompt for the coloring page. If Claude fails, falls back to a
 * simple scene-led template so generation never crashes.
 *
 * NOTES:
 * - This file is server-only (it calls Claude via the Anthropic provider).
 *   Never import it from client components. It can't be marked with
 *   `import 'server-only'` because the backfill scripts need to import it
 *   via tsx, which doesn't honor the Next.js `server-only` replacement.
 * - Imports the Anthropic provider directly rather than going through
 *   `@/lib/ai/models`, because the PostHog tracing wrapper in models.ts
 *   tries to subclass `Anthropic.Messages` at module-load time, which breaks
 *   in non-Next.js contexts (e.g. tsx scripts).
 * - The Claude model ID is hardcoded (not imported from `coloring-core`)
 *   because `coloring-core`'s barrel transitively pulls `sharp` and
 *   `detect-libc` — Node-only modules that blow up Turbopack client builds.
 *   Keep this string in sync with `MODEL_IDS.CLAUDE_SONNET_4_5` in
 *   `packages/coloring-core/src/models.ts`.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  MUSIC_PROMPT_SYSTEM,
  createMusicPromptUserPrompt,
} from "@/lib/ai/prompts";

const CLAUDE_SONNET_4_5 = "claude-sonnet-4-5-20250929";

/**
 * Generate a bespoke ElevenLabs music prompt for a coloring page scene.
 *
 * Uses Claude Sonnet 4.5 with an adult/wellness system prompt encoding
 * ElevenLabs' own music-prompting best practices. Returns a single-paragraph
 * string ready for `/v1/music`.
 */
export async function createMusicPrompt(
  title: string,
  description: string,
  tags: string[],
): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic(CLAUDE_SONNET_4_5),
      system: MUSIC_PROMPT_SYSTEM,
      prompt: createMusicPromptUserPrompt(title, description, tags),
    });

    const cleaned = stripQuotes(text.trim());
    if (cleaned.length > 0) {
      return cleaned;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "[AmbientMusicPrompt] Claude prompt generation failed, using fallback",
      error,
    );
  }

  return buildFallbackPrompt(title, description, tags);
}

/**
 * Scene-led fallback used when Claude is unreachable.
 *
 * Stripped-down version that still leads with the scene rather than
 * boilerplate, so the music isn't completely generic.
 */
function buildFallbackPrompt(
  title: string,
  description: string,
  tags: string[],
): string {
  const themes = [title, ...tags.slice(0, 3)]
    .filter(Boolean)
    .join(", ")
    .toLowerCase();
  const sceneHint = description?.trim() ? ` Scene: ${description.trim()}.` : "";

  return [
    `Translate this adult coloring page scene into a bespoke instrumental ambient loop:${sceneHint}`,
    `Use warm felt piano, analog synth pads, bowed cello and singing bowls to evoke ${themes}.`,
    "Around 60 BPM, suspended major chords, spacious and breathing.",
    "Instrumental only, no vocals, no drums, no melodic hooks, seamless meditative loop.",
  ].join(" ");
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
