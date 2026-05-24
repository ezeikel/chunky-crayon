import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPalette,
  faArrowRight,
  faBookOpen,
  faStar,
  faPaintbrush,
  faDownload,
  faGift,
} from '@fortawesome/pro-duotone-svg-icons';
import { differenceInDays, isToday, isYesterday, format } from 'date-fns';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import CrayonScribble from '@/components/Intro/CrayonScribble';
import ChallengeWidget from '@/components/ChallengeCard/ChallengeWidget';
import { getUserSavedArtwork } from '@/app/actions/saved-artwork';
import {
  getMyCreationsPage,
  MY_CREATIONS_PAGE_SIZE,
} from '@/app/data/coloring-image';
import { getActiveProfile } from '@/app/actions/profiles';
import { getColoringImageUrl } from '@/lib/seo/coloring-image-url';
import { getLocale } from 'next-intl/server';
import { getMyStickerStats } from '@/app/actions/stickers';
import { getMyCurrentChallenge } from '@/app/actions/challenges';
import { listMyBundlePurchases } from '@/app/data/bundle';
import Pagination from '@/components/Pagination/Pagination';
import DeleteArtworkButton from './DeleteArtworkButton';

export const metadata: Metadata = {
  title: 'My Stuff - Chunky Crayon',
  description: 'View and manage your saved coloring artwork.',
};

// Friendly relative time. Today / Yesterday / N days ago / Last week /
// "Mar 12" / "Mar 12 2024" — matches Coco-Wyo-style warm copy without
// being precious about exact timestamps.
const getFriendlyTime = (date: Date): string => {
  const now = new Date();
  const days = differenceInDays(now, date);

  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  const isSameYear = date.getFullYear() === now.getFullYear();
  return isSameYear ? format(date, 'MMM d') : format(date, 'MMM yyyy');
};

const formatPrice = (pricePence: number, currency: string) => {
  const symbol =
    currency.toLowerCase() === 'gbp'
      ? '£'
      : currency.toLowerCase() === 'usd'
        ? '$'
        : currency.toLowerCase() === 'eur'
          ? '€'
          : '';
  return `${symbol}${(pricePence / 100).toFixed(2)}`;
};

// Accent palette cycled across cards — same trio as /products/digital so
// the visual language carries through. Bundle cards on this page reuse
// the same chrome so a buyer who lands here from the thank-you page
// sees a familiar object (white card body + accent footer strip).
const CARD_ACCENTS = [
  {
    bg: 'bg-crayon-yellow-light/50',
    border: 'border-crayon-orange/20',
    hoverBorder: 'group-hover:border-crayon-orange',
    price: 'text-crayon-orange-dark',
    button: 'bg-crayon-orange hover:bg-crayon-orange-dark',
  },
  {
    bg: 'bg-crayon-pink-light/50',
    border: 'border-crayon-pink/20',
    hoverBorder: 'group-hover:border-crayon-pink',
    price: 'text-crayon-pink-dark',
    button: 'bg-crayon-pink hover:bg-crayon-pink-dark',
  },
  {
    bg: 'bg-crayon-purple-light/50',
    border: 'border-crayon-purple/20',
    hoverBorder: 'group-hover:border-crayon-purple',
    price: 'text-crayon-purple-dark',
    button: 'bg-crayon-purple hover:bg-crayon-purple-dark',
  },
] as const;

