import { writeFile } from "node:fs/promises";
import { ElevenLabsClient } from "elevenlabs";

/**
 * ElevenLabs TTS wrapper. Converts a short line of text into an MP3 using the
 * `eleven_v3` model — the newest and most expressive. Supports audio tags
 * like `[excited]`, `[whispers]`, `[giggles]` when the voice was trained on
 * them.
 *
 * Settings match the PTP production config (stability 0.5, similarity 0.75,
 * style 0.3, speaker boost, speed 0.95). speed 0.95 is the key bit — default
 * 1.0 makes kids' lines sound rushed.
 */

const client = process.env.ELEVENLABS_API_KEY
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;

export async function generateVoiceClip(opts: {
  text: string;
  voiceId: string;
  outputPath: string;
}): Promise<string> {
  if (!client) throw new Error("ELEVENLABS_API_KEY not set");

  const maxRetries = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const audio = await client.textToSpeech.convert(opts.voiceId, {
        text: opts.text,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        model_id: "eleven_v3",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        output_format: "mp3_44100_128",
        // eslint-disable-next-line @typescript-eslint/naming-convention
        voice_settings: {
          stability: 0.5,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          similarity_boost: 0.75,
          style: 0.3,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          use_speaker_boost: true,
          speed: 0.95,
        },
      });

      // The SDK returns a ReadableStream of audio bytes; collect it.
      const chunks: Buffer[] = [];
      for await (const chunk of audio as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length < 500) {
        throw new Error(
          `ElevenLabs returned suspiciously small audio (${buffer.length} bytes)`,
        );
      }
      await writeFile(opts.outputPath, buffer);
      return opts.outputPath;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        console.warn(
          `[elevenlabs] attempt ${attempt}/${maxRetries} failed, retrying:`,
          err instanceof Error ? err.message : err,
        );
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }
  throw new Error(
    `ElevenLabs TTS failed after ${maxRetries} attempts: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}
