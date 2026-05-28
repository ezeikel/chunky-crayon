/**
 * Local mode-unlock storage (mobile).
 *
 * Mirror of web's `lib/scene/unlock-cookie.ts`. The DB (`Profile.unlocked-
 * Modes`, read/written over the mobile HTTP route) is the source of truth,
 * but we also keep a local AsyncStorage cache so:
 *   - a just-unlocked mode lights up instantly without a refetch, and
 *   - an offline / slow-network reload still reflects past unlocks.
 *
 * The mental model matches web: "this parent decided their kid can use
 * this once" — once unlocked, it stays unlocked; we never re-ask. Effective
 * unlock set is server ∪ local (see `useUnlockedModes`).
 *
 * Storage shape: a single JSON array of gateable modes under
 * `cc_unlocked_modes`, kept human-readable for debugging.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { GATEABLE_MODES, isGateableMode, type GateableMode } from "./modes";

const STORAGE_KEY = "cc_unlocked_modes";

/** Read the locally cached unlocked modes (valid gateable modes only). */
export const getUnlockedModesFromStorage = async (): Promise<
  GateableMode[]
> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGateableMode);
  } catch {
    return [];
  }
};

/**
 * Add one mode to the local set (idempotent). Writes the full stable-
 * ordered set and returns it so callers can update state in lockstep.
 */
export const addUnlockedModeToStorage = async (
  mode: GateableMode,
): Promise<GateableMode[]> => {
  const current = new Set(await getUnlockedModesFromStorage());
  current.add(mode);
  const next = GATEABLE_MODES.filter((m) => current.has(m));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort cache; the server write is the source of truth.
  }
  return next;
};

/** Remove one mode from the local set (used when re-locking from settings). */
export const removeUnlockedModeFromStorage = async (
  mode: GateableMode,
): Promise<GateableMode[]> => {
  const current = new Set(await getUnlockedModesFromStorage());
  current.delete(mode);
  const next = GATEABLE_MODES.filter((m) => current.has(m));
  try {
    if (next.length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Best-effort.
  }
  return next;
};
