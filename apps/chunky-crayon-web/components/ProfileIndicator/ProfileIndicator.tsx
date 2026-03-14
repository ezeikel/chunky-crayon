'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ParentalGateLink } from '@/components/ParentalGate';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import cn from '@/lib/utils';
import { setActiveProfile } from '@/app/actions/profiles';
import type { ProfileWithStats } from '@/lib/profiles/service';

type ProfileIndicatorProps = {
  profiles: ProfileWithStats[];
  activeProfile: ProfileWithStats | null;
  onAddProfile?: () => void;
  className?: string;
};

const MAX_PROFILES = 10;

const ProfileIndicator = ({
  profiles,
  activeProfile,
  onAddProfile,
  className,
}: ProfileIndicatorProps) => {
  const router = useRouter();
  const t = useTranslations('navigation');
  const tProfiles = useTranslations('profiles');
  const [isPending, startTransition] = useTransition();

  const handleSwitchProfile = (profileId: string) => {
    if (profileId === activeProfile?.id) return;

    startTransition(async () => {
      await setActiveProfile(profileId);
      router.refresh();
    });
  };

  const otherProfiles = profiles.filter((p) => p.id !== activeProfile?.id);
  const canAddMore = profiles.length < MAX_PROFILES;

  // Don't render if no profiles exist
  if (!activeProfile && profiles.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 p-1.5 rounded-full',
            'bg-paper-cream hover:bg-paper-cream-dark',
            'transition-all duration-200 hover:scale-105 active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-crayon-orange',
            isPending && 'opacity-50 pointer-events-none',
            className,
          )}
          aria-label={`Current profile: ${activeProfile?.name || t('selectProfile')}`}
        >
          {activeProfile ? (
            <>
              <ProfileAvatar
                avatarId={activeProfile.avatarId}
                name={activeProfile.name}
                size="xs"
              />
              <span className="font-tondo font-bold text-sm text-text-primary pr-2 hidden sm:inline">
                {activeProfile.name}
              </span>
            </>
          ) : (
            <span className="font-tondo font-bold text-sm text-gray-400 px-2">
              {t('selectProfile')}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* Current profile (highlighted) */}
        {activeProfile && (
          <div className="px-3 py-2 bg-crayon-orange/10 rounded-lg mx-1 mb-2">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                avatarId={activeProfile.avatarId}
                name={activeProfile.name}
                size="sm"
              />
              <div>
                <p className="font-tondo font-bold text-sm text-crayon-orange">
                  {activeProfile.name}
                </p>
                <p className="text-xs text-gray-500">{t('currentlyActive')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Other profiles for quick switch */}
        {otherProfiles.length > 0 && (
          <>
            <p className="px-3 py-1 text-xs text-gray-400 font-tondo">
              {t('switchTo')}
            </p>
            {otherProfiles.map((profile) => (
              <DropdownMenuItem
                key={profile.id}
                onClick={() => handleSwitchProfile(profile.id)}
                className="flex items-center gap-3 cursor-pointer"
              >
                <ProfileAvatar
                  avatarId={profile.avatarId}
                  name={profile.name}
                  size="xs"
                />
                <span className="font-tondo font-bold text-sm">
                  {profile.name}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Add profile option */}
        {canAddMore && (
          <DropdownMenuItem
            onClick={onAddProfile}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <span className="font-tondo font-bold text-sm text-gray-500">
              {tProfiles('create.addProfile')}
            </span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Manage profiles link */}
        <DropdownMenuItem asChild>
          <ParentalGateLink
            href="/account/profiles"
            className="flex items-center gap-3 w-full"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                />
              </svg>
            </div>
            <span className="font-tondo font-bold text-sm text-gray-500">
              {t('manageProfiles')}
            </span>
          </ParentalGateLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileIndicator;
