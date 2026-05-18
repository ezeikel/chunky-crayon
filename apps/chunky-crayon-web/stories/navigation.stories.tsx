import type { Meta, StoryObj } from '@storybook/react-vite';
import Link from 'next/link';
import {
  faArrowRightToBracket,
  faComment,
  faHeadset,
  faHouse,
  faImages,
  faNewspaper,
  faStore,
  faToolbox,
} from '@fortawesome/pro-duotone-svg-icons';
import ScrollHeader from '@/components/Header/ScrollHeader';
import MobileMenu from '@/components/Header/MobileMenu';
import HeaderStickerIndicator from '@/components/Header/HeaderStickerIndicator';
import HeaderChallengeIndicator from '@/components/Header/HeaderChallengeIndicator';
import HeaderColoIndicator from '@/components/Header/HeaderColoIndicator';
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher';
import MobileLanguageSelector from '@/components/LanguageSwitcher/MobileLanguageSelector';
import {
  FooterContent,
  type FooterContentCopy,
} from '@/components/Footer/Footer';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Chunky Crayon/02 Navigation & Chrome',
  parameters: {
    docs: {
      description: {
        component:
          'Global site chrome broken into storyable pieces: header shell, desktop CTA, mobile menu, language controls, user indicators, and footer.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const mobileItems = [
  { label: 'Home', iconName: faHouse, href: '/' },
  { label: 'Gallery', iconName: faImages, href: '/gallery' },
  { label: 'Freebies', iconName: faToolbox, href: '/freebies' },
  { label: 'Comics', iconName: faComment, href: '/comics' },
  { label: 'Products', iconName: faStore, href: '/products' },
  { label: 'Blog', iconName: faNewspaper, href: '/blog' },
  { label: 'Support', iconName: faHeadset, isFeedback: true },
  { label: 'Sign in', iconName: faArrowRightToBracket, href: '/signin' },
];

const footerCopy: FooterContentCopy = {
  brand: 'Chunky Crayon',
  tagline: 'Dream. Create. Color.',
  aboutText:
    'Where imagination comes to life! Turn your wildest ideas into magical coloring pages.',
  mascotAlt: 'Colo the friendly crayon mascot',
  copyright: '© 2026 Chunky Crayon. All rights reserved.',
  madeByPrefix: 'Made with',
  madeByHeart: '♡',
  madeByLocationPrefix: 'in',
  madeByLocation: 'South London',
  sections: {
    about: 'About',
    connect: 'Connect',
    getTheApp: 'Get the App',
    support: 'Support',
    freeTools: 'Free Tools',
  },
  newsletter: {
    title: 'Free coloring page, every day',
    subtitle:
      'Join families getting a brand-new coloring page in their inbox each morning.',
  },
  links: {
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    colorAsYouGo: 'Color as you go',
  },
  freeTools: {
    allTools: 'All tools',
    nameColoringPages: 'Name coloring pages',
    rewardChartMaker: 'Reward chart maker',
    birthdayInviteMaker: 'Birthday invite maker',
    abcTracingWorksheets: 'ABC tracing worksheets',
    seasonalColoringPacks: 'Seasonal coloring packs',
    forTeachers: 'For teachers',
  },
};

export const HeaderShellLoggedOut: Story = {
  render: () => (
    <ScrollHeader>
      <Link
        href="/"
        className="group flex items-center gap-2.5 transition-transform duration-200 hover:scale-105"
      >
        <img src="/logos/cc-logo-no-bg.svg" alt="" className="h-8 w-8" />
        <span className="font-tondo text-3xl font-bold text-gradient-orange">
          Chunky Crayon
        </span>
      </Link>
      <div className="flex items-center gap-6">
        <nav className="hidden items-center gap-8 lg:flex">
          {['Home', 'Gallery', 'Freebies', 'Products', 'Blog', 'Pricing'].map(
            (label) => (
              <a
                key={label}
                href="#"
                className="font-tondo text-lg font-bold text-text-secondary transition-colors hover:text-crayon-orange"
              >
                {label}
              </a>
            ),
          )}
          <LanguageSwitcher variant="icon" />
        </nav>
        <Button className="hidden lg:flex">Sign in</Button>
        <MobileMenu items={mobileItems} />
      </div>
    </ScrollHeader>
  ),
};

export const MobileMenuTrigger: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: () => (
    <main className="p-8 [&>div]:!block">
      <MobileMenu items={mobileItems} />
    </main>
  ),
};

export const HeaderIndicators: Story = {
  render: () => (
    <main className="flex flex-wrap items-center gap-4 p-8">
      <HeaderStickerIndicator totalUnlocked={24} newCount={3} />
      <HeaderChallengeIndicator
        challengeData={{
          id: 'challenge-1',
          title: 'Dino week',
          percentComplete: 40,
          isCompleted: false,
          rewardClaimed: false,
          daysRemaining: 3,
        }}
      />
      <HeaderColoIndicator
        coloState={{
          stage: 1,
          stageName: 'Baby Colo',
          stageDescription: 'Colo is just getting started.',
          imagePath: '/images/colo.svg',
          accessories: [],
          nextStage: {
            stage: 2,
            name: 'Little Colo',
            description: 'Colo grows with each saved artwork.',
            requiredArtworks: 8,
            imagePath: '/images/colo.svg',
          },
          progressToNext: {
            current: 5,
            required: 8,
            percentage: 62,
          },
        }}
      />
    </main>
  ),
};

export const LanguageControls: Story = {
  render: () => (
    <main className="flex flex-wrap items-center gap-6 p-8">
      <LanguageSwitcher />
      <LanguageSwitcher variant="icon" />
      <MobileLanguageSelector />
    </main>
  ),
};

export const SiteFooter: Story = {
  render: () => <FooterContent copy={footerCopy} />,
};
