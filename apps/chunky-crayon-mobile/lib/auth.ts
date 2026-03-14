import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Keys for secure storage
const DEVICE_ID_KEY = "chunky_crayon_device_id";
const SESSION_TOKEN_KEY = "chunky_crayon_session_token";
const USER_ID_KEY = "chunky_crayon_user_id";

/**
 * Generate a unique device ID
 * Uses crypto.randomUUID if available, falls back to manual generation
 */
const generateDeviceId = (): string => {
  // Simple UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Secure storage wrapper that works on all platforms
 * Uses SecureStore on native, AsyncStorage on web
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

/**
 * Get or create a unique device ID for this device
 * This ID persists across app reinstalls (on iOS with keychain, Android with encrypted prefs)
 */
export const getDeviceId = async (): Promise<string> => {
  let deviceId = await storage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = generateDeviceId();
    await storage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
};

/**
 * Get the current session token (if authenticated with server)
 */
export const getSessionToken = async (): Promise<string | null> => {
  return storage.getItem(SESSION_TOKEN_KEY);
};

/**
 * Save a session token (received from server after device registration or OAuth)
 */
export const setSessionToken = async (token: string): Promise<void> => {
  return storage.setItem(SESSION_TOKEN_KEY, token);
};

/**
 * Clear the session token (logout)
 */
export const clearSessionToken = async (): Promise<void> => {
  return storage.deleteItem(SESSION_TOKEN_KEY);
};

/**
 * Get the linked user ID (if user has signed in with OAuth)
 */
export const getLinkedUserId = async (): Promise<string | null> => {
  return storage.getItem(USER_ID_KEY);
};

/**
 * Save the linked user ID after OAuth sign-in
 */
export const setLinkedUserId = async (userId: string): Promise<void> => {
  return storage.setItem(USER_ID_KEY, userId);
};

/**
 * Clear the linked user ID (unlink account)
 */
export const clearLinkedUserId = async (): Promise<void> => {
  return storage.deleteItem(USER_ID_KEY);
};

/**
 * Get the auth header for API requests
 * Returns the session token if available, otherwise the device ID
 */
export const getAuthHeader = async (): Promise<{
  Authorization: string;
}> => {
  const sessionToken = await getSessionToken();

  if (sessionToken) {
    return { Authorization: `Bearer ${sessionToken}` };
  }

  // Fall back to device ID for anonymous auth
  const deviceId = await getDeviceId();
  return { Authorization: `Device ${deviceId}` };
};

/**
 * Check if the user is authenticated (has a valid session token)
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await getSessionToken();
  return !!token;
};

/**
 * Check if the user has linked their account (OAuth sign-in)
 */
export const isAccountLinked = async (): Promise<boolean> => {
  const userId = await getLinkedUserId();
  return !!userId;
};

/**
 * Full logout - clears session and linked account
 */
export const logout = async (): Promise<void> => {
  await Promise.all([clearSessionToken(), clearLinkedUserId()]);
};

/**
 * Auth state for the app
 */
export type AuthState = {
  deviceId: string;
  sessionToken: string | null;
  linkedUserId: string | null;
  isAuthenticated: boolean;
  isAccountLinked: boolean;
};

/**
 * Get the current auth state
 */
export const getAuthState = async (): Promise<AuthState> => {
  const [deviceId, sessionToken, linkedUserId] = await Promise.all([
    getDeviceId(),
    getSessionToken(),
    getLinkedUserId(),
  ]);

  return {
    deviceId,
    sessionToken,
    linkedUserId,
    isAuthenticated: !!sessionToken,
    isAccountLinked: !!linkedUserId,
  };
};
