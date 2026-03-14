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
 * Generate ambient sound effect
 *
 * @param description - Description of the sound effect to generate
 * @returns Audio buffer
 */
export async function generateAmbientSound(
  description: string,
): Promise<Buffer> {
  const elevenlabs = getClient();

  // Use ElevenLabs sound effects API
  const audioStream = await elevenlabs.textToSoundEffects.convert({
    text: description,
    duration_seconds: 10, // Ambient loop length
    prompt_influence: 0.3, // Let it be creative
  });

  // Collect stream chunks into buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export { COLO_VOICE_ID };
