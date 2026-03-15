'use client';

import { useProfile } from '@/contexts/ProfileContext';
import ProfileSwitcher from '@/components/ProfileSwitcher/ProfileSwitcher';
import CreateProfileModal from '@/components/CreateProfileModal/CreateProfileModal';

const ProfileUI = () => {
  const {
    profiles,
    activeProfile,
    isProfileSwitcherOpen,
    isCreateModalOpen,
    closeProfileSwitcher,
    openCreateModal,
    closeCreateModal,
  } = useProfile();

  return (
    <>
      {/* Full-screen profile switcher */}
      {isProfileSwitcherOpen && (
        <ProfileSwitcher
          profiles={profiles}
          activeProfileId={activeProfile?.id || null}
          onClose={closeProfileSwitcher}
          onAddProfile={() => {
            closeProfileSwitcher();
            openCreateModal();
          }}
        />
      )}

      {/* Create profile modal */}
      <CreateProfileModal
        open={isCreateModalOpen}
        onOpenChange={closeCreateModal}
      />
    </>
  );
};

export default ProfileUI;
