"use server";

import { put } from "@one-colored-pixel/storage";
import { revalidatePath } from "next/cache";
import { db, Brand } from "@one-colored-pixel/db";
import { getUserId } from "@/app/actions/user";
import { ACTIONS } from "@/constants";
import sharp from "sharp";

/**
 * Standard size for saved artwork (Instagram-ready)
 */
const SAVED_ARTWORK_SIZE = 1080;

type SaveArtworkResult =
  | {
      success: true;
      artworkId: string;
      imageUrl: string;
    }
  | { success: false; error: string };

/**
 * Save a colored artwork to the user's gallery
 * @param coloringImageId - The ID of the original coloring image
 * @param imageDataUrl - The base64 data URL of the colored canvas
 * @param title - Optional custom title for the artwork
 */
export async function saveArtworkToGallery(
  coloringImageId: string,
  imageDataUrl: string,
  title?: string,
): Promise<SaveArtworkResult> {
  try {
    // Verify user is authenticated
    const userId = await getUserId(ACTIONS.SAVE_ARTWORK);
    if (!userId) {
      return { success: false, error: "You must be signed in to save artwork" };
    }

    // Verify the coloring image exists and belongs to this brand
    const coloringImage = await db.coloringImage.findUnique({
      where: { id: coloringImageId, brand: Brand.COLORING_HABITAT },
    });

    if (!coloringImage) {
      return { success: false, error: "Coloring image not found" };
    }

    // Convert data URL to buffer
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const rawBuffer = Buffer.from(base64Data, "base64");

    // Process image to Instagram-ready size (1080x1080)
    // Using 'contain' fit to preserve aspect ratio with white background
    const imageBuffer = await sharp(rawBuffer)
      .resize(SAVED_ARTWORK_SIZE, SAVED_ARTWORK_SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `uploads/saved-artwork/${userId}/${coloringImageId}/${timestamp}.png`;

    // Upload to R2 storage
    const { url: imageUrl } = await put(fileName, imageBuffer, {
      access: "public",
      contentType: "image/png",
    });

    // Create the saved artwork record
    const savedArtwork = await db.savedArtwork.create({
      data: {
        userId,
        coloringImageId,
        title: title || coloringImage.title,
        imageUrl,
      },
    });

    // Revalidate the gallery page
    revalidatePath("/gallery");
    revalidatePath("/my-artwork");

    return {
      success: true,
      artworkId: savedArtwork.id,
      imageUrl,
    };
  } catch (error) {
    console.error("Error saving artwork:", error);
    return {
      success: false,
      error: "Failed to save artwork. Please try again.",
    };
  }
}

/**
 * Get all saved artwork for the current user
 */
export async function getUserSavedArtwork() {
  const userId = await getUserId();
  if (!userId) {
    return [];
  }

  const savedArtwork = await db.savedArtwork.findMany({
    where: { userId },
    include: {
      coloringImage: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return savedArtwork;
}

/**
 * Delete a saved artwork
 */
export async function deleteSavedArtwork(
  artworkId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: "You must be signed in" };
    }

    // Verify ownership
    const artwork = await db.savedArtwork.findFirst({
      where: {
        id: artworkId,
        userId,
      },
    });

    if (!artwork) {
      return { success: false, error: "Artwork not found" };
    }

    // Delete the record (blob storage cleanup can be done via cron)
    await db.savedArtwork.delete({
      where: { id: artworkId },
    });

    revalidatePath("/gallery");
    revalidatePath("/my-artwork");

    return { success: true };
  } catch (error) {
    console.error("Error deleting artwork:", error);
    return { success: false, error: "Failed to delete artwork" };
  }
}
