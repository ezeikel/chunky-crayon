/**
 * One-shot — generate the cached Q1 audio for voice mode (Coloring Habitat).
 *
 * CH adult tone: calm-companion delivery via `[softly]` tag, slightly more
 * formal phrasing than CC. Otherwise structurally identical to CC's
 * generate-voice-q1 script.
 *
 * Run from `apps/coloring-habitat-web`:
 *   set -a && source .env.local && set +a && pnpm tsx scripts/generate-voice-q1.ts
 *
 * For production: run with prod env to upload to prod R2 / CH-branded URL.
 *
 * If we change Q1 copy, voice id, or TTS model: re-run + update
 * `VOICE_Q1_AUDIO_URL` in `constants.ts`. Cache key includes all three.
 */
import { synthesizeAndCacheTts } from "@/lib/voice/elevenlabs-tts";

// Fixed Q1 — must stay in sync with the client copy. The [softly] tag
// signals calm-companion delivery for the adult brand.
const Q1_TEXT = "[softly] Tell us what you'd like to colour.";

async function main() {
  const voiceId =
    process.env.ELEVENLABS_CH_NARRATOR_VOICE_ID ??
    process.env.ELEVENLABS_ADULT_VOICE_ID;
  if (!voiceId) {
    throw new Error(
      "no narrator voice id set (tried ELEVENLABS_CH_NARRATOR_VOICE_ID + ELEVENLABS_ADULT_VOICE_ID)",
    );
  }

  console.log("[generate-voice-q1] generating Q1 audio…");
  console.log(`[generate-voice-q1] text: ${Q1_TEXT}`);

  const result = await synthesizeAndCacheTts({
    text: Q1_TEXT,
    voiceId,
  });

  console.log(
    `\n[generate-voice-q1] ${result.cached ? "cached (already existed)" : "generated + uploaded"}`,
  );
  console.log(`[generate-voice-q1] URL: ${result.url}`);
  console.log("\nAdd this to apps/coloring-habitat-web/constants.ts:\n");
  console.log(`export const VOICE_Q1_AUDIO_URL = '${result.url}';\n`);
}

main().catch((err) => {
  console.error("[generate-voice-q1] fatal:", err);
  process.exit(1);
});
