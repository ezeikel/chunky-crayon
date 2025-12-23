'use server';

import {
  generateObject,
  generateText,
  getTracedModels,
  models,
  AUDIO_TRANSCRIPTION_SYSTEM,
  AUDIO_TRANSCRIPTION_PROMPT,
  IMAGE_DESCRIPTION_SYSTEM,
  IMAGE_DESCRIPTION_PROMPT,
  imageDescriptionSchema,
} from '@/lib/ai';
import { ACTIONS } from '@/constants';
import { getUserId } from '@/app/actions/user';

// =============================================================================
// Audio Transcription (for voice input)
// =============================================================================

export type TranscribeAudioResult =
  | { success: true; text: string }
  | { success: false; error: string };

/**
 * Transcribe audio recording to text using Gemini 3 Flash.
 * This is a free preprocessing step - no credits are deducted.
 * Credits are only charged when the coloring page is generated.
 *
 * @param formData - FormData containing 'audio' file (WebM/Opus format)
 * @returns Transcribed text or error
 */
export async function transcribeAudio(
  formData: FormData,
): Promise<TranscribeAudioResult> {
  try {
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return { success: false, error: 'No audio file provided' };
    }

    // Validate file type
    const validTypes = [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ];
    if (
      !validTypes.some((type) => audioFile.type.startsWith(type.split('/')[0]))
    ) {
      return { success: false, error: 'Invalid audio format' };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return { success: false, error: 'Audio file too large (max 10MB)' };
    }

    const userId = await getUserId(ACTIONS.TRANSCRIBE_AUDIO);

    // Get traced models for PostHog observability
    const tracedModels = getTracedModels({
      userId: userId || undefined,
      properties: { action: 'audio-transcription', inputType: 'voice' },
    });

    // Convert File to ArrayBuffer for Gemini
    const audioBuffer = await audioFile.arrayBuffer();

    // Check if audio file is too small (likely empty/silent)
    const minAudioSize = 1000; // 1KB minimum
    if (audioFile.size < minAudioSize) {
      console.log(
        '[Transcription] Audio file too small, likely empty:',
        audioFile.size,
        'bytes',
      );
      return {
        success: false,
        error: "I didn't hear anything. Please try speaking louder!",
      };
    }

    console.log('[Transcription] Processing audio:', {
      size: audioFile.size,
      type: audioFile.type,
      name: audioFile.name,
    });

    const { text } = await generateText({
      model: tracedModels.analytics, // Gemini 3 Flash
      system: AUDIO_TRANSCRIPTION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: AUDIO_TRANSCRIPTION_PROMPT,
            },
            {
              type: 'file',
              data: Buffer.from(audioBuffer),
              mediaType: audioFile.type,
            },
          ],
        },
      ],
    });

    console.log('[Transcription] Result:', text);

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: "Couldn't hear you clearly. Please try again!",
      };
    }

    return { success: true, text: text.trim() };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return {
      success: false,
      error: 'Something went wrong. Please try again!',
    };
  }
}

// =============================================================================
// Image Description (for image/photo input)
// =============================================================================

export type DescribeImageResult =
  | {
      success: true;
      description: string;
      subjects: string[];
      isChildDrawing: boolean;
    }
  | { success: false; error: string };

/**
 * Describe an image for coloring page generation using Gemini 3 Flash.
 * This is a free preprocessing step - no credits are deducted.
 * Credits are only charged when the coloring page is generated.
 *
 * @param formData - FormData containing 'image' file (JPEG, PNG, WebP, GIF)
 * @returns Image description with subjects and metadata, or error
 */
export async function describeImage(
  formData: FormData,
): Promise<DescribeImageResult> {
  try {
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return { success: false, error: 'No image provided' };
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(imageFile.type)) {
      return { success: false, error: 'Invalid image format' };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return { success: false, error: 'Image too large (max 10MB)' };
    }

    const userId = await getUserId(ACTIONS.DESCRIBE_IMAGE);

    // Get traced models for PostHog observability
    const tracedModels = getTracedModels({
      userId: userId || undefined,
      properties: { action: 'image-description', inputType: 'image' },
    });

    // Convert File to ArrayBuffer for Gemini
    const imageBuffer = await imageFile.arrayBuffer();

    const { object } = await generateObject({
      model: tracedModels.analytics, // Gemini 3 Flash
      schema: imageDescriptionSchema,
      system: IMAGE_DESCRIPTION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: IMAGE_DESCRIPTION_PROMPT,
            },
            {
              type: 'image',
              image: Buffer.from(imageBuffer),
            },
          ],
        },
      ],
    });

    if (!object.description || object.description.trim().length === 0) {
      return {
        success: false,
        error: "Couldn't understand the image. Please try another one!",
      };
    }

    return {
      success: true,
      description: object.description.trim(),
      subjects: object.subjects || [],
      isChildDrawing: object.isChildDrawing || false,
    };
  } catch (error) {
    console.error('Error describing image:', error);
    return {
      success: false,
      error: 'Something went wrong. Please try again!',
    };
  }
}
