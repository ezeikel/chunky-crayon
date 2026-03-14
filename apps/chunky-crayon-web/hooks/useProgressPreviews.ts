'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ProgressPreview,
  GetProgressPreviewsResponse,
} from '@/app/api/canvas/previews/route';

// Global cache to share previews across component instances
const previewCache = new Map<string, string | null>();
const pendingFetches = new Set<string>();

type UseProgressPreviewsResult = {
  /** Map of coloringImageId to previewUrl (null if no preview) */
  previews: Map<string, string | null>;
  /** Whether any previews are still loading */
  isLoading: boolean;
  /** Get preview URL for a specific image (returns undefined if not yet loaded) */
  getPreview: (coloringImageId: string) => string | null | undefined;
};

/**
 * Hook to fetch and cache progress preview thumbnails for coloring images.
 * Automatically fetches previews for the provided image IDs and caches results.
 *
 * @param imageIds - Array of coloring image IDs to fetch previews for
 * @returns Object with previews map, loading state, and getPreview helper
 */
export function useProgressPreviews(
  imageIds: string[],
): UseProgressPreviewsResult {
  const [previews, setPreviews] = useState<Map<string, string | null>>(
    () => new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  // Fetch previews for image IDs not already cached
  useEffect(() => {
    mountedRef.current = true;

    const fetchPreviews = async () => {
      // Filter to only IDs we haven't fetched yet
      const uncachedIds = imageIds.filter(
        (id) => !previewCache.has(id) && !pendingFetches.has(id),
      );

      if (uncachedIds.length === 0) {
        // All requested IDs are already cached, just update local state
        const cached = new Map<string, string | null>();
        imageIds.forEach((id) => {
          if (previewCache.has(id)) {
            cached.set(id, previewCache.get(id)!);
          }
        });
        setPreviews(cached);
        return;
      }

      // Mark IDs as pending to avoid duplicate fetches
      uncachedIds.forEach((id) => pendingFetches.add(id));
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/canvas/previews?imageIds=${uncachedIds.join(',')}`,
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch previews: ${response.status}`);
        }

        const data: GetProgressPreviewsResponse = await response.json();

        // Update global cache with fetched previews
        const fetchedMap = new Map<string, string | null>();
        data.previews.forEach((p) => {
          fetchedMap.set(p.coloringImageId, p.previewUrl);
          previewCache.set(p.coloringImageId, p.previewUrl);
        });

        // Mark IDs without previews as null in cache
        uncachedIds.forEach((id) => {
          if (!fetchedMap.has(id)) {
            previewCache.set(id, null);
          }
          pendingFetches.delete(id);
        });

        // Update local state with all requested previews from cache
        if (mountedRef.current) {
          const allPreviews = new Map<string, string | null>();
          imageIds.forEach((id) => {
            if (previewCache.has(id)) {
              allPreviews.set(id, previewCache.get(id)!);
            }
          });
          setPreviews(allPreviews);
        }
      } catch (error) {
        console.error('[useProgressPreviews] Error fetching previews:', error);
        // Clear pending status on error
        uncachedIds.forEach((id) => pendingFetches.delete(id));
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    if (imageIds.length > 0) {
      fetchPreviews();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [imageIds.join(',')]); // Re-fetch when image IDs change

  // Helper to get a single preview
  const getPreview = useCallback(
    (coloringImageId: string): string | null | undefined => {
      if (previews.has(coloringImageId)) {
        return previews.get(coloringImageId);
      }
      // Check global cache for items fetched by other instances
      if (previewCache.has(coloringImageId)) {
        return previewCache.get(coloringImageId);
      }
      return undefined; // Not yet loaded
    },
    [previews],
  );

  return {
    previews,
    isLoading,
    getPreview,
  };
}

/**
 * Invalidate cached preview for an image (call after saving new progress)
 */
export function invalidatePreviewCache(coloringImageId: string): void {
  previewCache.delete(coloringImageId);
}

/**
 * Clear entire preview cache (call on logout)
 */
export function clearPreviewCache(): void {
  previewCache.clear();
}
