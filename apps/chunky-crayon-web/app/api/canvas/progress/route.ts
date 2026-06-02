import { NextRequest, NextResponse, connection } from 'next/server';
import { put, del } from '@one-colored-pixel/storage';
import { auth } from '@/auth';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { verifyMobileToken } from '@/lib/mobile-auth';
import { getActiveProfile } from '@/app/actions/profiles';
import type {
  CanvasAction,
  SaveCanvasProgressRequest,
  GetCanvasProgressResponse,
} from '@one-colored-pixel/db';

// Preview update throttle: 5 seconds minimum between updates
// Short enough to feel responsive, long enough to prevent rapid uploads
const PREVIEW_UPDATE_THROTTLE_MS = 5 * 1000;
// Snapshot (full-fidelity restore raster) is bigger than the feed thumbnail —
// throttle it harder so a stream of autosaves doesn't spam R2 with PNGs.
const SNAPSHOT_UPDATE_THROTTLE_MS = 20 * 1000;

/**
 * Upload preview image to blob storage
 * Returns the blob URL or null if upload fails
 */
async function uploadPreviewImage(
  userId: string,
  coloringImageId: string,
  previewDataUrl: string,
): Promise<string | null> {
  try {
    // Extract base64 data from data URL
    const base64Match = previewDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error('[Canvas API] Invalid preview data URL format');
      return null;
    }

    const [, format, base64Data] = base64Match;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Validate size (max 300KB for 1024×1024 thumbnails)
    if (imageBuffer.length > 300 * 1024) {
      console.warn('[Canvas API] Preview too large:', imageBuffer.length);
      // Still upload but log warning - client should optimize
    }

    const timestamp = Date.now();
    const fileName = `uploads/canvas-previews/${userId}/${coloringImageId}/${timestamp}.${format === 'webp' ? 'webp' : 'png'}`;

    const { url } = await put(fileName, imageBuffer, {
      access: 'public',
      contentType: format === 'webp' ? 'image/webp' : 'image/png',
    });

    return url;
  } catch (error) {
    console.error('[Canvas API] Error uploading preview:', error);
    return null;
  }
}

/**
 * Delete old preview image from blob storage
 */
async function deletePreviewImage(previewUrl: string): Promise<void> {
  try {
    await del(previewUrl);
  } catch (error) {
    // Log but don't fail - old blobs can be cleaned up later
    console.warn('[Canvas API] Error deleting old preview:', error);
  }
}

/**
 * Check if preview should be updated based on throttle
 */
function shouldUpdatePreview(lastUpdatedAt: Date | null): boolean {
  if (!lastUpdatedAt) return true;
  const elapsed = Date.now() - lastUpdatedAt.getTime();
  return elapsed >= PREVIEW_UPDATE_THROTTLE_MS;
}

function shouldUpdateSnapshot(lastUpdatedAt: Date | null): boolean {
  if (!lastUpdatedAt) return true;
  const elapsed = Date.now() - lastUpdatedAt.getTime();
  return elapsed >= SNAPSHOT_UPDATE_THROTTLE_MS;
}

/**
 * Upload the full-fidelity restore snapshot to blob storage, namespaced by
 * user + profile. Returns { url, width, height } or null on failure.
 */
async function uploadSnapshotImage(
  userId: string,
  profileId: string | null,
  coloringImageId: string,
  snapshotDataUrl: string,
): Promise<string | null> {
  try {
    const base64Match = snapshotDataUrl.match(
      /^data:image\/(\w+);base64,(.+)$/,
    );
    if (!base64Match) {
      console.error('[Canvas API] Invalid snapshot data URL format');
      return null;
    }
    const [, format, base64Data] = base64Match;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Snapshots are full-fidelity PNGs; allow up to 2MB before warning.
    if (imageBuffer.length > 2 * 1024 * 1024) {
      console.warn('[Canvas API] Snapshot large:', imageBuffer.length);
    }

    const profileSeg = profileId || 'no-profile';
    const timestamp = Date.now();
    const fileName = `uploads/canvas-snapshots/${userId}/${profileSeg}/${coloringImageId}/${timestamp}.${format === 'webp' ? 'webp' : 'png'}`;

    const { url } = await put(fileName, imageBuffer, {
      access: 'public',
      contentType: format === 'webp' ? 'image/webp' : 'image/png',
    });
    return url;
  } catch (error) {
    console.error('[Canvas API] Error uploading snapshot:', error);
    return null;
  }
}

