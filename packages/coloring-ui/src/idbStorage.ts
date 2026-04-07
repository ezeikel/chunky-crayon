/**
 * Simple IndexedDB key-value store for coloring progress.
 *
 * Replaces localStorage for canvas snapshots to avoid the 5MB limit
 * and base64 encoding overhead. Stores data as structured objects
 * (no serialization needed for ImageData/Blobs).
 *
 * Falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = "coloring-progress";
const DB_VERSION = 1;
const STORE_NAME = "progress";

let dbPromise: Promise<IDBDatabase> | null = null;

/** Check if IndexedDB is available */
function isIDBAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/** Open or create the database */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIDBAvailable()) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Get a value from IndexedDB.
 * @returns The stored value, or null if not found.
 */
export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Set a value in IndexedDB.
 */
export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Silently fail — localStorage fallback will handle it
  }
}

/**
 * Delete a value from IndexedDB.
 */
export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Silently fail
  }
}

/**
 * Check if a key exists in IndexedDB.
 */
export async function idbHas(key: string): Promise<boolean> {
  const value = await idbGet(key);
  return value !== null;
}
