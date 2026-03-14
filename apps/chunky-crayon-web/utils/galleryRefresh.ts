/**
 * Utility for signaling that galleries need to refresh their data.
 * Uses localStorage to communicate between components.
 */

const REFRESH_KEY = 'chunky-crayon-gallery-refresh';

type RefreshSignal = {
  timestamp: number;
  type: 'image-created' | 'image-deleted';
};

/**
 * Signal that galleries should refresh (call after creating/deleting images)
 */
export function signalGalleryRefresh(
  type: RefreshSignal['type'] = 'image-created',
): void {
  try {
    const signal: RefreshSignal = {
      timestamp: Date.now(),
      type,
    };
    localStorage.setItem(REFRESH_KEY, JSON.stringify(signal));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the last refresh signal timestamp
 */
export function getLastRefreshSignal(): number | null {
  try {
    const stored = localStorage.getItem(REFRESH_KEY);
    if (!stored) return null;
    const signal: RefreshSignal = JSON.parse(stored);
    return signal.timestamp;
  } catch {
    return null;
  }
}

/**
 * Clear the refresh signal (call after refreshing)
 */
export function clearRefreshSignal(): void {
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if refresh is needed (signal is newer than given timestamp)
 */
export function shouldRefresh(mountedAt: number): boolean {
  const lastSignal = getLastRefreshSignal();
  if (!lastSignal) return false;
  return lastSignal > mountedAt;
}
