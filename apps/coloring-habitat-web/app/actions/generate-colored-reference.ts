"use server";

import { generateText } from "ai";
import { models } from "@one-colored-pixel/coloring-core";
import { put } from "@one-colored-pixel/storage";
import { db } from "@one-colored-pixel/db";

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
      ? `This is: "${sceneContext.title}". ${sceneContext.description || ""}`
      : "";

    const { files } = await generateText({
      model: models.geminiImage,
      providerOptions: {
        google: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Color this line art coloring page with beautiful, realistic, coherent colors. ${sceneHint}

RULES:
- Keep ALL the black outlines/lines exactly as they are — do NOT remove, lighten, or alter any lines
- Fill EVERY white region with an appropriate color
- Use realistic, natural colors (blue sky, green grass, natural skin tones, etc.)
- Ensure adjacent regions have contrasting colors so each shape is visually distinct
- The result should look like a professionally colored illustration
- Maintain the exact same composition and line work — only add color to the white areas
- Do NOT add any new elements, text, or modify the drawing in any way`,
            },
            {
              type: "image",
              image: new URL(imageUrl),
            },
          ],
        },
      ],
    });

    const elapsedMs = Date.now() - startTime;

    // Extract the generated image
    const generatedImage = files?.find((file) =>
      file.mediaType?.startsWith("image/"),
    );

    if (!generatedImage?.base64) {
      return { success: false, error: "No image was generated" };
    }

    // Upload to R2
    const imageBuffer = Buffer.from(generatedImage.base64, "base64");
    const fileName = `colored-references/${coloringImageId}-${Date.now()}.png`;
    const { url } = await put(fileName, imageBuffer, { access: "public" });

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
    console.error("[ColoredReference] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate colored reference",
    };
  }
}
