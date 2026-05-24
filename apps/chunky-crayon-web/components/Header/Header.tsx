import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { User } from '@one-colored-pixel/db/types';
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
  faHeart,
  faBookOpen,
  faTrophy,
  faToolbox,
  faComment,
  faStore,
  faUserAstronaut,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getCurrentUser } from '@/app/actions/user';
import { getProfiles, getActiveProfile } from '@/app/actions/profiles';
import { checkFeatureFlag, charactersFeatureEnabled } from '@/flags';
import { getMyStickerStats } from '@/app/actions/stickers';
import { getMyColoState } from '@/app/actions/colo';
import { getMyCurrentChallenge } from '@/app/actions/challenges';
import { signOut } from '@/auth';
import formatNumber from '@/utils/formatNumber';
import HeaderDropdown from './HeaderDropdown';
import HeaderStickerIndicator from './HeaderStickerIndicator';
import HeaderChallengeIndicator from './HeaderChallengeIndicator';
import HeaderColoIndicator from './HeaderColoIndicator';
import MobileMenu from './MobileMenu';
import ScrollHeader from './ScrollHeader';
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher';
import HeaderFeedbackTrigger from './HeaderFeedbackTrigger';
import { Button } from '@/components/ui/button';

export type Visibility = 'always' | 'authenticated' | 'unauthenticated';

export type NavItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  liClass?: string;
  component?: (user: Partial<User>) => React.ReactNode;
  visibility: Visibility;
  isFeedback?: boolean;
};

export type MobileNavItem = {
  label: string;
  iconName?: IconDefinition;
  href?: string;
  liClass?: string;
  action?: 'signout';
  requiresParentalGate?: boolean;
  isFeedback?: boolean;
};

const handleSignOut = async () => {
  'use server';

  await signOut();
};

// Simplified nav items - text only for navigation
// Note: Credits are now shown in the Combined Profile Pill (HeaderDropdown)
const getNavItems = (
  t: Awaited<ReturnType<typeof getTranslations<'navigation'>>>,
  showProducts: boolean,
  showCharacters: boolean,
): NavItem[] => [
  {
    label: t('home'),
    href: '/',
    visibility: 'always',
  },
  // My Stuff — second slot for signed-in users. It's the workbench
  // door (the kid's pile of pictures + saved + bundles + progress),
  // so it should sit right next to Home for a logged-in kid finding
  // their stuff. Previously buried after Freebies + Products which
  // was wrong priority — those are marketing/commerce surfaces, this
  // is "their stuff". Signed-in only by definition.
  {
    label: t('myStuff'),
    href: '/account/my-stuff',
    visibility: 'authenticated',
  },
  {
    label: t('gallery'),
    href: '/gallery',
    visibility: 'always',
  },
  // Characters — slot 4 (after Home / My Stuff / Gallery). The
  // differentiated retention feature; signed-in only. Gated by
  // `characters-feature` PostHog flag (always on in dev).
  ...(showCharacters
    ? ([
        {
          label: 'Characters',
          href: '/characters',
          visibility: 'authenticated',
        },
      ] as const)
    : []),
  // Comics demoted from desktop nav (still present in mobile menu +
  // footer) — desktop nav was overflowing once Characters was added.
  // Comics is the least conversion-critical of the top-level entries.
  {
    label: t('freebies'),
    href: '/freebies',
    visibility: 'always',
  },
  // Products entry — gated behind the `bundles-shop` PostHog flag while
  // we finish the v0 design pass + buy flow. Flip the flag on for the
  // public release once the product page redesign + thank-you page +
  // Stripe webhook + PDF generation are all wired.
  ...(showProducts
    ? ([
        {
          label: 'Products',
          href: '/products',
          visibility: 'always',
        },
      ] as const)
    : []),
  {
    label: t('blog'),
    href: '/blog',
    visibility: 'unauthenticated',
  },
  {
    label: t('pricing'),
    href: '/pricing',
    visibility: 'unauthenticated',
  },
  {
    label: t('support'),
    isFeedback: true,
    visibility: 'unauthenticated',
  },
];

