import axios from "axios";

import { Platform } from "react-native";

// allow an override just for Android if set in EAS
const apiUrlFromEnv =
  Platform.OS === "android"
    ? (process.env.EXPO_PUBLIC_API_URL_ANDROID ??
      process.env.EXPO_PUBLIC_API_URL)
    : process.env.EXPO_PUBLIC_API_URL;

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
