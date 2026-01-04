import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@chunky-crayon/db';
import { verifyMobileToken } from '@/lib/mobile-auth';

export type ProgressPreview = {
  coloringImageId: string;
  previewUrl: string | null;
  updatedAt: string;
};

export type GetProgressPreviewsResponse = {
  previews: ProgressPreview[];
};

/**
 * GET /api/canvas/previews
 * Batch fetch progress previews for multiple coloring images
 * Query params:
 *   - imageIds: comma-separated list of coloring image IDs
 *
 * Returns previewUrl for each image the user has progress on
 */
export async function GET(request: NextRequest) {
  // Get user from session or mobile token
  let userId: string | undefined;

  // Check for mobile token first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const mobileAuth = await verifyMobileToken(token);
    if (mobileAuth) {
      userId = mobileAuth.userId;
    }
  }

  // Fall back to session auth
  if (!userId) {
    const session = await auth();
    userId = session?.user?.id;
  }

  if (!userId) {
    return NextResponse.json({ previews: [] });
  }

  // Get image IDs from query params
  const { searchParams } = new URL(request.url);
  const imageIdsParam = searchParams.get('imageIds');

  if (!imageIdsParam) {
    return NextResponse.json({ previews: [] });
  }

  const imageIds = imageIdsParam.split(',').filter(Boolean);

  if (imageIds.length === 0) {
    return NextResponse.json({ previews: [] });
  }

  // Limit to prevent abuse
  if (imageIds.length > 50) {
    return NextResponse.json(
      { error: 'Too many image IDs (max 50)' },
      { status: 400 },
    );
  }

  try {
    // Fetch progress for all requested images
    const progress = await db.canvasProgress.findMany({
      where: {
        userId,
        coloringImageId: { in: imageIds },
        previewUrl: { not: null },
      },
      select: {
        coloringImageId: true,
        previewUrl: true,
        updatedAt: true,
      },
    });

    const previews: ProgressPreview[] = progress.map((p) => ({
      coloringImageId: p.coloringImageId,
      previewUrl: p.previewUrl,
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({ previews });
  } catch (error) {
    console.error('[Canvas Previews API] Error fetching previews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch previews' },
      { status: 500 },
    );
  }
}
