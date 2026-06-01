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
 * Two MMKV instances share the one read-once encryption key (via
 * `createEncryptedMMKV`): `storage` (the artwork store) and `canvasStorage`
 * (in-progress canvas autosave — migrated off AsyncStorage in #36). Each has its
 * own `id` so their key namespaces are fully isolated. The existing
 * onboarding/feature stores + lib/auth + unlock-storage still use AsyncStorage;
 * those are out of scope here.
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
// (id + encryptionKey) and the .set/.getString/.remove methods are unchanged.
//
// Resolve the encryption key ONCE at module load and reuse it for every
// instance — calling getOrCreateKey() per instance would do redundant keychain
// reads, and (worse) any transient failure on a later read could mint a second
// key and orphan that instance's data. One key, read once, shared.
const ENC_KEY = getOrCreateKey();

const createEncryptedMMKV = (id: string) =>
  createMMKV({ id, encryptionKey: ENC_KEY });

/** Backs the local-first artwork store (zustand persist). */
export const storage = createEncryptedMMKV("chunky-crayon-mmkv");

/**
 * Backs in-progress canvas autosave (`utils/canvasPersistence`, #36 — migrated
 * off AsyncStorage). Separate `id` from `storage` so the per-canvas action blobs
 * and the artwork metadata never share a key namespace.
 */
export const canvasStorage = createEncryptedMMKV("chunky-crayon-canvas");

/** zustand `persist` adapter over the encrypted MMKV instance.
 *  (v4 renamed `.delete()` → `.remove()`.) */
export const mmkvStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => {
    storage.remove(name);
  },
};
