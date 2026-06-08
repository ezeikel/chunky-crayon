import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage, canvasStorage } from "@/lib/storage/mmkv";
import { clearAllArtworkFiles } from "@/lib/artwork/files";
import { clearAllAuth } from "@/lib/auth";

/**
 * DEV-ONLY full local-device reset — returns the app to a fresh-install state.
 *
 * CC mobile spreads local data across FOUR mechanisms; a complete wipe has to
 * hit all of them or stale state survives:
 *   1. MMKV  — `storage` (artwork store) + `canvasStorage` (in-progress canvas
 *      autosave). `.clearAll()` empties each; the encryption key is left intact
 *      so the next launch reuses it cleanly (no orphaning).
 *   2. AsyncStorage — onboarding/feature stores, unlock-storage, misc caches.
 *   3. SecureStore — auth/identity (device id, session token, linked user id).
 *      Cleared so the next launch re-registers a fresh anonymous device.
 *   4. On-disk PNGs — the `documentDirectory/artworks/` saved-art files.
 *
 * Best-effort: each step is independent so one failure doesn't block the rest.
 * Surfaced via the __DEV__-gated "Reset local data" row in Settings. The caller
 * prompts the user to restart the app afterwards (in-memory zustand state isn't
 * cleared here — a relaunch rehydrates everything from the now-empty stores).
 */
export const resetLocalDeviceData = async (): Promise<void> => {
  // MMKV — synchronous, can't really fail, but guard anyway.
  try {
    storage.clearAll();
    canvasStorage.clearAll();
  } catch (err) {
    console.warn("[resetLocalDeviceData] MMKV clear failed", err);
  }

  await Promise.allSettled([
    AsyncStorage.clear(),
    clearAllAuth(),
    clearAllArtworkFiles(),
  ]);
};
