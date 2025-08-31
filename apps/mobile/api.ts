import axios from "axios";

import { Platform } from "react-native";

// allow an override just for Android if set in EAS
const apiUrlFromEnv =
  Platform.OS === "android"
    ? (process.env.EXPO_PUBLIC_API_URL_ANDROID ??
      process.env.EXPO_PUBLIC_API_URL)
    : process.env.EXPO_PUBLIC_API_URL;

export const getColoringImages = async () => {
  const response = await axios.get(`${apiUrlFromEnv}/coloring-images`);
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
