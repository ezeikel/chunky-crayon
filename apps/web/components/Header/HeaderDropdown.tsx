'use client';

import Link from 'next/link';
import { User } from '@chunky-crayon/db/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCreditCard,
  faGear,
  faArrowRightFromBracket,
  faCircleUser,
  faHeadset,
  faCoins,
  faNewspaper,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ParentalGateLink } from '@/components/ParentalGate';
import formatNumber from '@/utils/formatNumber';

type DropdownItemConfig = {
  icon?: IconDefinition;
  labelKey?: string;
  href?: string;
  separator?: boolean;
  external?: boolean;
  requiresParentalGate?: boolean;
  isSignOut?: boolean;
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
    href: 'mailto:support@chunkycrayon.com',
    external: true,
    requiresParentalGate: true,
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
} as React.CSSProperties;

const coinsStyle = {
  '--fa-primary-color': 'hsl(var(--crayon-yellow-dark))',
  '--fa-secondary-color': 'hsl(var(--crayon-orange))',
  '--fa-secondary-opacity': '1',
} as React.CSSProperties;

type HeaderDropdownProps = {
  user: Partial<User>;
  signOutAction: () => Promise<void>;
};

const HeaderDropdown = ({ user, signOutAction }: HeaderDropdownProps) => {
  const t = useTranslations('navigation');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 font-tondo font-bold px-4 py-2 rounded-full bg-paper-cream hover:bg-paper-cream-dark transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
        >
          {/* User section */}
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faCircleUser}
              className="text-xl"
              style={iconStyle}
            />
            <span className="text-text-primary">
              {user?.name?.split(' ')[0] || t('account')}
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
      <DropdownMenuContent align="end" className="w-52">
        {DROPDOWN_ITEMS.map((item) => {
          if (item.separator) {
            return <DropdownMenuSeparator key="dropdown-separator" />;
          }

          const label = item.labelKey ? t(item.labelKey) : '';

          // Items that require parental gate
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
              <DropdownMenuItem key={item.labelKey} asChild>
                <form action={signOutAction} className="w-full">
                  <button
                    type="submit"
                    className="w-full text-left flex items-center gap-3"
                  >
                    <FontAwesomeIcon
                      icon={item.icon!}
                      className="text-lg"
                      style={iconStyle}
                    />
                    {label}
                  </button>
                </form>
              </DropdownMenuItem>
            );
          }

          return null;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderDropdown;
