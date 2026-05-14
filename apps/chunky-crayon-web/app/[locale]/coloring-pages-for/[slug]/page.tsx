import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import { getComboImages } from '@/app/data/gallery';
import { getCategoryBySlug } from '@/constants';
import { generateAlternates } from '@/lib/seo';
import {
  COMBO_PAGES,
  getComboPageBySlug,
  type ComboPage,
} from '@/lib/seo/combo-pages';
import { getColoringImageCanonicalUrl } from '@/lib/seo/coloring-image-url';
import type { GalleryImage } from '@/app/data/coloring-image';
import cn from '@/lib/utils';

type PageParams = { locale: string; slug: string };

export async function generateStaticParams() {
  return COMBO_PAGES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const combo = getComboPageBySlug(slug);

  if (!combo) {
    return { title: 'Not Found - Chunky Crayon' };
  }

  const pagePath = `/coloring-pages-for/${slug}`;

  return {
    title: combo.title,
    description: combo.description,
    keywords: combo.keywords,
    openGraph: {
      title: combo.h1,
      description: combo.description,
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${pagePath}`,
    },
    alternates: generateAlternates(locale, pagePath),
  };
}

const buildCollectionSchema = (
  combo: ComboPage,
  locale: string,
  images: GalleryImage[],
) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `https://chunkycrayon.com/coloring-pages-for/${combo.slug}`,
  name: combo.h1,
  description: combo.description,
  url: `https://chunkycrayon.com/coloring-pages-for/${combo.slug}`,
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
        name: image.title || combo.h1,
        contentUrl: image.svgUrl,
      },
    })),
  },
});

const buildFaqSchema = (combo: ComboPage) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: combo.faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.a,
    },
  })),
});

const RelatedCombos = ({ combo }: { combo: ComboPage }) => {
  const slugs = combo.relatedComboSlugs ?? [];
  const related = slugs
    .map((s) => getComboPageBySlug(s))
    .filter((c): c is ComboPage => Boolean(c));

  if (related.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="font-tondo font-semibold text-lg text-text-primary mb-3">
        Related Coloring Pages
      </h2>
      <div className="flex flex-wrap gap-2">
        {related.map((r) => (
          <Link
            key={r.slug}
            href={`/coloring-pages-for/${r.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-cream hover:bg-crayon-orange/10 border border-paper-cream-dark hover:border-crayon-orange/30 transition-colors text-sm"
          >
            {r.h1}
          </Link>
        ))}
      </div>
    </section>
  );
};

const ComboPageContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { locale, slug } = await paramsPromise;
  const combo = getComboPageBySlug(slug);

  if (!combo) {
    notFound();
  }

  const [galleryData, breadcrumbsT] = await Promise.all([
    getComboImages({
      categorySlug: combo.categorySlug,
      difficulty: combo.difficulty,
      extraTagsAny: combo.extraTagsAny,
    }),
    getTranslations({ locale, namespace: 'breadcrumbs' }),
  ]);

  const { images, nextCursor, hasMore } = galleryData;

  const category = combo.categorySlug
    ? getCategoryBySlug(combo.categorySlug)
    : undefined;

  const collectionSchema = buildCollectionSchema(combo, locale, images);
  const faqSchema = buildFaqSchema(combo);

  const iconClass = category?.color ?? 'text-crayon-orange';
  const icon = category?.icon ?? faPalette;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Breadcrumbs
        items={[
          { label: breadcrumbsT('home'), href: '/' },
          { label: 'Coloring Pages For' },
          { label: combo.h1 },
        ]}
        className="mb-6"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon icon={icon} className={cn('text-4xl', iconClass)} />
          <div>
            <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
              {combo.h1}
            </h1>
            {images.length > 0 && (
              <p className="text-text-tertiary text-sm mt-1">
                {images.length} coloring{' '}
                {images.length === 1 ? 'page' : 'pages'}
              </p>
            )}
          </div>
        </div>
        <p className="text-text-secondary max-w-2xl">{combo.tagline}</p>
      </div>

      {/* Intro */}
      <section className="mb-8 max-w-3xl">
        <p className="text-text-secondary leading-relaxed">{combo.intro}</p>
      </section>

      {/* Why it helps (optional) */}
      {combo.whyItHelps && (
        <section className="mb-8 max-w-3xl">
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-3">
            Why these work
          </h2>
          <p className="text-text-secondary leading-relaxed">
            {combo.whyItHelps}
          </p>
        </section>
      )}

      {/* Related combos */}
      <RelatedCombos combo={combo} />

      {/* Gallery */}
      {images.length > 0 ? (
        <InfiniteScrollGallery
          initialImages={images}
          initialCursor={nextCursor}
          initialHasMore={hasMore}
          galleryType="combo"
          comboSlug={combo.slug}
          locale={locale}
        />
      ) : (
        <div className="text-center py-16">
          <FontAwesomeIcon
            icon={icon}
            className={cn('text-6xl mb-4', iconClass)}
          />
          <h2 className="font-tondo font-semibold text-xl text-text-primary mb-2">
            No matching pages yet
          </h2>
          <p className="text-text-secondary mb-6">
            We are filling out this collection. Check back soon or browse our
            full gallery.
          </p>
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
          >
            Browse All Pages
          </Link>
        </div>
      )}

      {/* FAQs */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark max-w-3xl">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Frequently Asked Questions
        </h2>
        <dl className="space-y-6">
          {combo.faqs.map((faq) => (
            <div key={faq.q}>
              <dt className="font-tondo font-semibold text-lg text-text-primary mb-2">
                {faq.q}
              </dt>
              <dd className="text-text-secondary leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>
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

const ComboPageRoute = ({ params }: { params: Promise<PageParams> }) => {
  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <ComboPageContent paramsPromise={params} />
      </Suspense>
    </PageWrap>
  );
};

export default ComboPageRoute;
