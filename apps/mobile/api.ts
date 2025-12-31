import axios from "axios";

import { Platform } from "react-native";
import type { AgeGroup, Difficulty } from "./types";

// allow an override just for Android if set in EAS
const apiUrlFromEnv =
  Platform.OS === "android"
    ? (process.env.EXPO_PUBLIC_API_URL_ANDROID ??
      process.env.EXPO_PUBLIC_API_URL)
    : process.env.EXPO_PUBLIC_API_URL;

// ============================================================================
// Coloring Images
// ============================================================================

export const getColoringImages = async (cursor?: string) => {
  const params = cursor ? { cursor } : {};
  const response = await axios.get(`${apiUrlFromEnv}/coloring-images`, {
    params,
  });
  return response.data;
};

export const getColoringImage = async (id: string) => {
  const response = await axios.get(`${apiUrlFromEnv}/coloring-images/${id}`);
  return response.data;
};

export const createColoringImage = async (description: string) => {
  const response = await axios.post(
    `${apiUrlFromEnv}/coloring-images`,
    { description },
    { headers: { "Content-Type": "application/json" } },
  );

  return response.data;
};

export const describeSketch = async (
  base64Image: string,
): Promise<string | null> => {
  try {
    const response = await axios.post(
      `${apiUrlFromEnv}/describe-sketch`,
      { image: base64Image },
      { headers: { "Content-Type": "application/json" } },
    );

    return response.data.description || null;
  } catch (error) {
    console.error("Failed to describe sketch:", error);
    return null;
  }
};

/**
 * Generate a coloring page directly from a photo.
 * Uses AI to transform the photo into a coloring page that closely matches the original.
 */
export const generateFromPhoto = async (base64Image: string) => {
  const response = await axios.post(
    `${apiUrlFromEnv}/photo-to-coloring`,
    { image: base64Image },
    { headers: { "Content-Type": "application/json" } },
  );

  return response.data;
};

// ============================================================================
// User & Authentication
// ============================================================================

export type UserResponse = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    credits: number;
    subscription: {
      planName: string;
      billingPeriod: string;
      status: string;
      currentPeriodEnd: string;
    } | null;
  } | null;
  activeProfile: {
    id: string;
    name: string;
    avatarId: string;
    ageGroup: AgeGroup;
    difficulty: Difficulty;
    artworkCount: number;
  } | null;
  stickerStats: {
    totalUnlocked: number;
    totalPossible: number;
    newCount: number;
  };
  error?: string;
};

export const getCurrentUser = async (): Promise<UserResponse> => {
  const response = await axios.get(`${apiUrlFromEnv}/mobile/user`);
  return response.data;
};

// ============================================================================
// Profiles
// ============================================================================

export type Profile = {
  id: string;
  name: string;
  avatarId: string;
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  isDefault: boolean;
  artworkCount: number;
  createdAt: string;
};

export type ProfilesResponse = {
  profiles: Profile[];
  error?: string;
};

export const getProfiles = async (): Promise<ProfilesResponse> => {
  const response = await axios.get(`${apiUrlFromEnv}/mobile/profiles`);
  return response.data;
};

export type CreateProfileInput = {
  name: string;
  avatarId?: string;
  ageGroup?: AgeGroup;
  difficulty?: Difficulty;
};

export const createProfile = async (
  input: CreateProfileInput,
): Promise<{ success: boolean; profile?: Profile; error?: string }> => {
  const response = await axios.post(`${apiUrlFromEnv}/mobile/profiles`, input, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
};

export type ActiveProfileResponse = {
  activeProfile: Profile | null;
  error?: string;
};

export const getActiveProfile = async (): Promise<ActiveProfileResponse> => {
  const response = await axios.get(`${apiUrlFromEnv}/mobile/profiles/active`);
  return response.data;
};

export const setActiveProfile = async (
  profileId: string,
): Promise<{ success: boolean; error?: string }> => {
  const response = await axios.post(
    `${apiUrlFromEnv}/mobile/profiles/active`,
    { profileId },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
};

// ============================================================================
// Saved Artworks
// ============================================================================

export type SavedArtwork = {
  id: string;
  title: string;
  imageUrl: string;
  coloringImageId: string;
  coloringImage: {
    id: string;
    title: string;
    svgUrl: string;
  } | null;
  createdAt: string;
};

export type SavedArtworksResponse = {
  artworks: SavedArtwork[];
  error?: string;
};

export const getSavedArtworks = async (): Promise<SavedArtworksResponse> => {
  const response = await axios.get(`${apiUrlFromEnv}/mobile/saved-artworks`);
  return response.data;
};

export type SaveArtworkInput = {
  coloringImageId: string;
  imageDataUrl: string;
  title?: string;
};

export type SaveArtworkResponse = {
  success: boolean;
  artworkId?: string;
  imageUrl?: string;
  newStickers?: Array<{
    id: string;
    name: string;
    emoji: string;
  }>;
  evolutionResult?: {
    evolved: boolean;
    previousStage: number;
    newStage: number;
    newAccessories: string[];
  } | null;
  error?: string;
};

export const saveArtwork = async (
  input: SaveArtworkInput,
): Promise<SaveArtworkResponse> => {
  const response = await axios.post(
    `${apiUrlFromEnv}/mobile/saved-artworks`,
    input,
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
};

// ============================================================================
// Colo Evolution
// ============================================================================

export type ColoStateResponse = {
  coloState: {
    stage: number;
    stageName: string;
    imagePath: string;
    accessories: string[];
    progressToNext: {
      current: number;
      required: number;
    } | null;
  } | null;
  error?: string;
};

export const getColoState = async (): Promise<ColoStateResponse> => {
  const response = await axios.get(`${apiUrlFromEnv}/mobile/colo`);
  return response.data;
};

export type CheckColoEvolutionResponse = {
  coloState: ColoStateResponse["coloState"];
  evolutionResult: {
    evolved: boolean;
    previousStage: number;
    newStage: number;
    newAccessories: string[];
  } | null;
  error?: string;
};

export const checkColoEvolution = async (
  profileId?: string,
): Promise<CheckColoEvolutionResponse> => {
  const response = await axios.post(
    `${apiUrlFromEnv}/mobile/colo`,
    { profileId },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
};

// ============================================================================
// Stickers
// ============================================================================

export type Sticker = {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  rarity: string;
  isUnlocked: boolean;
  isNew: boolean;
  unlockedAt: string | null;
};

export type StickersResponse = {
  stickers: Sticker[];
  stats: {
    totalUnlocked: number;
    totalPossible: number;
    newCount: number;
  };
  error?: string;
};

export const getStickers = async (): Promise<StickersResponse> => {
  const response = await axios.get(`${apiUrlFromEnv}/mobile/stickers`);
  return response.data;
};

export const markStickersAsViewed = async (
  stickerIds: string[],
): Promise<{ success: boolean; error?: string }> => {
  const response = await axios.post(
    `${apiUrlFromEnv}/mobile/stickers`,
    { stickerIds },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
};
