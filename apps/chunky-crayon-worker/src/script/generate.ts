import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

/**
 * Voiceover script for V2 demo reels.
 *
 * Two slots:
 *   - earlyLine — plays during the create/upload phase before the reveal.
 *     For text mode this is the KID voice reading what they "typed".
 *     For image mode this is the ADULT narrator reacting to what's in the
 *     uploaded photo (the kid uploaded; they didn't describe — so an adult
 *     reaction reads more naturally).
 *   - adultLine — adult narrator reaction as the colours start to appear.
 *     Same in both modes.
 *
 * The worker keeps using `kidVoiceUrl` as the prop name on the comp side
 * regardless of which voice generated `earlyLine`, because the comp's
 * audio Sequence slot is identical — only the speaker changes.
 */

export type ReelMode = "text" | "image";

export type ReelScript = {
  /**
   * The line that plays in the early (typing/upload) phase. Includes any
   * ElevenLabs v3 audio tag at the start so the TTS delivery matches.
   */
  earlyLine: string;
  /**
   * Which voice should speak earlyLine — picked by mode. The worker reads
   * this to choose ELEVENLABS_KID_VOICE_ID vs ELEVENLABS_ADULT_VOICE_ID.
   */
  earlyVoice: "kid" | "adult";
  /** Warm adult narrator line played as the reveal starts. */
  adultLine: string;
};

/**
 * Kid-voice emotion tags — prepended to the typed prompt for ElevenLabs
 * v3 so the kid VO has appropriate energy.
 */
const KID_TAGS = ["[excited]", "[curious]", "[giggles]", "[gasps]"] as const;

const adultLineSchema = z.object({
  adultLine: z
    .string()
    .describe(
      "Warm adult narrator line played as the reveal starts. 6–14 words. Bluey-narrator energy — simple, inviting, never markety. Start with an ElevenLabs v3 audio tag in square brackets: one of [warm], [whispers], [softly]. Example: '[warm] And just like that... it comes to life.'",
    ),
});

const imageReactionSchema = z.object({
  reactionLine: z
    .string()
    .describe(
      "A short warm adult-narrator reaction to a photo a child just uploaded, that hands off into the coloring-page reveal. 8–14 words. Bluey-narrator energy — simple, parent-y, conversational. Acknowledge the subject of the photo (without re-listing every detail), then a gentle setup for what's about to happen. Start with an ElevenLabs v3 audio tag in square brackets: one of [warm], [softly], [smiling], [curious]. Example: '[warm] Ooh, a meadow of wildflowers — let's turn it into a coloring page.' or '[smiling] A puppy in the garden — perfect for colouring.'",
    ),
});

/**
 * Generate the per-render script. `mode` controls who speaks the early
 * line.
 */
export async function generateReelScript(opts: {
  /** The short prompt the kid typed (text mode) OR a description of what
   * the photo shows (image mode). Same shape from `shortenPromptForReel`. */
  prompt: string;
  imageTitle?: string | null;
  mode: ReelMode;
}): Promise<ReelScript> {
  const title = opts.imageTitle ?? opts.prompt;

  if (opts.mode === "text") {
    // Text: kid reads what they typed; adult does the reveal reaction.
    const tag = KID_TAGS[Math.floor(Math.random() * KID_TAGS.length)];
    const earlyLine = `${tag} ${opts.prompt}`;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: adultLineSchema,
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

    return { earlyLine, earlyVoice: "kid", adultLine: object.adultLine };
  }

  // Image mode: adult reacts to the uploaded photo, then narrates the reveal.
  // Two Claude calls in parallel — both adult-voiced lines.
  const [reaction, adult] = await Promise.all([
    generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: imageReactionSchema,
      system: [
        "You write a single narrator line for a short social video.",
        "Context: a child has just uploaded a photo. The video shows the photo, then it transforms into a black-and-white coloring page.",
        "Voice: warm adult narrator, Bluey/parent energy — simple, conversational, never markety.",
        "Tone: a gentle ooh-and-aah moment that sets up the reveal. Talk TO the child, not at them.",
        "No exclamation-mark stacking, no emojis, no hashtags, no brand name, no URLs.",
        "Never say 'click', 'upload', 'app', 'magic brush', 'AI'. Describe the feeling, not the UI.",
      ].join("\n"),
      prompt: [
        `What the photo shows (kid-style summary): "${opts.prompt}".`,
        title && title !== opts.prompt
          ? `The image's title is: "${title}".`
          : undefined,
        "Write one reactionLine the narrator says when the photo first appears.",
      ]
        .filter(Boolean)
        .join("\n"),
    }),
    generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: adultLineSchema,
      system: [
        "You write a single narrator line for a short social video (Reels/TikTok).",
        "The video shows a child uploading a photo, the photo turning into a black-and-white coloring page, and a Magic Brush revealing the colours.",
        "Voice: warm adult narrator, Bluey-energy — simple, playful, never markety.",
        "No exclamation-mark stacking, no emojis, no hashtags, no brand name, no URLs.",
        "Never say 'click', 'upload', 'app', 'magic brush', 'AI'. Describe the feeling, not the UI.",
      ].join("\n"),
      prompt: [
        `What the photo shows: "${opts.prompt}".`,
        title && title !== opts.prompt
          ? `The generated image is titled: "${title}".`
          : undefined,
        "Write one adultLine that plays as the colours start to appear.",
      ]
        .filter(Boolean)
        .join("\n"),
    }),
  ]);

  return {
    earlyLine: reaction.object.reactionLine,
    earlyVoice: "adult",
    adultLine: adult.object.adultLine,
  };
}
