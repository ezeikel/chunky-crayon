"use client";

import { useState, useEffect, useCallback } from "react";

// =============================================================================
// Constants
// =============================================================================

const GUEST_STORAGE_KEY = "coloring-habitat-guest";
const MAX_GUEST_GENERATIONS_PER_DAY = 2;

// =============================================================================
// Types
// =============================================================================

type GuestData = {
  generationCount: number;
  date: string; // ISO date string (YYYY-MM-DD) for daily reset
};

type UseGuestModeResult = {
  /** Number of free generations remaining today */
  remainingGenerations: number;
  /** Whether the guest has used at least one free generation today */
  hasUsedFreeGeneration: boolean;
  /** Record a generation (call after successful generation) */
  recordGeneration: () => void;
  /** Whether the guest can still generate today */
  canGenerate: boolean;
  /** Maximum allowed guest generations per day */
  maxGenerations: number;
  /** Whether guest data has been loaded from storage */
  isLoaded: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

const getTodayDate = (): string => new Date().toISOString().split("T")[0];

const getGuestData = (): GuestData => {
  if (typeof window === "undefined") {
    return { generationCount: 0, date: getTodayDate() };
  }

  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as GuestData;

      // Reset if it's a new day
      if (data.date !== getTodayDate()) {
        return { generationCount: 0, date: getTodayDate() };
      }

      return data;
    }
  } catch (error) {
    console.error("Error reading guest data:", error);
  }

  return { generationCount: 0, date: getTodayDate() };
};

const saveGuestData = (data: GuestData): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving guest data:", error);
  }
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing guest/anonymous user daily generation limits.
 *
 * Allows anonymous users to try a configurable number of free generations
 * per day before requiring signup. Resets daily.
 * Tracks usage in localStorage for persistence across page refreshes.
 */
export function useGuestMode(): UseGuestModeResult {
  const [guestData, setGuestData] = useState<GuestData>({
    generationCount: 0,
    date: getTodayDate(),
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load guest data from localStorage on mount
  useEffect(() => {
    const data = getGuestData();
    setGuestData(data);
    saveGuestData(data); // persist the (possibly reset) data
    setIsLoaded(true);
  }, []);

  // Calculate derived values
  const remainingGenerations = Math.max(
    0,
    MAX_GUEST_GENERATIONS_PER_DAY - guestData.generationCount,
  );
  const canGenerate = remainingGenerations > 0;
  const hasUsedFreeGeneration = guestData.generationCount > 0;

  // Record a generation
  const recordGeneration = useCallback(() => {
    const today = getTodayDate();
    const currentData =
      guestData.date === today
        ? guestData
        : { generationCount: 0, date: today };

    const newData: GuestData = {
      generationCount: currentData.generationCount + 1,
      date: today,
    };
    setGuestData(newData);
    saveGuestData(newData);
  }, [guestData]);

  return {
    remainingGenerations,
    hasUsedFreeGeneration,
    recordGeneration,
    canGenerate,
    maxGenerations: MAX_GUEST_GENERATIONS_PER_DAY,
    isLoaded,
  };
}

export default useGuestMode;
