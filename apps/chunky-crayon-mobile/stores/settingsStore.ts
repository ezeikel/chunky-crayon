import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupportedLocale } from "@one-colored-pixel/translations";

/**
 * User-facing device/app preferences (persisted). Holds the haptics (Vibration)
 * toggle and the language override; sound/music toggles can move here when
 * they're wired up.
 *
 * The haptics value is mirrored into the haptics module (setHapticsEnabled) so
 * the ~170 fire-and-forget call sites + the continuous BrushHapticController all
 * respect it without per-call-site plumbing. The mirror happens on rehydrate
 * (app start) and on every toggle.
 *
 * `preferredLocale` is the user's explicit language choice from the in-app
 * switcher. `null` means "follow the device language" (the default). When set,
 * it overrides the device locale; _layout.tsx mirrors it into i18next on
 * rehydrate and on every change (same reactive pattern as haptics).
 */
type SettingsState = {
  hapticsEnabled: boolean;
  preferredLocale: SupportedLocale | null;
};

type SettingsActions = {
  setHapticsEnabled: (enabled: boolean) => void;
  setPreferredLocale: (locale: SupportedLocale | null) => void;
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      preferredLocale: null,
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setPreferredLocale: (locale) => set({ preferredLocale: locale }),
    }),
    {
      name: "settings-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
