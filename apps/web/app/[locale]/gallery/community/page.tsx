import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faArrowLeft } from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import { getCommunityImages } from '@/app/data/gallery';

export const metadata: Metadata = {
  title: 'Community Coloring Pages - Free Printable Pages | Chunky Crayon',
  description:
    'Browse free coloring pages created by our community. Unique designs from creative minds around the world. Color online or print for free!',
  keywords: [
    'community coloring pages',
    'free coloring pages',
    'user created coloring pages',
    'printable coloring pages',
  ],
  openGraph: {
    title: 'Community Coloring Pages - Chunky Crayon',
    description:
      'Browse free coloring pages created by our community. Unique designs from creative minds around the world.',
    type: 'website',
  },
};

const CommunityGalleryContent = async () => {
  const { images, nextCursor, hasMore } = await getCommunityImages();

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-crayon-orange transition-colors mb-4"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          <span>Back to Gallery</span>
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faUsers}
            className="text-3xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            Community Coloring Pages
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl">
          Explore unique coloring pages created by our creative community. These
          designs come from imaginative prompts submitted by users just like
          you. Color them online or download and print for free!
        </p>
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <InfiniteScrollGallery
          initialImages={images}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
          galleryType="community"
        />
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎨</div>
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
            No community pages yet
          </h2>
          <p className="text-text-secondary mb-6">
            Be the first to create a coloring page for the community!
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-purple text-white font-semibold rounded-full hover:bg-crayon-purple-dark transition-colors"
          >
            Create a Page
          </Link>
        </div>
      )}

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Community-Created Coloring Pages
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Our community gallery showcases coloring pages generated from
            creative prompts submitted by users around the world. Each page is
            unique, reflecting the diverse imagination of our community members.
          </p>
          <p>
            Want to contribute? Create your own coloring page using our
            AI-powered generator. Simply describe what you&apos;d like to color,
            and our tools will create a beautiful line drawing ready for
            coloring.
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
  </div>
);

const CommunityGalleryPage = () => {
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <CommunityGalleryContent />
      </Suspense>
    </PageWrap>
  );
};

export default CommunityGalleryPage;
