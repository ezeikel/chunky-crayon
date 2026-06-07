'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from '@one-colored-pixel/db/types';
import {
  FontAwesomeIcon,
  type CSSVariables,
} from '@fortawesome/react-fontawesome';
import {
  faCreditCard,
  faGear,
  faArrowRightFromBracket,
  faCircleUser,
  faHeadset,
  faCoins,
  faNewspaper,
  faShieldHalved,
  faPlus,
  faUsers,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ParentalGateLink } from '@/components/ParentalGate';
import FeedbackDialog from '@/components/FeedbackDialog/FeedbackDialog';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import ProfileUI from '@/components/ProfileUI/ProfileUI';
import { ProfileProvider, useProfile } from '@/contexts/ProfileContext';
import { setActiveProfile } from '@/app/actions/profiles';
import formatNumber from '@/utils/formatNumber';
import type { ProfileWithStats } from '@/lib/profiles/service';

type DropdownItemConfig = {
  icon?: IconDefinition;
  labelKey?: string;
  /** Hardcoded label, used when there's no i18n key (e.g. internal-only "Admin"). */
  label?: string;
  href?: string;
  separator?: boolean;
  external?: boolean;
  requiresParentalGate?: boolean;
  isSignOut?: boolean;
  isFeedback?: boolean;
  /** Only render when the current user has this role. */
  adminOnly?: boolean;
};

const DROPDOWN_ITEMS: DropdownItemConfig[] = [
  {
    icon: faCreditCard,
    labelKey: 'billing',
    href: '/account/billing',
    requiresParentalGate: true,
  },
  {
    icon: faGear,
    labelKey: 'settings',
    href: '/account/settings',
    requiresParentalGate: true,
  },
  {
    icon: faNewspaper,
    labelKey: 'blog',
    href: '/blog',
  },
  {
    icon: faHeadset,
    labelKey: 'support',
    isFeedback: true,
    requiresParentalGate: true,
  },
  {
    separator: true,
    adminOnly: true,
  },
  {
    icon: faShieldHalved,
    label: 'Admin',
    href: '/admin',
    adminOnly: true,
  },
  {
    separator: true,
  },
  {
    icon: faArrowRightFromBracket,
    labelKey: 'signOut',
    isSignOut: true,
  },
];

const iconStyle = {
  '--fa-primary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-color': 'hsl(var(--crayon-teal))',
  '--fa-secondary-opacity': '0.8',
} as React.CSSProperties & CSSVariables;

const coinsStyle = {
  '--fa-primary-color': 'hsl(var(--crayon-yellow-dark))',
  '--fa-secondary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-opacity': '1',
} as React.CSSProperties & CSSVariables;

type HeaderDropdownProps = {
  user: Partial<User>;
  profiles: ProfileWithStats[];
  activeProfile: ProfileWithStats | null;
  signOutAction: () => Promise<void>;
};

const MAX_PROFILES = 10;

