'use server';

import { generateText } from 'ai';
import { models } from '@one-colored-pixel/coloring-core';
import { put } from '@one-colored-pixel/storage';
import { db } from '@one-colored-pixel/db';

export type GenerateColoredReferenceResult =
  | { success: true; url: string }
  | { success: false; error: string };

/**
 * Generate a colored version of a line art coloring page using AI,
 * upload to R2, and save the URL to the database.
 *
 * Used as the primary color source for Auto Color + Magic Brush.
 */
export async function generateColoredReference(
  coloringImageId: string,
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

CRITICAL RULES:
- Keep ALL black outlines/lines EXACTLY as they are — do not remove, lighten, or alter any lines
- Color ONLY within the existing line art — do NOT invent new details, textures, or patterns that aren't drawn in the original
- Do NOT add backgrounds, wallpapers, or decorations to empty/white areas — fill large blank areas with a single simple color
- The LINE ART itself must remain unchanged — same shapes, same lines, same composition
- Within each drawn region, you may use natural color variation to bring the subject to life
- Use bright, saturated, cheerful colors that kids would love
- Ensure adjacent regions have contrasting colors so each shape is visually distinct
- The result should look like the same coloring page, expertly colored with crayons or markers`,
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

    // Extract the generated image
    const generatedImage = files?.find((file) =>
      file.mediaType?.startsWith('image/'),
    );

    if (!generatedImage?.base64) {
      return { success: false, error: 'No image was generated' };
    }

    // Upload to R2
    const imageBuffer = Buffer.from(generatedImage.base64, 'base64');
    const fileName = `colored-references/${coloringImageId}-${Date.now()}.png`;
    const { url } = await put(fileName, imageBuffer, { access: 'public' });

    // Save URL to database
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { coloredReferenceUrl: url },
    });

    console.log(
      `[ColoredReference] Generated + stored in ${elapsedMs}ms for ${coloringImageId}: ${url}`,
    );

    return { success: true, url };
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
