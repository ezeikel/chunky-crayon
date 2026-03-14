import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getChallenges,
  claimChallengeReward,
  type ChallengesResponse,
} from "@/api";

/**
 * Hook to fetch challenges (current + history)
 */
export const useChallenges = () =>
  useQuery<ChallengesResponse>({
    queryKey: ["challenges"],
    queryFn: getChallenges,
    // Refresh every 5 minutes to update days remaining
    refetchInterval: 5 * 60 * 1000,
  });

/**
 * Hook to claim a challenge reward
 */
export const useClaimChallengeReward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weeklyChallengeId: string) =>
      claimChallengeReward(weeklyChallengeId),
    onSuccess: () => {
      // Refresh challenges to update claimed status
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      // Refresh stickers in case a sticker was awarded
      queryClient.invalidateQueries({ queryKey: ["stickers"] });
      // Refresh colo state in case an accessory was awarded
      queryClient.invalidateQueries({ queryKey: ["coloState"] });
    },
  });
};

export default useChallenges;
