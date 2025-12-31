import { createContext, useContext, ReactNode } from "react";
import { useUser } from "@/hooks/api";
import type { UserResponse } from "@/api";

type UserContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: UserResponse["user"];
  activeProfile: UserResponse["activeProfile"];
  stickerStats: UserResponse["stickerStats"];
  refetch: () => void;
};

const defaultStickerStats = {
  totalUnlocked: 0,
  totalPossible: 0,
  newCount: 0,
};

const UserContext = createContext<UserContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  activeProfile: null,
  stickerStats: defaultStickerStats,
  refetch: () => {},
});

export const useUserContext = () => {
  const context = useContext(UserContext);
  return context;
};

type UserProviderProps = {
  children: ReactNode;
};

export const UserProvider = ({ children }: UserProviderProps) => {
  const { data, isLoading, refetch } = useUser();

  const value: UserContextType = {
    isLoading,
    isAuthenticated: !!data?.user,
    user: data?.user ?? null,
    activeProfile: data?.activeProfile ?? null,
    stickerStats: data?.stickerStats ?? defaultStickerStats,
    refetch: () => refetch(),
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;
