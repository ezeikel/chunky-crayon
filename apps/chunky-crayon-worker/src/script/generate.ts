import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

/**
 * Script for the reveal video's two voiceover tracks.
 *
 * kidLine is NOT generated here — it's just the short prompt (what the kid
 * "typed" on camera) wrapped in an audio tag so ElevenLabs reads it with
 * the right emotion. Same words typed = same words heard = natural sync.
 *
 * adultLine IS generated — a warm narrator reaction that plays as the
 * reveal starts. It rhymes with the scene but doesn't repeat the prompt.
 */

const scriptSchema = z.object({
  adultLine: z
    .string()
    .describe(
      "Warm adult narrator line played as the reveal starts. 6–14 words. Bluey-narrator energy — simple, inviting, never markety. Start with an ElevenLabs v3 audio tag in square brackets: one of [warm], [whispers], [softly]. Example: '[warm] And just like that... it comes to life.'",
    ),
});

export type ReelScript = {
  kidLine: string;
  adultLine: string;
};

/**
 * One of the kid-voice emotion tags, picked to match the subject vibe.
 * Prepended to the typed prompt so ElevenLabs delivers it with energy.
 */
const KID_TAGS = ["[excited]", "[curious]", "[giggles]", "[gasps]"] as const;

export async function generateReelScript(opts: {
  /** The short prompt the kid typed — spoken verbatim as the kid VO. */
  prompt: string;
  imageTitle?: string | null;
}): Promise<ReelScript> {
  // Kid voice: just read the typed prompt with a random excited opener.
  const tag = KID_TAGS[Math.floor(Math.random() * KID_TAGS.length)];
  const kidLine = `${tag} ${opts.prompt}`;

  // Adult voice: Claude writes a warm reaction rhyming with the scene.
  const title = opts.imageTitle ?? opts.prompt;
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    schema: scriptSchema,
    system: [
      "You write a single narrator line for a short social video (Reels/TikTok).",
      "The video shows a child typing a coloring-page request, an image appearing, and a Magic Brush revealing the colours.",
      "Voice: warm adult narrator, Bluey-energy — simple, playful, never markety.",
      "No exclamation-mark stacking, no emojis, no hashtags, no brand name, no URLs.",
      "Never say 'click', 'type', 'app', 'magic brush', 'AI'. Describe the feeling, not the UI.",
    ].join("\n"),
    prompt: [
      `The child's wish: "${opts.prompt}".`,
      title && title !== opts.prompt
        ? `The generated image is titled: "${title}".`
        : undefined,
      "Write one adultLine that plays as the colours start to appear.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return { kidLine, adultLine: object.adultLine };
}
