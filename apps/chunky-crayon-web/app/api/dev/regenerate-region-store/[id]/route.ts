import { NextResponse, connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { generateRegionStore } from '@/app/actions/generate-regions';

export const maxDuration = 900; // 15 minutes — some images have 500+ regions and the labelling pass alone takes 2-3 minutes at that scale

/**
 * Dev-only: regenerate the region store for a single coloring image.
 *
 * Triggered via curl from the terminal — avoids the need for a browser to
 * click the debug page button. Hard-gated to NODE_ENV=development.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/regenerate-region-store/<id>
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  await connection();

  const { id } = await params;

  const image = await db.coloringImage.findFirst({
    where: { id, brand: BRAND },
    select: {
      id: true,
      title: true,
      svgUrl: true,
      tags: true,
      description: true,
    },
  });

  if (!image) {
    return NextResponse.json(
      { error: `Image not found: ${id}` },
      { status: 404 },
    );
  }

  if (!image.svgUrl) {
    return NextResponse.json({ error: 'Image has no svgUrl' }, { status: 400 });
  }

  const start = Date.now();
  const result = await generateRegionStore(image.id, image.svgUrl, {
    title: image.title ?? '',
    description: image.description ?? '',
    tags: (image.tags as string[]) ?? [],
  });
  const elapsedMs = Date.now() - start;

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        elapsedMs,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    elapsedMs,
    regionCount: result.regionsJson.regions.length,
    gzippedBytes: result.regionMapGzipped.byteLength,
    sceneDescription: result.sceneDescription,
    width: result.width,
    height: result.height,
  });
}
