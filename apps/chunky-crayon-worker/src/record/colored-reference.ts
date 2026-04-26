/**
 * In-process colored-reference generation for the worker.
 *
 * Same architecture as record/region-store.ts and record/background-music.ts —
 * runs the AI image-to-image colorization on the Hetzner box so the CC web
 * app's after() hook doesn't drop the work under Vercel CPU contention.
 *
 * Ported from apps/chunky-crayon-web/app/actions/generate-colored-reference.ts.
 * Logic is intentionally a near-verbatim copy so the AI behaviour stays
 * identical between the two paths.
 */
import { put } from "@one-colored-pixel/storage";
import { db } from "@one-colored-pixel/db";
import { generateText } from "ai";
import { models } from "@one-colored-pixel/coloring-core";

export type GenerateColoredReferenceResult =
  | { success: true; url: string }
  | { success: false; error: string };

/**
 * Colorize a line-art coloring page via Gemini image generation, upload
 * to R2, persist coloredReferenceUrl on the row.
 *
 * Idempotent — early-returns if coloredReferenceUrl is already set.
 */
export const generateColoredReferenceLocal = async (
  coloringImageId: string,
): Promise<GenerateColoredReferenceResult> => {
  try {
    const startTime = Date.now();

    const coloringImage = await db.coloringImage.findFirst({
      where: { id: coloringImageId },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        coloredReferenceUrl: true,
      },
    });

    if (!coloringImage) {
      return { success: false, error: "Coloring image not found" };
    }
    if (coloringImage.coloredReferenceUrl) {
      return { success: true, url: coloringImage.coloredReferenceUrl };
    }
    if (!coloringImage.url) {
      return {
        success: false,
        error: "Coloring image has no source url to colorize",
      };
    }

    const sceneHint = coloringImage.title
      ? `This is: "${coloringImage.title}". ${coloringImage.description ?? ""}`
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
              type: "image",
              image: new URL(coloringImage.url),
            },
          ],
        },
      ],
    });

    const elapsedMs = Date.now() - startTime;

    const generatedImage = files?.find((file) =>
      file.mediaType?.startsWith("image/"),
    );
    if (!generatedImage?.base64) {
      return { success: false, error: "No image was generated" };
    }

    const imageBuffer = Buffer.from(generatedImage.base64, "base64");
    const fileName = `colored-references/${coloringImageId}-${Date.now()}.png`;
    const { url } = await put(fileName, imageBuffer, { access: "public" });

    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: { coloredReferenceUrl: url },
    });

    console.log(
      `[colored-reference] Generated + stored in ${elapsedMs}ms for ${coloringImageId}: ${url}`,
    );
    return { success: true, url };
  } catch (error) {
    console.error("[colored-reference] Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate colored reference",
    };
  }
};
