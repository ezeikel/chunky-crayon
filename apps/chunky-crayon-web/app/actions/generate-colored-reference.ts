'use server';

import { generateText } from 'ai';
import { models } from '@one-colored-pixel/coloring-core';

export type GenerateColoredReferenceResult =
  | { success: true; imageBase64: string }
  | { success: false; error: string };

/**
 * Generate a colored version of a line art coloring page using AI.
 * The AI colors the image holistically, producing a coherent reference
 * that can be used to sample colors for auto-fill.
 */
export async function generateColoredReference(
  imageUrl: string,
  sceneContext?: { title?: string; description?: string },
): Promise<GenerateColoredReferenceResult> {
  try {
    const startTime = Date.now();

    const sceneHint = sceneContext?.title
      ? `This is: "${sceneContext.title}". ${sceneContext.description || ''}`
      : '';

    const { files } = await generateText({
      model: models.geminiImage,
      providerOptions: {
        google: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Color this children's coloring page with bright, cheerful, kid-friendly colors. ${sceneHint}

RULES:
- Keep ALL the black outlines/lines exactly as they are — do NOT remove, lighten, or alter any lines
- Fill EVERY white region with an appropriate color
- Use bright, saturated, cheerful colors that kids would love
- Ensure adjacent regions have contrasting colors so each shape is visually distinct
- The result should look like a beautifully colored children's illustration
- Maintain the exact same composition and line work — only add color to the white areas
- Do NOT add any new elements, text, or modify the drawing in any way`,
            },
            {
              type: 'image',
              image: new URL(imageUrl),
            },
          ],
        },
      ],
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[ColoredReference] Generated in ${elapsedMs}ms`);

    // Extract the generated image (Gemini returns files with mediaType + base64)
    const generatedImage = files?.find((file) =>
      file.mediaType?.startsWith('image/'),
    );

    if (generatedImage?.base64) {
      const mimeType = generatedImage.mediaType || 'image/png';
      const imageBase64 = `data:${mimeType};base64,${generatedImage.base64}`;
      return { success: true, imageBase64 };
    }

    return {
      success: false,
      error: 'No image was generated. Please try again.',
    };
  } catch (error) {
    console.error('[ColoredReference] Error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate colored reference',
    };
  }
}
