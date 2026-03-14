// Sticker system types

export type StickerRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type StickerCategory =
  | 'milestone' // First artwork, 5 artworks, etc.
  | 'category' // Animals, Fantasy, Space, etc.
  | 'special' // Seasonal, events
  | 'color' // Color-related achievements
  | 'exploration'; // Try different features

export type UnlockConditionType =
  | 'artwork_count' // Save X artworks
  | 'category_count' // Save X artworks in a category
  | 'first_category' // First artwork in a category
  | 'color_variety' // Use X different colors (future)
  | 'streak' // Color X days in a row (future, gentle)
  | 'special'; // Manual/event unlock

export type UnlockCondition = {
  type: UnlockConditionType;
  value: number; // e.g., 5 for "5 artworks"
  category?: string; // e.g., "animals" for category-based conditions
};

export type Sticker = {
  id: string;
  name: string;
  description: string;
  // TODO: Replace with actual Colo sticker SVGs
  // These will be custom illustrations featuring Colo in different poses/costumes
  imageUrl: string;
  category: StickerCategory;
  rarity: StickerRarity;
  unlockCondition: UnlockCondition;
  // Fun message shown when unlocking
  unlockMessage: string;
};

export type UserStickerData = {
  id: string;
  stickerId: string;
  unlockedAt: Date;
  isNew: boolean;
};

// Stats for the My Artwork page
export type ArtworkStats = {
  totalArtworks: number;
  totalStickers: number;
  favoriteCategory?: string;
  memberSince: Date;
  recentUnlocks: UserStickerData[];
};
