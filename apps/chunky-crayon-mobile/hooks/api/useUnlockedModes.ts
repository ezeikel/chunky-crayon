import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnlockedModes,
  setModeUnlocked,
  type UnlockedModesResponse,
} from "@/api";
import {
  getUnlockedModesFromStorage,
  addUnlockedModeToStorage,
} from "@/lib/scene/unlock-storage";
import type { GateableMode } from "@/lib/scene/modes";

/**
 * Effective unlocked-mode set = server (DB) ∪ local (AsyncStorage).
 *
 * Mirrors web's InputModeSelector merge logic. The server is the source of
 * truth; the local cache makes a just-unlocked mode light up instantly and
 * survives an offline reload. Both paths converge on the same UI.
 *
 * Returns:
 *   - `unlockedModes`: the merged set (always excludes scene — scene is
 *     never gateable and is handled in the selector, not here).
 *   - `isUnlocked(mode)`: convenience predicate.
 *   - `unlockMode(mode)`: persist an unlock to BOTH server + local cache.
 *     The caller is responsible for passing the parent gate first.
 */
export const useUnlockedModes = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<UnlockedModesResponse>({
    queryKey: ["unlockedModes"],
    queryFn: getUnlockedModes,
  });

  const [localUnlocks, setLocalUnlocks] = useState<GateableMode[]>([]);
  useEffect(() => {
    let active = true;
    getUnlockedModesFromStorage().then((modes) => {
      if (active) setLocalUnlocks(modes);
    });
    return () => {
      active = false;
    };
  }, []);

  const serverUnlocks = data?.unlockedModes ?? [];
  const unlockedModes = Array.from(
    new Set<GateableMode>([...serverUnlocks, ...localUnlocks]),
  );

  const isUnlocked = useCallback(
    (mode: GateableMode) => unlockedModes.includes(mode),
    [unlockedModes],
  );

  /**
   * Persist an unlock. Writes the local cache immediately (optimistic) then
   * the server; refetches the server query so the merged set converges.
   * Returns true on server success, false otherwise — the local optimistic
   * write stays either way (best-effort; matches "decided once" model).
   */
  const unlockMode = useCallback(
    async (mode: GateableMode): Promise<boolean> => {
      const next = await addUnlockedModeToStorage(mode);
      setLocalUnlocks(next);

      try {
        const res = await setModeUnlocked(mode, true);
        await queryClient.invalidateQueries({ queryKey: ["unlockedModes"] });
        return res.success === true;
      } catch {
        return false;
      }
    },
    [queryClient],
  );

  return { unlockedModes, isUnlocked, unlockMode, isLoading };
};

export default useUnlockedModes;
