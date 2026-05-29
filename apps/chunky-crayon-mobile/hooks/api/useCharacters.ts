import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCharacters,
  createCharacter,
  deleteCharacter,
  retryCharacterPortrait,
  type CharactersResponse,
  type CreateCharacterInput,
} from "@/api";

/**
 * Hook to fetch the active profile's characters.
 *
 * Portrait generation is async (the worker flips GENERATING → READY/FAILED),
 * so while any character is still GENERATING we poll every 4s; once all
 * settle we stop polling. This is what makes a freshly-created character's
 * portrait pop in without a manual refresh.
 */
export const useCharacters = () =>
  useQuery<CharactersResponse>({
    queryKey: ["characters"],
    queryFn: getCharacters,
    refetchInterval: (query) => {
      const characters = query.state.data?.characters ?? [];
      const anyGenerating = characters.some((c) => c.status === "GENERATING");
      return anyGenerating ? 4000 : false;
    },
  });

/**
 * Create a character. The row starts GENERATING; invalidating refetches
 * the list which then begins polling (see useCharacters) until the worker
 * finishes the portrait.
 */
export const useCreateCharacter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCharacterInput) => createCharacter(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
};

/**
 * Delete a character. The mobile client gates this behind the parental
 * check before calling; the route mints the scoped HMAC token server-side.
 */
export const useDeleteCharacter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
};

/** Re-run portrait generation for a FAILED character (flips back to GENERATING). */
export const useRetryCharacter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retryCharacterPortrait(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
};

export default useCharacters;
