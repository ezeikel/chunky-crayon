/**
 * ElevenLabs Client (Coloring Habitat)
 *
 * Currently used for ambient music generation via the Music API.
 * Mirrors `apps/chunky-crayon-web/lib/elevenlabs/index.ts` — keep in sync.
 */

/**
 * Generate ambient background music for a coloring scene.
 *
 * Uses the ElevenLabs Music API (`/v1/music`) with `force_instrumental: true`
 * to produce a 90s instrumental track designed to loop seamlessly under the
 * coloring experience.
 *
 * @param prompt - Scene-aware music description (see createMusicPrompt)
 * @returns MP3 audio buffer
 */
export async function generateBackgroundMusic(prompt: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const res = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
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
