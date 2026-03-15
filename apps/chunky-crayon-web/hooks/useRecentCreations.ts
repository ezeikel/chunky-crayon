'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'chunky-crayon-recent-creations';
const MAX_RECENT_CREATIONS = 6;

export type RecentCreation = {
  id: string;
  createdAt: number; // timestamp
};

/**
 * Hook for managing recent guest creations in localStorage.
 * Stores up to 6 most recent image IDs for guests to find their creations.
 */
export const useRecentCreations = () => {
  const [recentCreations, setRecentCreations] = useState<RecentCreation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentCreation[];
        // Filter out any that are older than 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const valid = parsed.filter((c) => c.createdAt > thirtyDaysAgo);
        setRecentCreations(valid);
        // Update storage if we filtered any out
        if (valid.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        }
      }
    } catch (error) {
      console.error('Failed to load recent creations:', error);
    }
    setIsLoaded(true);
  }, []);

  // Add a new creation
  const addCreation = useCallback((imageId: string) => {
    setRecentCreations((prev) => {
      // Remove if already exists (to move to front)
      const filtered = prev.filter((c) => c.id !== imageId);
      const newCreation: RecentCreation = {
        id: imageId,
        createdAt: Date.now(),
      };
      // Add to front, limit to max
      const updated = [newCreation, ...filtered].slice(0, MAX_RECENT_CREATIONS);
      // Persist to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent creation:', error);
      }
      return updated;
    });
  }, []);

  // Clear all recent creations (e.g., after sign up)
  const clearCreations = useCallback(() => {
    setRecentCreations([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recent creations:', error);
    }
  }, []);

  // Get just the IDs - memoized to prevent infinite re-renders in consumers
  const recentIds = useMemo(
    () => recentCreations.map((c) => c.id),
    [recentCreations],
  );

  return {
    recentCreations,
    recentIds,
    addCreation,
    clearCreations,
    isLoaded,
    hasCreations: recentCreations.length > 0,
  };
};

export default useRecentCreations;
