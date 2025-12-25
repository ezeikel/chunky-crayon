import Link from 'next/link';
import { User } from '@chunky-crayon/db/types';
import {
  faCoins,
  faCreditCard,
  faGear,
  faHouse,
  faArrowRightToBracket,
  faArrowRightFromBracket,
  faTag,
  faHeadset,
  faNewspaper,
  faImages,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getCurrentUser } from '@/app/actions/user';
import { signOut } from '@/auth';
import formatNumber from '@/utils/formatNumber';
import HeaderDropdown from './HeaderDropdown';
import MobileMenu from './MobileMenu';

export type Visibility = 'always' | 'authenticated' | 'unauthenticated';

export type NavItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  liClass?: string;
  component?: (user: Partial<User>) => React.ReactNode;
  visibility: Visibility;
};

export type MobileNavItem = {
  label: string;
  iconName?: IconDefinition;
  href?: string;
  liClass?: string;
  action?: 'signout';
  requiresParentalGate?: boolean;
};

const handleSignOut = async () => {
  'use server';

  await signOut();
};

// Simplified nav items - text only for navigation
// Note: Credits are now shown in the Combined Profile Pill (HeaderDropdown)
const ITEMS: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    visibility: 'always',
  },
  {
    label: 'Gallery',
    href: '/gallery',
    visibility: 'always',
  },
  {
    label: 'Blog',
    href: '/blog',
    visibility: 'always',
  },
  {
    label: 'Pricing',
    href: '/pricing',
    visibility: 'unauthenticated',
  },
  {
    label: 'Support',
    href: 'mailto:support@chunkycrayon.com',
    visibility: 'unauthenticated',
  },
];

const getMobileItems = (user: Partial<User> | null): MobileNavItem[] => {
  const items: MobileNavItem[] = [];
  if (user) {
    items.push({
      label: 'Home',
      iconName: faHouse,
      href: '/',
    });
    items.push({
      label: 'Gallery',
      iconName: faImages,
      href: '/gallery',
    });
    items.push({
      label: 'Blog',
      iconName: faNewspaper,
      href: '/blog',
    });
    items.push({
      label: `${formatNumber(user.credits || 0)} credits`,
      iconName: faCoins,
      liClass: 'bg-crayon-yellow-light/30 rounded-full',
    });
    items.push({
      label: 'Billing',
      iconName: faCreditCard,
      href: '/account/billing',
      requiresParentalGate: true,
    });
    items.push({
      label: 'Settings',
      iconName: faGear,
      href: '/account/settings',
      requiresParentalGate: true,
    });
    items.push({
      label: 'Support',
      iconName: faHeadset,
      href: 'mailto:support@chunkycrayon.com',
      requiresParentalGate: true,
    });
    items.push({
      label: 'Sign out',
      iconName: faArrowRightFromBracket,
      action: 'signout',
    });
  } else {
    items.push({
      label: 'Home',
      iconName: faHouse,
      href: '/',
    });
    items.push({
      label: 'Gallery',
      iconName: faImages,
      href: '/gallery',
    });
    items.push({
      label: 'Blog',
      iconName: faNewspaper,
      href: '/blog',
    });
    items.push({
      label: 'Pricing',
      iconName: faTag,
      href: '/pricing',
    });
    items.push({
      label: 'Support',
      iconName: faHeadset,
      href: 'mailto:support@chunkycrayon.com',
    });
    items.push({
      label: 'Sign in',
      iconName: faArrowRightToBracket,
      href: '/signin',
    });
  }
  return items;
};

const renderNavLink = (item: NavItem, user: Partial<User> | null) => {
  // Clean text-only nav links (like Bluey's approach)
  const linkClass =
    'font-tondo font-bold text-lg text-text-secondary hover:text-crayon-orange transition-colors';

  if (item.href?.startsWith('mailto:')) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {item.label}
      </a>
    );
  }

  if (item.href) {
    return (
      <Link href={item.href} className={linkClass}>
        {item.label}
      </Link>
    );
  }

  // Functional components (Credits, Dropdown) render their own UI
  return item.component?.(user as Partial<User>);
};

const Header = async () => {
  const user = await getCurrentUser();
  const mobileItems = getMobileItems(user);

  const renderItems = () => {
    const visibleItems = ITEMS.filter((item) => {
      switch (item.visibility) {
        case 'always':
          return true;
        case 'authenticated':
          return !!user;
        case 'unauthenticated':
          return !user;
        default:
          return false;
      }
    });

    if (user) {
      return (
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8 items-center">
            {visibleItems.map((item) => (
              <div key={item.href || item.label} className={item.liClass}>
                {renderNavLink(item, user)}
              </div>
            ))}
            <HeaderDropdown user={user} signOutAction={handleSignOut} />
          </nav>
          <MobileMenu items={mobileItems} />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-6">
        <nav className="hidden md:flex gap-8 items-center">
          {visibleItems.map((item) => (
            <div key={item.href || item.label} className={item.liClass}>
              {renderNavLink(item, null)}
            </div>
          ))}
        </nav>
        <Link
          href="/signin"
          className="hidden md:flex items-center font-tondo font-bold text-white px-6 py-2.5 rounded-full bg-crayon-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200"
        >
          Sign in
        </Link>
        <MobileMenu items={mobileItems} />
      </div>
    );
  };

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-card border-b border-paper-cream-dark">
      <Link
        href="/"
        className="group flex items-center hover:scale-105 active:scale-95 transition-transform duration-200"
      >
        <h1 className="font-tondo text-2xl md:text-3xl font-bold text-gradient-orange tracking-tight">
          Chunky Crayon
        </h1>
      </Link>
      {renderItems()}
    </header>
  );
};

export default Header;
