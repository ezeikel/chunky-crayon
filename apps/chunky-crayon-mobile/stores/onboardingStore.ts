import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type OnboardingState = {
  hasCompleted: boolean;
};

type OnboardingActions = {
  complete: () => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      hasCompleted: false,
      complete: () => set({ hasCompleted: true }),
      reset: () => set({ hasCompleted: false }),
    }),
    {
      name: "onboarding-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
