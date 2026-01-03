import { useUserContext, useColoContext } from "@/contexts";

/**
 * Hook to get data for the AppHeader component
 * Combines user data, profile data, and Colo state
 */
const useHeaderData = () => {
  const { isLoading: userLoading, user, activeProfile, stickerStats } = useUserContext();
  const { coloState, isLoading: coloLoading } = useColoContext();

  return {
    isLoading: userLoading || coloLoading,
    credits: user?.credits ?? 0,
    stickerCount: stickerStats.totalUnlocked,
    profileName: activeProfile?.name ?? "Artist",
    coloStage: coloState.stage,
    // Challenge progress would need a separate API - for now show artwork-based progress
    challengeProgress: activeProfile
      ? Math.min((activeProfile.artworkCount / 10) * 100, 100)
      : 0,
  };
};

export default useHeaderData;
