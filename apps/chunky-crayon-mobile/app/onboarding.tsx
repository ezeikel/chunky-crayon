import { useCallback } from "react";
import { router } from "expo-router";
import { OnboardingCarousel } from "@/components/Onboarding";
import { useOnboardingStore } from "@/stores/onboardingStore";

const OnboardingScreen = () => {
  const complete = useOnboardingStore((s) => s.complete);

  const handleComplete = useCallback(() => {
    complete();
    router.replace("/(tabs)");
  }, [complete]);

  return <OnboardingCarousel onComplete={handleComplete} />;
};

export default OnboardingScreen;
