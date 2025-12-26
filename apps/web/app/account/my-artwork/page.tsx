import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPalette,
  faHeart,
  faArrowRight,
  faBookOpen,
  faStar,
  faPaintbrush,
} from '@fortawesome/pro-duotone-svg-icons';
import { differenceInDays, isToday, isYesterday, format } from 'date-fns';

// Simple time display - friendly for kids, useful for parents
const getFriendlyTime = (date: Date): string => {
  const now = new Date();
  const days = differenceInDays(now, date);

  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  // Show month name for older items (e.g., "Dec" or "Nov 2024" if different year)
  const isSameYear = date.getFullYear() === now.getFullYear();
  return isSameYear ? format(date, 'MMM d') : format(date, 'MMM yyyy');
};
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import Loading from '@/components/Loading/Loading';
import ChallengeWidget from '@/components/ChallengeCard/ChallengeWidget';
import { getUserSavedArtwork } from '@/app/actions/saved-artwork';
import { getMyStickerStats } from '@/app/actions/stickers';
import { getMyCurrentChallenge } from '@/app/actions/challenges';
import DeleteArtworkButton from './DeleteArtworkButton';

export const metadata: Metadata = {
  title: 'My Artwork - Chunky Crayon',
  description: 'View and manage your saved coloring artwork.',
};

// Sticker stats card component
const StickerStatsCard = async () => {
  const stats = await getMyStickerStats();

  // Don't show if user has no stickers yet
  if (!stats || stats.totalUnlocked === 0) {
    return null;
  }

  const progressPercent = Math.round(
    (stats.totalUnlocked / stats.totalPossible) * 100,
  );

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <Link
      href="/account/stickers"
      className="block mb-4 p-4 md:p-6 bg-gradient-to-r from-crayon-orange/5 to-crayon-yellow/5 rounded-2xl border-2 border-crayon-orange/20 hover:border-crayon-orange/40 hover:shadow-lg transition-all group"
    >
      <div className="flex items-center gap-4 md:gap-6">
        {/* Icon */}
        <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          <FontAwesomeIcon
            icon={faBookOpen}
            className="text-2xl md:text-3xl"
            style={iconStyle}
          />
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-tondo font-bold text-lg md:text-xl text-text-primary">
              Sticker Book
            </h3>
            {stats.newCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-crayon-orange text-white text-xs font-bold rounded-full animate-pulse">
                <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                {stats.newCount} NEW
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mb-2">
            {stats.totalUnlocked} of {stats.totalPossible} stickers collected
          </p>
          {/* Progress bar */}
          <div className="h-2 bg-paper-cream rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-crayon-orange to-crayon-yellow rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Arrow */}
        <div className="shrink-0 text-text-muted group-hover:text-crayon-orange transition-colors">
          <FontAwesomeIcon icon={faArrowRight} className="text-lg" />
        </div>
      </div>
    </Link>
  );
};

// Weekly challenge section component
const ChallengeSection = async () => {
  const challengeData = await getMyCurrentChallenge();

  // Don't show if no active challenge
  if (!challengeData) {
    return null;
  }

  return (
    <div className="mb-8">
      <ChallengeWidget
        challengeData={challengeData}
        weeklyChallengeId={challengeData.weeklyChallengeId}
        className="hover:shadow-lg transition-shadow"
      />
    </div>
  );
};

const ArtworkGrid = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  const savedArtwork = await getUserSavedArtwork();

  if (savedArtwork.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-crayon-pink/10 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-4xl text-crayon-pink"
          />
        </div>
        <h2 className="font-tondo font-bold text-2xl text-text-primary mb-2">
          No saved artwork yet!
        </h2>
        <p className="text-text-secondary mb-6 max-w-md mx-auto">
          Start coloring and save your creations to see them here. Your artwork
          will be saved forever!
        </p>
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
        >
          Browse Coloring Pages
          <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
      {savedArtwork.map((artwork) => (
        <div
          key={artwork.id}
          className="group relative bg-white rounded-2xl border-2 border-paper-cream-dark overflow-hidden hover:border-crayon-pink/50 hover:shadow-lg transition-all"
        >
          {/* Artwork Image */}
          <Link
            href={`/coloring-image/${artwork.coloringImageId}`}
            className="block aspect-square relative"
          >
            <Image
              src={artwork.imageUrl}
              alt={artwork.title || 'Saved artwork'}
              fill
              className="object-contain p-2"
            />
          </Link>

          {/* Title and Time */}
          <div className="p-3 border-t border-paper-cream-dark">
            <h3 className="font-tondo font-semibold text-sm text-text-primary truncate">
              {artwork.title}
            </h3>
            <span className="font-tondo text-xs text-text-muted">
              {getFriendlyTime(new Date(artwork.createdAt))}
            </span>
          </div>

          {/* Big Action Buttons - always visible on mobile, hover-reveal on desktop */}
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 md:bg-black/0 md:opacity-0 md:group-hover:opacity-100 md:group-hover:bg-black/20 transition-all duration-200 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              {/* Color Again Button - big circular */}
              <Link
                href={`/coloring-image/${artwork.coloringImageId}`}
                className="flex items-center justify-center size-11 md:size-14 rounded-full bg-crayon-teal text-white shadow-lg hover:bg-crayon-teal-dark hover:scale-110 active:scale-95 transition-all duration-200"
                title="Color again"
              >
                <FontAwesomeIcon
                  icon={faPaintbrush}
                  className="text-base md:text-lg"
                />
              </Link>
              {/* Delete Button - big circular */}
              <DeleteArtworkButton artworkId={artwork.id} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MyArtworkPage = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <PageWrap>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Account', href: '/account/settings' },
          { label: 'My Artwork' },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faHeart}
            className="text-3xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            My Artwork
          </h1>
        </div>
        <p className="text-text-secondary max-w-lg mx-auto">
          All your saved coloring creations in one place. Click on any artwork
          to color it again or make a new version!
        </p>
      </div>

      {/* Sticker Stats Card (only shows when user has stickers) */}
      <Suspense fallback={null}>
        <StickerStatsCard />
      </Suspense>

      {/* Weekly Challenge Widget (only shows when there's an active challenge) */}
      <Suspense fallback={null}>
        <ChallengeSection />
      </Suspense>

      {/* Artwork Grid */}
      <Suspense fallback={<Loading size="lg" />}>
        <ArtworkGrid />
      </Suspense>
    </PageWrap>
  );
};

export default MyArtworkPage;
