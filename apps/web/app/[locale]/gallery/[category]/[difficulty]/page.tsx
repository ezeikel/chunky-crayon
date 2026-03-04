import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import {
  getCategoryImagesWithDifficulty,
  getDifficultyFromSlug,
  DIFFICULTY_LABELS,
  DIFFICULTY_DESCRIPTIONS,
  ALL_DIFFICULTIES,
} from '@/app/data/gallery';
import { getCategoryBySlug } from '@/constants';
import { generateAlternates } from '@/lib/seo';

type PageParams = {
  locale: string;
  category: string;
  difficulty: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const {
    locale,
    category: categorySlug,
    difficulty: difficultySlug,
  } = await params;
  const category = getCategoryBySlug(categorySlug);
  const difficulty = getDifficultyFromSlug(difficultySlug);

  if (!category || !difficulty) {
    return { title: 'Not Found - Chunky Crayon' };
  }

  const diffLabel = DIFFICULTY_LABELS[difficulty];
  const title = `${diffLabel} ${category.name} Coloring Pages - Free Printable | Chunky Crayon`;
  const description = `Free ${diffLabel.toLowerCase()} ${category.name.toLowerCase()} coloring pages. ${DIFFICULTY_DESCRIPTIONS[difficulty]} Print or color online!`;
  const pagePath = `/gallery/${categorySlug}/${difficultySlug}`;

  return {
    title,
    description,
    keywords: [
      `${diffLabel.toLowerCase()} ${category.name.toLowerCase()} coloring pages`,
      `easy ${category.name.toLowerCase()} coloring pages`,
      `${category.name.toLowerCase()} coloring sheets`,
      'free coloring pages',
      'printable coloring pages',
    ],
    openGraph: {
      title: `${diffLabel} ${category.name} Coloring Pages - Chunky Crayon`,
      description,
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${pagePath}`,
    },
    alternates: generateAlternates(locale, pagePath),
  };
}

const ComboGalleryContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const {
    locale,
    category: categorySlug,
    difficulty: difficultySlug,
  } = await paramsPromise;
  const difficulty = getDifficultyFromSlug(difficultySlug);
  const categoryDef = getCategoryBySlug(categorySlug);

  if (!difficulty || !categoryDef) {
    notFound();
  }

  const [galleryData, breadcrumbsT, categoryT] = await Promise.all([
    getCategoryImagesWithDifficulty(categorySlug, difficulty),
    getTranslations({ locale, namespace: 'breadcrumbs' }),
    getTranslations({ locale, namespace: 'gallery.categories' }),
  ]);

  const { images, nextCursor, hasMore, category } = galleryData;

  if (!category) {
    notFound();
  }

  const diffLabel = DIFFICULTY_LABELS[difficulty];

  // JSON-LD
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `https://chunkycrayon.com/gallery/${categorySlug}/${difficultySlug}`,
    name: `${diffLabel} ${category.name} Coloring Pages`,
    description: `Free ${diffLabel.toLowerCase()} ${category.name.toLowerCase()} coloring pages`,
    url: `https://chunkycrayon.com/gallery/${categorySlug}/${difficultySlug}`,
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
          name: image.title || `${diffLabel} ${category.name} Coloring Page`,
          contentUrl: image.svgUrl,
        },
      })),
    },
  };

  // Other difficulties for this category
  const otherDifficulties = ALL_DIFFICULTIES.filter((d) => d !== difficulty);

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
          { label: categoryT(category.id), href: `/gallery/${categorySlug}` },
          { label: `${diffLabel}` },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{category.emoji}</span>
          <div>
            <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
              {diffLabel} {categoryT(category.id)} Coloring Pages
            </h1>
            {images.length > 0 && (
              <p className="text-text-tertiary text-sm mt-1">
                {images.length} coloring{' '}
                {images.length === 1 ? 'page' : 'pages'}
              </p>
            )}
          </div>
        </div>
        <p className="text-text-secondary max-w-2xl">
          {DIFFICULTY_DESCRIPTIONS[difficulty]} Browse our{' '}
          {category.name.toLowerCase()} coloring pages at the{' '}
          {diffLabel.toLowerCase()} level.
        </p>
      </div>

      {/* Other difficulty levels */}
      <div className="mb-8">
        <h2 className="font-tondo font-semibold text-lg text-text-primary mb-3">
          Other Difficulty Levels
        </h2>
        <div className="flex flex-wrap gap-2">
          {otherDifficulties.map((d) => (
            <Link
              key={d}
              href={`/gallery/${categorySlug}/${d.toLowerCase()}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-cream hover:bg-crayon-orange/10 border border-paper-cream-dark hover:border-crayon-orange/30 transition-colors text-sm"
            >
              {DIFFICULTY_LABELS[d]}
            </Link>
          ))}
          <Link
            href={`/gallery/${categorySlug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-crayon-orange/10 hover:bg-crayon-orange/20 border border-crayon-orange/30 transition-colors text-sm font-medium text-crayon-orange"
          >
            All Levels
          </Link>
        </div>
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <InfiniteScrollGallery
          initialImages={images}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
          galleryType="category"
          categorySlug={categorySlug}
          difficultySlug={difficultySlug}
        />
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">{category.emoji}</div>
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
            No {diffLabel.toLowerCase()} {category.name.toLowerCase()} pages yet
          </h2>
          <p className="text-text-secondary mb-6">
            Try a different difficulty level or browse all{' '}
            {category.name.toLowerCase()} pages.
          </p>
          <Link
            href={`/gallery/${categorySlug}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
          >
            All {categoryT(category.id)} Pages
          </Link>
        </div>
      )}

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Free {diffLabel} {categoryT(category.id)} Coloring Pages
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Looking for {diffLabel.toLowerCase()} {category.name.toLowerCase()}{' '}
            coloring pages? Our curated collection features{' '}
            {category.name.toLowerCase()} designs at the{' '}
            {diffLabel.toLowerCase()} difficulty level.{' '}
            {DIFFICULTY_DESCRIPTIONS[difficulty]}
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

const CategoryDifficultyPage = async ({
  params,
}: {
  params: Promise<PageParams>;
}) => {
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <ComboGalleryContent paramsPromise={params} />
      </Suspense>
    </PageWrap>
  );
};

export default CategoryDifficultyPage;
