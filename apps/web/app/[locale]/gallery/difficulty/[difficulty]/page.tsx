import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faStars,
  faCrown,
  faMedal,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import {
  getDifficultyImages,
  getDifficultyCounts,
  getDifficultyFromSlug,
  getAllDifficultySlugs,
  DIFFICULTY_LABELS,
  DIFFICULTY_DESCRIPTIONS,
  ALL_DIFFICULTIES,
} from '@/app/data/gallery';
import { Difficulty } from '@chunky-crayon/db';
import cn from '@/lib/utils';

type PageParams = {
  locale: string;
  difficulty: string;
};

export async function generateStaticParams() {
  return getAllDifficultySlugs();
}

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    icon: IconDefinition;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  [Difficulty.BEGINNER]: {
    icon: faStar,
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
    borderColor: 'border-crayon-green/30',
  },
  [Difficulty.INTERMEDIATE]: {
    icon: faStars,
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
    borderColor: 'border-crayon-orange/30',
  },
  [Difficulty.ADVANCED]: {
    icon: faMedal,
    color: 'text-crayon-blue',
    bgColor: 'bg-crayon-blue/10',
    borderColor: 'border-crayon-blue/30',
  },
  [Difficulty.EXPERT]: {
    icon: faCrown,
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
    borderColor: 'border-crayon-purple/30',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, difficulty: difficultySlug } = await params;
  const difficulty = getDifficultyFromSlug(difficultySlug);

  if (!difficulty) {
    return {
      title: 'Difficulty Not Found - Chunky Crayon',
    };
  }

  const label = DIFFICULTY_LABELS[difficulty];
  const description = DIFFICULTY_DESCRIPTIONS[difficulty];

  const title = `${label} Coloring Pages - Free Printable Pages | Chunky Crayon`;
  const metaDescription = `Free ${label.toLowerCase()} coloring pages. ${description} Print or color online!`;

  const baseUrl = 'https://chunkycrayon.com';
  const pagePath = `/gallery/difficulty/${difficultySlug}`;

  return {
    title,
    description: metaDescription,
    keywords: [
      `${label.toLowerCase()} coloring pages`,
      `${label.toLowerCase()} coloring sheets`,
      'free coloring pages',
      'printable coloring pages',
      'coloring pages for kids',
      'coloring pages for adults',
    ],
    openGraph: {
      title: `${label} Coloring Pages - Chunky Crayon`,
      description: metaDescription,
      type: 'website',
      url: `${baseUrl}/${locale}${pagePath}`,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}${pagePath}`,
      languages: {
        en: `${baseUrl}/en${pagePath}`,
        ja: `${baseUrl}/ja${pagePath}`,
        ko: `${baseUrl}/ko${pagePath}`,
        de: `${baseUrl}/de${pagePath}`,
        fr: `${baseUrl}/fr${pagePath}`,
        es: `${baseUrl}/es${pagePath}`,
        'x-default': `${baseUrl}/en${pagePath}`,
      },
    },
  };
}

const OtherDifficulties = ({
  currentDifficulty,
}: {
  currentDifficulty: Difficulty;
}) => {
  const others = ALL_DIFFICULTIES.filter((d) => d !== currentDifficulty);

  return (
    <div className="mb-8">
      <h2 className="font-tondo font-semibold text-lg text-text-primary mb-3">
        Other Difficulty Levels
      </h2>
      <div className="flex flex-wrap gap-2">
        {others.map((difficulty) => {
          const config = DIFFICULTY_CONFIG[difficulty];
          const label = DIFFICULTY_LABELS[difficulty];

          return (
            <Link
              key={difficulty}
              href={`/gallery/difficulty/${difficulty.toLowerCase()}`}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                'bg-white border transition-all',
                config.borderColor,
                'hover:shadow-md',
              )}
            >
              <FontAwesomeIcon
                icon={config.icon}
                className={cn('text-sm', config.color)}
              />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const DifficultyGalleryContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { difficulty: difficultySlug } = await paramsPromise;
  const difficulty = getDifficultyFromSlug(difficultySlug);

  if (!difficulty) {
    notFound();
  }

  const [galleryData, counts] = await Promise.all([
    getDifficultyImages(difficulty),
    getDifficultyCounts(),
  ]);

  const { images, nextCursor, hasMore } = galleryData;
  const config = DIFFICULTY_CONFIG[difficulty];
  const label = DIFFICULTY_LABELS[difficulty];
  const description = DIFFICULTY_DESCRIPTIONS[difficulty];
  const count = counts[difficulty];

  // JSON-LD CollectionPage schema for SEO
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `https://chunkycrayon.com/gallery/difficulty/${difficultySlug}`,
    name: `${label} Coloring Pages`,
    description,
    url: `https://chunkycrayon.com/gallery/difficulty/${difficultySlug}`,
    isPartOf: {
      '@id': 'https://chunkycrayon.com/#website',
    },
    about: {
      '@type': 'Thing',
      name: `${label} Difficulty Coloring Pages`,
    },
    numberOfItems: count,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: images.length,
      itemListElement: images.slice(0, 10).map((image, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'ImageObject',
          '@id': `https://chunkycrayon.com/coloring-image/${image.id}`,
          name: image.title || `${label} Coloring Page`,
          contentUrl: image.svgUrl,
          thumbnailUrl: image.svgUrl,
          description:
            image.description || `Free ${label.toLowerCase()} coloring page`,
        },
      })),
    },
  };

  return (
    <>
      {/* CollectionPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Gallery', href: '/gallery' },
          { label: `${label} Coloring Pages` },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              config.bgColor,
            )}
          >
            <FontAwesomeIcon
              icon={config.icon}
              className={cn('text-2xl', config.color)}
            />
          </div>
          <div>
            <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
              {label} Coloring Pages
            </h1>
            {count > 0 && (
              <p className="text-text-tertiary text-sm mt-1">
                {count} coloring {count === 1 ? 'page' : 'pages'}
              </p>
            )}
          </div>
        </div>
        <p className="text-text-secondary max-w-2xl">{description}</p>
      </div>

      {/* Other Difficulty Levels */}
      <OtherDifficulties currentDifficulty={difficulty} />

      {/* Gallery */}
      {images.length > 0 ? (
        <InfiniteScrollGallery
          initialImages={images}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
          galleryType="difficulty"
          difficultySlug={difficultySlug}
        />
      ) : (
        <div className="text-center py-16">
          <div
            className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4',
              config.bgColor,
            )}
          >
            <FontAwesomeIcon
              icon={config.icon}
              className={cn('text-4xl', config.color)}
            />
          </div>
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
            No {label.toLowerCase()} pages yet
          </h2>
          <p className="text-text-secondary mb-6">
            Check back soon for {label.toLowerCase()} coloring pages!
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
          >
            Browse All Pages
          </Link>
        </div>
      )}

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Free {label} Coloring Pages
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Looking for {label.toLowerCase()} coloring pages? Our{' '}
            {label.toLowerCase()} collection features{' '}
            {description.toLowerCase()} These designs are perfect for{' '}
            {difficulty === Difficulty.BEGINNER
              ? 'young children just learning to color, with simple shapes and bold outlines that are easy to stay within.'
              : difficulty === Difficulty.INTERMEDIATE
                ? 'kids who have developed their fine motor skills and are ready for more detailed designs.'
                : difficulty === Difficulty.ADVANCED
                  ? 'teens and experienced colorists who enjoy spending time on detailed artwork.'
                  : 'adults who want a relaxing, meditative coloring experience with intricate patterns and fine details.'}
          </p>
          <p>
            Each coloring page can be colored online using our digital tools or
            downloaded and printed for traditional coloring with crayons,
            colored pencils, or markers. Our AI-generated designs feature clean
            lines and engaging details that make coloring fun and relaxing.
          </p>
        </div>
        <h3 className="font-tondo font-semibold text-xl text-text-primary mt-8 mb-3">
          What Makes {label} Coloring Pages Special?
        </h3>
        <p className="text-text-secondary leading-relaxed max-w-4xl">
          {difficulty === Difficulty.BEGINNER
            ? 'Our beginner coloring pages feature large areas to color, simple shapes, and thick outlines. These are designed to build confidence and develop hand-eye coordination in young artists.'
            : difficulty === Difficulty.INTERMEDIATE
              ? 'Intermediate coloring pages offer a nice balance of detail and simplicity. They include moderate complexity with defined sections that provide a satisfying coloring experience without being overwhelming.'
              : difficulty === Difficulty.ADVANCED
                ? 'Advanced coloring pages include detailed scenes, smaller sections, and more intricate patterns. These designs reward patience and attention to detail, making them perfect for relaxation and creative expression.'
                : 'Expert-level coloring pages feature the most intricate designs with fine details, complex patterns, and challenging areas. These are ideal for experienced colorists who enjoy meditative, long-form coloring sessions.'}
        </p>
      </section>
    </>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-paper-cream rounded w-32 mb-4" />
    <div className="h-10 bg-paper-cream rounded w-72 mb-4" />
    <div className="h-6 bg-paper-cream rounded w-96 mb-8" />
    <div className="flex gap-2 mb-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-10 w-32 bg-paper-cream rounded-full" />
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
  </div>
);

const DifficultyGalleryPage = async ({
  params,
}: {
  params: Promise<PageParams>;
}) => {
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <DifficultyGalleryContent paramsPromise={params} />
      </Suspense>
    </PageWrap>
  );
};

export default DifficultyGalleryPage;
