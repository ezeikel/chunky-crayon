import Link from 'next/link';
import { User } from '@chunky-crayon/db/types';
import {
  faCoins,
  faCreditCard,
  faHome,
  faSignOut,
  faUser,
  faTag,
  faRightToBracket,
  faHeadset,
} from '@fortawesome/pro-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getCurrentUser } from '@/app/actions/user';
import cn from '@/lib/utils';
import { showAuthButtonsFlag } from '@/flags';
import { signOut } from '@/auth';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import formatNumber from '@/utils/formatNumber';
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
};

type DropdownItem = {
  icon?: typeof faCreditCard;
  label?: string;
  href?: string;
  action?: () => Promise<void>;
  separator?: boolean;
  external?: boolean;
};

const handleSignOut = async () => {
  'use server';

  await signOut();
};

const DROPDOWN_ITEMS: DropdownItem[] = [
  {
    icon: faCreditCard,
    label: 'Billing',
    href: '/account/billing',
  },
  {
    icon: faHeadset,
    label: 'Support',
    href: 'mailto:support@chunkycrayon.com',
    external: true,
  },
  {
    separator: true,
  },
  {
    icon: faSignOut,
    label: 'Sign out',
    action: handleSignOut,
  },
];

const renderDropdown = (dropdownUser: Partial<User>) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="flex items-center gap-2 font-medium px-4 py-2 rounded hover:bg-muted/50 transition-colors"
      >
        <FontAwesomeIcon
          icon={faUser}
          size="lg"
          className="text-muted-foreground"
        />
        {dropdownUser?.name || 'Account'}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-48">
      {DROPDOWN_ITEMS.map((item) => {
        if (item.separator) {
          return <DropdownMenuSeparator key="dropdown-separator" />;
        }

        if (item.href) {
          return (
            <DropdownMenuItem key={item.label} asChild>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={item.icon!} size="lg" />
                  <span className="text-base">{item.label}</span>
                </a>
              ) : (
                <Link href={item.href} className="flex items-center gap-2">
                  <FontAwesomeIcon icon={item.icon!} size="lg" />
                  <span className="text-base">{item.label}</span>
                </Link>
              )}
            </DropdownMenuItem>
          );
        }

        return (
          <DropdownMenuItem key={item.label} asChild>
            <form action={item.action} className="w-full">
              <button
                type="submit"
                className="w-full text-left flex items-center gap-2"
              >
                <FontAwesomeIcon icon={item.icon!} size="lg" />
                <span className="text-base">{item.label}</span>
              </button>
            </form>
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuContent>
  </DropdownMenu>
);

const ITEMS: NavItem[] = [
  {
    label: 'Home',
    icon: <FontAwesomeIcon icon={faHome} size="lg" />,
    href: '/',
    visibility: 'always',
  },
  {
    label: 'Pricing',
    icon: <FontAwesomeIcon icon={faTag} size="lg" />,
    href: '/pricing',
    visibility: 'unauthenticated',
  },
  {
    label: 'Support',
    icon: <FontAwesomeIcon icon={faHeadset} size="lg" />,
    href: 'mailto:support@chunkycrayon.com',
    visibility: 'unauthenticated',
  },
  {
    label: 'Credits',
    component: (user: Partial<User>) => (
      <span className="flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 font-medium">
        <FontAwesomeIcon icon={faCoins} className="text-amber-600" size="lg" />
        {formatNumber(user.credits || 0)} credits
      </span>
    ),
    liClass: 'bg-amber-100 rounded-full',
    visibility: 'authenticated',
  },
  // {
  //   label: 'Account',
  //   icon: <FontAwesomeIcon icon={faUser} size="lg" />,
  //   href: '/account',
  //   visibility: 'authenticated',
  // },
  // Dropdown trigger as last item (for authenticated users)
  {
    label: 'UserDropdown',
    liClass: 'p-0',
    component: (user: Partial<User>) => renderDropdown(user),
    visibility: 'authenticated',
  },
];

const getMobileItems = (user: Partial<User> | null): MobileNavItem[] => {
  const items: MobileNavItem[] = [];
  if (user) {
    items.push({
      label: 'Home',
      iconName: faHome,
      href: '/',
    });
    items.push({
      label: `${formatNumber(user.credits || 0)} credits`,
      iconName: faCoins,
      liClass: 'bg-amber-100 rounded-full',
    });
    // items.push({
    //   label: user.name || 'Account',
    //   iconName: faUser,
    //   href: '/account',
    // });
    items.push({
      label: 'Billing',
      iconName: faCreditCard,
      href: '/account/billing',
    });
    items.push({
      label: 'Support',
      iconName: faHeadset,
      href: 'mailto:support@chunkycrayon.com',
    });
    items.push({
      label: 'Sign out',
      iconName: faSignOut,
      action: 'signout',
    });
  } else {
    items.push({
      label: 'Home',
      iconName: faHome,
      href: '/',
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
      iconName: faRightToBracket,
      href: '/signin',
    });
  }
  return items;
};

const renderNavLink = (item: NavItem, user: Partial<User> | null) => {
  if (item.href?.startsWith('mailto:')) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        {item.icon}
        {item.label}
      </a>
    );
  }

  if (item.href) {
    return (
      <Link href={item.href} className="flex items-center gap-2">
        {item.icon}
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {item.icon}
      {item.component?.(user as Partial<User>)}
    </div>
  );
};

const Header = async () => {
  const user = await getCurrentUser();
  const showAuthButtons = await showAuthButtonsFlag();
  const mobileItems = getMobileItems(user);

  const renderItems = () => {
    if (!showAuthButtons) {
      return null;
    }

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
        <div className="flex items-center gap-4">
          <ul className="hidden md:flex gap-8">
            {visibleItems.map((item) => (
              <li
                key={item.href || item.label}
                className={cn('p-2', item.liClass)}
              >
                {renderNavLink(item, user)}
              </li>
            ))}
          </ul>
          <MobileMenu items={mobileItems} />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4">
        <ul className="hidden md:flex gap-8">
          {visibleItems.map((item) => (
            <li
              key={item.href || item.label}
              className={cn('p-2', item.liClass)}
            >
              {renderNavLink(item, null)}
            </li>
          ))}
        </ul>
        <Link
          href="/signin"
          className="hidden md:flex items-center gap-2 font-medium px-4 py-2 rounded hover:bg-muted/50 transition-colors"
        >
          <FontAwesomeIcon icon={faRightToBracket} size="lg" />
          Sign in
        </Link>
        <MobileMenu items={mobileItems} />
      </div>
    );
  };

  return (
    <header className="flex items-center justify-between p-4 shadow-perfect sticky top-0 z-50 bg-white">
      <Link href="/">
        <h1 className="font-tondo text-4xl font-bold text-[#FF8A65] tracking-tight">
          Chunky Crayon
        </h1>
      </Link>
      {renderItems()}
    </header>
  );
};

export default Header;
