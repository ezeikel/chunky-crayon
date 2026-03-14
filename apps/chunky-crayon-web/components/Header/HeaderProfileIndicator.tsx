'use client';

import { ProfileProvider, useProfile } from '@/contexts/ProfileContext';
import ProfileIndicator from '@/components/ProfileIndicator/ProfileIndicator';
import ProfileUI from '@/components/ProfileUI/ProfileUI';
import type { ProfileWithStats } from '@/lib/profiles/service';

type HeaderProfileIndicatorProps = {
  profiles: ProfileWithStats[];
  activeProfile: ProfileWithStats | null;
};

// Inner component that uses the context
const ProfileIndicatorWithContext = () => {
  const { profiles, activeProfile, openCreateModal } = useProfile();

  // Don't show if no profiles (new user hasn't created one yet)
  if (profiles.length === 0) {
    return null;
  }

  return (
    <ProfileIndicator
      profiles={profiles}
      activeProfile={activeProfile}
      onAddProfile={openCreateModal}
    />
  );
};

const HeaderProfileIndicator = ({
  profiles,
  activeProfile,
}: HeaderProfileIndicatorProps) => {
  // Wrap with ProfileProvider so ProfileUI and ProfileIndicator can use the context
  return (
    <ProfileProvider profiles={profiles} activeProfile={activeProfile}>
      <ProfileIndicatorWithContext />
      {/* ProfileUI renders the modals (CreateProfileModal, ProfileSwitcher) */}
      <ProfileUI />
    </ProfileProvider>
  );
};

export default HeaderProfileIndicator;
