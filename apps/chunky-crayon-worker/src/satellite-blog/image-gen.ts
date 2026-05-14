import OpenAI from "openai";
import { put, del } from "@one-colored-pixel/storage";

/**
 * Featured image generation for the satellite-site blog pipeline.
 *
 * Unlike the CC pipeline (which uses BEGINNER coloring-page references to
 * keep featured images on-brand as colorable line art), satellite featured
 * images are editorial illustrations. Pure text-to-image with style direction
 * passed in by the caller.
 *
 * Same fire-and-forget posture as CC's image-gen: no retries, no fallback.
 * A worker re-trigger is the cleanest retry.
 */

export type SatelliteBlogImageResult = {
  url: string;
  tempFileName: string;
  generationTimeMs: number;
};

export async function generateSatelliteFeaturedImage(
  imagePrompt: string,
  styleDirection: string,
): Promise<SatelliteBlogImageResult> {
  const startTime = Date.now();

  const fullPrompt = `${imagePrompt}

Style: ${styleDirection}`;

  const client = new OpenAI();
  const result = await client.images.generate({
    model: "gpt-image-2",
    prompt: fullPrompt,
    size: "1536x1024",
    quality: "high",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("[satellite-blog-image-gen] OpenAI returned no image");
  }

  const imageBuffer = Buffer.from(b64, "base64");
  const tempFileName = `temp/satellite-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.png`;
  const { url } = await put(tempFileName, imageBuffer, { access: "public" });

  return {
    url,
    tempFileName,
    generationTimeMs: Date.now() - startTime,
  };
}

export const cleanupSatelliteBlogImage = (
  tempFileName: string,
): Promise<void> =>
  del(tempFileName).catch((err) => {
    console.error(
      `[satellite-blog-image-gen] failed to cleanup temp ${tempFileName}:`,
      err,
    );
  });
