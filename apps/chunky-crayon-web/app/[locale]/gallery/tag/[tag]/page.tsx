import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag } from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import { getTagImages, getTagCount } from '@/app/data/gallery';
import { generateAlternates } from '@/lib/seo';
import { GALLERY_CATEGORIES } from '@/constants';

type PageParams = {
  locale: string;
  tag: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const displayTag = decodedTag.charAt(0).toUpperCase() + decodedTag.slice(1);
  const count = await getTagCount(decodedTag);

  if (count === 0) {
    return { title: 'Tag Not Found - Chunky Crayon' };
  }

  const countText = count > 0 ? `${count} ` : '';
  const title = `${countText}${displayTag} Coloring Pages - Free Printable | Chunky Crayon`;
  const description = `Free ${decodedTag} coloring pages for kids and adults. Browse ${count} printable ${decodedTag} coloring pages. Color online or print for free!`;
  const pagePath = `/gallery/tag/${tag}`;

  return {
    title,
    description,
    keywords: [
      `${decodedTag} coloring pages`,
      `${decodedTag} coloring sheets`,
      `free ${decodedTag} coloring pages`,
      `printable ${decodedTag} coloring pages`,
    ],
    openGraph: {
      title: `${displayTag} Coloring Pages - Chunky Crayon`,
      description,
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${pagePath}`,
    },
    alternates: generateAlternates(locale, pagePath),
  };
}

const TagGalleryContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { locale, tag: rawTag } = await paramsPromise;
  const tag = decodeURIComponent(rawTag);
  const displayTag = tag.charAt(0).toUpperCase() + tag.slice(1);

  const [galleryData, count, breadcrumbsT] = await Promise.all([
    getTagImages(tag),
    getTagCount(tag),
    getTranslations({ locale, namespace: 'breadcrumbs' }),
  ]);

  const { images, nextCursor, hasMore } = galleryData;

  if (count === 0) {
    notFound();
  }

  // Find related categories that share this tag
  const relatedCategories = GALLERY_CATEGORIES.filter((cat) =>
    cat.tags.includes(tag),
  ).slice(0, 5);

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-color': 'hsl(var(--crayon-green))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  // JSON-LD CollectionPage schema
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `https://chunkycrayon.com/gallery/tag/${rawTag}`,
    name: `${displayTag} Coloring Pages`,
    description: `Free ${tag} coloring pages for kids and adults`,
    url: `https://chunkycrayon.com/gallery/tag/${rawTag}`,
    isPartOf: {
      '@id': 'https://chunkycrayon.com/#website',
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
          name: image.title || `${displayTag} Coloring Page`,
          contentUrl: image.svgUrl,
          thumbnailUrl: image.svgUrl,
          description: image.description || `Free ${tag} coloring page`,
        },
      })),
    },
  };

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
          { label: `${displayTag} Coloring Pages` },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faTag}
            className="text-3xl"
            style={iconStyle}
          />
          <div>
            <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
              {displayTag} Coloring Pages
            </h1>
            {count > 0 && (
              <p className="text-text-tertiary text-sm mt-1">
                {count} coloring {count === 1 ? 'page' : 'pages'}
              </p>
            )}
          </div>
        </div>
        <p className="text-text-secondary max-w-2xl">
          Browse our collection of free {tag} coloring pages. Each page can be
          colored online or downloaded and printed for traditional coloring.
        </p>
      </div>

      {/* Related Categories */}
      {relatedCategories.length > 0 && (
        <div className="mb-8">
          <h2 className="font-tondo font-semibold text-lg text-text-primary mb-3">
            Related Categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/gallery/${cat.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-cream hover:bg-crayon-orange/10 border border-paper-cream-dark hover:border-crayon-orange/30 transition-colors text-sm"
              >
                <FontAwesomeIcon icon={cat.icon} className={cat.color} />
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      {images.length > 0 ? (
        <InfiniteScrollGallery
          initialImages={images}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
          galleryType="tag"
          tagSlug={tag}
        />
      ) : (
        <div className="text-center py-16">
          <FontAwesomeIcon
            icon={faTag}
            className="text-6xl mb-4 text-crayon-orange"
          />
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
            No {tag} pages yet
          </h2>
          <p className="text-text-secondary mb-6">
            Check back soon for {tag} coloring pages!
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
          Free {displayTag} Coloring Pages
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Looking for {tag} coloring pages? Our collection features {count}{' '}
            free printable {tag} coloring pages suitable for all ages and skill
            levels. From simple designs for toddlers to detailed illustrations
            for adults, there is something for everyone.
          </p>
          <p>
            Each coloring page can be colored online using our digital tools or
            downloaded and printed for traditional coloring with crayons,
            colored pencils, or markers. Every design features clean lines and
            engaging details that make coloring fun and relaxing.
          </p>
        </div>
      </section>
    </>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-paper-cream rounded w-32 mb-4" />
    <div className="h-10 bg-paper-cream rounded w-72 mb-4" />
    <div className="h-6 bg-paper-cream rounded w-96 mb-8" />
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
  </div>
);

const TagGalleryPage = async ({ params }: { params: Promise<PageParams> }) => {
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <TagGalleryContent paramsPromise={params} />
      </Suspense>
    </PageWrap>
  );
};

export default TagGalleryPage;
