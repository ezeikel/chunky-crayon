import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PageWrap from '@/components/PageWrap/PageWrap';
import InfiniteScrollGallery from '@/components/InfiniteScrollGallery/InfiniteScrollGallery';
import ColoringImageDetailView from '@/components/ColoringImageDetailView/ColoringImageDetailView';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { getTagImages } from '@/app/data/gallery';
import {
  getColoringImageBySlugSuffix,
  getColoringImageById,
} from '@/app/data/coloring-image';
import { generateAlternates } from '@/lib/seo';
import { LANDING_PAGES, getLandingPageBySlug } from '@/lib/seo/landing-pages';
import {
  getCanonicalSlugForImage,
  getIdSuffixFromSlug,
  isPubliclyIndexable,
} from '@/lib/seo/coloring-image-url';
import SeoLandingViewTracker from '@/components/SeoLandingViewTracker';
import PackDownloadButton from '@/components/PackDownloadButton/PackDownloadButton';
import EmailCaptureModal from '@/components/EmailCaptureModal/EmailCaptureModal';

// Mirror of generateLandingPackPDF's PACK_SIZE — kept in sync by hand
// rather than imported to avoid pulling the PDF deps into the page bundle.
const PACK_PAGE_COUNT = 12;

type PageParams = { locale: string; slug: string };

// generateStaticParams prerenders BOTH curated landing pages AND public
// coloring-image detail pages at their slugged URLs. We do this because the
// old /coloring-image/[id] route used to prerender ~239 image pages at
// build; moving them here is a wash, and the alternative — ISR on first
// hit — means Googlebot would crawl a cold page and the redirect destination
// would be empty until the first request warms it. Catch + fallback to
// landing-only on DB error to match the old route's graceful behaviour.
export async function generateStaticParams() {
  const landingParams = LANDING_PAGES.map((p) => ({ slug: p.slug }));
  try {
    const images = await db.coloringImage.findMany({
      where: {
        brand: BRAND,
        userId: null,
        status: 'READY',
        showInCommunity: true,
        slugBase: { not: null },
      },
      select: { id: true, slugBase: true },
      orderBy: { createdAt: 'desc' },
    });
    const imageParams = images.map((img) => ({
      slug: `${img.slugBase}-${img.id.slice(-5)}`,
    }));
    return [...landingParams, ...imageParams];
  } catch (err) {
    console.error(
      '[coloring-pages] generateStaticParams: image lookup failed — landing pages only:',
      err,
    );
    return landingParams;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const config = getLandingPageBySlug(slug);

  // Curated landing page — use its config.
  if (config) {
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

  // Image-detail fallback — derive metadata from the matching image row.
  const image = await getColoringImageBySlugSuffix(getIdSuffixFromSlug(slug));
  if (!image || !image.id) {
    return { title: 'Not Found - Chunky Crayon' };
  }

  const title = `${image.title || 'Coloring Page'} - Free Printable | Chunky Crayon`;
  const description =
    image.description ||
    'Free printable coloring page from Chunky Crayon. Color online or download and print!';
  const canonicalPath = `/${locale}/coloring-pages/${slug}`;

  return {
    title,
    description,
    keywords: image.tags?.join(', ') || 'coloring page, printable, kids',
    openGraph: {
      title: `${image.title || 'Coloring Page'} - Chunky Crayon`,
      description,
      url: `https://chunkycrayon.com${canonicalPath}`,
      siteName: 'Chunky Crayon',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${image.title || 'Coloring Page'} - Chunky Crayon`,
      description,
    },
    alternates: generateAlternates(locale, `/coloring-pages/${slug}`),
  };
}

const LandingPageContent = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { slug, locale } = await paramsPromise;
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
      <EmailCaptureModal />
      <PageWrap>
        <header className="text-center mb-10 max-w-3xl mx-auto">
          <h1 className="font-tondo text-3xl md:text-5xl font-extrabold mb-3 text-primary">
            {config.title}
          </h1>
          <p className="font-tondo text-lg text-crayon-orange mb-4">
            {config.tagline}
          </p>
          <p className="text-muted-foreground">{config.intro}</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            {/* Primary CTA — instant pack download. The reason a parent
                landed here from a "free X coloring pages" query is to
                grab a printable now; everything else is secondary. */}
            {images.length > 0 && (
              <PackDownloadButton
                slug={slug}
                title={config.title}
                pageCount={Math.min(PACK_PAGE_COUNT, images.length)}
              />
            )}
            <Link
              href="/"
              className="font-tondo text-crayon-orange underline-offset-4 hover:underline"
            >
              Or make your own custom page →
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
            locale={locale}
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

// Image-detail route fallback: when the slug isn't a curated landing page,
// it might be the slugged URL for a public coloring image. The route handler
// at the top of LandingPage decides which branch to render.
const ImageDetailFallback = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const { locale, slug } = await paramsPromise;
  const suffix = getIdSuffixFromSlug(slug);
  const image = await getColoringImageBySlugSuffix(suffix);

  if (!image || !image.id) {
    notFound();
  }

  // The query already filters by isPubliclyIndexable predicates (userId IS
  // NULL, status READY, showInCommunity true, slugBase not null), so any
  // row that comes back here is safe to serve. The redundant check below
  // is a safety belt against the helper's contract changing.
  if (
    !isPubliclyIndexable({
      id: image.id,
      slugBase: image.slugBase ?? null,
      userId: image.userId ?? null,
      showInCommunity: image.showInCommunity ?? false,
      status: image.status ?? 'READY',
    })
  ) {
    notFound();
  }

  // Canonical-slug check — if the URL slug doesn't match the row's current
  // canonical (e.g. someone hand-typed garbage + the right suffix), 301 to
  // canonical. Keeps Google from indexing slug variations.
  const canonical = getCanonicalSlugForImage({
    id: image.id,
    slugBase: image.slugBase ?? null,
  });
  if (canonical && slug !== canonical) {
    redirect(`/${locale}/coloring-pages/${canonical}`);
  }

  // Fetch full image (with all canvas/region fields) for the detail view.
  // getColoringImageBySlugSuffix selects gallery fields; the detail view
  // needs colorMapJson, regionsJson, etc. so re-fetch via getColoringImageById.
  const full = await getColoringImageById(image.id);
  if (!full) notFound();

  return <ColoringImageDetailView coloringImage={full} locale={locale} />;
};

// SlugRouter runs inside Suspense so it can `await params` without busting
// the static shell (see project memory `feedback_async_page_handlers_block_static_shell`).
// It picks the branch by slug shape — curated landing pages render the
// gallery; everything else attempts an image-detail lookup.
const SlugRouter = async ({
  paramsPromise,
}: {
  paramsPromise: Promise<PageParams>;
}) => {
  const params = await paramsPromise;
  const isLanding = !!getLandingPageBySlug(params.slug);
  return isLanding ? (
    <LandingPageContent paramsPromise={Promise.resolve(params)} />
  ) : (
    <ImageDetailFallback paramsPromise={Promise.resolve(params)} />
  );
};

const LandingPage = ({ params }: { params: Promise<PageParams> }) => (
  <Suspense fallback={<div className="text-center py-24">Loading…</div>}>
    <SlugRouter paramsPromise={params} />
  </Suspense>
);

export default LandingPage;
