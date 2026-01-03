import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getColoState,
  checkColoEvolution,
  type ColoStateResponse,
} from "@/api";

/**
 * Hook to fetch the current Colo state for the active profile
 */
export const useColoState = () =>
  useQuery<ColoStateResponse>({
    queryKey: ["coloState"],
    queryFn: getColoState,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

/**
 * Hook to check for Colo evolution (typically called after saving artwork)
 */
export const useCheckColoEvolution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId?: string) => checkColoEvolution(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coloState"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export default useColoState;
