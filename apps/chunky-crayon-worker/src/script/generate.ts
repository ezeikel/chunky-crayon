import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

/**
 * Generate a short two-voice script for a reveal video.
 *
 * Returns:
 *   - kidLine: one short line voiced over the prompt-typing phase
 *   - adultLine: one short narration line voiced over the reveal phase
 *
 * Deliberately simple: we don't chunk the narration into multiple lines yet
 * because the reveal is only ~30s long. One warm line per phase keeps the
 * pacing clean.
 */

const scriptSchema = z.object({
  kidLine: z
    .string()
    .describe(
      "Excited kid-voiced line said while the prompt is being typed on screen. 5–10 words, natural first-person, like a child making a wish. Start with an ElevenLabs v3 audio tag in square brackets that matches the mood — one of [excited], [curious], [gasps], [giggles]. Example: '[excited] Ooh! A friendly dragon!'",
    ),
  adultLine: z
    .string()
    .describe(
      "Warm adult narrator line that plays as the reveal starts. 6–14 words. Simple, inviting, never markety, Bluey-narrator energy. Start with an ElevenLabs v3 audio tag — one of [warm], [whispers], [softly]. Example: '[warm] And just like that... it comes to life.'",
    ),
});

export type ReelScript = z.infer<typeof scriptSchema>;

export async function generateReelScript(opts: {
  prompt: string;
  imageTitle?: string | null;
}): Promise<ReelScript> {
  const title = opts.imageTitle ?? opts.prompt;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    schema: scriptSchema,
    system: [
      "You write micro-scripts for short social videos (Reels/TikTok).",
      "The video shows a child using Chunky Crayon — they type what they want to color, an image is generated, and then a Magic Brush reveals the colors.",
      "Two voices:",
      "  • KID voice — excited, playful, child making a wish.",
      "  • ADULT voice — warm, storytelling, Bluey-narrator energy.",
      "Keep lines SHORT. No exclamation-mark stacking, no emojis, no hashtags, no brand name, no URLs.",
      "Never say “click”, “type”, “magic brush” — describe feelings/experiences, not UI.",
    ].join("\n"),
    prompt: [
      `The child wants to color: "${opts.prompt}".`,
      title && title !== opts.prompt
        ? `The generated image is titled: "${title}".`
        : undefined,
      "Write the kidLine and adultLine.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}