// ─── Sticker stats card ──────────────────────────────────────────────
const StickerStatsCard = async () => {
  const stats = await getMyStickerStats();
  if (!stats || stats.totalUnlocked === 0) return null;

  const progressPercent = Math.round(
    (stats.totalUnlocked / stats.totalPossible) * 100,
  );

  return (
    <Link
      href="/account/stickers"
      className="group block rounded-3xl border-3 border-text-primary/10 bg-bg-white hover:border-crayon-orange hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      <div className="flex items-center gap-4 p-5 lg:p-6">
        <div className="shrink-0 w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-crayon-orange/10 flex items-center justify-center">
          <FontAwesomeIcon
            icon={faBookOpen}
            className="text-2xl lg:text-3xl text-crayon-orange"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-tondo font-bold text-lg lg:text-xl text-text-primary">
              Sticker Book
            </h3>
            {stats.newCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-crayon-orange text-white text-xs font-bold rounded-full">
                <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                {stats.newCount} new
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary font-rooney-sans mb-2">
            {stats.totalUnlocked} of {stats.totalPossible} stickers collected
          </p>
          <div className="h-2 bg-paper-cream rounded-full overflow-hidden">
            <div
              className="h-full bg-crayon-orange rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <FontAwesomeIcon
          icon={faArrowRight}
          className="shrink-0 text-text-muted group-hover:text-crayon-orange transition-colors"
        />
      </div>
    </Link>
  );
};

// ─── Weekly challenge ────────────────────────────────────────────────
const ChallengeSection = async () => {
  const challengeData = await getMyCurrentChallenge();
  if (!challengeData) return null;

  return (
    <ChallengeWidget
      challengeData={challengeData}
      weeklyChallengeId={challengeData.weeklyChallengeId}
      className="hover:shadow-card-hover transition-shadow"
    />
  );
};

// ─── My Bundles section ──────────────────────────────────────────────
const MyBundlesSection = async ({ userId }: { userId: string }) => {
  const purchases = await listMyBundlePurchases(userId);
  if (purchases.length === 0) return null;

  return (
    <section className="mt-12 lg:mt-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary relative inline-block">
          Your Bundles
          <CrayonScribble
            seed={42}
            className="absolute -bottom-2 left-0 w-full h-3 text-crayon-pink/60"
          />
        </h2>
        <Link
          href="/products/digital"
          className="self-start sm:self-auto inline-flex items-center gap-2 font-tondo font-bold text-base px-5 py-2.5 rounded-full bg-bg-white border-3 border-crayon-orange/30 text-crayon-orange-dark hover:border-crayon-orange hover:bg-crayon-yellow-light/40 transition-all duration-200"
        >
          <FontAwesomeIcon icon={faGift} className="text-sm" />
          Browse all bundles
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {purchases.map((purchase, idx) => (
          <BundlePurchaseCard
            key={purchase.id}
            purchase={purchase}
            accent={CARD_ACCENTS[idx % CARD_ACCENTS.length]}
          />
        ))}
      </div>
    </section>
  );
};

const BundlePurchaseCard = ({
  purchase,
  accent,
}: {
  purchase: Awaited<ReturnType<typeof listMyBundlePurchases>>[number];
  accent: (typeof CARD_ACCENTS)[number];
}) => {
  const isRefunded = !!purchase.refundedAt;
  const downloadHref = `/api/bundles/${purchase.bundle.slug}/download`;
  const productHref = `/products/digital/${purchase.bundle.slug}`;

  return (
    <div
      className={`
        group relative flex flex-col overflow-hidden rounded-3xl border-3 bg-bg-white
        ${accent.border} ${isRefunded ? 'opacity-60' : `${accent.hoverBorder} hover:shadow-card-hover hover:-translate-y-1`}
        transition-all duration-200
      `}
    >
      <Link href={productHref} className="block">
        {purchase.bundle.listingHeroUrl ? (
          <div className="relative aspect-square w-full overflow-hidden bg-bg-white">
            <Image
              src={purchase.bundle.listingHeroUrl}
              alt={purchase.bundle.name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden bg-bg-white flex items-center justify-center">
            <FontAwesomeIcon
              icon={faGift}
              className="text-4xl text-text-primary/20"
            />
          </div>
        )}
      </Link>

      <div className={`p-4 lg:p-5 ${accent.bg} border-t-2 ${accent.border}`}>
        <h3 className="font-tondo text-lg lg:text-xl font-bold text-text-primary line-clamp-1">
          {purchase.bundle.name}
        </h3>
        <p className="mt-1 text-xs text-text-secondary font-rooney-sans uppercase tracking-wide">
          Bought {getFriendlyTime(new Date(purchase.purchasedAt))}
          {' · '}
          <span className={accent.price}>
            {formatPrice(purchase.pricePence, purchase.currency)}
          </span>
        </p>

        <div className="mt-3">
          {isRefunded ? (
            <span className="inline-flex items-center gap-2 font-tondo font-bold text-sm px-4 py-2 rounded-full bg-text-primary/5 text-text-secondary">
              Refunded
            </span>
          ) : (
            <a
              href={downloadHref}
              className={`inline-flex items-center gap-2 font-tondo font-bold text-sm px-4 py-2 rounded-full text-white shadow-btn-primary transition-colors ${accent.button}`}
            >
              <FontAwesomeIcon icon={faDownload} className="text-xs" />
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// Skeleton placeholders for the two grid sections — matches the
// final card layout so the page doesn't flash a spinner. Static
// shell renders these instantly while the per-user data resolves
// inside Suspense.
const GridSectionSkeleton = ({
  title,
  cards = 8,
}: {
  title: string;
  cards?: number;
}) => (
  <section className="mt-12 lg:mt-16">
    <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary mb-6 relative inline-block">
      {title}
      <CrayonScribble
        seed={29}
        className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
      />
    </h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-2xl bg-paper-cream-dark/30 animate-pulse"
        />
      ))}
    </div>
  </section>
);

// ─── My creations grid (every page they generated, paginated) ───────
// Distinct from "Your saved pictures" below: this is the kid's full
// pile of generated coloring pages (colored or not), the workbench
// archive. Tap a card to keep coloring. Page-numbered URLs so a
// parent can deep-link or refresh without losing their place.
const MyCreationsSection = async ({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ page?: string }>;
}) => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const [activeProfile, locale, sp] = await Promise.all([
    getActiveProfile(),
    getLocale(),
    searchParamsPromise,
  ]);

  const pageNum = Number(sp.page ?? '1');
  const { images, page, totalPages, totalCount } = await getMyCreationsPage(
    userId,
    activeProfile?.id,
    Number.isFinite(pageNum) ? pageNum : 1,
  );

  if (totalCount === 0) {
    return (
      <section className="mt-12 lg:mt-16">
        <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary mb-6 relative inline-block">
          Your pictures
          <CrayonScribble
            seed={29}
            className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
          />
        </h2>
        <div className="text-center py-12 lg:py-16 rounded-3xl border-2 border-dashed border-border-light bg-paper-cream">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-crayon-orange/10 border-2 border-crayon-orange/20 flex items-center justify-center">
            <FontAwesomeIcon
              icon={faPalette}
              className="text-3xl text-crayon-orange"
            />
          </div>
          <h3 className="font-tondo font-bold text-xl lg:text-2xl text-text-primary mb-2">
            No pictures yet
          </h3>
          <p className="text-text-secondary font-rooney-sans mb-6 max-w-md mx-auto">
            Head back home and tap Create to make your first picture.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange hover:bg-crayon-orange-dark text-white font-tondo font-bold rounded-full shadow-btn-primary transition-colors"
          >
            Make a picture
            <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12 lg:mt-16">
      <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary mb-6 relative inline-block">
        Your pictures
        <CrayonScribble
          seed={29}
          className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
        />
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
        {images.map((img) => (
          <Link
            key={img.id}
            href={getColoringImageUrl(img, locale)}
            className="group block aspect-square relative rounded-2xl border-3 border-text-primary/10 overflow-hidden bg-bg-white hover:border-crayon-orange hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            {img.svgUrl ? (
              <Image
                src={img.svgUrl}
                alt={img.title ?? 'My picture'}
                fill
                className="object-contain p-2"
              />
            ) : null}
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            buildHref={(p) =>
              p === 1 ? '/account/my-stuff' : `/account/my-stuff?page=${p}`
            }
            ariaLabel="Your pictures"
            // Stay put on click — the grid above is what changed, the
            // pagination is right under the kid's eye. Scroll-to-top
            // would jump the page back to the breadcrumb header.
            scroll={false}
          />
        </div>
      )}
    </section>
  );
};

// ─── Saved-pictures grid ─────────────────────────────────────────────
const ArtworkGrid = async () => {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  const savedArtwork = await getUserSavedArtwork();

  if (savedArtwork.length === 0) {
    return (
      <section className="mt-12 lg:mt-16">
        <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary mb-6 relative inline-block">
          Your saved pictures
          <CrayonScribble
            seed={17}
            className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
          />
        </h2>
        <div className="text-center py-12 lg:py-16 rounded-3xl border-2 border-dashed border-border-light bg-paper-cream">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-crayon-pink/10 border-2 border-crayon-pink/20 flex items-center justify-center">
            <FontAwesomeIcon
              icon={faPalette}
              className="text-3xl text-crayon-pink"
            />
          </div>
          <h3 className="font-tondo font-bold text-xl lg:text-2xl text-text-primary mb-2">
            Nothing saved yet
          </h3>
          <p className="text-text-secondary font-rooney-sans mb-6 max-w-md mx-auto">
            Color one of your pictures and tap save. Saved pictures stay
            forever, ready to print whenever you want.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12 lg:mt-16">
      <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary mb-6 relative inline-block">
        Your saved pictures
        <CrayonScribble
          seed={17}
          className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
        />
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
        {savedArtwork.map((artwork) => (
          <div
            key={artwork.id}
            className="group relative bg-bg-white rounded-2xl border-3 border-text-primary/10 overflow-hidden hover:border-crayon-pink hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
          >
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

            <div className="p-3 border-t-2 border-text-primary/5 bg-paper-cream/40">
              <h3 className="font-tondo font-bold text-sm text-text-primary truncate">
                {artwork.title}
              </h3>
              <span className="font-rooney-sans text-xs text-text-muted">
                {getFriendlyTime(new Date(artwork.createdAt))}
              </span>
            </div>

            {/* Hover-reveal action buttons (always visible on mobile) */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 md:bg-black/0 md:opacity-0 md:group-hover:opacity-100 md:group-hover:bg-black/20 transition-all duration-200 pointer-events-none">
              <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
                <Link
                  href={`/coloring-image/${artwork.coloringImageId}`}
                  className="flex items-center justify-center size-10 md:size-14 rounded-full bg-crayon-teal text-white shadow-lg hover:bg-crayon-teal-dark hover:scale-110 active:scale-95 transition-all duration-200"
                  title="Color again"
                >
                  <FontAwesomeIcon
                    icon={faPaintbrush}
                    className="text-sm md:text-lg"
                  />
                </Link>
                <DeleteArtworkButton artworkId={artwork.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── Bundles wrapper that resolves userId for the section ────────────
const MyBundlesWrapper = async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return <MyBundlesSection userId={session.user.id} />;
};

// ─── Page ────────────────────────────────────────────────────────────
const MyArtworkPage = ({
  searchParams,
}: {
  // Sync page handler (per `feedback_async_page_handlers_block_static_shell`),
  // params arrive as a Promise that the Suspense child awaits.
  searchParams: Promise<{ page?: string }>;
}) => {
  return (
    <PageWrap>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Account', href: '/account/settings' },
          { label: 'My Stuff' },
        ]}
        className="mb-6"
      />

      {/* Hero header — matches /products/digital aesthetic */}
      <header className="text-center py-8 lg:py-12">
        <h1 className="font-tondo text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary relative inline-block">
          My Stuff
          <CrayonScribble
            seed={73}
            className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
          />
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg text-text-secondary font-rooney-sans">
          Everything you've made and bought, in one place.
        </p>
      </header>

      {/* Section order: made > saved > bought > earned.
            1. Your pictures — every page the kid generated (the active
               workbench, the most-asked thing on this page).
            2. Your saved pictures — colored & saved.
            3. Bundles — bought content.
            4. Stickers + challenge — progress / engagement. */}
      <Suspense fallback={<GridSectionSkeleton title="Your pictures" />}>
        <MyCreationsSection searchParamsPromise={searchParams} />
      </Suspense>

      <Suspense
        fallback={<GridSectionSkeleton title="Your saved pictures" cards={4} />}
      >
        <ArtworkGrid />
      </Suspense>

      <Suspense fallback={null}>
        <MyBundlesWrapper />
      </Suspense>

      <div className="mt-12 lg:mt-16 space-y-4 lg:space-y-5">
        <Suspense fallback={null}>
          <StickerStatsCard />
        </Suspense>
        <Suspense fallback={null}>
          <ChallengeSection />
        </Suspense>
      </div>
    </PageWrap>
  );
};

export default MyArtworkPage;
