/**
 * Voice demo reel fixture generator.
 *
 * Builds the per-render audio fixtures for `VoiceDemoReelV2`:
 *   - Q1: cached on R2 — same URL the live web client uses
 *   - Q2: dynamically generated per reel (Claude follow-up + ElevenLabs adult)
 *   - A1: kid voice speaking the seeded firstAnswer
 *   - A2: kid voice speaking the seeded secondAnswer
 *
 * Plus generates synthetic answers from the image's title/description via
 * Claude — "what would a kid have said in voice mode that resulted in this
 * scene?". So the demo reel feels real even though the image was generated
 * via the daily/text/image cron, not the live voice flow.
 *
 * All audio uploads to R2 under `voice-reel/<imageId>/` so each reel run
 * can find its own fixtures without stomping on previous renders.
 */
import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { put } from "@one-colored-pixel/storage";
import { generateVoiceClip } from "./elevenlabs.js";
import { unlink } from "node:fs/promises";

// Same Q1 audio URL the web client embeds in `constants.ts`. Cached on
// prod R2 so we never pay for re-synthesis. If Q1 copy or the cached
// audio path changes, update this.
const Q1_AUDIO_URL =
  "https://assets.chunkycrayon.com/voice-tts/fb5e5f11aab81d0a2a93632ec3e737869706515e0edd1e7494a70a4fe175cdba.mp3";

// Same kids follow-up system prompt as the live `/api/voice/follow-up`.
// Inlined here so the worker doesn't reach into the web app's prompts.
const VOICE_FOLLOW_UP_SYSTEM_KIDS = `You are Chunky Crayon, a warm friendly helper for a kids coloring page app (ages 3-8).

A child has just told you what they want to colour. Generate ONE short follow-up question that helps them add details so the coloring page is richer.

Voice: Bluey-mum energy — warm, simple, never reading like an interview. One short sentence, 6-10 words max so kids don't get distracted. End with a question mark.

Add SCENE context only (what they're doing, where they are, what's around them).

NEVER ask about colours, names, ages, locations, schools, family, real people, brands.

Optionally start with one ElevenLabs audio tag in square brackets: [warm], [softly], or [excited]. Never use more than one tag.

Output ONLY the follow-up question text, nothing else.`;

// Used to synthesise plausible kid utterances from the image title/desc.
// We're not getting Claude to invent a story — we're back-deriving the
// voice prompts a kid likely said to make the daily/text/image picture.
const SYNTHESISE_ANSWERS_SYSTEM = `You are imagining a 5 year old child using a coloring page app's voice mode. The child speaks twice:

  Turn 1: A short, child-like description of what they want to colour. 1-4 words, simple, like "a koala", "a princess", "space".
  Turn 2: An elaboration after a friendly follow-up. 4-10 words, scene-context. e.g. "building a sandcastle at the beach".

Your output must be plausible kid speech — simple words, present tense, no adult phrasing.`;

const synthesiseAnswersSchema = z.object({
  firstAnswer: z
    .string()
    .min(2)
    .max(40)
    .describe("Turn 1 — short kid-like 1-4 word description"),
  secondAnswer: z
    .string()
    .min(4)
    .max(80)
    .describe("Turn 2 — 4-10 word scene elaboration"),
});

export type SynthesisedAnswers = {
  firstAnswer: string;
  secondAnswer: string;
};

/**
 * Back-derive plausible kid voice answers from an image's title +
 * description. Used when the image was generated via the daily/text/image
 * cron and we want to render a voice reel "as if" a kid had spoken it.
 */
export async function synthesiseVoiceAnswers(opts: {
  title: string;
  description: string;
}): Promise<SynthesisedAnswers> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    schema: synthesiseAnswersSchema,
    system: SYNTHESISE_ANSWERS_SYSTEM,
    prompt: `Image title: "${opts.title}"\nImage description: "${opts.description}"\n\nWrite the two voice-mode utterances a child would have said to make this image.`,
  });
  return {
    firstAnswer: object.firstAnswer,
    secondAnswer: object.secondAnswer,
  };
}

