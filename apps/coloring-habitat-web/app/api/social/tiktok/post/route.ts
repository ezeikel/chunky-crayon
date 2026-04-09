import { NextResponse } from "next/server";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";
import { auth } from "@/auth";
import { postVideoForUser, postPhotoForUser } from "@/lib/tiktok";

/**
 * POST /api/social/tiktok/post
 *
 * User-facing TikTok posting. Posts a user"s coloring artwork to their
 * connected TikTok account. Requires the user to have connected TikTok
 * via /api/auth/tiktok/user.
 */
export const POST = async (request: Request) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      artworkId,
      caption,
      privacyLevel = "SELF_ONLY",
      disableDuet = false,
      disableStitch = false,
      disableComment = false,
    } = body;

    if (!artworkId) {
      return NextResponse.json(
        { error: "artworkId is required" },
        { status: 400 },
      );
    }

    // Look up the coloring image
    const coloringImage = await db.coloringImage.findFirst({
      where: { id: artworkId, brand: BRAND },
    });

    if (!coloringImage) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }

    const postOptions = {
      caption: caption || coloringImage.title || "My coloring artwork",
      privacyLevel,
      disableDuet,
      disableStitch,
      disableComment,
    };

    let result;

    // Prefer video (animation) if available, otherwise post as photo
    if (coloringImage.animationUrl) {
      result = await postVideoForUser(
        session.user.id,
        coloringImage.animationUrl,
        postOptions,
      );
    } else if (coloringImage.url) {
      result = await postPhotoForUser(
        session.user.id,
        [coloringImage.url],
        postOptions,
      );
    } else {
      return NextResponse.json(
        { error: "No media available for this artwork" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      publishId: result.publishId,
      status: result.status,
      message: "Content submitted to TikTok — may take a moment to process.",
    });
  } catch (error) {
    console.error("[TikTok User Post] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to post to TikTok",
      },
      { status: 500 },
    );
  }
};
