import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@chunky-crayon/db';
import { verifyMobileToken } from '@/lib/mobile-auth';
import type {
  CanvasAction,
  SaveCanvasProgressRequest,
  GetCanvasProgressResponse,
} from '@chunky-crayon/db';

/**
 * Get the authenticated user ID from either:
 * 1. NextAuth session (web users)
 * 2. Mobile JWT token in Authorization header (mobile users)
 */
async function getAuthenticatedUserId(
  request: NextRequest,
): Promise<string | null> {
  // First, try NextAuth session (web users)
  const session = await auth();
  if (session?.user?.id) {
    console.log(
      '[Canvas API] Auth via NextAuth session, userId:',
      session.user.id,
    );
    return session.user.id;
  }

  // Second, try mobile JWT token
  const authHeader = request.headers.get('Authorization');
  console.log(
    '[Canvas API] Auth header:',
    authHeader ? `${authHeader.substring(0, 20)}...` : 'none',
  );

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyMobileToken(token);
    console.log('[Canvas API] Mobile token payload:', payload);
    if (payload?.userId) {
      console.log(
        '[Canvas API] Auth via mobile token, userId:',
        payload.userId,
      );
      return payload.userId;
    }
  }

  console.log('[Canvas API] No valid auth found');
  return null;
}

// POST /api/canvas/progress - Save canvas progress
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    console.log('[Canvas API] POST - userId:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SaveCanvasProgressRequest = await request.json();
    const { coloringImageId, actions, version, canvasWidth, canvasHeight } =
      body;
    console.log(
      '[Canvas API] POST - coloringImageId:',
      coloringImageId,
      'actions:',
      actions?.length,
      'version:',
      version,
      'dimensions:',
      canvasWidth,
      'x',
      canvasHeight,
    );

    if (!coloringImageId || !actions || version === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Verify the coloringImage exists
    const coloringImage = await db.coloringImage.findUnique({
      where: { id: coloringImageId },
      select: { id: true },
    });

    if (!coloringImage) {
      console.error('[Canvas API] ColoringImage not found:', coloringImageId);
      return NextResponse.json(
        { error: 'Coloring image not found' },
        { status: 404 },
      );
    }

    // Check if progress exists
    const existingProgress = await db.canvasProgress.findUnique({
      where: {
        userId_coloringImageId: {
          userId,
          coloringImageId,
        },
      },
    });

    if (existingProgress) {
      // Handle version conflict
      if (existingProgress.version > version) {
        return NextResponse.json(
          {
            error: 'Version conflict',
            currentVersion: existingProgress.version,
            actions: existingProgress.actions as unknown as CanvasAction[],
          },
          { status: 409 },
        );
      }

      // Update existing progress
      const updated = await db.canvasProgress.update({
        where: {
          userId_coloringImageId: {
            userId,
            coloringImageId,
          },
        },
        data: {
          actions: actions as any, // Prisma Json type
          version: version + 1,
          // Only update dimensions if provided (to preserve existing values)
          ...(canvasWidth && { canvasWidth }),
          ...(canvasHeight && { canvasHeight }),
        },
      });

      return NextResponse.json({
        success: true,
        version: updated.version,
        lastUpdated: updated.updatedAt.toISOString(),
      });
    } else {
      // Create new progress
      const created = await db.canvasProgress.create({
        data: {
          userId,
          coloringImageId,
          actions: actions as any, // Prisma Json type
          version: 1,
          canvasWidth: canvasWidth || null,
          canvasHeight: canvasHeight || null,
        },
      });

      return NextResponse.json({
        success: true,
        version: created.version,
        lastUpdated: created.createdAt.toISOString(),
      });
    }
  } catch (error) {
    console.error('[Canvas API] Error saving canvas progress:', error);
    return NextResponse.json(
      {
        error: 'Failed to save canvas progress',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// GET /api/canvas/progress?imageId=xxx - Get canvas progress
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json(
        { error: 'Missing imageId parameter' },
        { status: 400 },
      );
    }

    const progress = await db.canvasProgress.findUnique({
      where: {
        userId_coloringImageId: {
          userId,
          coloringImageId: imageId,
        },
      },
    });

    if (!progress) {
      return NextResponse.json({ error: 'No progress found' }, { status: 404 });
    }

    const response: GetCanvasProgressResponse = {
      actions: progress.actions as unknown as CanvasAction[],
      version: progress.version,
      lastUpdated: progress.updatedAt.toISOString(),
      ...(progress.canvasWidth && { canvasWidth: progress.canvasWidth }),
      ...(progress.canvasHeight && { canvasHeight: progress.canvasHeight }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error loading canvas progress:', error);
    return NextResponse.json(
      { error: 'Failed to load canvas progress' },
      { status: 500 },
    );
  }
}

// DELETE /api/canvas/progress?imageId=xxx - Clear canvas progress
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json(
        { error: 'Missing imageId parameter' },
        { status: 400 },
      );
    }

    await db.canvasProgress.delete({
      where: {
        userId_coloringImageId: {
          userId,
          coloringImageId: imageId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting canvas progress:', error);
    return NextResponse.json(
      { error: 'Failed to delete canvas progress' },
      { status: 500 },
    );
  }
}
