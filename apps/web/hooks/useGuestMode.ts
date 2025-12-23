'use client';

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Constants
// =============================================================================

const GUEST_STORAGE_KEY = 'chunky_crayon_guest';
const MAX_GUEST_GENERATIONS = 2;

// =============================================================================
// Types
// =============================================================================

type GuestData = {
  generationCount: number;
  firstGenerationAt: string | null;
  lastGenerationAt: string | null;
};

type UseGuestModeResult = {
  /** Whether in guest mode (not signed in) */
  isGuest: boolean;
  /** Number of generations remaining for guest */
  generationsRemaining: number;
  /** Total generations used by guest */
  generationsUsed: number;
  /** Whether guest can still generate */
  canGenerate: boolean;
  /** Increment the generation counter (call after successful generation) */
  incrementGeneration: () => void;
  /** Reset guest data (useful for testing) */
  resetGuestData: () => void;
  /** Maximum allowed guest generations */
  maxGenerations: number;
  /** Whether guest data has been loaded from storage */
  isLoaded: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

const getGuestData = (): GuestData => {
  if (typeof window === 'undefined') {
    return {
      generationCount: 0,
      firstGenerationAt: null,
      lastGenerationAt: null,
    };
  }

  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as GuestData;
    }
  } catch (error) {
    console.error('Error reading guest data:', error);
  }

  return {
    generationCount: 0,
    firstGenerationAt: null,
    lastGenerationAt: null,
  };
};

const saveGuestData = (data: GuestData): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving guest data:', error);
  }
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing guest/anonymous user generation limits.
 *
 * Allows users to try 2 free generations before requiring signup.
 * Tracks usage in localStorage for persistence across page refreshes.
 *
 * @param isSignedIn - Whether the user is signed in (from useUser)
 * @returns Guest mode state and actions
 *
 * @example
 * ```tsx
 * const { isSignedIn } = useUser();
 * const { canGenerate, generationsRemaining, incrementGeneration } = useGuestMode(isSignedIn);
 *
 * // Check if user can generate (either signed in OR guest with remaining)
 * if (isSignedIn || canGenerate) {
 *   // Allow generation
 * }
 * ```
 */
export function useGuestMode(isSignedIn: boolean): UseGuestModeResult {
  const [guestData, setGuestData] = useState<GuestData>({
    generationCount: 0,
    firstGenerationAt: null,
    lastGenerationAt: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load guest data from localStorage on mount
  useEffect(() => {
    const data = getGuestData();
    setGuestData(data);
    setIsLoaded(true);
  }, []);

  // Calculate derived values
  const isGuest = !isSignedIn;
  const generationsUsed = guestData.generationCount;
  const generationsRemaining = Math.max(
    0,
    MAX_GUEST_GENERATIONS - generationsUsed,
  );
  const canGenerate = generationsRemaining > 0;

  // Increment generation count
  const incrementGeneration = useCallback(() => {
    const now = new Date().toISOString();
    const newData: GuestData = {
      generationCount: guestData.generationCount + 1,
      firstGenerationAt: guestData.firstGenerationAt || now,
      lastGenerationAt: now,
    };
    setGuestData(newData);
    saveGuestData(newData);
  }, [guestData]);

  // Reset guest data (useful for testing)
  const resetGuestData = useCallback(() => {
    const emptyData: GuestData = {
      generationCount: 0,
      firstGenerationAt: null,
      lastGenerationAt: null,
    };
    setGuestData(emptyData);
    saveGuestData(emptyData);
  }, []);

  return {
    isGuest,
    generationsRemaining,
    generationsUsed,
    canGenerate,
    incrementGeneration,
    resetGuestData,
    maxGenerations: MAX_GUEST_GENERATIONS,
    isLoaded,
  };
}

export default useGuestMode;
