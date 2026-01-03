'use client';

import { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark, faCheck } from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';
import { signOutAction } from '@/app/actions/auth';
import cn from '@/lib/utils';
import { ParentalGateLink } from '@/components/ParentalGate';
import ProfileAvatar from '@/components/ProfileAvatar/ProfileAvatar';
import MobileLanguageSelector from '@/components/LanguageSwitcher/MobileLanguageSelector';
import { setActiveProfile } from '@/app/actions/profiles';
import type { ProfileWithStats } from '@/lib/profiles/service';
import type { MobileNavItem } from './Header';

type MobileMenuProps = {
  items: MobileNavItem[];
  profiles?: ProfileWithStats[];
  activeProfile?: ProfileWithStats | null;
};

const MobileMenu = ({
  items,
  profiles = [],
  activeProfile,
}: MobileMenuProps) => {
  const router = useRouter();
  const t = useTranslations('navigation');
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Only render portal after component mounts (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSwitchProfile = (profileId: string) => {
    if (profileId === activeProfile?.id) return;

    startTransition(async () => {
      await setActiveProfile(profileId);
      router.refresh();
      setIsOpen(false);
    });
  };

  const otherProfiles = profiles.filter((p) => p.id !== activeProfile?.id);

  const renderMenuItem = (item: MobileNavItem) => {
    const iconStyle = {
      '--fa-primary-color': 'hsl(var(--crayon-orange))',
      '--fa-secondary-color': 'hsl(var(--crayon-teal))',
      '--fa-secondary-opacity': '0.8',
    } as React.CSSProperties;

    if (item.action === 'signout') {
      return (
        <button
          type="button"
          className="flex items-center gap-3 p-3 w-full text-left font-tondo font-medium text-text-primary hover:bg-paper-cream rounded-xl transition-all duration-200 active:scale-95"
          onClick={async () => {
            setIsOpen(false);
            await signOutAction();
          }}
        >
          {item.iconName && (
            <FontAwesomeIcon
              icon={item.iconName}
              className="text-xl"
              style={iconStyle}
            />
          )}
          {item.label}
        </button>
      );
    }

    if (item.href) {
      // Items that require parental gate (Billing, Settings, Support)
      // Check this first so mailto: links with parental gate are handled
      if (item.requiresParentalGate) {
        return (
          <ParentalGateLink
            href={item.href}
            className="flex items-center gap-3 p-3 w-full text-left font-tondo font-medium text-text-primary hover:bg-paper-cream rounded-xl transition-all duration-200 active:scale-95"
          >
            {item.iconName && (
              <FontAwesomeIcon
                icon={item.iconName}
                className="text-xl"
                style={iconStyle}
              />
            )}
            {item.label}
          </ParentalGateLink>
        );
      }

      // External links (mailto:, etc.) without parental gate
      if (item.href.startsWith('mailto:')) {
        return (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 font-tondo font-medium text-text-primary hover:bg-paper-cream rounded-xl transition-all duration-200 active:scale-95"
            onClick={() => setIsOpen(false)}
          >
            {item.iconName && (
              <FontAwesomeIcon
                icon={item.iconName}
                className="text-xl"
                style={iconStyle}
              />
            )}
            {item.label}
          </a>
        );
      }

      return (
        <Link
          href={item.href}
          className="flex items-center gap-3 p-3 font-tondo font-medium text-text-primary hover:bg-paper-cream rounded-xl transition-all duration-200 active:scale-95"
          onClick={() => setIsOpen(false)}
        >
          {item.iconName && (
            <FontAwesomeIcon
              icon={item.iconName}
              className="text-xl"
              style={iconStyle}
            />
          )}
          {item.label}
        </Link>
      );
    }

    // Coins/credits display - special styling
    const coinsStyle = {
      '--fa-primary-color': 'hsl(var(--crayon-yellow-dark))',
      '--fa-secondary-color': 'hsl(var(--crayon-orange))',
      '--fa-secondary-opacity': '1',
    } as React.CSSProperties;

    return (
      <div className="flex items-center gap-3 p-3 font-tondo font-bold text-text-primary">
        {item.iconName && (
          <FontAwesomeIcon
            icon={item.iconName}
            className="text-xl"
            style={item.label.includes('credits') ? coinsStyle : iconStyle}
          />
        )}
        {item.label}
      </div>
    );
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2.5 hover:bg-paper-cream rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Open menu"
      >
        <FontAwesomeIcon
          icon={faBars}
          className="text-2xl"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-teal))',
              '--fa-secondary-opacity': '0.8',
            } as React.CSSProperties
          }
        />
      </button>

      {/* Full-screen menu - rendered via portal to escape header stacking context */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-white z-[100] flex flex-col animate-slide-up-full"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-paper-cream-dark">
              <h2 className="font-tondo font-bold text-xl text-text-primary">
                {t('menu')}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-paper-cream rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Close menu"
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  className="text-2xl"
                  style={
                    {
                      '--fa-primary-color': 'hsl(var(--crayon-orange))',
                      '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                      '--fa-secondary-opacity': '0.8',
                    } as React.CSSProperties
                  }
                />
              </button>
            </div>

            {/* Profile section */}
            {profiles.length > 0 && activeProfile && (
              <div className="p-4 border-b border-paper-cream-dark">
                {/* Active profile */}
                <div className="flex items-center gap-3 p-3 bg-crayon-orange/10 rounded-xl mb-3">
                  <ProfileAvatar
                    avatarId={activeProfile.avatarId}
                    name={activeProfile.name}
                    size="sm"
                  />
                  <div className="flex-1">
                    <p className="font-tondo font-bold text-crayon-orange">
                      {activeProfile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('currentlyActive')}
                    </p>
                  </div>
                  <FontAwesomeIcon
                    icon={faCheck}
                    className="text-crayon-orange"
                  />
                </div>

                {/* Other profiles */}
                {otherProfiles.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400 font-tondo mb-2 px-1">
                      {t('switchTo')}
                    </p>
                    <div className="space-y-2">
                      {otherProfiles.map((profile) => (
                        <button
                          key={profile.id}
                          type="button"
                          onClick={() => handleSwitchProfile(profile.id)}
                          disabled={isPending}
                          className={cn(
                            'flex items-center gap-3 p-3 w-full rounded-xl',
                            'hover:bg-paper-cream transition-all duration-200 active:scale-95',
                            isPending && 'opacity-50 pointer-events-none',
                          )}
                        >
                          <ProfileAvatar
                            avatarId={profile.avatarId}
                            name={profile.name}
                            size="xs"
                          />
                          <span className="font-tondo font-bold text-sm text-text-primary">
                            {profile.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Manage profiles link */}
                <ParentalGateLink
                  href="/account/profiles"
                  className="flex items-center justify-center gap-2 mt-3 p-2 text-sm font-tondo text-gray-500 hover:text-crayon-orange transition-colors"
                >
                  <span>{t('manageProfiles')}</span>
                </ParentalGateLink>
              </div>
            )}

            {/* Navigation items */}
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.href || item.label}
                    className={cn(item.liClass)}
                  >
                    {renderMenuItem(item)}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Language selector - only for logged out users */}
            {profiles.length === 0 && (
              <div className="px-4 py-3 border-t border-paper-cream-dark">
                <MobileLanguageSelector
                  onLanguageChange={() => setIsOpen(false)}
                />
              </div>
            )}

            {/* Fun decoration at bottom */}
            <div className="p-4 flex justify-center gap-2 opacity-50">
              <span
                className="text-2xl animate-float"
                style={{ animationDelay: '0s' }}
              >
                🖍️
              </span>
              <span
                className="text-2xl animate-float"
                style={{ animationDelay: '0.2s' }}
              >
                🎨
              </span>
              <span
                className="text-2xl animate-float"
                style={{ animationDelay: '0.4s' }}
              >
                ✨
              </span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default MobileMenu;
