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
              text: `Color this line art coloring page with beautiful, coherent colors. ${sceneHint}

CRITICAL RULES:
- Use FLAT, SOLID colors only — no gradients, no shading, no textures, no patterns
- Each enclosed region should be filled with ONE single uniform color
- Keep ALL black outlines/lines EXACTLY as they are — do not alter any lines
- Do NOT add any new elements, details, textures, or patterns that are not in the original line art
- Do NOT add backgrounds, wallpapers, or decorations — if an area is blank/white in the original, fill it with a single solid color
- The result must be IDENTICAL to the original line art but with flat color fills — like a coloring book page colored with markers
- Use realistic, natural color choices (blue sky, green grass, natural skin tones)
- Ensure adjacent regions have contrasting colors so each shape is visually distinct`,
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
