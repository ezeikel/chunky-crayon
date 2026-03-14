import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSavedArtworks,
  saveArtwork,
  type SavedArtworksResponse,
  type SaveArtworkInput,
} from "@/api";

/**
 * Hook to fetch saved artworks for the current user/profile
 */
export const useSavedArtworks = () =>
  useQuery<SavedArtworksResponse>({
    queryKey: ["savedArtworks"],
    queryFn: getSavedArtworks,
  });

/**
 * Hook to save an artwork to the gallery
 */
export const useSaveArtwork = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveArtworkInput) => saveArtwork(input),
    onSuccess: (data) => {
      // Invalidate saved artworks to refetch the list
      queryClient.invalidateQueries({ queryKey: ["savedArtworks"] });

      // If there was an evolution, invalidate colo state
      if (data.evolutionResult) {
        queryClient.invalidateQueries({ queryKey: ["coloState"] });
      }

      // If new stickers were awarded, invalidate stickers
      if (data.newStickers && data.newStickers.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["stickers"] });
      }

      // Invalidate user data to update artwork count
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export default useSavedArtworks;
