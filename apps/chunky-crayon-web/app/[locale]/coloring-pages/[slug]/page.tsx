import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageWrap from '@/components/PageWrap/PageWrap';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import { getTagImages } from '@/app/data/gallery';
import { generateAlternates } from '@/lib/seo';
import { LANDING_PAGES, getLandingPageBySlug } from '@/lib/seo/landing-pages';
import SeoLandingViewTracker from '@/components/SeoLandingViewTracker';

type PageParams = { locale: string; slug: string };

export async function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const config = getLandingPageBySlug(slug);
  if (!config) return { title: 'Not Found - Chunky Crayon' };

  const pagePath = `/coloring-pages/${slug}`;
  return {
    title: `${config.title} | Chunky Crayon`,
    description: config.description,
    openGraph: {
      title: `${config.title} - Chunky Crayon`,
      description: config.description,
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${pagePath}`,
    },
    alternates: generateAlternates(locale, pagePath),
  };
}

const LandingPageContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { slug } = await paramsPromise;
  const config = getLandingPageBySlug(slug);
  if (!config) notFound();

  // Use the first tag as the primary filter. Falls back gracefully when
  // the tag has no matches — the generator CTA is still prominent.
  const primaryTag = config.tags[0] ?? '';
  const galleryData = primaryTag
    ? await getTagImages(primaryTag)
    : { images: [], nextCursor: null, hasMore: false };
  const { images, nextCursor, hasMore } = galleryData;

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `https://chunkycrayon.com/coloring-pages/${slug}`,
    name: config.title,
    description: config.description,
    url: `https://chunkycrayon.com/coloring-pages/${slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <SeoLandingViewTracker slug={slug} />
      <PageWrap>
        <header className="text-center mb-10 max-w-3xl mx-auto">
          <h1 className="font-tondo text-3xl md:text-5xl font-extrabold mb-3 text-primary">
            {config.title}
          </h1>
          <p className="font-tondo text-lg text-crayon-orange mb-4">
            {config.tagline}
          </p>
          <p className="text-muted-foreground">{config.intro}</p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-block bg-btn-orange text-white font-tondo font-bold px-6 py-3 rounded-coloring-card shadow-btn-primary hover:scale-105 transition"
            >
              Make your own free page →
            </Link>
          </div>
        </header>

        {images.length > 0 ? (
          <InfiniteScrollGallery
            initialImages={images}
            initialCursor={nextCursor}
            initialHasMore={hasMore}
            galleryType="tag"
            tagSlug={primaryTag}
          />
        ) : (
          <div className="text-center text-muted-foreground py-16">
            Our fresh pages are loading in daily. Come back soon, or{' '}
            <Link href="/" className="underline text-crayon-orange font-tondo">
              generate a custom one now
            </Link>
            .
          </div>
        )}
      </PageWrap>
    </>
  );
};

const LandingPage = ({ params }: { params: Promise<PageParams> }) => (
  <Suspense fallback={<div className="text-center py-24">Loading pages…</div>}>
    <LandingPageContent paramsPromise={params} />
  </Suspense>
);

export default LandingPage;
