/**
 * One-shot — generate ALL the per-turn voice spike fixtures for the
 * koala VoiceDemoReelV2 studio preview:
 *   - public/spike/koala-q2.mp3      adult Q2 ("[warm] What's the koala doing?")
 *   - public/spike/koala-a1.mp3      kid speaking "a koala"
 *   - public/spike/koala-a2.mp3      kid speaking "building a sandcastle at the beach"
 *
 * Run from worker dir:
 *   set -a && source /tmp/voice-env.tmp && set +a
 *   pnpm tsx src/scripts/generate-spike-q2.ts
 *
 * Delete once V2 reels run with real per-render audio from the worker.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { ElevenLabsClient } from "elevenlabs";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Use the kids prompt — same one the live `/api/voice/follow-up` uses
// in CC. Inlined here so this script doesn't reach into the web app.
const VOICE_FOLLOW_UP_SYSTEM_KIDS = `You are Chunky Crayon, a warm friendly helper for a kids coloring page app (ages 3-8).

A child has just told you what they want to colour. Generate ONE short follow-up question that helps them add details so the coloring page is richer.

Voice: Bluey-mum energy — warm, simple, never reading like an interview. One short sentence, 6-10 words max so kids don't get distracted. End with a question mark.

Add SCENE context only (what they're doing, where they are, what's around them).

NEVER ask about colours, names, ages, locations, schools, family, real people, brands.

Optionally start with one ElevenLabs audio tag in square brackets: [warm], [softly], or [excited]. Never use more than one tag.

Output ONLY the follow-up question text, nothing else.`;

const FIRST_ANSWER = "a koala";
const SECOND_ANSWER = "building a sandcastle at the beach";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SPIKE_DIR = resolve(__dirname, "..", "..", "public", "spike");

const VOICE_SETTINGS = {
  stability: 0.5,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  similarity_boost: 0.75,
  style: 0.3,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  use_speaker_boost: true,
  speed: 0.95,
} as const;

async function tts(
  client: ElevenLabsClient,
  voiceId: string,
  text: string,
  outName: string,
): Promise<void> {
  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    model_id: "eleven_v3",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    output_format: "mp3_44100_128",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    voice_settings: VOICE_SETTINGS,
  });
  const chunks: Buffer[] = [];
  for await (const chunk of audio as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const outPath = `${SPIKE_DIR}/${outName}`;
  await writeFile(outPath, buffer);
  console.log(`[generate-spike-q2] wrote ${outName} (${buffer.length} bytes)`);
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const adultVoiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;
  const kidVoiceId = process.env.ELEVENLABS_KID_VOICE_ID;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");
  if (!adultVoiceId) throw new Error("ELEVENLABS_ADULT_VOICE_ID not set");
  if (!kidVoiceId) throw new Error("ELEVENLABS_KID_VOICE_ID not set");

  console.log("[generate-spike-q2] generating short Q2 via Claude…");
  const { text: q2Text } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    system: VOICE_FOLLOW_UP_SYSTEM_KIDS,
    prompt: FIRST_ANSWER,
  });
  console.log("[generate-spike-q2] Q2 text:", q2Text.trim());

  const client = new ElevenLabsClient({ apiKey });

  // Adult Q2 — the warm follow-up question.
  await tts(client, adultVoiceId, q2Text.trim(), "koala-q2.mp3");

  // Kid speaking A1 (just the first answer, with an excited tag so it
  // sounds natural — same shape as the worker's existing reel script).
  await tts(client, kidVoiceId, `[curious] ${FIRST_ANSWER}`, "koala-a1.mp3");

  // Kid speaking A2 (the elaboration).
  await tts(client, kidVoiceId, `[excited] ${SECOND_ANSWER}`, "koala-a2.mp3");
}

main().catch((err) => {
  console.error("[generate-spike-q2] fatal:", err);
  process.exit(1);
});
