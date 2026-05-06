/**
 * Persist a generated bundle page as a ColoringImage row.
 *
 * Differs from coloring-image/persist.ts in two ways:
 *   1. INSERTs a new row instead of UPDATING — bundle rows aren't created
 *      ahead of time by Vercel like user-initiated streaming generations.
 *   2. Stamps `bundleId`, `bundleOrder`, `purposeKey: 'bundle:slug'`,
 *      `showInCommunity: false`, and `generationType: SYSTEM` so the page
 *      stays gated behind purchase entitlement and out of free galleries.
 *
 * Metadata (title, description, alt, tags) is generated from the final
 * image via the same vision pipeline used for daily-image generation.
 */

import { db } from "@one-colored-pixel/db";
import { put } from "@one-colored-pixel/storage";
import { getTracedModels } from "@one-colored-pixel/coloring-core";
import { generateText, Output } from "ai";
import { z } from "zod";
import sharp from "sharp";
import potrace from "oslllo-potrace";

const imageMetadataSchema = z.object({
  title: z.string().describe("SEO-friendly title for the coloring page"),
  description: z
    .string()
    .describe("Brief description of the image for SEO purposes"),
  alt: z.string().describe("Accessible alt text for the image"),
  tags: z
    .array(z.string())
    .describe("Relevant tags/keywords for categorization"),
});

const METADATA_SYSTEM = `You are an assistant that generates metadata for images to be used for SEO and accessibility. The metadata should include a title, a description, and an alt text for the image alt attribute. The information should be concise, relevant to the image, and suitable for children aged 3-8.`;

const traceImage = async (imageBuffer: Buffer): Promise<string> =>
  new Promise((resolve, reject) => {
    sharp(imageBuffer)
      .flatten({ background: "#ffffff" })
      .resize({ width: 1024 })
      .grayscale()
      .normalize()
      .linear(1.3, -40)
      .threshold(210)
      .toFormat("png")
      .toBuffer(async (err, pngBuffer) => {
        if (err) {
          reject(err);
          return;
        }
        try {
          const traced = await potrace(Buffer.from(pngBuffer), {
            threshold: 200,
            optimizeImage: true,
            turnPolicy: "majority",
          }).trace();
          resolve(traced);
        } catch (traceErr) {
          reject(
            traceErr instanceof Error ? traceErr : new Error(String(traceErr)),
          );
        }
      });
  });

export type PersistBundlePageOptions = {
  bundleId: string;
  bundleSlug: string;
  bundleOrder: number; // 1-10
  imageBuffer: Buffer;
  /** Original prompt — written to sourcePrompt for debugging / regen. */
  sourcePrompt: string;
};

export type PersistBundlePageResult = {
  coloringImageId: string;
  url: string;
  svgUrl: string;
};

export const persistBundlePage = async ({
  bundleId,
  bundleSlug,
  bundleOrder,
  imageBuffer,
  sourcePrompt,
}: PersistBundlePageOptions): Promise<PersistBundlePageResult> => {
  const tracedModels = getTracedModels(null);

  const [metadataResult, svg, webpBuffer] = await Promise.all([
    generateText({
      model: tracedModels.vision,
      output: Output.object({ schema: imageMetadataSchema }),
      system: METADATA_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Generate metadata for the generated image based on the following image:",
            },
            {
              type: "image",
              image: `data:image/png;base64,${imageBuffer.toString("base64")}`,
            },
          ],
        },
      ],
    }),
    traceImage(imageBuffer),
    sharp(imageBuffer).webp().toBuffer(),
  ]);

  const imageMetadata = metadataResult.output;
  if (!imageMetadata) {
    throw new Error("[bundle-persist] metadata generation returned no output");
  }

  // Generate the row id up-front so we can scope R2 paths under it.
  const coloringImageId = (
    await db.coloringImage.create({
      data: {
        title: imageMetadata.title,
        description: imageMetadata.description,
        alt: imageMetadata.alt,
        tags: imageMetadata.tags,
        sourcePrompt,
        generationType: "SYSTEM",
        purposeKey: `bundle:${bundleSlug}`,
        bundleId,
        bundleOrder,
        showInCommunity: false,
        status: "READY",
        brand: "CHUNKY_CRAYON",
      },
    })
  ).id;

  const imagePath = `bundles/${bundleSlug}/pages/${bundleOrder}/image.webp`;
  const svgPath = `bundles/${bundleSlug}/pages/${bundleOrder}/image.svg`;

  const [{ url: imageUrl }, { url: svgUrl }] = await Promise.all([
    put(imagePath, webpBuffer, {
      access: "public",
      contentType: "image/webp",
      allowOverwrite: true,
    }),
    put(svgPath, Buffer.from(svg), {
      access: "public",
      contentType: "image/svg+xml",
      allowOverwrite: true,
    }),
  ]);

  await db.coloringImage.update({
    where: { id: coloringImageId },
    data: { url: imageUrl, svgUrl },
  });

  console.log(
    `[bundle-persist] page ${bundleOrder} of ${bundleSlug} → ${coloringImageId}`,
  );

  return { coloringImageId, url: imageUrl, svgUrl };
};
