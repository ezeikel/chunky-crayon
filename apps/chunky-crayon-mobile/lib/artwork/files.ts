import {
  documentDirectory,
  makeDirectoryAsync,
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
  EncodingType,
} from "expo-file-system/legacy";

/**
 * On-device PNG storage for the local-first artwork collection. The artwork
 * STORE (MMKV/zustand) keeps only tiny metadata + a file:// URI; the heavy PNG
 * bytes live on disk here. Files go in `documentDirectory` (persistent — unlike
 * `cacheDirectory`, which the OS may purge) under `artworks/`.
 *
 * Kept out of the zustand store so the store stays pure/synchronous; the store
 * holds the uri, these helpers own the I/O.
 */

const ARTWORK_DIR = `${documentDirectory}artworks/`;

const ensureDir = async (): Promise<void> => {
  const info = await getInfoAsync(ARTWORK_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(ARTWORK_DIR, { intermediates: true });
  }
};

/**
 * Write a captured-canvas PNG data URL to disk and return its file:// URI.
 * `dataUrl` is the `data:image/png;base64,...` string from captureCanvas().
 */
export const writeArtworkPng = async (
  artworkId: string,
  dataUrl: string,
): Promise<string> => {
  await ensureDir();
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const fileUri = `${ARTWORK_DIR}${artworkId}.png`;
  await writeAsStringAsync(fileUri, base64, { encoding: EncodingType.Base64 });
  return fileUri;
};

/** Delete a stored artwork PNG. Best-effort — never throws on a missing file. */
export const deleteArtworkFile = async (fileUri: string): Promise<void> => {
  try {
    await deleteAsync(fileUri, { idempotent: true });
  } catch {
    // Missing/already-gone file is fine; the store record is the source of truth.
  }
};

/**
 * Delete the WHOLE on-disk artwork directory (every saved PNG). Used by the dev
 * "reset local device data" tool. Best-effort — idempotent, never throws.
 */
export const clearAllArtworkFiles = async (): Promise<void> => {
  try {
    await deleteAsync(ARTWORK_DIR, { idempotent: true });
  } catch {
    // Already gone / never created — fine.
  }
};
