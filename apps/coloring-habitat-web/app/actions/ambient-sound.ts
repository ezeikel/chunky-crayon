"use server";

// Stub — ambient sound generation to be adapted for Habitat

export type GenerateAmbientSoundResult =
  | {
      success: true;
      ambientSoundUrl: string;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Generate ambient sound for a coloring image
 * Stub implementation — to be wired up when ambient sound is needed
 */
export async function generateAmbientSoundForImage(
  _coloringImageId: string,
): Promise<GenerateAmbientSoundResult> {
  return {
    success: false,
    error: "Ambient sound generation not yet configured for Habitat",
  };
}

/**
 * Batch generate ambient sounds for multiple coloring images
 * Stub implementation
 */
export async function generateAmbientSoundsForExistingImages(
  _limit: number = 10,
): Promise<{ processed: number; failed: number }> {
  return { processed: 0, failed: 0 };
}
