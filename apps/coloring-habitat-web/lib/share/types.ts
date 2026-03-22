import type {
  ArtworkShare,
  SavedArtwork,
  ColoringImage,
} from "@one-colored-pixel/db/types";

// Share expiration options
export type ShareExpiration = "7days" | "30days" | "never";

// Extended share with artwork data for display
export type ShareWithArtwork = ArtworkShare & {
  artwork: SavedArtwork & {
    coloringImage: Pick<ColoringImage, "title" | "description" | "tags">;
  };
};

// Data needed to display a shared artwork page
export type SharedArtworkData = {
  shareCode: string;
  imageUrl: string;
  title: string;
  tags: string[];
  createdAt: Date;
};

// Result of creating a share
export type CreateShareResult = {
  success: boolean;
  shareCode?: string;
  shareUrl?: string;
  error?: string;
};
