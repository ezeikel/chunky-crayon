import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarStar, faSparkles } from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import TodaysDate from '@/components/TodaysDate';
import { getDailyImages, getTodaysDailyImage } from '@/app/data/gallery';

export const metadata: Metadata = {
  title: 'Daily Coloring Pages - New Free Page Every Day | Chunky Crayon',
  description:
    'Get a free new coloring page every day! Browse our archive of daily coloring pages. Color online or print for free. Never run out of pages to color!',
  keywords: [
    'daily coloring pages',
    'free coloring pages',
    'new coloring pages',
    'coloring page of the day',
    'printable coloring pages',
  ],
  openGraph: {
    title: 'Daily Coloring Pages - Chunky Crayon',
    description:
      'Get a free new coloring page every day! Browse our archive of daily coloring pages.',
    type: 'website',
  },
};

const TodaysFeatured = async () => {
  const todaysImage = await getTodaysDailyImage();

  if (!todaysImage || !todaysImage.svgUrl) return null;

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <div className="bg-gradient-to-br from-crayon-yellow/20 to-crayon-orange/20 rounded-3xl p-6 md:p-8 mb-10">
      <div className="flex items-center gap-2 mb-4">
        <FontAwesomeIcon
          icon={faCalendarStar}
          className="text-xl"
          style={iconStyle}
        />
        <span className="font-tondo font-semibold text-text-primary">
          Today&apos;s Page
        </span>
        <TodaysDate className="text-sm text-text-secondary" />
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <Link
          href={`/coloring-image/${todaysImage.id}`}
          className="relative w-full md:w-64 aspect-square rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-shadow group"
        >
          <Image
            src={todaysImage.svgUrl}
            alt={todaysImage.title || 'Daily coloring page'}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        <div className="flex-1 text-center md:text-left">
          <h2 className="font-tondo font-bold text-xl text-text-primary mb-2">
            {todaysImage.title}
          </h2>
          {todaysImage.description && (
            <p className="text-text-secondary mb-4 line-clamp-2">
              {todaysImage.description}
            </p>
          )}
          <Link
            href={`/coloring-image/${todaysImage.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
          >
            <FontAwesomeIcon icon={faSparkles} />
            Start Coloring
          </Link>
        </div>
      </div>
    </div>
  );
};

const DailyGalleryContent = async () => {
  const { images, nextCursor, hasMore } = await getDailyImages();

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Gallery', href: '/gallery' },
          { label: 'Daily Coloring Pages' },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faCalendarStar}
            className="text-3xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            Daily Coloring Pages
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl">
          Every day, we generate a brand new coloring page just for you!
          Subscribe to our daily email to get each new page delivered to your
          inbox. Browse the archive below to catch up on any you might have
          missed.
        </p>
      </div>

      {/* Today's Featured */}
      <TodaysFeatured />

      {/* Archive Section */}
      <div className="mb-6">
        <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
          Daily Archive
        </h2>
        <p className="text-sm text-text-tertiary">
          Browse all previous daily coloring pages
        </p>
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <InfiniteScrollGallery
          initialImages={images}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
          galleryType="daily"
        />
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
            No daily pages yet
          </h2>
          <p className="text-text-secondary">
            Check back tomorrow for the first daily coloring page!
          </p>
        </div>
      )}

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Daily Coloring Page Delivery
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Never run out of coloring pages with our daily delivery service!
            Each day, our AI generates a unique coloring page based on trending
            themes, seasonal events, and creative inspiration. From cute animals
            to fantastical creatures, you never know what tomorrow&apos;s page
            will bring.
          </p>
          <p>
            Want to receive each daily page directly to your inbox? Sign up for
            our free daily email and start each morning with a fresh coloring
            page ready to print or color online.
          </p>
        </div>
      </section>
    </>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-paper-cream rounded w-32 mb-4" />
    <div className="h-10 bg-paper-cream rounded w-64 mb-4" />
    <div className="h-6 bg-paper-cream rounded w-96 mb-8" />
    <div className="h-64 bg-paper-cream rounded-3xl mb-10" />
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
  </div>
);

const DailyGalleryPage = () => {
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <DailyGalleryContent />
      </Suspense>
    </PageWrap>
  );
};

export default DailyGalleryPage;
