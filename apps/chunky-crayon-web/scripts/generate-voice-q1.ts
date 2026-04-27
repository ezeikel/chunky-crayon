/**
 * One-shot — generate the cached Q1 audio for voice mode.
 *
 * Voice mode's Q1 ("Tell us what you want to colour.") is fixed copy.
 * Generating it on every session would burn ElevenLabs character budget
 * for no reason; instead we render it once via this script, upload to R2
 * at a stable path, and embed the public URL in `constants.ts` as
 * `VOICE_Q1_AUDIO_URL`. The client plays it directly — never hits any
 * API at request time.
 *
 * Run from `apps/chunky-crayon-web`:
 *   set -a && source .env.local && set +a && pnpm tsx scripts/generate-voice-q1.ts
 *
 * If we ever change the Q1 copy, voice id, or TTS model, re-run this and
 * update the URL in `constants.ts`. The cache key includes all three so
 * the new audio uploads to a new path and stale audio doesn't get served.
 */
import { synthesizeAndCacheTts } from '@/lib/voice/elevenlabs-tts';

// Fixed Q1 — must stay in sync with the client copy. The [warm] tag tells
// ElevenLabs eleven_v3 to use a softer warm delivery vs the default.
const Q1_TEXT = '[warm] Tell us what you want to colour.';

async function main() {
  const voiceId = process.env.ELEVENLABS_ADULT_VOICE_ID;
  if (!voiceId) {
    throw new Error('ELEVENLABS_ADULT_VOICE_ID not set');
  }

  console.log('[generate-voice-q1] generating Q1 audio…');
  console.log(`[generate-voice-q1] text: ${Q1_TEXT}`);

  const result = await synthesizeAndCacheTts({
    text: Q1_TEXT,
    voiceId,
  });

  console.log(
    `\n[generate-voice-q1] ${result.cached ? 'cached (already existed)' : 'generated + uploaded'}`,
  );
  console.log(`[generate-voice-q1] URL: ${result.url}`);
  console.log('\nAdd this to apps/chunky-crayon-web/constants.ts:\n');
  console.log(`export const VOICE_Q1_AUDIO_URL = '${result.url}';\n`);
}

main().catch((err) => {
  console.error('[generate-voice-q1] fatal:', err);
  process.exit(1);
});
