"use server";

// Stub — Colo voice loading audio is Chunky Crayon only.
// Coloring Habitat does not have a mascot character.

export type LoadingAudioResult = {
  audioUrl: string;
  script: string;
  durationMs: number;
};

/**
 * Generate loading audio for a coloring page request.
 * Stub — not used in Coloring Habitat (Colo mascot is Chunky Crayon only).
 */
export async function generateLoadingAudio(
  _description: string,
  _locale: string = "en",
): Promise<LoadingAudioResult> {
  return {
    audioUrl: "",
    script: "",
    durationMs: 0,
  };
}
