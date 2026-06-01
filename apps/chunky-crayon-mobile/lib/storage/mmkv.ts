import { createMMKV } from "react-native-mmkv";
import * as SecureStore from "expo-secure-store";
import type { StateStorage } from "zustand/middleware";

/**
 * Encrypted MMKV instance + a zustand `persist` storage adapter over it.
 *
 * Used as the backend for the local-first artwork store (offline-first, fast
 * synchronous writes). The encryption key is generated once and kept in the
 * iOS Keychain / Android encrypted prefs via expo-secure-store — at-rest
 * obfuscation for the kid's local artwork metadata, in line with the app's
 * local-first / no-PII posture. Secrets (device id, JWT) stay in secure-store
 * directly; this is only for the MMKV-backed stores.
 *
 * Canvas in-progress autosave (`utils/canvasPersistence`) and the existing
 * onboarding/feature stores deliberately stay on AsyncStorage — this MMKV
 * instance is scoped to the NEW artwork store only (separate `id`, separate
 * key namespace), so there's zero overlap with existing persistence.
 */

const ENC_KEY_NAME = "chunky_crayon_mmkv_key";

// Dependency-free 64-hex-char key (mirrors the UUID approach in lib/auth.ts —
// avoids pulling in expo-crypto). Not a CSPRNG; this is at-rest obfuscation
// for local thumbnails, not a secrets vault. Swap to expo-crypto later if we
// ever want a true CSPRNG — it's a one-function change.
const genHexKey = (): string =>
  "x".repeat(64).replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));

/**
 * Read-or-create the MMKV encryption key, SYNCHRONOUSLY (MMKV's constructor
 * needs it at module init). expo-secure-store ~56 exposes sync getItem/setItem.
 *
 * CRITICAL: never regenerate the key when one might already exist — a new key
 * makes the existing encrypted store unreadable and every saved artwork
 * silently "disappears". We only generate when getItem returns null. If the
 * keychain read ever throws transiently, we rethrow (fail closed) rather than
 * mint a fresh key that would orphan the data.
 */
const getOrCreateKey = (): string => {
  const existing = SecureStore.getItem(ENC_KEY_NAME);
  if (existing) return existing;
  const key = genHexKey();
  SecureStore.setItem(ENC_KEY_NAME, key);
  return key;
};

// react-native-mmkv v4 (Nitro): instances are created via the `createMMKV`
// factory (the v3 `new MMKV(...)` constructor was removed). Config shape
// (id + encryptionKey) and the .set/.getString/.delete methods are unchanged.
export const storage = createMMKV({
  id: "chunky-crayon-mmkv",
  encryptionKey: getOrCreateKey(),
});

/** zustand `persist` adapter over the encrypted MMKV instance.
 *  (v4 renamed `.delete()` → `.remove()`.) */
export const mmkvStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => {
    storage.remove(name);
  },
};
