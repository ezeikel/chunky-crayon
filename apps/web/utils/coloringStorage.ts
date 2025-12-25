/**
 * Utility functions for saving/loading coloring progress to localStorage.
 * Uses base64-encoded canvas data for persistence.
 */

const STORAGE_KEY_PREFIX = 'coloring-progress-';

type SavedColoringData = {
  imageDataUrl: string;
  savedAt: number;
  coloringImageId: string;
};

/**
 * Get the storage key for a coloring image
 */
export const getStorageKey = (coloringImageId: string): string => {
  return `${STORAGE_KEY_PREFIX}${coloringImageId}`;
};

/**
 * Save canvas state to localStorage
 */
export const saveColoringProgress = (
  coloringImageId: string,
  canvas: HTMLCanvasElement,
): boolean => {
  try {
    const imageDataUrl = canvas.toDataURL('image/png');
    const data: SavedColoringData = {
      imageDataUrl,
      savedAt: Date.now(),
      coloringImageId,
    };
    localStorage.setItem(getStorageKey(coloringImageId), JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save coloring progress:', error);
    return false;
  }
};

/**
 * Load saved canvas state from localStorage
 * Returns a promise that resolves with an Image element, or null if no saved data
 */
export const loadColoringProgress = (
  coloringImageId: string,
): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    try {
      const stored = localStorage.getItem(getStorageKey(coloringImageId));
      if (!stored) {
        resolve(null);
        return;
      }

      const data: SavedColoringData = JSON.parse(stored);

      // Create image from saved data
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = data.imageDataUrl;
    } catch (error) {
      console.error('Failed to load coloring progress:', error);
      resolve(null);
    }
  });
};

/**
 * Check if saved progress exists for a coloring image
 */
export const hasSavedProgress = (coloringImageId: string): boolean => {
  try {
    return localStorage.getItem(getStorageKey(coloringImageId)) !== null;
  } catch {
    return false;
  }
};

/**
 * Clear saved progress for a coloring image
 */
export const clearColoringProgress = (coloringImageId: string): boolean => {
  try {
    localStorage.removeItem(getStorageKey(coloringImageId));
    return true;
  } catch (error) {
    console.error('Failed to clear coloring progress:', error);
    return false;
  }
};

/**
 * Get metadata about saved progress (without loading the full image)
 */
export const getSavedProgressInfo = (
  coloringImageId: string,
): { savedAt: number } | null => {
  try {
    const stored = localStorage.getItem(getStorageKey(coloringImageId));
    if (!stored) return null;

    const data: SavedColoringData = JSON.parse(stored);
    return { savedAt: data.savedAt };
  } catch {
    return null;
  }
};
