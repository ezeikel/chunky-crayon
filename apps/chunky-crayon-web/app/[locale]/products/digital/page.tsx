import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines,
  faPrint,
  faPalette,
  faUsers,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import {
  listPublishedBundles,
  listingImagesForBundle,
} from '@/app/data/bundle';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import CrayonScribble from '@/components/Intro/CrayonScribble';
import { checkFeatureFlag } from '@/flags';

type DigitalProductsIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: DigitalProductsIndexProps): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = 'https://chunkycrayon.com';
  const url = `${baseUrl}/${locale}/products/digital`;
  const title = 'Digital Coloring Bundles - Chunky Crayon';
  const description =
    'Themed coloring bundles for ages 3 to 8. Print at home, color online, replay forever. Each bundle is 10 pages with a recurring cast of characters.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Chunky Crayon',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  };
}

// Synchronous page handler — only renders the static shell. Static
// breadcrumbs that don't depend on params live here directly. Anything
// dynamic (incl. unwrapping params) is delegated to the Suspense child.
const DigitalProductsIndexPage = ({ params }: DigitalProductsIndexProps) => {
  return (
    <PageWrap>
      <Suspense fallback={null}>
        <DigitalProductsGrid params={params} />
      </Suspense>
    </PageWrap>
  );
};

// What's in a bundle strip content
const BUNDLE_FEATURES = [
  {
    icon: faFileLines,
    title: '10 Pages',
    description: 'Each bundle is a complete themed set',
  },
  {
    icon: faPrint,
    title: 'Print + Online',
    description: 'PDF downloads and instant web coloring',
  },
  {
    icon: faUsers,
    title: 'Recurring Characters',
    description: 'Meet the same friends across adventures',
  },
];

// Accent colors for bundle cards - cycles through these
const CARD_ACCENTS = [
  {
    bg: 'bg-crayon-yellow-light/50',
    border: 'border-crayon-orange/20',
    hoverBorder: 'group-hover:border-crayon-orange',
    badge: 'bg-crayon-orange text-white',
    price: 'text-crayon-orange-dark',
  },
  {
    bg: 'bg-crayon-pink-light/50',
    border: 'border-crayon-pink/20',
    hoverBorder: 'group-hover:border-crayon-pink',
    badge: 'bg-crayon-pink text-white',
    price: 'text-crayon-pink-dark',
  },
  {
    bg: 'bg-crayon-purple-light/50',
    border: 'border-crayon-purple/20',
    hoverBorder: 'group-hover:border-crayon-purple',
    badge: 'bg-crayon-purple text-white',
    price: 'text-crayon-purple-dark',
  },
];

