import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ColoStage, ColoState, EvolutionResult } from "@/lib/colo";
import { getColoState, checkEvolution, COLO_STAGES } from "@/lib/colo";

const COLO_STORAGE_KEY = "@colo_state";

type StoredColoData = {
  stage: ColoStage;
  accessories: string[];
  artworkCount: number;
  lastUpdated: string;
};

const DEFAULT_COLO_DATA: StoredColoData = {
  stage: 1,
  accessories: [],
  artworkCount: 0,
  lastUpdated: new Date().toISOString(),
};

/**
 * Hook for managing Colo evolution state
 *
 * Persists state to AsyncStorage for offline support.
 * Will sync with server when authentication is added.
 */
const useColo = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [coloData, setColoData] = useState<StoredColoData>(DEFAULT_COLO_DATA);
  const [pendingEvolution, setPendingEvolution] =
    useState<EvolutionResult | null>(null);

  // Derived state
  const coloState: ColoState = getColoState(
    coloData.stage,
    coloData.accessories,
    coloData.artworkCount,
  );

  // Load state from storage on mount
  useEffect(() => {
    const loadColoData = async () => {
      try {
        const stored = await AsyncStorage.getItem(COLO_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StoredColoData;
          setColoData(parsed);
        }
      } catch (error) {
        console.error("Failed to load Colo data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadColoData();
  }, []);

  // Save state to storage whenever it changes
  const saveColoData = useCallback(async (data: StoredColoData) => {
    try {
      await AsyncStorage.setItem(COLO_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save Colo data:", error);
    }
  }, []);

  /**
   * Record a new artwork and check for evolution.
   * Call this after saving an artwork.
   *
   * @param stats - Optional additional stats for accessory unlocks
   * @returns Evolution result if evolution or accessory unlock occurred
   */
  const recordArtwork = useCallback(
    async (stats?: {
      stickerCount?: number;
      categoryArtworkCounts?: Record<string, number>;
      totalColorsUsed?: number;
      isSpecialOccasion?: boolean;
    }): Promise<EvolutionResult | null> => {
      const newArtworkCount = coloData.artworkCount + 1;

      // Check for evolution
      const result = checkEvolution(
        coloData.stage,
        coloData.accessories,
        newArtworkCount,
        stats,
      );

      // Update state
      const newData: StoredColoData = {
        stage: result.newStage,
        accessories: [...coloData.accessories, ...result.newAccessories],
        artworkCount: newArtworkCount,
        lastUpdated: new Date().toISOString(),
      };

      setColoData(newData);
      await saveColoData(newData);

      // If evolution or new accessories, set pending for celebration
      if (result.evolved || result.newAccessories.length > 0) {
        setPendingEvolution(result);
        return result;
      }

      return null;
    },
    [coloData, saveColoData],
  );

  /**
   * Dismiss the pending evolution celebration
   */
  const dismissEvolution = useCallback(() => {
    setPendingEvolution(null);
  }, []);

  /**
   * Manually set the artwork count (useful for syncing with server)
   */
  const setArtworkCount = useCallback(
    async (count: number) => {
      const newStage = getStageForCount(count);

      const newData: StoredColoData = {
        ...coloData,
        artworkCount: count,
        stage: newStage,
        lastUpdated: new Date().toISOString(),
      };

      setColoData(newData);
      await saveColoData(newData);
    },
    [coloData, saveColoData],
  );

  /**
   * Reset Colo to initial state (for testing or profile switch)
   */
  const resetColo = useCallback(async () => {
    setColoData(DEFAULT_COLO_DATA);
    await saveColoData(DEFAULT_COLO_DATA);
    setPendingEvolution(null);
  }, [saveColoData]);

  return {
    isLoading,
    coloState,
    artworkCount: coloData.artworkCount,
    pendingEvolution,
    recordArtwork,
    dismissEvolution,
    setArtworkCount,
    resetColo,
  };
};

/**
 * Helper to get stage for a given artwork count
 */
const getStageForCount = (count: number): ColoStage => {
  const stages: ColoStage[] = [6, 5, 4, 3, 2, 1];
  for (const stage of stages) {
    if (count >= COLO_STAGES[stage].requiredArtworks) {
      return stage;
    }
  }
  return 1;
};

export default useColo;
