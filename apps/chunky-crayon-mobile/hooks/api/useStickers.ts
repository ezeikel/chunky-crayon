import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStickers,
  markStickersAsViewed,
  type StickersResponse,
} from "@/api";

/**
 * Hook to fetch all stickers with unlock status
 */
export const useStickers = () =>
  useQuery<StickersResponse>({
    queryKey: ["stickers"],
    queryFn: getStickers,
  });

/**
 * Hook to mark stickers as viewed (removes NEW badge)
 */
export const useMarkStickersAsViewed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stickerIds: string[]) => markStickersAsViewed(stickerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stickers"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export default useStickers;
