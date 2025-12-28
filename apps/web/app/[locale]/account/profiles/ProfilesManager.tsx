'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ProfileProvider } from '@/contexts/ProfileContext';
import ProfileCard from '@/components/ProfileCard/ProfileCard';
import AddProfileCard from '@/components/AddProfileCard/AddProfileCard';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import CreateProfileModal from '@/components/CreateProfileModal/CreateProfileModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  setActiveProfile,
  deleteProfile,
  type ProfileWithStats,
} from '@/app/actions/profiles';

const MAX_PROFILES = 10;

type ProfilesManagerProps = {
  profiles: ProfileWithStats[];
  activeProfile: ProfileWithStats | null;
};

const ProfilesManager = ({ profiles, activeProfile }: ProfilesManagerProps) => {
  const t = useTranslations('profiles');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] =
    useState<ProfileWithStats | null>(null);

  const canAddMore = profiles.length < MAX_PROFILES;

  const handleSwitchProfile = (profileId: string) => {
    if (profileId === activeProfile?.id) return;

    startTransition(async () => {
      const result = await setActiveProfile(profileId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('form.profileSwitched'));
        router.refresh();
      }
    });
  };

  const handleDeleteProfile = () => {
    if (!profileToDelete) return;

    startTransition(async () => {
      const result = await deleteProfile(profileToDelete.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t('delete.deleted', { name: profileToDelete.name }));
        router.refresh();
      }
      setProfileToDelete(null);
    });
  };

  return (
    <ProfileProvider profiles={profiles} activeProfile={activeProfile}>
      <div className="space-y-8">
        {/* Profiles grid */}
        <div className="flex flex-wrap justify-center gap-4">
          {profiles.map((profile) => (
            <div key={profile.id} className="relative group">
              <ProfileCard
                id={profile.id}
                name={profile.name}
                avatarId={profile.avatarId}
                isActive={profile.id === activeProfile?.id}
                onClick={() => handleSwitchProfile(profile.id)}
              />

              {/* Edit button (shown on hover) */}
              <Link
                href={`/account/profiles/${profile.id}`}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 left-2 w-8 h-8 rounded-full bg-crayon-blue text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-crayon-blue/80"
                aria-label={`Edit ${profile.name}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </Link>

              {/* Delete button (shown on hover, not for default profile if it's the only one) */}
              {(profiles.length > 1 || !profile.isDefault) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileToDelete(profile);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                  aria-label={`Delete ${profile.name}`}
                  disabled={isPending}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              {/* Stats badge */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {t('manager.colorings', { count: profile._count.coloringImages })}
              </div>
            </div>
          ))}

          {/* Add profile card */}
          {canAddMore && (
            <AddProfileCard
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isPending}
            />
          )}
        </div>

        {/* Info section */}
        <div className="bg-paper-cream rounded-2xl p-6 space-y-4 max-w-lg mx-auto">
          <h2 className="font-tondo font-bold text-xl text-center">
            {t('manager.aboutProfiles')}
          </h2>
          <ul className="space-y-2 text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-crayon-orange mt-1">•</span>
              <span>{t('manager.ownCollection')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-crayon-orange mt-1">•</span>
              <span>{t('manager.personalizedDifficulty')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-crayon-orange mt-1">•</span>
              <span>
                {t('manager.maxProfiles', { max: MAX_PROFILES })}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-crayon-orange mt-1">•</span>
              <span>{t('manager.switchAnytime')}</span>
            </li>
          </ul>
        </div>

        {/* Profile limit info */}
        <p className="text-center text-sm text-muted-foreground">
          {t('manager.profilesUsed', { count: profiles.length, max: MAX_PROFILES })}
        </p>
      </div>

      {/* Create profile modal */}
      <CreateProfileModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!profileToDelete}
        onOpenChange={() => setProfileToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {profileToDelete && (
                    <>
                      <ProfileAvatar
                        avatarId={profileToDelete.avatarId}
                        name={profileToDelete.name}
                        size="sm"
                      />
                      <div>
                        <p className="font-tondo font-bold">
                          {profileToDelete.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t('delete.coloringPages', { count: profileToDelete._count.coloringImages })}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <p>
                  {t('delete.confirmText')}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setProfileToDelete(null)}
              disabled={isPending}
            >
              {t('form.cancel')}
            </Button>
            <Button
              onClick={handleDeleteProfile}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isPending ? t('delete.deleting') : t('delete.deleteProfile')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProfileProvider>
  );
};

export default ProfilesManager;