/**
 * Generate the warm Q2 follow-up via Claude using the same kids prompt
 * the live `/api/voice/follow-up` endpoint uses. Returns the text only —
 * caller TTSs it.
 */
export async function generateVoiceFollowUp(
  firstAnswer: string,
): Promise<string> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    system: VOICE_FOLLOW_UP_SYSTEM_KIDS,
    prompt: firstAnswer,
  });
  return text.trim();
}

export type VoiceReelFixturesResult = {
  q1AudioUrl: string;
  q2AudioUrl: string;
  a1AudioUrl: string;
  a2AudioUrl: string;
  /** Q2 text — useful for logging + DB analytics. */
  q2Text: string;
};

/**
 * Build all per-render audio fixtures for a voice demo reel. Generates
 * Q2 + A1 + A2 via ElevenLabs, uploads each to R2, returns public URLs.
 *
 * Q1 is the cached fixed-prompt audio — same URL the web client uses.
 * Three TTS calls per reel + one Claude call. ~3-5 seconds total.
 */
export async function buildVoiceReelFixtures(opts: {
  imageId: string;
  firstAnswer: string;
  secondAnswer: string;
  outDir: string;
}): Promise<VoiceReelFixturesResult> {
  const { imageId, firstAnswer, secondAnswer, outDir } = opts;

  const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;
  const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
  if (!adultVoiceId)
    throw new Error("ELEVENLABS_ADULT_VOICE_ID not set on worker");
  if (!kidVoiceId) throw new Error("ELEVENLABS_KID_VOICE_ID not set on worker");

  console.log(
    `[voice-fixtures] building for image ${imageId} — A1="${firstAnswer}", A2="${secondAnswer}"`,
  );

  // Q2 — Claude generates the warm follow-up text, ElevenLabs TTSs it.
  const q2Text = await generateVoiceFollowUp(firstAnswer);
  console.log(`[voice-fixtures] Q2 text: ${q2Text}`);

  // Generate all three clips in parallel — each is independent.
  const [q2Path, a1Path, a2Path] = await Promise.all([
    generateVoiceClip({
      text: q2Text,
      voiceId: adultVoiceId,
      outputPath: `${outDir}/${imageId}-q2.mp3`,
    }),
    generateVoiceClip({
      text: `[curious] ${firstAnswer}`,
      voiceId: kidVoiceId,
      outputPath: `${outDir}/${imageId}-a1.mp3`,
    }),
    generateVoiceClip({
      text: `[excited] ${secondAnswer}`,
      voiceId: kidVoiceId,
      outputPath: `${outDir}/${imageId}-a2.mp3`,
    }),
  ]);

  // Upload to R2 under voice-reel/<imageId>/ — keyed by imageId so each
  // run owns its own fixtures and we never stomp.
  const [q2Buffer, a1Buffer, a2Buffer] = await Promise.all([
    readBuffer(q2Path),
    readBuffer(a1Path),
    readBuffer(a2Path),
  ]);

  const stamp = Date.now();
  const [q2Upload, a1Upload, a2Upload] = await Promise.all([
    put(`voice-reel/${imageId}/${stamp}-q2.mp3`, q2Buffer, {
      contentType: "audio/mpeg",
      access: "public",
    }),
    put(`voice-reel/${imageId}/${stamp}-a1.mp3`, a1Buffer, {
      contentType: "audio/mpeg",
      access: "public",
    }),
    put(`voice-reel/${imageId}/${stamp}-a2.mp3`, a2Buffer, {
      contentType: "audio/mpeg",
      access: "public",
    }),
  ]);

  // Clean up local /tmp files — uploaded copies are the source of truth.
  await Promise.allSettled([unlink(q2Path), unlink(a1Path), unlink(a2Path)]);

  return {
    q1AudioUrl: Q1_AUDIO_URL,
    q2AudioUrl: q2Upload.url,
    a1AudioUrl: a1Upload.url,
    a2AudioUrl: a2Upload.url,
    q2Text,
  };
}

async function readBuffer(filePath: string): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  return readFile(filePath);
}
