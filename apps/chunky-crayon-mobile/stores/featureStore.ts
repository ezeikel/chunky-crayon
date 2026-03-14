import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Feature flags for gradual rollout of tablet experience features.
 * All Phase 1 features default to ON after testing.
 */

export type FeatureState = {
  // Phase 1 features - Default ON
  /** Enable tablet and phone landscape layouts */
  responsiveLayout: boolean;
  /** Enable Apple Pencil pressure sensitivity */
  pressureSensitivity: boolean;
  /** Enable two-finger undo, three-finger redo */
  advancedGestures: boolean;
  /** Enable Douglas-Peucker path simplification */
  pathSimplification: boolean;
  /** Enable texture-based brushes */
  texturedBrushes: boolean;

  // User preferences
  /** Enable haptic feedback */
  hapticsEnabled: boolean;
  /** Side toolbar expanded state (for phone landscape) */
  sideToolbarExpanded: boolean;
};

type FeatureActions = {
  // Toggle individual features
  setResponsiveLayout: (enabled: boolean) => void;
  setPressureSensitivity: (enabled: boolean) => void;
  setAdvancedGestures: (enabled: boolean) => void;
  setPathSimplification: (enabled: boolean) => void;
  setTexturedBrushes: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSideToolbarExpanded: (expanded: boolean) => void;
  toggleSideToolbar: () => void;

  // Bulk operations
  resetToDefaults: () => void;
};

const initialState: FeatureState = {
  // Phase 1 - ON by default
  responsiveLayout: true,
  pressureSensitivity: true,
  advancedGestures: true,
  pathSimplification: true,
  texturedBrushes: false, // OFF until tested

  // User preferences
  hapticsEnabled: true,
  sideToolbarExpanded: true,
};

export const useFeatureStore = create<FeatureState & FeatureActions>()(
  persist(
    (set) => ({
      ...initialState,

      // Individual toggles
      setResponsiveLayout: (enabled) => set({ responsiveLayout: enabled }),
      setPressureSensitivity: (enabled) =>
        set({ pressureSensitivity: enabled }),
      setAdvancedGestures: (enabled) => set({ advancedGestures: enabled }),
      setPathSimplification: (enabled) => set({ pathSimplification: enabled }),
      setTexturedBrushes: (enabled) => set({ texturedBrushes: enabled }),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setSideToolbarExpanded: (expanded) =>
        set({ sideToolbarExpanded: expanded }),
      toggleSideToolbar: () =>
        set((state) => ({ sideToolbarExpanded: !state.sideToolbarExpanded })),

      // Bulk operations
      resetToDefaults: () => set(initialState),
    }),
    {
      name: "feature-store",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences, not feature flags
      // (feature flags should be controlled by code/remote config)
      partialize: (state) => ({
        hapticsEnabled: state.hapticsEnabled,
        sideToolbarExpanded: state.sideToolbarExpanded,
      }),
    },
  ),
);
