/**
 * Utility for signaling that galleries need to refresh their data.
 * Uses localStorage to communicate between components.
 */

type RefreshSignal = {
  timestamp: number;
  type: "image-created" | "image-deleted";
};

/**
 * Create a gallery refresh utility with a specific storage key prefix.
 *
 * @param prefix - App-specific prefix (e.g. "chunky-crayon", "coloring-habitat")
 */
export function createGalleryRefresh(prefix: string) {
  const REFRESH_KEY = `${prefix}-gallery-refresh`;

  function signalGalleryRefresh(
    type: RefreshSignal["type"] = "image-created",
  ): void {
    try {
      const signal: RefreshSignal = { timestamp: Date.now(), type };
      localStorage.setItem(REFRESH_KEY, JSON.stringify(signal));
    } catch {
      // Ignore storage errors
    }
  }

  function getLastRefreshSignal(): number | null {
    try {
      const stored = localStorage.getItem(REFRESH_KEY);
      if (!stored) return null;
      const signal: RefreshSignal = JSON.parse(stored);
      return signal.timestamp;
    } catch {
      return null;
    }
  }

  function clearRefreshSignal(): void {
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  function shouldRefresh(mountedAt: number): boolean {
    const lastSignal = getLastRefreshSignal();
    if (!lastSignal) return false;
    return lastSignal > mountedAt;
  }

  return {
    signalGalleryRefresh,
    getLastRefreshSignal,
    clearRefreshSignal,
    shouldRefresh,
  };
}