// Inner component — has access to ProfileContext for the create-profile modal.
const HeaderDropdownInner = ({
  user,
  signOutAction,
}: {
  user: Partial<User>;
  signOutAction: () => Promise<void>;
}) => {
  const t = useTranslations('navigation');
  const tProfiles = useTranslations('profiles');
  const router = useRouter();
  const { profiles, activeProfile, openCreateModal } = useProfile();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const otherProfiles = profiles.filter((p) => p.id !== activeProfile?.id);
  const canAddMore = profiles.length < MAX_PROFILES;
  const hasProfiles = profiles.length > 0;

  const handleSwitchProfile = (profileId: string) => {
    if (profileId === activeProfile?.id) return;
    startTransition(async () => {
      await setActiveProfile(profileId);
      router.refresh();
    });
  };

  return (
    <>
      <FeedbackDialog
        userEmail={user?.email || undefined}
        userName={user?.name || undefined}
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        trigger={<span className="hidden" />}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`flex items-center gap-3 font-tondo font-bold px-4 py-2 rounded-full bg-paper-cream hover:bg-paper-cream-dark transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm ${
              isPending ? 'opacity-50 pointer-events-none' : ''
            }`}
            aria-label={
              activeProfile
                ? `Account menu — active profile: ${activeProfile.name}`
                : 'Account menu'
            }
          >
            {/* User / active-profile section */}
            <div className="flex items-center gap-2">
              {activeProfile ? (
                <ProfileAvatar
                  avatarId={activeProfile.avatarId}
                  name={activeProfile.name}
                  size="xs"
                />
              ) : (
                <FontAwesomeIcon
                  icon={faCircleUser}
                  className="text-xl"
                  style={iconStyle}
                />
              )}
              <span className="text-text-primary">
                {activeProfile?.name ||
                  user?.name?.split(' ')[0] ||
                  t('account')}
              </span>
            </div>
            {/* Divider */}
            <div className="w-px h-5 bg-paper-cream-dark" />
            {/* Credits section */}
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon
                icon={faCoins}
                className="text-lg"
                style={coinsStyle}
              />
              <span className="text-text-primary">
                {formatNumber(user.credits || 0)}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {/* Active profile card — only render if there are profiles. New
              users without one see the rest of the menu unchanged. */}
          {hasProfiles && activeProfile && (
            <div className="px-3 py-2 bg-crayon-orange/10 rounded-lg mx-1 mb-1">
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
                  <p className="text-xs text-gray-500">
                    {t('currentlyActive')}
                  </p>
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
            </>
          )}

          {/* Add profile */}
          {hasProfiles && canAddMore && (
            <DropdownMenuItem
              onClick={openCreateModal}
              className="flex items-center gap-3 cursor-pointer"
            >
              <FontAwesomeIcon
                icon={faPlus}
                className="text-lg"
                style={iconStyle}
              />
              <span className="font-tondo font-bold text-sm">
                {tProfiles('create.addProfile')}
              </span>
            </DropdownMenuItem>
          )}

          {/* Manage profiles */}
          {hasProfiles && (
            <DropdownMenuItem asChild>
              <ParentalGateLink
                href="/account/profiles"
                className="flex items-center gap-3 w-full"
              >
                <FontAwesomeIcon
                  icon={faUsers}
                  className="text-lg"
                  style={iconStyle}
                />
                <span className="font-tondo font-bold text-sm">
                  {t('manageProfiles')}
                </span>
              </ParentalGateLink>
            </DropdownMenuItem>
          )}

          {hasProfiles && <DropdownMenuSeparator />}

          {DROPDOWN_ITEMS.filter(
            (item) => !item.adminOnly || user?.role === 'ADMIN',
          ).map((item, idx) => {
            if (item.separator) {
              return (
                <DropdownMenuSeparator key={`dropdown-separator-${idx}`} />
              );
            }

            const label = item.label ?? (item.labelKey ? t(item.labelKey) : '');

            if (item.isFeedback) {
              return (
                <DropdownMenuItem
                  key={item.labelKey}
                  onClick={() => setFeedbackOpen(true)}
                >
                  <FontAwesomeIcon
                    icon={item.icon!}
                    className="text-lg"
                    style={iconStyle}
                  />
                  {label}
                </DropdownMenuItem>
              );
            }

            if (item.requiresParentalGate && item.href) {
              return (
                <DropdownMenuItem key={item.labelKey} asChild>
                  <ParentalGateLink
                    href={item.href}
                    className="flex items-center gap-3 w-full text-left"
                  >
                    <FontAwesomeIcon
                      icon={item.icon!}
                      className="text-lg"
                      style={iconStyle}
                    />
                    {label}
                  </ParentalGateLink>
                </DropdownMenuItem>
              );
            }

            // External links (like Support mailto)
            if (item.external && item.href) {
              return (
                <DropdownMenuItem key={item.labelKey} asChild>
                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon
                      icon={item.icon!}
                      className="text-lg"
                      style={iconStyle}
                    />
                    {label}
                  </a>
                </DropdownMenuItem>
              );
            }

            // Regular internal links
            if (item.href) {
              return (
                <DropdownMenuItem key={item.labelKey} asChild>
                  <Link href={item.href}>
                    <FontAwesomeIcon
                      icon={item.icon!}
                      className="text-lg"
                      style={iconStyle}
                    />
                    {label}
                  </Link>
                </DropdownMenuItem>
              );
            }

            // Sign out action
            if (item.isSignOut) {
              return (
                <DropdownMenuItem
                  key={item.labelKey}
                  onClick={async () => {
                    await signOutAction();
                  }}
                >
                  <FontAwesomeIcon
                    icon={item.icon!}
                    className="text-lg"
                    style={iconStyle}
                  />
                  {label}
                </DropdownMenuItem>
              );
            }

            return null;
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

const HeaderDropdown = ({
  user,
  profiles,
  activeProfile,
  signOutAction,
}: HeaderDropdownProps) => (
  <ProfileProvider profiles={profiles} activeProfile={activeProfile}>
    <HeaderDropdownInner user={user} signOutAction={signOutAction} />
    {/* Renders CreateProfileModal + ProfileSwitcher modals at portal root */}
    <ProfileUI />
  </ProfileProvider>
);

export default HeaderDropdown;
