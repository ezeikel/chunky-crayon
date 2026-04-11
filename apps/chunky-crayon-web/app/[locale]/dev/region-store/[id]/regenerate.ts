'use server';

import { notFound } from 'next/navigation';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { generateRegionStore } from '@/app/actions/generate-regions';

/**
 * Dev-only: regenerate the region store for a single coloring image.
 *
 * Used by the debug visualiser to re-run the pipeline against an image
 * after prompt or algorithm changes — without creating a new coloring
 * image from scratch. Hard-gated to NODE_ENV=development.
 */
export async function regenerateRegionStoreDev(
  coloringImageId: string,
): Promise<{ success: boolean; message: string }> {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const image = await db.coloringImage.findFirst({
    where: { id: coloringImageId, brand: BRAND },
    select: {
      id: true,
      title: true,
      svgUrl: true,
      tags: true,
      description: true,
    },
  });

  if (!image) {
    return { success: false, message: `Image not found: ${coloringImageId}` };
  }

  if (!image.svgUrl) {
    return { success: false, message: 'Image has no svgUrl' };
  }

  const start = Date.now();
  const result = await generateRegionStore(image.id, image.svgUrl, {
    title: image.title ?? '',
    description: image.description ?? '',
    tags: (image.tags as string[]) ?? [],
  });
  const elapsedMs = Date.now() - start;

  if (!result.success) {
    return {
      success: false,
      message: `Failed after ${elapsedMs}ms: ${result.error}`,
    };
  }

  return {
    success: true,
    message: `Regenerated in ${(elapsedMs / 1000).toFixed(1)}s — ${result.regionsJson.regions.length} regions, ${result.regionMapGzipped.byteLength} gz bytes`,
  };
}
