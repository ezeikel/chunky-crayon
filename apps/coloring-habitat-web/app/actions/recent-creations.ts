"use server";

import { db } from "@one-colored-pixel/db";
import { getUserId } from "@/app/actions/user";

export type RecentCreation = {
  id: string;
  title: string | null;
  imageUrl: string;
  coloringImageId: string;
  createdAt: Date;
};

/**
 * Fetch the current user's most recent saved artworks (limit 6).
 * Returns an empty array if the user is not authenticated.
 */
export async function getRecentCreations(
  limit: number = 6,
): Promise<RecentCreation[]> {
  const userId = await getUserId();
  if (!userId) {
    return [];
  }

  const artworks = await db.savedArtwork.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      coloringImageId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return artworks;
}
