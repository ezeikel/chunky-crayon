/**
 * ElevenLabs Client
 *
 * Text-to-speech integration for Colo mascot voice during loading.
 * Generates personalized audio messages about what's being drawn.
 */

import { ElevenLabsClient } from 'elevenlabs';

// ElevenLabs client singleton
let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }
    client = new ElevenLabsClient({ apiKey });
  }
  return client;
}

// Colo's voice ID
const COLO_VOICE_ID =
  process.env.ELEVENLABS_COLO_VOICE_ID || 'XJ2fW4ybq7HouelYYGcL';

// Voice settings for Colo (friendly, enthusiastic kid character)
const COLO_VOICE_SETTINGS = {
  stability: 0.5, // Medium stability for natural variation
  similarity_boost: 0.75, // Keep it recognizable as Colo
  style: 0.4, // Some expressiveness
  use_speaker_boost: true,
};

export type GenerateVoiceResult = {
  audioBuffer: Buffer;
  durationMs: number;
};

/**
 * Generate Colo's voice audio from text
 *
 * @param text - The script for Colo to speak
 * @returns Audio buffer and duration
 */
export async function generateColoVoice(
  text: string,
): Promise<GenerateVoiceResult> {
  const startTime = Date.now();
  const elevenlabs = getClient();

  // Generate audio using ElevenLabs text-to-speech
  const audioStream = await elevenlabs.textToSpeech.convert(COLO_VOICE_ID, {
    text,
    model_id: 'eleven_turbo_v2_5', // Fast, low-latency model
    voice_settings: COLO_VOICE_SETTINGS,
  });

  // Collect stream chunks into buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  const audioBuffer = Buffer.concat(chunks);
  const durationMs = Date.now() - startTime;

  // eslint-disable-next-line no-console
  console.log(
    `[ElevenLabs] Generated Colo voice in ${durationMs}ms (${audioBuffer.length} bytes)`,
  );

  return {
    audioBuffer,
    durationMs,
  };
}

/**
 * Generate ambient background music for a coloring scene.
 *
 * Uses the ElevenLabs Music API (`/v1/music`) with `force_instrumental: true`
 * to produce a looping 90s track. Called via raw fetch because the music
 * endpoint is not yet exposed by the installed `elevenlabs` SDK (v1.59).
 *
 * @param prompt - Scene-aware music description (see createAmbientPrompt)
 * @returns MP3 audio buffer (90 seconds, designed to loop seamlessly)
 */
export async function generateAmbientSound(prompt: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const res = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: 90_000,
      force_instrumental: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `ElevenLabs music generation failed (${res.status}): ${err}`,
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Generate a short sound effect via ElevenLabs /v1/sound-generation.
 *
 * Used today for ad-video transition whooshes. TODO: swap to curated
 * Epidemic Sound clips (matching the PTP pattern at
 * parking-ticket-pal/apps/web/lib/music.ts) once we have a subscription
 * — licensed library SFX are more consistent than AI-generated ones.
 *
 * @param prompt - Short descriptive phrase, e.g. "soft paper page turn whoosh"
 * @param durationSeconds - 0.5-22 seconds (ElevenLabs limits)
 * @returns MP3 audio buffer
 */
export async function generateSoundEffect(
  prompt: string,
  durationSeconds = 1,
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: durationSeconds,
      prompt_influence: 0.4,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(
      `ElevenLabs sound generation failed (${res.status}): ${err}`,
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

export { COLO_VOICE_ID };