const getMobileItems = (
  user: Partial<User> | null,
  t: Awaited<ReturnType<typeof getTranslations<'navigation'>>>,
  tCommon: Awaited<ReturnType<typeof getTranslations<'common'>>>,
  showProducts: boolean,
  showCharacters: boolean,
): MobileNavItem[] => {
  const items: MobileNavItem[] = [];
  if (user) {
    items.push({
      label: t('home'),
      iconName: faHouse,
      href: '/',
    });
    // My Stuff second — the kid's workbench door. Same priority as
    // the desktop nav so the two orderings stay in sync.
    items.push({
      label: t('myStuff'),
      iconName: faHeart,
      href: '/account/my-stuff',
    });
    items.push({
      label: t('gallery'),
      iconName: faImages,
      href: '/gallery',
    });
    // Characters in slot 4 — keep mobile in sync with desktop ordering
    // (Home, My Stuff, Gallery, Characters, Freebies, Comics, Products,
    // …). Mobile keeps Comics in the list because the drawer has no
    // space constraint; desktop demotes Comics to footer-only.
    if (showCharacters) {
      items.push({
        label: 'Characters',
        iconName: faUserAstronaut,
        href: '/characters',
      });
    }
    items.push({
      label: t('freebies'),
      iconName: faToolbox,
      href: '/freebies',
    });
    items.push({
      label: 'Comics',
      iconName: faComment,
      href: '/comics',
    });
    if (showProducts) {
      items.push({
        label: 'Products',
        iconName: faStore,
        href: '/products',
      });
    }
    items.push({
      label: t('blog'),
      iconName: faNewspaper,
      href: '/blog',
    });
    items.push({
      label: t('stickerBook'),
      iconName: faBookOpen,
      href: '/account/profiles/stickers',
    });
    items.push({
      label: t('challenges'),
      iconName: faTrophy,
      href: '/account/challenges',
    });
    items.push({
      label: tCommon('creditsWithCount', {
        count: formatNumber(user.credits || 0),
      }),
      iconName: faCoins,
      liClass: 'bg-crayon-yellow-light/30 rounded-full',
    });
    items.push({
      label: t('billing'),
      iconName: faCreditCard,
      href: '/account/billing',
      requiresParentalGate: true,
    });
    items.push({
      label: t('settings'),
      iconName: faGear,
      href: '/account/settings',
      requiresParentalGate: true,
    });
    items.push({
      label: t('support'),
      iconName: faHeadset,
      isFeedback: true,
      requiresParentalGate: true,
    });
    items.push({
      label: t('signOut'),
      iconName: faArrowRightFromBracket,
      action: 'signout',
    });
  } else {
    items.push({
      label: t('home'),
      iconName: faHouse,
      href: '/',
    });
    items.push({
      label: t('gallery'),
      iconName: faImages,
      href: '/gallery',
    });
    // Logged-out branch — same ordering as the signed-in mobile menu
    // minus the auth-gated entries (Characters / My Stuff / etc.).
    items.push({
      label: t('freebies'),
      iconName: faToolbox,
      href: '/freebies',
    });
    items.push({
      label: 'Comics',
      iconName: faComment,
      href: '/comics',
    });
    if (showProducts) {
      items.push({
        label: 'Products',
        iconName: faStore,
        href: '/products',
      });
    }
    items.push({
      label: t('blog'),
      iconName: faNewspaper,
      href: '/blog',
    });
    items.push({
      label: t('pricing'),
      iconName: faTag,
      href: '/pricing',
    });
    items.push({
      label: t('support'),
      iconName: faHeadset,
      isFeedback: true,
    });
    items.push({
      label: t('signIn'),
      iconName: faArrowRightToBracket,
      href: '/signin',
    });
  }
  return items;
};

const renderNavLink = (item: NavItem, user: Partial<User> | null) => {
  const linkClass =
    'font-tondo font-bold text-lg text-text-secondary hover:text-crayon-orange transition-colors';

  if (item.isFeedback) {
    return (
      <HeaderFeedbackTrigger
        label={item.label}
        className={linkClass}
        userEmail={user?.email || undefined}
        userName={user?.name || undefined}
      />
    );
  }

  if (item.href) {
    return (
      <Link href={item.href} className={linkClass}>
        {item.label}
      </Link>
    );
  }

  return item.component?.(user as Partial<User>);
};

