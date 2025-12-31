import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProfiles,
  createProfile,
  getActiveProfile,
  setActiveProfile,
  type ProfilesResponse,
  type ActiveProfileResponse,
  type CreateProfileInput,
} from "@/api";

/**
 * Hook to fetch all profiles for the current user
 */
export const useProfiles = () =>
  useQuery<ProfilesResponse>({
    queryKey: ["profiles"],
    queryFn: getProfiles,
  });

/**
 * Hook to fetch the active profile
 */
export const useActiveProfile = () =>
  useQuery<ActiveProfileResponse>({
    queryKey: ["activeProfile"],
    queryFn: getActiveProfile,
  });

/**
 * Hook to create a new profile
 */
export const useCreateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProfileInput) => createProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

/**
 * Hook to set the active profile
 */
export const useSetActiveProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => setActiveProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeProfile"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["savedArtworks"] });
      queryClient.invalidateQueries({ queryKey: ["coloState"] });
    },
  });
};

export default useProfiles;
