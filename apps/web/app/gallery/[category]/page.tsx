import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import DifficultyFilter from '@/components/DifficultyFilter';
import JumpToNav from '@/components/JumpToNav';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import {
  getCategoryImagesWithDifficulty,
  getAllCategorySlugs,
  getCategoryCount,
  getDifficultyCounts,
  getDifficultyFromSlug,
  DIFFICULTY_LABELS,
} from '@/app/data/gallery';
import { GALLERY_CATEGORIES, getCategoryBySlug } from '@/constants';
import { Difficulty } from '@chunky-crayon/db';

type PageParams = {
  category: string;
};

type SearchParams = {
  difficulty?: string;
};

export async function generateStaticParams() {
  return getAllCategorySlugs();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getCategoryBySlug(categorySlug);

  if (!category) {
    return {
      title: 'Category Not Found - Chunky Crayon',
    };
  }

  // Get count for SEO title (e.g., "84 Dragon Coloring Pages")
  const count = await getCategoryCount(categorySlug);
  const countText = count > 0 ? `${count} ` : '';

  const title = `${countText}${category.name} Coloring Pages - Free Printable Pages | Chunky Crayon`;
  const description = `Free ${category.name.toLowerCase()} coloring pages for kids and adults. ${category.description} Print or color online!`;

  return {
    title,
    description,
    keywords: category.keywords,
    openGraph: {
      title: `${countText}${category.name} Coloring Pages - Chunky Crayon`,
      description,
      type: 'website',
    },
  };
}

const RelatedCategories = ({ currentSlug }: { currentSlug: string }) => {
  // Show up to 5 related categories (excluding current)
  const related = GALLERY_CATEGORIES.filter(
    (cat) => cat.slug !== currentSlug,
  ).slice(0, 5);

  if (related.length === 0) return null;

  return (
    <section id="related" className="mb-8 scroll-mt-24">
      <h2 className="font-tondo font-semibold text-lg text-text-primary mb-3">
        Related Categories
      </h2>
      <div className="flex flex-wrap gap-2">
        {related.map((cat) => (
          <Link
            key={cat.id}
            href={`/gallery/${cat.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-cream hover:bg-crayon-orange/10 border border-paper-cream-dark hover:border-crayon-orange/30 transition-colors text-sm"
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

const CategoryGalleryContent = async ({
  paramsPromise,
  searchParamsPromise,
}: {
  paramsPromise: Promise<PageParams>;
  searchParamsPromise: Promise<SearchParams>;
}) => {
  const [{ category: categorySlug }, searchParams] = await Promise.all([
    paramsPromise,
    searchParamsPromise,
  ]);

  // Parse difficulty from search params
  const difficultySlug = searchParams.difficulty;
  const difficulty = difficultySlug
    ? getDifficultyFromSlug(difficultySlug)
    : null;

  // Fetch images with optional difficulty filter
  const [galleryData, difficultyCounts] = await Promise.all([
    getCategoryImagesWithDifficulty(categorySlug, difficulty || undefined),
    getDifficultyCounts(),
  ]);

  const { images, nextCursor, hasMore, category } = galleryData;

  if (!category) {
    notFound();
  }

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-color': 'hsl(var(--crayon-green))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  // JSON-LD CollectionPage schema for SEO
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `https://chunkycrayon.com/gallery/${categorySlug}`,
    name: `${category.name} Coloring Pages`,
    description: category.description,
    url: `https://chunkycrayon.com/gallery/${categorySlug}`,
    isPartOf: {
      '@id': 'https://chunkycrayon.com/#website',
    },
    about: {
      '@type': 'Thing',
      name: category.name,
    },
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
          name: image.title || `${category.name} Coloring Page`,
          contentUrl: image.svgUrl,
          thumbnailUrl: image.svgUrl,
          description:
            image.description || `Free ${category.name} coloring page`,
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
          { label: `${category.name} Coloring Pages` },
        ]}
        className="mb-6"
      />

      {/* Jump to Navigation */}
      <JumpToNav
        sections={[
          { id: 'filters', label: 'Filters', icon: '🎯' },
          { id: 'gallery', label: 'Gallery', icon: '🖼️' },
          { id: 'related', label: 'Related', icon: '🔗' },
          { id: 'about', label: 'About', icon: '📖' },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div id="top" className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{category.emoji}</span>
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            {category.name} Coloring Pages
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl">{category.description}</p>
      </div>

      {/* Difficulty Filter */}
      <section id="filters" className="mb-6 scroll-mt-24">
        <h2 className="font-tondo font-semibold text-sm text-text-tertiary uppercase tracking-wide mb-3">
          Filter by Difficulty
        </h2>
        <DifficultyFilter
          currentDifficulty={difficulty}
          counts={difficultyCounts}
        />
      </section>

      {/* Related Categories */}
      <RelatedCategories currentSlug={categorySlug} />

      {/* Gallery */}
      <section id="gallery" className="scroll-mt-24">
        {images.length > 0 ? (
          <InfiniteScrollGallery
            initialImages={images}
            initialCursor={nextCursor}
            initialHasMore={hasMore}
            galleryType="category"
            categorySlug={categorySlug}
          />
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">{category.emoji}</div>
            <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
              No {category.name.toLowerCase()} pages yet
            </h2>
            <p className="text-text-secondary mb-6">
              Be the first to create a {category.name.toLowerCase()} coloring
              page!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
            >
              Create a Page
            </Link>
          </div>
        )}
      </section>

      {/* SEO Content */}
      <section
        id="about"
        className="mt-16 pt-12 border-t border-paper-cream-dark scroll-mt-24"
      >
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Free {category.name} Coloring Pages
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Looking for the perfect {category.name.toLowerCase()} coloring page?
            You&apos;ve come to the right place! Our collection features a wide
            variety of {category.name.toLowerCase()} designs perfect for kids
            and adults alike.
          </p>
          <p>
            Each coloring page can be colored online using our digital tools or
            downloaded and printed for traditional coloring with crayons,
            colored pencils, or markers. Our AI-generated designs feature clean
            lines and engaging details that make coloring fun and relaxing.
          </p>
        </div>
        <h3 className="font-tondo font-semibold text-xl text-text-primary mt-8 mb-3">
          Popular {category.name} Themes
        </h3>
        <p className="text-text-secondary leading-relaxed max-w-4xl">
          Our {category.name.toLowerCase()} category includes popular searches
          like:{' '}
          {category.keywords.slice(0, 5).map((keyword, i) => (
            <span key={keyword}>
              {keyword}
              {i < Math.min(category.keywords.length, 5) - 1 ? ', ' : '.'}
            </span>
          ))}
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
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-8 w-24 bg-paper-cream rounded-full" />
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
  </div>
);

const CategoryGalleryPage = async ({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) => {
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <CategoryGalleryContent
          paramsPromise={params}
          searchParamsPromise={searchParams}
        />
      </Suspense>
    </PageWrap>
  );
};

export default CategoryGalleryPage;
