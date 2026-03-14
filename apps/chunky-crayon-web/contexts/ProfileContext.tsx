'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { ProfileWithStats } from '@/lib/profiles/service';

type ProfileContextValue = {
  profiles: ProfileWithStats[];
  activeProfile: ProfileWithStats | null;
  isProfileSwitcherOpen: boolean;
  isCreateModalOpen: boolean;
  openProfileSwitcher: () => void;
  closeProfileSwitcher: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

type ProfileProviderProps = {
  children: ReactNode;
  profiles: ProfileWithStats[];
  activeProfile: ProfileWithStats | null;
};

export const ProfileProvider = ({
  children,
  profiles,
  activeProfile,
}: ProfileProviderProps) => {
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const openProfileSwitcher = useCallback(() => {
    setIsProfileSwitcherOpen(true);
  }, []);

  const closeProfileSwitcher = useCallback(() => {
    setIsProfileSwitcherOpen(false);
  }, []);

  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      profiles,
      activeProfile,
      isProfileSwitcherOpen,
      isCreateModalOpen,
      openProfileSwitcher,
      closeProfileSwitcher,
      openCreateModal,
      closeCreateModal,
    }),
    [
      profiles,
      activeProfile,
      isProfileSwitcherOpen,
      isCreateModalOpen,
      openProfileSwitcher,
      closeProfileSwitcher,
      openCreateModal,
      closeCreateModal,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextValue => {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }

  return context;
};

// Hook that returns null instead of throwing when used outside provider
// Useful for components that may be rendered with or without profile context
export const useProfileSafe = (): ProfileContextValue | null => {
  return useContext(ProfileContext);
};
