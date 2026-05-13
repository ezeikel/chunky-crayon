import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getLandingIcon } from '@/lib/seo/landing-icons';
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
import {
  LANDING_PAGES,
  getLandingPageBySlug,
  getRelatedLandings,
} from '@/lib/seo/landing-pages';
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
      <EmailCaptureModal sourceSlug={slug} />
      <PageWrap>
        <header className="text-center mb-10 max-w-3xl mx-auto">
          <h1 className="font-tondo text-3xl md:text-5xl font-extrabold mb-3 text-primary">
            {config.title}
          </h1>
          <p className="font-tondo text-lg text-crayon-orange mb-4">
            {config.tagline}
          </p>
          {/* Problem-solver landings get a different copy block: targeted
              audience line + situation acknowledgement + optional citation.
              The reframing matters because these searchers arrived with a
              problem, not browsing curiosity. Theme landings render the
              standard intro only. */}
          {config.angle === 'problem' ? (
            <div className="space-y-4 text-left">
              {config.targetAudience ? (
                <p className="text-sm font-tondo text-muted-foreground italic text-center">
                  {config.targetAudience}
                </p>
              ) : null}
              {config.problemFraming ? (
                <div className="bg-paper-cream/60 rounded-2xl p-5 border border-crayon-orange/20">
                  <p className="text-xs font-tondo font-semibold uppercase tracking-wider text-crayon-orange mb-2">
                    The situation
                  </p>
                  <p className="text-foreground">{config.problemFraming}</p>
                </div>
              ) : null}
              <p className="text-muted-foreground text-center">
                {config.intro}
              </p>
              {config.researchCitation?.source &&
              config.researchCitation?.claim ? (
                <p className="text-xs text-muted-foreground italic text-center">
                  &ldquo;{config.researchCitation.claim}&rdquo; —{' '}
                  {config.researchCitation.url ? (
                    <a
                      href={config.researchCitation.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="underline hover:text-foreground"
                    >
                      {config.researchCitation.source}
                    </a>
                  ) : (
                    config.researchCitation.source
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">{config.intro}</p>
          )}
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
              {config.angle === 'problem'
                ? 'Or make a custom calming page for your kid →'
                : 'Or make your own custom page →'}
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

        {/* Related landings — internal cross-linking. Google rewards
            topical clusters where related pages link to each other, and
            it gives readers a natural next-step that keeps them on-site
            instead of bouncing back to search. */}
        {(() => {
          const related = getRelatedLandings(slug, 4);
          if (related.length === 0) return null;
          return (
            <section className="mt-16 max-w-4xl mx-auto">
              <h2 className="font-tondo text-xl md:text-2xl font-extrabold mb-2 text-primary">
                Related coloring page collections
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Other collections parents and teachers often pair with this one.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {related.map((r) => {
                  const { icon, color } = getLandingIcon(r.slug);
                  return (
                    <Link
                      key={r.slug}
                      href={`/coloring-pages/${r.slug}`}
                      className="group flex items-start gap-3 bg-paper-cream/40 hover:bg-paper-cream/70 border-2 border-crayon-orange/15 hover:border-crayon-orange/40 rounded-2xl p-4 transition-colors"
                    >
                      <div
                        className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-white/60 group-hover:bg-white transition-colors"
                        style={{ color }}
                      >
                        <FontAwesomeIcon icon={icon} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-tondo font-bold text-sm text-foreground mb-0.5">
                          {r.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {r.tagline}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/coloring-pages"
                  className="font-tondo text-crayon-orange underline-offset-4 hover:underline text-sm"
                >
                  See all coloring page collections →
                </Link>
              </div>
            </section>
          );
        })()}
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

// Skeleton that mirrors the actual landing shape (header + gallery grid).
// Replaces the inline "Loading…" string — the brand convention is
// per-page LoadingSkeletons that match the surrounding layout, not a
// generic spinner.
const LoadingSkeleton = () => (
  <div className="animate-pulse max-w-5xl mx-auto px-6 py-12">
    <div className="text-center mb-10 max-w-3xl mx-auto">
      <div className="h-10 bg-paper-cream rounded w-3/4 mx-auto mb-4" />
      <div className="h-5 bg-paper-cream rounded w-1/2 mx-auto mb-3" />
      <div className="h-4 bg-paper-cream rounded w-5/6 mx-auto mb-1.5" />
      <div className="h-4 bg-paper-cream rounded w-2/3 mx-auto" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
  </div>
);

const LandingPage = ({ params }: { params: Promise<PageParams> }) => (
  <Suspense fallback={<LoadingSkeleton />}>
    <SlugRouter paramsPromise={params} />
  </Suspense>
);

export default LandingPage;
