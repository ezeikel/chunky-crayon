import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import { getTagImages } from '@/app/data/gallery';
import { generateAlternates } from '@/lib/seo';
import {
  HOLIDAY_EVENTS,
  getHolidayEventBySlug,
  type HolidayEvent,
} from '@/lib/seo/holidays';
import cn from '@/lib/utils';
import { getColoringImageCanonicalUrl } from '@/lib/seo/coloring-image-url';

type PageParams = {
  locale: string;
  event: string;
};

export async function generateStaticParams() {
  return HOLIDAY_EVENTS.map((event) => ({
    event: event.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, event: eventSlug } = await params;
  const event = getHolidayEventBySlug(eventSlug);

  if (!event) {
    return { title: 'Not Found - Chunky Crayon' };
  }

  const pagePath = `/gallery/holidays/${eventSlug}`;

  return {
    title: `${event.seoTitle} | Chunky Crayon`,
    description: event.seoDescription,
    keywords: [
      `${event.name.toLowerCase()} coloring pages`,
      `${event.name.toLowerCase()} coloring sheets`,
      `free ${event.name.toLowerCase()} coloring`,
      'printable coloring pages',
      'free coloring pages',
    ],
    openGraph: {
      title: `${event.seoTitle} - Chunky Crayon`,
      description: event.seoDescription,
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${pagePath}`,
    },
    alternates: generateAlternates(locale, pagePath),
  };
}

const HolidayGalleryContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { locale, event: eventSlug } = await paramsPromise;
  const event = getHolidayEventBySlug(eventSlug);

  if (!event) {
    notFound();
  }

  const [galleryData, breadcrumbsT] = await Promise.all([
    getTagImages(event.tags[0]),
    getTranslations({ locale, namespace: 'breadcrumbs' }),
  ]);

  const { images, nextCursor, hasMore } = galleryData;

  // JSON-LD
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `https://chunkycrayon.com/gallery/holidays/${eventSlug}`,
    name: `${event.name} Coloring Pages`,
    description: event.description,
    url: `https://chunkycrayon.com/gallery/holidays/${eventSlug}`,
    isPartOf: { '@id': 'https://chunkycrayon.com/#website' },
    numberOfItems: images.length,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: images.length,
      itemListElement: images.slice(0, 10).map((image, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'ImageObject',
          '@id': getColoringImageCanonicalUrl(image, locale),
          name: image.title || `${event.name} Coloring Page`,
          contentUrl: image.svgUrl,
        },
      })),
    },
  };

  // Other holiday events
  const otherEvents = HOLIDAY_EVENTS.filter((e) => e.slug !== eventSlug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <Breadcrumbs
        items={[
          { label: breadcrumbsT('home'), href: '/' },
          { label: breadcrumbsT('gallery'), href: '/gallery' },
          { label: breadcrumbsT('holidays'), href: '/gallery/holidays' },
          { label: event.name },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={event.icon}
            className={cn('text-4xl', event.color)}
          />
          <div>
            <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
              {event.name} Coloring Pages
            </h1>
            {images.length > 0 && (
              <p className="text-text-tertiary text-sm mt-1">
                {images.length} coloring{' '}
                {images.length === 1 ? 'page' : 'pages'}
              </p>
            )}
          </div>
        </div>
        <p className="text-text-secondary max-w-2xl">{event.description}</p>
      </div>

      {/* Other holidays/seasons */}
      <div className="mb-8">
        <h2 className="font-tondo font-semibold text-lg text-text-primary mb-3">
          More Holidays & Seasons
        </h2>
        <div className="flex flex-wrap gap-2">
          {otherEvents.map((e) => (
            <Link
              key={e.slug}
              href={`/gallery/holidays/${e.slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-cream hover:bg-crayon-orange/10 border border-paper-cream-dark hover:border-crayon-orange/30 transition-colors text-sm"
            >
              <FontAwesomeIcon icon={e.icon} className={e.color} />
              {e.name}
            </Link>
          ))}
          <Link
            href="/gallery/holidays"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-crayon-orange/10 hover:bg-crayon-orange/20 border border-crayon-orange/30 transition-colors text-sm font-medium text-crayon-orange"
          >
            All Holidays
          </Link>
        </div>
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <InfiniteScrollGallery
          initialImages={images}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
          galleryType="tag"
          tagSlug={event.tags[0]}
          locale={locale}
        />
      ) : (
        <div className="text-center py-16">
          <FontAwesomeIcon
            icon={event.icon}
            className={cn('text-6xl mb-4', event.color)}
          />
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
            No {event.name.toLowerCase()} coloring pages yet
          </h2>
          <p className="text-text-secondary mb-6">
            Check back soon for new {event.name.toLowerCase()} designs!
          </p>
          <Link
            href="/gallery/holidays"
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
          >
            All Holiday Pages
          </Link>
        </div>
      )}

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Free {event.name} Coloring Pages for Kids
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Looking for free {event.name.toLowerCase()} coloring pages? Our
            collection features beautiful {event.name.toLowerCase()}-themed
            designs perfect for kids of all ages. {event.description}
          </p>
          <p>
            Each coloring page can be colored online using our digital tools or
            downloaded and printed for traditional coloring with crayons,
            colored pencils, or markers.
          </p>
        </div>
      </section>
    </>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-paper-cream rounded w-48 mb-4" />
    <div className="h-10 bg-paper-cream rounded w-72 mb-4" />
    <div className="h-6 bg-paper-cream rounded w-96 mb-8" />
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
  </div>
);

const HolidayEventPage = async ({
  params,
}: {
  params: Promise<PageParams>;
}) => {
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <HolidayGalleryContent paramsPromise={params} />
      </Suspense>
    </PageWrap>
  );
};

export default HolidayEventPage;