// Dynamic island for Cache Components — flag check + DB read + breadcrumbs
// (which need locale) live here so the page shell can prerender. notFound()
// inside a Suspense child still short-circuits the whole route to /not-found.
const DigitalProductsGrid = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  const enabled = await checkFeatureFlag('bundles-shop');
  if (!enabled) notFound();

  const bundles = await listPublishedBundles();

  return (
    <>
      <Breadcrumbs
        items={[
          { href: `/${locale}`, label: 'Home' },
          { href: `/${locale}/products`, label: 'Products' },
          { label: 'Digital Bundles' },
        ]}
      />

      {/* Hero Header */}
      <header className="text-center py-8 lg:py-12">
        <h1 className="font-tondo text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary relative inline-block">
          Coloring Bundles
          <CrayonScribble
            seed={84}
            className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
          />
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg text-text-secondary font-rooney-sans">
          Themed 10-page sets with a recurring cast. Print at home, color
          online, replay forever.
        </p>
      </header>

      {/* Bundle Grid or Empty State */}
      <section className="max-w-5xl mx-auto px-4 pb-8">
        {bundles.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {bundles.map((bundle, idx) => {
              const hero = listingImagesForBundle(bundle)[0];
              const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
              return (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  hero={hero}
                  accent={accent}
                  locale={locale}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* What's in a Bundle Strip */}
      <section className="mt-8 lg:mt-16 py-10 lg:py-14 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 bg-paper-cream rounded-3xl border-2 border-border-light">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary text-center mb-2">
            {"What's in a bundle?"}
          </h2>
          <p className="text-center text-text-secondary mb-10 max-w-lg mx-auto font-rooney-sans">
            Everything you need for creative coloring fun
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {BUNDLE_FEATURES.map((feature, idx) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center p-4"
              >
                {/* Icon with chunky border */}
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-bg-white border-3 border-text-primary/10 flex items-center justify-center mb-4 shadow-card">
                  <FontAwesomeIcon
                    icon={feature.icon}
                    className={`text-2xl lg:text-3xl ${
                      idx === 0
                        ? 'text-crayon-orange'
                        : idx === 1
                          ? 'text-crayon-teal'
                          : 'text-crayon-pink'
                    }`}
                  />
                </div>
                <h3 className="font-tondo text-lg lg:text-xl font-bold text-text-primary mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary font-rooney-sans leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

// Bundle Card Component
type BundleCardProps = {
  bundle: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    pricePence: number;
    pageCount: number;
    currency: string;
  };
  hero: string | undefined;
  accent: (typeof CARD_ACCENTS)[number];
  locale: string;
};

const BundleCard = ({ bundle, hero, accent, locale }: BundleCardProps) => {
  return (
    <Link
      href={`/${locale}/products/digital/${bundle.slug}`}
      className={`
        group relative flex flex-col overflow-hidden rounded-3xl border-3 bg-bg-white
        ${accent.border} ${accent.hoverBorder}
        transition-all duration-200
        hover:shadow-card-hover hover:-translate-y-1
      `}
    >
      {/* Hero Image — listing JPGs are already fully composed (badges,
          page count, brand mark baked in), so we let it fill the frame
          edge-to-edge with no overlay chrome. */}
      {hero ? (
        <div className="relative aspect-square w-full overflow-hidden bg-bg-white">
          <Image
            src={hero}
            alt={bundle.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="relative aspect-square w-full overflow-hidden bg-bg-white flex items-center justify-center">
          <FontAwesomeIcon
            icon={faSparkles}
            className="text-4xl text-text-primary/20"
          />
        </div>
      )}

      {/* Content footer — accent tint lives here, not behind the artwork */}
      <div className={`p-4 lg:p-5 ${accent.bg} border-t-2 ${accent.border}`}>
        <h2 className="font-tondo text-xl lg:text-2xl font-bold text-text-primary group-hover:text-crayon-orange-dark transition-colors line-clamp-1">
          {bundle.name}
        </h2>
        {bundle.tagline && (
          <p className="mt-1 text-sm text-text-secondary font-rooney-sans line-clamp-2 leading-relaxed">
            {bundle.tagline}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className={`font-tondo text-xl font-bold ${accent.price}`}>
            {(() => {
              const cur = bundle.currency.toUpperCase();
              const symbol =
                cur === 'GBP'
                  ? '£'
                  : cur === 'USD'
                    ? '$'
                    : cur === 'EUR'
                      ? '€'
                      : '';
              return `${symbol}${(bundle.pricePence / 100).toFixed(2)}`;
            })()}
          </span>
          <span className="text-xs text-text-secondary font-rooney-sans uppercase tracking-wide">
            {bundle.pageCount} pages
          </span>
        </div>
      </div>
    </Link>
  );
};

// Empty State Component
const EmptyState = () => {
  return (
    <div className="text-center py-16 lg:py-24">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-crayon-yellow-light/50 border-3 border-crayon-orange/20 flex items-center justify-center shadow-card">
        <FontAwesomeIcon
          icon={faSparkles}
          className="text-3xl text-crayon-orange"
        />
      </div>
      <h2 className="font-tondo text-2xl font-bold text-text-primary mb-2">
        New bundles coming soon
      </h2>
      <p className="text-text-secondary font-rooney-sans max-w-md mx-auto">
        {"We're"} working on exciting new coloring adventures. Check back soon
        for themed bundles featuring adorable characters.
      </p>
    </div>
  );
};

export default DigitalProductsIndexPage;