type AuthContext = { userId: string; profileId: string | null };

/**
 * Resolve the authenticated user AND active profile from either:
 * 1. NextAuth session (web) → session.user.id + getActiveProfile()
 * 2. Mobile JWT (Bearer) → payload.userId + payload.profileId
 *
 * Canvas progress is PER-PROFILE: sibling child profiles get independent
 * progress per image. An explicit profileId from the request (body/query)
 * overrides the resolved default (the client is the source of truth for which
 * profile is active right now). Sync is login-only — anonymous Device auth is
 * intentionally not accepted here (local storage still works offline).
 */
async function getAuthContext(
  request: NextRequest,
  explicitProfileId?: string | null,
): Promise<AuthContext | null> {
  const session = await auth();
  if (session?.user?.id) {
    const profileId =
      explicitProfileId ?? (await getActiveProfile())?.id ?? null;
    return { userId: session.user.id, profileId };
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyMobileToken(token);
    if (payload?.userId) {
      return {
        userId: payload.userId,
        profileId: explicitProfileId ?? payload.profileId ?? null,
      };
    }
  }

  return null;
}

// POST /api/canvas/progress - Save canvas progress
export async function POST(request: NextRequest) {
  try {
    const body: SaveCanvasProgressRequest = await request.json();
    const {
      coloringImageId,
      profileId: bodyProfileId,
      actions,
      version,
      canvasWidth,
      canvasHeight,
      previewDataUrl,
      snapshotDataUrl,
      snapshotWidth,
      snapshotHeight,
    } = body;

    const authCtx = await getAuthContext(request, bodyProfileId);
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId, profileId } = authCtx;

    if (!coloringImageId || !actions || version === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Verify the coloringImage exists
    const coloringImage = await db.coloringImage.findFirst({
      where: { id: coloringImageId, brand: BRAND },
      select: { id: true },
    });

    if (!coloringImage) {
      console.error('[Canvas API] ColoringImage not found:', coloringImageId);
      return NextResponse.json(
        { error: 'Coloring image not found' },
        { status: 404 },
      );
    }

    // Per-profile lookup. profileId is nullable in the compound unique, so use
    // findFirst with explicit equality (handles null cleanly; findUnique can't
    // take null in a compound key where).
    const existingProgress = await db.canvasProgress.findFirst({
      where: { userId, profileId, coloringImageId },
    });

    if (existingProgress) {
      const storedActions =
        existingProgress.actions as unknown as CanvasAction[];

      // Handle version conflict
      if (existingProgress.version > version) {
        return NextResponse.json(
          {
            error: 'Version conflict',
            currentVersion: existingProgress.version,
            actions: storedActions,
          },
          { status: 409 },
        );
      }

      // Equal-version divergence guard: two devices that each advanced from a
      // shared base offline can hold the SAME version, so the strict-greater
      // check above wouldn't fire and the second write would clobber the first.
      // If the stored set contains action-ids the incoming write doesn't carry,
      // the client diverged — force a 409 so it append-merges instead. A clean
      // linear advance (incoming ⊇ stored) passes through.
      if (existingProgress.version === version) {
        const incomingIds = new Set(
          (actions as CanvasAction[]).map((a) => a.id).filter(Boolean),
        );
        const storedHasUnseen = storedActions.some(
          (a) => a.id && !incomingIds.has(a.id),
        );
        if (storedHasUnseen) {
          return NextResponse.json(
            {
              error: 'Version conflict',
              currentVersion: existingProgress.version,
              actions: storedActions,
            },
            { status: 409 },
          );
        }
      }

      // Preview (feed thumbnail) upload, throttled.
      let newPreviewUrl: string | null = null;
      if (
        previewDataUrl &&
        shouldUpdatePreview(existingProgress.previewUpdatedAt)
      ) {
        newPreviewUrl = await uploadPreviewImage(
          userId,
          coloringImageId,
          previewDataUrl,
        );
        if (newPreviewUrl && existingProgress.previewUrl) {
          await deletePreviewImage(existingProgress.previewUrl);
        }
      }

      // Snapshot (restore raster) upload, throttled harder.
      let newSnapshotUrl: string | null = null;
      if (
        snapshotDataUrl &&
        shouldUpdateSnapshot(existingProgress.snapshotUpdatedAt)
      ) {
        newSnapshotUrl = await uploadSnapshotImage(
          userId,
          profileId,
          coloringImageId,
          snapshotDataUrl,
        );
        if (newSnapshotUrl && existingProgress.snapshotUrl) {
          await deletePreviewImage(existingProgress.snapshotUrl);
        }
      }

      const updated = await db.canvasProgress.update({
        where: { id: existingProgress.id },
        data: {
          actions: actions as any, // Prisma Json type
          version: version + 1,
          ...(canvasWidth && { canvasWidth }),
          ...(canvasHeight && { canvasHeight }),
          ...(newPreviewUrl && {
            previewUrl: newPreviewUrl,
            previewUpdatedAt: new Date(),
          }),
          ...(newSnapshotUrl && {
            snapshotUrl: newSnapshotUrl,
            snapshotWidth: snapshotWidth ?? null,
            snapshotHeight: snapshotHeight ?? null,
            snapshotUpdatedAt: new Date(),
          }),
        },
      });

      return NextResponse.json({
        success: true,
        version: updated.version,
        lastUpdated: updated.updatedAt.toISOString(),
        previewUrl: updated.previewUrl,
        snapshotUrl: updated.snapshotUrl,
      });
    } else {
      let previewUrl: string | null = null;
      if (previewDataUrl) {
        previewUrl = await uploadPreviewImage(
          userId,
          coloringImageId,
          previewDataUrl,
        );
      }
      let snapshotUrl: string | null = null;
      if (snapshotDataUrl) {
        snapshotUrl = await uploadSnapshotImage(
          userId,
          profileId,
          coloringImageId,
          snapshotDataUrl,
        );
      }

      const created = await db.canvasProgress.create({
        data: {
          userId,
          profileId,
          coloringImageId,
          actions: actions as any, // Prisma Json type
          version: 1,
          canvasWidth: canvasWidth || null,
          canvasHeight: canvasHeight || null,
          previewUrl,
          previewUpdatedAt: previewUrl ? new Date() : null,
          snapshotUrl,
          snapshotWidth: snapshotUrl ? (snapshotWidth ?? null) : null,
          snapshotHeight: snapshotUrl ? (snapshotHeight ?? null) : null,
          snapshotUpdatedAt: snapshotUrl ? new Date() : null,
        },
      });

      return NextResponse.json({
        success: true,
        version: created.version,
        lastUpdated: created.createdAt.toISOString(),
        previewUrl: created.previewUrl,
        snapshotUrl: created.snapshotUrl,
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
  await connection();

  try {
    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get('imageId');
    const queryProfileId = searchParams.get('profileId');

    const authCtx = await getAuthContext(request, queryProfileId);
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId, profileId } = authCtx;

    if (!imageId) {
      return NextResponse.json(
        { error: 'Missing imageId parameter' },
        { status: 400 },
      );
    }

    const progress = await db.canvasProgress.findFirst({
      where: { userId, profileId, coloringImageId: imageId },
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
      ...(progress.previewUrl && { previewUrl: progress.previewUrl }),
      ...(progress.snapshotUrl && { snapshotUrl: progress.snapshotUrl }),
      ...(progress.snapshotWidth && { snapshotWidth: progress.snapshotWidth }),
      ...(progress.snapshotHeight && {
        snapshotHeight: progress.snapshotHeight,
      }),
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
    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get('imageId');
    const queryProfileId = searchParams.get('profileId');

    const authCtx = await getAuthContext(request, queryProfileId);
    if (!authCtx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId, profileId } = authCtx;

    if (!imageId) {
      return NextResponse.json(
        { error: 'Missing imageId parameter' },
        { status: 400 },
      );
    }

    // Fetch first to get the blob URLs for cleanup + the row id to delete.
    const progress = await db.canvasProgress.findFirst({
      where: { userId, profileId, coloringImageId: imageId },
      select: { id: true, previewUrl: true, snapshotUrl: true },
    });

    if (!progress) {
      // Already gone — idempotent success.
      return NextResponse.json({ success: true });
    }

    if (progress.previewUrl) await deletePreviewImage(progress.previewUrl);
    if (progress.snapshotUrl) await deletePreviewImage(progress.snapshotUrl);

    await db.canvasProgress.delete({ where: { id: progress.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting canvas progress:', error);
    return NextResponse.json(
      { error: 'Failed to delete canvas progress' },
      { status: 500 },
    );
  }
}
