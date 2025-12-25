'use client';

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import cn from '@/lib/utils';
import ProfileCard from '@/components/ProfileCard/ProfileCard';
import AddProfileCard from '@/components/AddProfileCard/AddProfileCard';
import { setActiveProfile } from '@/app/actions/profiles';
import type { ProfileWithStats } from '@/app/actions/profiles';

const MAX_PROFILES = 10;

type ProfileSwitcherProps = {
  profiles: ProfileWithStats[];
  activeProfileId: string | null;
  onClose?: () => void;
  onAddProfile?: () => void;
  className?: string;
};

const ProfileSwitcher = ({
  profiles,
  activeProfileId,
  onClose,
  onAddProfile,
  className,
}: ProfileSwitcherProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      if (profileId === activeProfileId) {
        // Already active, just close
        onClose?.();
        return;
      }

      startTransition(async () => {
        const result = await setActiveProfile(profileId);

        if (result.success) {
          router.refresh();
          onClose?.();
        }
      });
    },
    [activeProfileId, onClose, router],
  );

  const canAddMore = profiles.length < MAX_PROFILES;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-gradient-to-br from-paper-cream via-white to-paper-cream-dark',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-switcher-title"
    >
      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 p-2 rounded-full',
            'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
            'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange',
          )}
          aria-label="Close profile switcher"
        >
          <svg
            className="w-8 h-8"
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

      {/* Title */}
      <h1
        id="profile-switcher-title"
        className="font-tondo text-3xl md:text-4xl font-bold text-text-primary mb-8 md:mb-12"
      >
        Who&apos;s coloring?
      </h1>

      {/* Profile grid */}
      <div
        className={cn(
          'grid gap-6 md:gap-8 justify-items-center',
          profiles.length <= 2
            ? 'grid-cols-2'
            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          isPending && 'opacity-50 pointer-events-none',
        )}
      >
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            id={profile.id}
            name={profile.name}
            avatarId={profile.avatarId}
            isActive={profile.id === activeProfileId}
            onClick={() => handleSelectProfile(profile.id)}
          />
        ))}

        {canAddMore && (
          <AddProfileCard onClick={onAddProfile} disabled={isPending} />
        )}
      </div>

      {/* Manage profiles link */}
      <button
        type="button"
        onClick={() => {
          router.push('/account/profiles');
          onClose?.();
        }}
        className={cn(
          'mt-12 font-tondo text-sm text-gray-500 hover:text-crayon-orange',
          'underline underline-offset-2 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange rounded',
        )}
      >
        Manage Profiles
      </button>

      {/* Loading indicator */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="w-12 h-12 border-4 border-crayon-orange/30 border-t-crayon-orange rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ProfileSwitcher;
