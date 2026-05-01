import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTreeChristmas,
  faPumpkin,
  faRabbit,
  faTurkey,
  faHeart,
  faSnowflake,
  faFlower,
  faSun,
  faLeaf,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import { getTagImages } from '@/app/data/gallery';
import { generateAlternates } from '@/lib/seo';
import cn from '@/lib/utils';

type HolidayEvent = {
  slug: string;
  name: string;
  icon: IconDefinition;
  color: string;
  tags: string[];
  description: string;
  seoTitle: string;
  seoDescription: string;
};

const HOLIDAY_EVENTS: HolidayEvent[] = [
  {
    slug: 'christmas',
    name: 'Christmas',
    icon: faTreeChristmas,
    color: 'text-crayon-green',
    tags: ['christmas', 'santa', 'holiday'],
    description:
      'Festive Christmas coloring pages featuring Santa, snowmen, ornaments, and holiday cheer.',
    seoTitle: 'Christmas Coloring Pages - Free Printable Holiday Pages',
    seoDescription:
      'Free printable Christmas coloring pages for kids and adults. Santa, snowmen, reindeer, ornaments, and more festive designs. Color online or print!',
  },
  {
    slug: 'halloween',
    name: 'Halloween',
    icon: faPumpkin,
    color: 'text-crayon-orange',
    tags: ['halloween', 'pumpkin', 'spooky'],
    description:
      'Spooky and fun Halloween coloring pages with pumpkins, friendly ghosts, and costumes.',
    seoTitle: 'Halloween Coloring Pages - Free Printable Spooky Pages',
    seoDescription:
      'Free printable Halloween coloring pages. Pumpkins, friendly ghosts, witches, and spooky fun designs for kids. Color online or print!',
  },
  {
    slug: 'easter',
    name: 'Easter',
    icon: faRabbit,
    color: 'text-crayon-purple',
    tags: ['easter', 'bunny', 'eggs'],
    description:
      'Cheerful Easter coloring pages with bunnies, decorated eggs, and spring flowers.',
    seoTitle: 'Easter Coloring Pages - Free Printable Spring Pages',
    seoDescription:
      'Free printable Easter coloring pages. Easter bunnies, decorated eggs, spring flowers, and more. Color online or print!',
  },
  {
    slug: 'thanksgiving',
    name: 'Thanksgiving',
    icon: faTurkey,
    color: 'text-crayon-orange',
    tags: ['thanksgiving', 'autumn'],
    description:
      'Thanksgiving coloring pages featuring turkeys, autumn leaves, and harvest themes.',
    seoTitle: 'Thanksgiving Coloring Pages - Free Printable Autumn Pages',
    seoDescription:
      'Free printable Thanksgiving coloring pages. Turkeys, autumn leaves, pumpkins, and harvest designs. Color online or print!',
  },
  {
    slug: 'valentines-day',
    name: "Valentine's Day",
    icon: faHeart,
    color: 'text-crayon-pink',
    tags: ['valentine', 'hearts', 'love'],
    description:
      "Valentine's Day coloring pages with hearts, flowers, and messages of love and friendship.",
    seoTitle: "Valentine's Day Coloring Pages - Free Printable Heart Pages",
    seoDescription:
      "Free printable Valentine's Day coloring pages. Hearts, flowers, and friendship designs for kids. Color online or print!",
  },
  {
    slug: 'winter',
    name: 'Winter',
    icon: faSnowflake,
    color: 'text-crayon-blue',
    tags: ['winter', 'snow'],
    description:
      'Winter-themed coloring pages with snowflakes, snowmen, and cozy winter scenes.',
    seoTitle: 'Winter Coloring Pages - Free Printable Snow & Ice Pages',
    seoDescription:
      'Free printable winter coloring pages. Snowflakes, snowmen, and cozy winter scenes. Color online or print!',
  },
  {
    slug: 'spring',
    name: 'Spring',
    icon: faFlower,
    color: 'text-crayon-pink',
    tags: ['spring'],
    description:
      'Spring coloring pages with blooming flowers, butterflies, and sunny outdoor scenes.',
    seoTitle: 'Spring Coloring Pages - Free Printable Flower Pages',
    seoDescription:
      'Free printable spring coloring pages. Blooming flowers, butterflies, gardens, and sunny scenes. Color online or print!',
  },
  {
    slug: 'summer',
    name: 'Summer',
    icon: faSun,
    color: 'text-crayon-yellow',
    tags: ['summer'],
    description:
      'Summer coloring pages featuring beach scenes, sunshine, and outdoor adventures.',
    seoTitle: 'Summer Coloring Pages - Free Printable Beach Pages',
    seoDescription:
      'Free printable summer coloring pages. Beach scenes, sunshine, ice cream, and outdoor fun. Color online or print!',
  },
  {
    slug: 'autumn',
    name: 'Autumn',
    icon: faLeaf,
    color: 'text-crayon-orange',
    tags: ['autumn'],
    description:
      'Autumn coloring pages with falling leaves, harvest scenes, and cozy fall themes.',
    seoTitle: 'Autumn Coloring Pages - Free Printable Fall Pages',
    seoDescription:
      'Free printable autumn coloring pages. Falling leaves, harvest scenes, and cozy fall designs. Color online or print!',
  },
];

const getEventBySlug = (slug: string): HolidayEvent | undefined =>
  HOLIDAY_EVENTS.find((e) => e.slug === slug);

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
  const event = getEventBySlug(eventSlug);

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
  const event = getEventBySlug(eventSlug);

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
          '@id': `https://chunkycrayon.com/coloring-image/${image.id}`,
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
