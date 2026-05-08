import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faStar,
  faLockKeyhole,
  faPrint,
  faPalette,
  faUsers,
  faArrowRight,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import CrayonScribble from '@/components/Intro/CrayonScribble';
import { checkFeatureFlag } from '@/flags';

type ProductsIndexProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: ProductsIndexProps): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = 'https://chunkycrayon.com';
  const url = `${baseUrl}/${locale}/products`;
  const title = 'Products - Chunky Crayon';
  const description =
    'Themed coloring bundles, sticker packs, and printable activity sets for ages 3 to 8. Print at home, color online, replay forever.';

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

// Category cards configuration
const CATEGORIES = [
  {
    slug: 'digital',
    label: 'Digital Bundles',
    description:
      '10-page coloring sets featuring adorable recurring characters. Each bundle includes printable PDFs and instant online coloring.',
    icon: faBookOpen,
    accentBg: 'bg-crayon-yellow-light/40',
    accentBorder: 'border-crayon-orange/30',
    accentHover: 'hover:border-crayon-orange',
    iconColor: 'text-crayon-orange',
    ctaText: 'Shop Bundles',
    live: true,
  },
  {
    slug: 'stickers',
    label: 'Sticker Packs',
    description:
      'Printable sticker sheets starring your favorite bundle characters. Perfect for decorating, journaling, and creative play.',
    icon: faStar,
    accentBg: 'bg-crayon-pink-light/40',
    accentBorder: 'border-crayon-pink/30',
    accentHover: 'hover:border-crayon-pink',
    iconColor: 'text-crayon-pink',
    ctaText: 'Coming Soon',
    live: false,
  },
] as const;

// Differentiators strip content
const DIFFERENTIATORS = [
  {
    icon: faPrint,
    title: 'Print at Home',
    description: 'High-quality PDFs for crisp, clean prints every time',
  },
  {
    icon: faPalette,
    title: 'Color Online',
    description: 'Every page works in our web coloring tool instantly',
  },
  {
    icon: faUsers,
    title: 'Recurring Characters',
    description: 'Meet the same friends across different themed sets',
  },
];

// Synchronous page handler for Cache Components
const ProductsIndexPage = ({ params }: ProductsIndexProps) => {
  return (
    <PageWrap className="bg-bg-cream">
      <Suspense fallback={null}>
        <ProductsContent params={params} />
      </Suspense>
    </PageWrap>
  );
};

// Dynamic island for Cache Components
const ProductsContent = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  const enabled = await checkFeatureFlag('bundles-shop');
  if (!enabled) notFound();

  return (
    <>
      <Breadcrumbs
        items={[{ href: `/${locale}`, label: 'Home' }, { label: 'Products' }]}
      />

      {/* Hero Header */}
      <header className="text-center py-8 lg:py-12">
        <h1 className="font-tondo text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary relative inline-block">
          Products
          <CrayonScribble
            seed={42}
            className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
          />
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg text-text-secondary font-rooney-sans">
          Themed coloring sets and activity packs for ages 3 to 8
        </p>
      </header>

      {/* Category Cards */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.slug} category={cat} locale={locale} />
          ))}
        </div>
      </section>

      {/* What Makes Us Different Strip */}
      <section className="mt-16 lg:mt-24 py-10 lg:py-14 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 bg-paper-cream rounded-3xl border-2 border-border-light">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary text-center mb-2">
            What makes Chunky Crayon different?
          </h2>
          <p className="text-center text-text-secondary mb-10 max-w-lg mx-auto">
            Every product comes with online coloring built in, not just
            printable PDFs
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {DIFFERENTIATORS.map((diff, idx) => (
              <div
                key={diff.title}
                className="flex flex-col items-center text-center p-4"
              >
                {/* Icon with chunky border */}
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-bg-white border-3 border-text-primary/10 flex items-center justify-center mb-4 shadow-card">
                  <FontAwesomeIcon
                    icon={diff.icon}
                    className={`text-2xl lg:text-3xl ${
                      idx === 0
                        ? 'text-crayon-orange'
                        : idx === 1
                          ? 'text-crayon-pink'
                          : 'text-crayon-teal'
                    }`}
                  />
                </div>
                <h3 className="font-tondo text-lg lg:text-xl font-bold text-text-primary mb-1">
                  {diff.title}
                </h3>
                <p className="text-sm text-text-secondary font-rooney-sans leading-relaxed">
                  {diff.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

// Category Card Component
type CategoryCardProps = {
  category: (typeof CATEGORIES)[number];
  locale: string;
};

const CategoryCard = ({ category, locale }: CategoryCardProps) => {
  const cardContent = (
    <div
      className={`
        relative overflow-hidden rounded-3xl border-3 p-6 lg:p-8
        transition-all duration-200
        ${category.accentBg}
        ${category.accentBorder}
        ${category.live ? `${category.accentHover} cursor-pointer hover:shadow-card-hover hover:-translate-y-1` : 'opacity-80'}
      `}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="8 6"
            className={category.iconColor}
          />
        </svg>
      </div>

      {/* Icon */}
      <div
        className={`
        w-14 h-14 lg:w-16 lg:h-16 rounded-2xl 
        bg-bg-white border-2 border-text-primary/10
        flex items-center justify-center mb-5 shadow-card
      `}
      >
        <FontAwesomeIcon
          icon={category.icon}
          className={`text-2xl lg:text-3xl ${category.iconColor}`}
        />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-tondo text-2xl lg:text-3xl font-bold text-text-primary">
            {category.label}
          </h2>
          {!category.live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-text-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-text-secondary">
              <FontAwesomeIcon icon={faLockKeyhole} size="xs" />
              Soon
            </span>
          )}
        </div>

        <p className="text-text-secondary font-rooney-sans leading-relaxed mb-6">
          {category.description}
        </p>

        {/* CTA */}
        {category.live ? (
          <span
            className={`
            inline-flex items-center gap-2 
            font-tondo font-bold text-base
            px-5 py-2.5 rounded-full
            bg-crayon-orange text-white
            shadow-btn-primary
            transition-all duration-200
            group-hover:shadow-btn-primary-hover
          `}
          >
            {category.ctaText}
            <FontAwesomeIcon
              icon={faArrowRight}
              size="sm"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        ) : (
          <span
            className={`
            inline-flex items-center gap-2
            font-tondo font-bold text-base
            px-5 py-2.5 rounded-full
            bg-text-primary/10 text-text-secondary
          `}
          >
            {category.ctaText}
          </span>
        )}
      </div>
    </div>
  );

  if (category.live) {
    return (
      <Link
        href={`/${locale}/products/${category.slug}`}
        className="block group"
      >
        {cardContent}
      </Link>
    );
  }

  return <div>{cardContent}</div>;
};

export default ProductsIndexPage;
