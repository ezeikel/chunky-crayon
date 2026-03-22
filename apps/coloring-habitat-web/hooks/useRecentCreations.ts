import { useEffect, useState } from "react";
import {
  getRecentCreations,
  type RecentCreation,
} from "@/app/actions/recent-creations";

type UseRecentCreationsReturn = {
  creations: RecentCreation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

/**
 * Hook to fetch the current user's most recent saved artworks.
 * Calls the server action on mount and exposes a refresh function.
 */
export function useRecentCreations(
  limit: number = 6,
): UseRecentCreationsReturn {
  const [creations, setCreations] = useState<RecentCreation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCreations() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getRecentCreations(limit);
        if (!cancelled) {
          setCreations(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load creations",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchCreations();

    return () => {
      cancelled = true;
    };
  }, [limit, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return { creations, isLoading, error, refresh };
}
