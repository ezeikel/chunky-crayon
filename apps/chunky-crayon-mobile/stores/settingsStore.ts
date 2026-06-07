import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * User-facing device/app preferences (persisted). Currently just the haptics
 * (Vibration) toggle; sound/music toggles can move here when they're wired up.
 *
 * The haptics value is mirrored into the haptics module (setHapticsEnabled) so
 * the ~170 fire-and-forget call sites + the continuous BrushHapticController all
 * respect it without per-call-site plumbing. The mirror happens on rehydrate
 * (app start) and on every toggle.
 */
type SettingsState = {
  hapticsEnabled: boolean;
};

type SettingsActions = {
  setHapticsEnabled: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
    }),
    {
      name: "settings-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
