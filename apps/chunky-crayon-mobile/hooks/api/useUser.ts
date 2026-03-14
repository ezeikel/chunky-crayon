import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, type UserResponse } from "@/api";

/**
 * Hook to fetch current user data including active profile and sticker stats
 */
const useUser = () =>
  useQuery<UserResponse>({
    queryKey: ["user"],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

export default useUser;
