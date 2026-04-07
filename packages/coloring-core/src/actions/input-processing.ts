import { generateText, Output } from "ai";
import { getTracedModels } from "../models";
import { imageDescriptionSchema } from "../schemas";

// =============================================================================
// Types
// =============================================================================

export type TranscribeAudioResult =
  | { success: true; text: string }
  | { success: false; error: string };

export type DescribeImageResult =
  | {
      success: true;
      description: string;
      subjects: string[];
      isChildDrawing: boolean;
    }
  | { success: false; error: string };

export type InputProcessingConfig = {
  /** System prompt for audio transcription */
  audioTranscriptionSystem: string;
  /** User prompt for audio transcription */
  audioTranscriptionPrompt: string;
  /** System prompt for image description */
  imageDescriptionSystem: string;
  /** User prompt for image description */
  imageDescriptionPrompt: string;
};

// =============================================================================
// Audio Transcription
// =============================================================================

/**
 * Transcribe audio recording to text using Gemini 3 Flash.
 * Free preprocessing step — no credits deducted.
 */
export async function transcribeAudioLogic(
  formData: FormData,
  config: InputProcessingConfig,
  userId?: string | null,
): Promise<TranscribeAudioResult> {
  try {
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return { success: false, error: "No audio file provided" };
    }

    const validTypes = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
    ];
    if (
      !validTypes.some((type) => audioFile.type.startsWith(type.split("/")[0]))
    ) {
      return { success: false, error: "Invalid audio format" };
    }

    const maxSize = 10 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return { success: false, error: "Audio file too large (max 10MB)" };
    }

    const tracedModels = getTracedModels({
      userId: userId || undefined,
      properties: { action: "audio-transcription", inputType: "voice" },
    });

    const audioBuffer = await audioFile.arrayBuffer();

    const minAudioSize = 1000;
    if (audioFile.size < minAudioSize) {
      console.log(
        "[Transcription] Audio file too small, likely empty:",
        audioFile.size,
        "bytes",
      );
      return {
        success: false,
        error: "I didn't hear anything. Please try speaking louder!",
      };
    }

    console.log("[Transcription] Processing audio:", {
      size: audioFile.size,
      type: audioFile.type,
      name: audioFile.name,
    });

    const { text } = await generateText({
      model: tracedModels.analytics,
      system: config.audioTranscriptionSystem,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: config.audioTranscriptionPrompt },
            {
              type: "file",
              data: Buffer.from(audioBuffer),
              mediaType: audioFile.type,
            },
          ],
        },
      ],
    });

    console.log("[Transcription] Result:", text);

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: "Couldn't hear you clearly. Please try again!",
      };
    }

    return { success: true, text: text.trim() };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again!",
    };
  }
}

// =============================================================================
// Image Description
// =============================================================================

/**
 * Describe an image for coloring page generation using Gemini 3 Flash.
 * Free preprocessing step — no credits deducted.
 */
export async function describeImageLogic(
  formData: FormData,
  config: InputProcessingConfig,
  userId?: string | null,
): Promise<DescribeImageResult> {
  try {
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return { success: false, error: "No image provided" };
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(imageFile.type)) {
      return { success: false, error: "Invalid image format" };
    }

    const maxSize = 10 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return { success: false, error: "Image too large (max 10MB)" };
    }

    const tracedModels = getTracedModels({
      userId: userId || undefined,
      properties: { action: "image-description", inputType: "image" },
    });

    const imageBuffer = await imageFile.arrayBuffer();

    const { output } = await generateText({
      model: tracedModels.analytics,
      output: Output.object({ schema: imageDescriptionSchema }),
      system: config.imageDescriptionSystem,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: config.imageDescriptionPrompt },
            { type: "image", image: Buffer.from(imageBuffer) },
          ],
        },
      ],
    });

    if (!output?.description || output.description.trim().length === 0) {
      return {
        success: false,
        error: "Couldn't understand the image. Please try another one!",
      };
    }

    return {
      success: true,
      description: output.description.trim(),
      subjects: output.subjects || [],
      isChildDrawing: output.isChildDrawing || false,
    };
  } catch (error) {
    console.error("Error describing image:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again!",
    };
  }
}