const Header = async () => {
  const t = await getTranslations('navigation');
  const tCommon = await getTranslations('common');
  const user = await getCurrentUser();

  // Fetch profiles, sticker stats, challenge, and Colo state for authenticated users
  const profiles = user ? (await getProfiles()) || [] : [];
  const activeProfile = user ? await getActiveProfile() : null;
  const stickerStats = user ? await getMyStickerStats() : null;
  const coloState = user ? await getMyColoState() : null;
  const currentChallenge = user ? await getMyCurrentChallenge() : null;

  // Bundles shop flag — gates the Products entry in both desktop nav
  // and mobile menu. Computed before mobileItems is built.
  const showProducts = await checkFeatureFlag(
    'bundles-shop',
    user?.id ?? 'server-side-check',
    false,
  );
  // Characters feature flag — gates the /characters entry. Mirrors
  // showProducts; default off in prod, always on in local dev (the
  // helper bypasses PostHog when NODE_ENV === 'development').
  const showCharacters = await charactersFeatureEnabled(user?.id);

  const mobileItems = getMobileItems(
    user,
    t,
    tCommon,
    showProducts,
    showCharacters,
  );

  const renderItems = () => {
    const navItems = getNavItems(t, showProducts, showCharacters);
    const visibleItems = navItems.filter((item) => {
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
        <div className="flex items-center gap-3 md:gap-6">
          {/* Desktop nav - text links and profile/dropdown */}
          <nav className="hidden lg:flex gap-6 items-center">
            {visibleItems.map((item) => (
              <div key={item.href || item.label} className={item.liClass}>
                {renderNavLink(item, user)}
              </div>
            ))}
            <HeaderDropdown
              user={user}
              profiles={profiles}
              activeProfile={activeProfile}
              signOutAction={handleSignOut}
            />
          </nav>

          {/* Kid-facing progress items.
              - Challenge keeps its own small pill (always visible).
              - Colo + Sticker are now ONE shared pill so they read as
                a single "your progress" widget instead of two competing
                chunky pills (each was min-w-32–48). The pill is sized
                snug around the sticker icon's height; the Colo avatar
                drops its own pill chrome (variant='bare') and sits on
                the left, sticker icon+count on the right.
              - Two distinct tap targets inside one visual pill: Colo
                opens its dropdown, sticker links to the stickers page.
              - Hides below xl (same as before) to prevent header wrap
                on the cluttered logged-in nav. */}
          <div className="flex items-center gap-2">
            {/* Challenge indicator */}
            <HeaderChallengeIndicator challengeData={currentChallenge} />

            {/* Combined Colo + Sticker progress pill — only render when
                both data sources are present (the bare variants assume
                they're composed inside this shared chrome). */}
            {coloState && stickerStats && (
              <div className="hidden xl:flex h-12 items-center gap-2 rounded-full border-2 border-paper-cream-dark bg-white/80 px-3 shadow-sm">
                <HeaderColoIndicator coloState={coloState} variant="bare" />
                {/* Subtle vertical divider so the two tap targets read
                    as distinct without an extra border. */}
                <span aria-hidden className="h-6 w-px bg-paper-cream-dark/60" />
                <HeaderStickerIndicator
                  totalUnlocked={stickerStats.totalUnlocked}
                  newCount={stickerStats.newCount}
                  variant="bare"
                />
              </div>
            )}

            {/* Fallback: if only one of the two is present, render it
                standalone in its original pill shape (avoids a
                lopsided shared pill with one empty side). */}
            {coloState && !stickerStats && (
              <div className="hidden xl:flex">
                <HeaderColoIndicator coloState={coloState} />
              </div>
            )}
            {!coloState && stickerStats && (
              <div className="hidden xl:flex">
                <HeaderStickerIndicator
                  totalUnlocked={stickerStats.totalUnlocked}
                  newCount={stickerStats.newCount}
                />
              </div>
            )}
          </div>

          <MobileMenu
            items={mobileItems}
            profiles={profiles}
            activeProfile={activeProfile}
            userEmail={user?.email || undefined}
            userName={user?.name || undefined}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-6">
        <nav className="hidden lg:flex gap-8 items-center">
          {visibleItems.map((item) => (
            <div key={item.href || item.label} className={item.liClass}>
              {renderNavLink(item, null)}
            </div>
          ))}
          <LanguageSwitcher variant="icon" />
        </nav>
        <Button asChild className="hidden lg:flex rounded-full">
          <Link href="/signin">{t('signIn')}</Link>
        </Button>
        <MobileMenu items={mobileItems} />
      </div>
    );
  };

  return (
    <ScrollHeader>
      <Link
        href="/"
        aria-label="Chunky Crayon — home"
        className="group flex items-center gap-2 md:gap-2.5 hover:scale-105 active:scale-95 transition-transform duration-200"
      >
        {/* Logo mark — same lockup used in Meta ads for brand continuity
            when ad clickers land on the homepage. */}
        <Image
          src="/logos/cc-logo-no-bg.svg"
          alt=""
          width={32}
          height={32}
          priority
          className="w-7 h-7 md:w-8 md:h-8 shrink-0"
        />
        {/* Brand wordmark — not a heading. Was an <h1> historically,
            which made every page have two H1s (this one + the page's
            real H1). Per SEO best practice the header lockup is
            decorative branding; the page's own <h1> stays the only one. */}
        <span className="font-tondo text-2xl md:text-3xl font-bold text-gradient-orange tracking-tight">
          Chunky Crayon
        </span>
      </Link>
      {renderItems()}
    </ScrollHeader>
  );
};

export default Header;
