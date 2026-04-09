import { NextRequest, NextResponse, connection } from "next/server";
import { put, del } from "@one-colored-pixel/storage";
import { auth } from "@/auth";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";
import type {
  CanvasAction,
  SaveCanvasProgressRequest,
  GetCanvasProgressResponse,
} from "@one-colored-pixel/db";

// Preview update throttle: 5 seconds minimum between updates
const PREVIEW_UPDATE_THROTTLE_MS = 5 * 1000;

/**
 * Upload preview image to blob storage
 */
async function uploadPreviewImage(
  userId: string,
  coloringImageId: string,
  previewDataUrl: string,
): Promise<string | null> {
  try {
    const base64Match = previewDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error("[Canvas API] Invalid preview data URL format");
      return null;
    }

    const [, format, base64Data] = base64Match;
    const imageBuffer = Buffer.from(base64Data, "base64");

    if (imageBuffer.length > 300 * 1024) {
      console.warn("[Canvas API] Preview too large:", imageBuffer.length);
    }

    const timestamp = Date.now();
    const fileName = `uploads/canvas-previews/${userId}/${coloringImageId}/${timestamp}.${format === "webp" ? "webp" : "png"}`;

    const { url } = await put(fileName, imageBuffer, {
      access: "public",
      contentType: format === "webp" ? "image/webp" : "image/png",
    });

    return url;
  } catch (error) {
    console.error("[Canvas API] Error uploading preview:", error);
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
    console.warn("[Canvas API] Error deleting old preview:", error);
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

/**
 * Get the authenticated user ID from NextAuth session.
 * Habitat is web-only so no mobile JWT support needed.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// POST /api/canvas/progress - Save canvas progress
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SaveCanvasProgressRequest = await request.json();
    const {
      coloringImageId,
      actions,
      version,
      canvasWidth,
      canvasHeight,
      previewDataUrl,
    } = body;

    if (!coloringImageId || !actions || version === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify the coloringImage exists and belongs to this brand
    const coloringImage = await db.coloringImage.findFirst({
      where: { id: coloringImageId, brand: BRAND },
      select: { id: true },
    });

    if (!coloringImage) {
      return NextResponse.json(
        { error: "Coloring image not found" },
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
            error: "Version conflict",
            currentVersion: existingProgress.version,
            actions: existingProgress.actions as unknown as CanvasAction[],
          },
          { status: 409 },
        );
      }

      // Handle preview upload with throttling
      let newPreviewUrl: string | null = null;
      const shouldUploadPreview =
        previewDataUrl &&
        shouldUpdatePreview(existingProgress.previewUpdatedAt);

      if (shouldUploadPreview) {
        newPreviewUrl = await uploadPreviewImage(
          userId,
          coloringImageId,
          previewDataUrl,
        );

        if (newPreviewUrl && existingProgress.previewUrl) {
          await deletePreviewImage(existingProgress.previewUrl);
        }
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
          actions: actions as any,
          version: version + 1,
          ...(canvasWidth && { canvasWidth }),
          ...(canvasHeight && { canvasHeight }),
          ...(newPreviewUrl && {
            previewUrl: newPreviewUrl,
            previewUpdatedAt: new Date(),
          }),
        },
      });

      return NextResponse.json({
        success: true,
        version: updated.version,
        lastUpdated: updated.updatedAt.toISOString(),
        previewUrl: updated.previewUrl,
      });
    } else {
      // Upload preview for new progress if provided
      let previewUrl: string | null = null;
      if (previewDataUrl) {
        previewUrl = await uploadPreviewImage(
          userId,
          coloringImageId,
          previewDataUrl,
        );
      }

      // Create new progress
      const created = await db.canvasProgress.create({
        data: {
          userId,
          coloringImageId,
          actions: actions as any,
          version: 1,
          canvasWidth: canvasWidth || null,
          canvasHeight: canvasHeight || null,
          previewUrl,
          previewUpdatedAt: previewUrl ? new Date() : null,
        },
      });

      return NextResponse.json({
        success: true,
        version: created.version,
        lastUpdated: created.createdAt.toISOString(),
        previewUrl: created.previewUrl,
      });
    }
  } catch (error) {
    console.error("[Canvas API] Error saving canvas progress:", error);
    return NextResponse.json(
      {
        error: "Failed to save canvas progress",
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
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        { error: "Missing imageId parameter" },
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
      return NextResponse.json({ error: "No progress found" }, { status: 404 });
    }

    const response: GetCanvasProgressResponse = {
      actions: progress.actions as unknown as CanvasAction[],
      version: progress.version,
      lastUpdated: progress.updatedAt.toISOString(),
      ...(progress.canvasWidth && { canvasWidth: progress.canvasWidth }),
      ...(progress.canvasHeight && { canvasHeight: progress.canvasHeight }),
      ...(progress.previewUrl && { previewUrl: progress.previewUrl }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error loading canvas progress:", error);
    return NextResponse.json(
      { error: "Failed to load canvas progress" },
      { status: 500 },
    );
  }
}

// DELETE /api/canvas/progress?imageId=xxx - Clear canvas progress
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json(
        { error: "Missing imageId parameter" },
        { status: 400 },
      );
    }

    // Fetch the progress to get the previewUrl for cleanup
    const progress = await db.canvasProgress.findUnique({
      where: {
        userId_coloringImageId: {
          userId,
          coloringImageId: imageId,
        },
      },
      select: { previewUrl: true },
    });

    if (progress?.previewUrl) {
      await deletePreviewImage(progress.previewUrl);
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
    console.error("Error deleting canvas progress:", error);
    return NextResponse.json(
      { error: "Failed to delete canvas progress" },
      { status: 500 },
    );
  }
}
