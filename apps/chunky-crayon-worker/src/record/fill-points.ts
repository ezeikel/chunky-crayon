/**
 * In-process region-fill-points generation for the worker.
 *
 * Same architecture as record/region-store.ts and the rest of the
 * /generate/* handlers. Persists `fillPointsJson` + `fillPointsGeneratedAt`
 * on success; idempotent on early-exit if fillPointsJson is already set.
 *
 * Reuses the prompts + palette from record/_prompts.ts so the AI behaviour
 * stays in lockstep with region-store. Ported from CC's
 * apps/chunky-crayon-web/app/actions/generate-color-map.ts.
 */
import {
  generateRegionFillPointsLogic,
  type GenerateFillPointsResult,
} from "@one-colored-pixel/coloring-core";
import { db } from "@one-colored-pixel/db";
import { regionStoreConfig } from "./_prompts.js";

export const generateFillPointsLocal = async (
  coloringImageId: string,
): Promise<GenerateFillPointsResult> => {
  const coloringImage = await db.coloringImage.findFirst({
    where: { id: coloringImageId },
    select: {
      id: true,
      url: true,
      title: true,
      description: true,
      tags: true,
      fillPointsJson: true,
    },
  });

  if (!coloringImage) {
    return { success: false, error: "Coloring image not found" };
  }
  if (coloringImage.fillPointsJson) {
    // Already generated — caller treats this as a success on the
    // assumption the existing row is fresh enough.
    return {
      success: true,
      // The downstream consumer only inspects success; cast keeps the
      // shared GenerateFillPointsResult type honest without fabricating
      // an array we don't have.
      fillPoints: JSON.parse(coloringImage.fillPointsJson),
    };
  }
  if (!coloringImage.url) {
    return {
      success: false,
      error: "Coloring image has no source url for fill points",
    };
  }

  console.log(
    `[fill-points] Generating for ${coloringImageId} (${coloringImage.title ?? "untitled"})`,
  );

  const result = await generateRegionFillPointsLogic(
    coloringImage.url,
    regionStoreConfig,
    {
      title: coloringImage.title ?? "",
      description: coloringImage.description ?? "",
      tags: (coloringImage.tags as string[]) ?? [],
    },
  );

  if (result.success) {
    await db.coloringImage.update({
      where: { id: coloringImageId },
      data: {
        fillPointsJson: JSON.stringify(result.fillPoints),
        fillPointsGeneratedAt: new Date(),
      },
    });
    console.log(`[fill-points] Saved fill points for ${coloringImageId}`);
  } else {
    console.error(
      `[fill-points] FAILED for ${coloringImageId}: ${result.error}`,
    );
  }

  return result;
};
