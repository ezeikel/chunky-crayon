import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPalette,
  faArrowRight,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import { getTranslations } from 'next-intl/server';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { GALLERY_CATEGORIES } from '@/constants';
import { getFeaturedImages, getCategoryCounts } from '@/app/data/gallery';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = 'https://chunkycrayon.com';
  const pagePath = '/gallery/for-adults';

  return {
    title:
      'Coloring Pages for Adults - Relaxing Detailed Designs | Chunky Crayon',
    description:
      'Beautiful coloring pages for adults. Intricate mandalas, nature scenes, and relaxing patterns. Free printable pages for stress relief and mindfulness.',
    keywords: [
      'coloring pages for adults',
      'adult coloring pages',
      'mandala coloring pages',
      'stress relief coloring',
      'mindfulness coloring',
      'intricate coloring pages',
      'relaxing coloring pages',
    ],
    openGraph: {
      title: 'Coloring Pages for Adults - Chunky Crayon',
      description:
        'Beautiful coloring pages for adults. Mandalas, nature, and relaxing patterns!',
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

// Categories most suitable for adults
const ADULT_CATEGORIES = [
  'mandalas',
  'nature',
  'animals',
  'fantasy',
  'flowers',
  'patterns',
  'architecture',
];

const AgeGroupSchema = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://chunkycrayon.com/gallery/for-adults',
    name: 'Coloring Pages for Adults',
    description: 'Beautiful, intricate coloring pages perfect for adults',
    url: 'https://chunkycrayon.com/gallery/for-adults',
    isPartOf: {
      '@id': 'https://chunkycrayon.com/#website',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Adults',
      suggestedMinAge: 18,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

const FeaturedImages = async ({ locale }: { locale: string }) => {
  const [t, images] = await Promise.all([
    getTranslations({ locale, namespace: 'gallery.ageGroupPages.adults' }),
    getFeaturedImages(8),
  ]);
  const validImages = images.filter((img) => img.svgUrl);

  if (validImages.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        {t('featuredSection')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {validImages.slice(0, 8).map((image) => (
          <Link
            key={image.id}
            href={`/coloring-image/${image.id}`}
            className="relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-paper-cream-dark hover:border-crayon-green/50 transition-all group shadow-sm hover:shadow-md"
          >
            <Image
              src={image.svgUrl as string}
              alt={image.title || 'Adult coloring page'}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        ))}
      </div>
    </section>
  );
};

const CategoryCards = async ({ locale }: { locale: string }) => {
  const [t, categoryT, statsT, counts] = await Promise.all([
    getTranslations({ locale, namespace: 'gallery.ageGroupPages.adults' }),
    getTranslations({ locale, namespace: 'gallery.categories' }),
    getTranslations({ locale, namespace: 'gallery.stats' }),
    getCategoryCounts(),
  ]);
  const adultCategories = GALLERY_CATEGORIES.filter((cat) =>
    ADULT_CATEGORIES.includes(cat.slug),
  );

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        {t('categoriesSection')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {adultCategories.map((category) => (
          <Link
            key={category.id}
            href={`/gallery/${category.slug}`}
            className="group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:border-crayon-green/50 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{category.emoji}</div>
            <h3 className="font-tondo font-semibold text-text-primary group-hover:text-crayon-green transition-colors">
              {categoryT(category.id)}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {counts[category.slug] || 0} {statsT('pagesSuffix')}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-12">
    <div className="h-8 w-48 bg-paper-cream rounded mb-6" />
    <div className="h-48 bg-paper-cream rounded-3xl mb-12" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="h-24 bg-paper-cream rounded-2xl" />
      ))}
    </div>
  </div>
);

// Async component that handles data fetching and translations
const ForAdultsContent = async ({ locale }: { locale: string }) => {
  const [t, commonT, breadcrumbsT] = await Promise.all([
    getTranslations({ locale, namespace: 'gallery.ageGroupPages.adults' }),
    getTranslations({ locale, namespace: 'gallery.ageGroupPages.common' }),
    getTranslations({ locale, namespace: 'breadcrumbs' }),
  ]);

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-green))',
    '--fa-secondary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: breadcrumbsT('home'), href: '/' },
          { label: breadcrumbsT('gallery'), href: '/gallery' },
          { label: breadcrumbsT('forAdults') },
        ]}
        className="mb-6"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-crayon-green/20 to-crayon-blue/20 rounded-3xl p-8 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-4xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            {t('pageTitle')}
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl mb-6">
          {t('heroDescription')}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-green text-white font-semibold rounded-full hover:bg-crayon-green-dark transition-colors"
        >
          <FontAwesomeIcon icon={faSparkles} />
          {commonT('createYourDesign')}
        </Link>
      </div>

      <FeaturedImages locale={locale} />
      <CategoryCards locale={locale} />

      {/* Benefits Section */}
      <section className="bg-paper-cream rounded-3xl p-8 mb-12">
        <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
          {t('whyTitle')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🧘</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              {t('why1Title')}
            </h3>
            <p className="text-text-secondary text-sm">
              {t('why1Description')}
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              {t('why2Title')}
            </h3>
            <p className="text-text-secondary text-sm">
              {t('why2Description')}
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              {t('why3Title')}
            </h3>
            <p className="text-text-secondary text-sm">
              {t('why3Description')}
            </p>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          {t('seoTitle')}
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>{t('seoParagraph1')}</p>
          <p>{t('seoParagraph2')}</p>
          <p>{t('seoParagraph3')}</p>
        </div>

        <h3 className="font-tondo font-semibold text-xl text-text-primary mt-8 mb-3">
          {t('popularTitle')}
        </h3>
        <p className="text-text-secondary leading-relaxed max-w-4xl">
          {t('popularDescription')}
        </p>
      </section>

      {/* Related Age Groups */}
      <section className="mt-12 pt-8 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-semibold text-lg text-text-primary mb-4">
          {commonT('moreAgeGroups')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/gallery/for-toddlers"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper-cream hover:bg-crayon-purple/10 border border-paper-cream-dark hover:border-crayon-purple/30 transition-colors"
          >
            <span>👶</span>
            <span>{breadcrumbsT('forToddlers')}</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
          <Link
            href="/gallery/for-kids"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper-cream hover:bg-crayon-orange/10 border border-paper-cream-dark hover:border-crayon-orange/30 transition-colors"
          >
            <span>👦</span>
            <span>{breadcrumbsT('forKids')}</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
          <Link
            href="/gallery/for-teens"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper-cream hover:bg-crayon-blue/10 border border-paper-cream-dark hover:border-crayon-blue/30 transition-colors"
          >
            <span>🎮</span>
            <span>{breadcrumbsT('forTeens')}</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
        </div>
      </section>
    </>
  );
};

const ForAdultsPage = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;

  return (
    <PageWrap>
      <AgeGroupSchema />
      <Suspense fallback={<LoadingSkeleton />}>
        <ForAdultsContent locale={locale} />
      </Suspense>
    </PageWrap>
  );
};

export default ForAdultsPage;
