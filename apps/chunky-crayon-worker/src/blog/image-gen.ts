import OpenAI from "openai";
import { put, del } from "@one-colored-pixel/storage";
import {
  getReferenceImages,
  createColoringImagePrompt,
} from "./cc-image-prompts.js";

/**
 * Worker-side image generation for the blog cron.
 *
 * Self-contained: fetches CC's reference images, calls openai.images.edit
 * with gpt-image-2, uploads result to R2 temp/, returns the temp URL +
 * filename so the caller can upload to Sanity then delete.
 *
 * No retries / no Gemini fallback — the cron is fire-and-forget anyway,
 * and a worker re-trigger gives us a clean retry. Keep this dumb.
 *
 * Always uses BEGINNER references — blog featured images target the
 * same broad parent audience the social feed does.
 */

const referenceFilesCache = new Map<string, File[]>();

async function getReferenceFiles(): Promise<File[]> {
  const urls = getReferenceImages("BEGINNER").slice(0, 4);
  const cacheKey = urls.join("|");
  const cached = referenceFilesCache.get(cacheKey);
  if (cached) return cached;

  const files = await Promise.all(
    urls.map(async (url, i) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `[blog-image-gen] failed to fetch reference image ${i}: ${response.statusText}`,
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      const ext = url.endsWith(".webp") ? "webp" : "png";
      return new File([arrayBuffer], `style-ref-${i}.${ext}`, {
        type: `image/${ext}`,
      });
    }),
  );

  referenceFilesCache.set(cacheKey, files);
  return files;
}

export type BlogImageResult = {
  url: string;
  tempFileName: string;
  generationTimeMs: number;
};

export async function generateBlogFeaturedImage(
  imagePrompt: string,
): Promise<BlogImageResult> {
  const startTime = Date.now();

  const styledPrompt = `The provided images show the target coloring book style. Match their line weight, simplicity, and outline-only aesthetic.

${createColoringImagePrompt(imagePrompt)}`;

  const styleFiles = await getReferenceFiles();

  const client = new OpenAI();
  const result = await client.images.edit({
    model: "gpt-image-2",
    image: styleFiles,
    prompt: styledPrompt,
    size: "1024x1024",
    quality: "high",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("[blog-image-gen] OpenAI returned no image");
  }

  const imageBuffer = Buffer.from(b64, "base64");
  const tempFileName = `temp/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.png`;
  const { url } = await put(tempFileName, imageBuffer, { access: "public" });

  return {
    url,
    tempFileName,
    generationTimeMs: Date.now() - startTime,
  };
}

export const cleanupBlogImage = (tempFileName: string): Promise<void> =>
  del(tempFileName).catch((err) => {
    console.error(
      `[blog-image-gen] failed to cleanup temp ${tempFileName}:`,
      err,
    );
  });
