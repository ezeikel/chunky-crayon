import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faArrowLeft } from '@fortawesome/pro-duotone-svg-icons';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import { getCommunityImages } from '@/app/data/gallery';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { generateAlternates } = await import('@/lib/seo');

  return {
    title: 'Community Coloring Pages - Free Printable Pages | Chunky Crayon',
    description:
      'A live feed of coloring pages people made while trying Chunky Crayon. Fresh ideas every day. Color online or print for free.',
    keywords: [
      'community coloring pages',
      'free coloring pages',
      'printable coloring pages',
      'free coloring page ideas',
    ],
    openGraph: {
      title: 'Community Coloring Pages - Chunky Crayon',
      description:
        'A live feed of coloring pages people made while trying Chunky Crayon. Fresh ideas every day.',
      type: 'website',
      url: `https://chunkycrayon.com/${locale}/gallery/community`,
    },
    alternates: generateAlternates(locale, '/gallery/community'),
  };
}

const CommunityGalleryContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<{ locale: string }>;
}) => {
  // CC content policy: community is for LOGGED-OUT visitors only
  // (3-8yo kids app; signed-in accounts are families, no opt-in flow
  // for kid art on a public surface — see
  // `feedback_cc_no_community_for_logged_in`). Signed-in users get
  // redirected back to /gallery.
  const session = await auth();
  if (session?.user) {
    const { locale } = await paramsPromise;
    redirect(`/${locale}/gallery`);
  }

  const [{ locale }, { images, nextCursor, hasMore }] = await Promise.all([
    paramsPromise,
    getCommunityImages(),
  ]);

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
          A live feed of pages people drew while trying Chunky Crayon. Fresh
          ideas every day — color them online or print them for free.
        </p>
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <InfiniteScrollGallery
          initialImages={images}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
          galleryType="community"
          locale={locale}
        />
      ) : (
        <div className="text-center py-16">
          <FontAwesomeIcon
            icon={faUsers}
            className="text-6xl mb-4 text-crayon-purple"
          />
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
            Nothing here yet
          </h2>
          <p className="text-text-secondary mb-6">
            Try a free create to see your idea appear here.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-purple text-white font-semibold rounded-full hover:bg-crayon-purple-dark transition-colors"
          >
            Try it free
          </Link>
        </div>
      )}

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Where these pages come from
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Every page on this feed was drawn from an idea someone typed into
            Chunky Crayon while trying the free create flow. No accounts, no
            usernames — just fresh coloring ideas as they happen.
          </p>
          <p>
            Try it yourself: describe anything you&apos;d like to color, and
            Chunky Crayon turns it into a printable line drawing in seconds.
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

const CommunityGalleryPage = ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  // Page handler stays sync (otherwise the async + await busts the
  // static shell — see `feedback_async_page_handlers_block_static_shell`).
  // Auth check + the data fetch both happen inside the Suspense child,
  // so the shell prerenders and the gated content streams in.
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <CommunityGalleryContent paramsPromise={params} />
      </Suspense>
    </PageWrap>
  );
};

export default CommunityGalleryPage;
