/**
 * Gallery Refresh — Chunky Crayon
 *
 * Signals that galleries need to refresh their data.
 * Uses localStorage to communicate between components.
 * Inlined here to avoid pulling server-only deps from coloring-core into client bundle.
 */

type RefreshSignal = {
  timestamp: number;
  type: 'image-created' | 'image-deleted';
};

const REFRESH_KEY = 'chunky-crayon-gallery-refresh';

export function signalGalleryRefresh(
  type: RefreshSignal['type'] = 'image-created',
): void {
  try {
    const signal: RefreshSignal = { timestamp: Date.now(), type };
    localStorage.setItem(REFRESH_KEY, JSON.stringify(signal));
  } catch {
    // Ignore storage errors
  }
}

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

export function clearRefreshSignal(): void {
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function shouldRefresh(mountedAt: number): boolean {
  const lastSignal = getLastRefreshSignal();
  if (!lastSignal) return false;
  return lastSignal > mountedAt;
}
