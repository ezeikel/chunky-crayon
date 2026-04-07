"use server";

import { generateText } from "ai";
import { models } from "@one-colored-pixel/coloring-core";

export type GenerateColoredReferenceResult =
  | { success: true; imageBase64: string }
  | { success: false; error: string };

/**
 * Generate a colored version of a line art coloring page using AI.
 * The AI colors the image holistically, producing a coherent reference
 * that can be used to sample colors for auto-fill.
 *
 * Uses Gemini Pro Image which can take an image input and generate
 * a modified version with colors applied.
 */
export async function generateColoredReference(
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
    console.log(`[ColoredReference] Generated in ${elapsedMs}ms`);

    // Extract the generated image
    if (files && files.length > 0) {
      const imageFile = files[0];
      const base64 = Buffer.from(imageFile.data).toString("base64");
      const mimeType = imageFile.mimeType || "image/png";
      const imageBase64 = `data:${mimeType};base64,${base64}`;

      return { success: true, imageBase64 };
    }

    return {
      success: false,
      error: "No image was generated. Please try again.",
    };
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
