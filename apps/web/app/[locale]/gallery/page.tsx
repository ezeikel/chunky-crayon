import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSparkles,
  faUsers,
  faCalendarStar,
  faArrowRight,
  faImages,
  faStar,
  faStars,
  faMedal,
  faCrown,
  faGaugeSimple,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  getTodaysDailyImage,
  getFeaturedImages,
  getCategoryCounts,
  getGalleryStats,
  getDifficultyCounts,
} from '@/app/data/gallery';
import { GALLERY_CATEGORIES } from '@/constants';
import { Difficulty } from '@chunky-crayon/db';
import cn from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Free Coloring Pages Gallery - Chunky Crayon',
  description:
    'Browse our free collection of printable coloring pages. Find animals, dragons, unicorns, princesses, and more. New pages added daily!',
  keywords: [
    'free coloring pages',
    'printable coloring pages',
    'coloring pages for kids',
    'coloring pages for adults',
    'animal coloring pages',
    'dragon coloring pages',
  ],
  openGraph: {
    title: 'Free Coloring Pages Gallery - Chunky Crayon',
    description:
      'Browse our free collection of printable coloring pages. Find animals, dragons, unicorns, princesses, and more.',
    type: 'website',
  },
};

const DailyImageSection = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: 'gallery' });
  const tAlt = await getTranslations({ locale, namespace: 'altText' });
  const dailyImage = await getTodaysDailyImage();

  if (!dailyImage || !dailyImage.svgUrl) return null;

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faCalendarStar}
            className="text-2xl"
            style={iconStyle}
          />
          <h2 className="font-tondo font-bold text-2xl text-text-primary">
            {t('dailyPage')}
          </h2>
        </div>
        <Link
          href="/gallery/daily"
          className="text-sm text-crayon-orange hover:text-crayon-orange-dark transition-colors flex items-center gap-1"
        >
          {t('viewAllDaily')}
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>
      <div className="bg-gradient-to-br from-crayon-yellow/20 to-crayon-orange/20 rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <Link
            href={`/coloring-image/${dailyImage.id}`}
            className="relative w-full md:w-80 aspect-square rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-shadow group"
          >
            <Image
              src={dailyImage.svgUrl}
              alt={dailyImage.title || tAlt('dailyPage')}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-tondo font-bold text-xl md:text-2xl text-text-primary mb-2">
              {dailyImage.title || tAlt('dailyPage')}
            </h3>
            {dailyImage.description && (
              <p className="text-text-secondary mb-4 line-clamp-2">
                {dailyImage.description}
              </p>
            )}
            <Link
              href={`/coloring-image/${dailyImage.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
            >
              <FontAwesomeIcon icon={faSparkles} />
              {t('startColoring')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const CommunityHighlights = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: 'gallery' });
  const tAlt = await getTranslations({ locale, namespace: 'altText' });
  const allImages = await getFeaturedImages(6);
  // Filter out images without svgUrl
  const images = allImages.filter((img) => img.svgUrl);

  if (images.length === 0) return null;

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faUsers}
            className="text-2xl"
            style={iconStyle}
          />
          <h2 className="font-tondo font-bold text-2xl text-text-primary">
            {t('communityCreations')}
          </h2>
        </div>
        <Link
          href="/gallery/community"
          className="text-sm text-crayon-purple hover:text-crayon-purple-dark transition-colors flex items-center gap-1"
        >
          {t('viewAllCommunity')}
          <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {images.map((image) => (
          <Link
            key={image.id}
            href={`/coloring-image/${image.id}`}
            className="relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-paper-cream-dark hover:border-crayon-purple/50 transition-colors group"
          >
            <Image
              src={image.svgUrl as string}
              alt={image.title || tAlt('coloringPage')}
              fill
              className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        ))}
      </div>
    </section>
  );
};

const AgeGroupCards = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: 'gallery' });

  const ageGroups = [
    {
      slug: 'for-toddlers',
      emoji: '👶',
      key: 'toddlers' as const,
      color: 'crayon-purple',
    },
    {
      slug: 'for-kids',
      emoji: '👦',
      key: 'kids' as const,
      color: 'crayon-orange',
    },
    {
      slug: 'for-teens',
      emoji: '🎮',
      key: 'teens' as const,
      color: 'crayon-blue',
    },
    {
      slug: 'for-adults',
      emoji: '🎨',
      key: 'adults' as const,
      color: 'crayon-green',
    },
  ];

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        {t('browseByAge')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ageGroups.map((group) => (
          <Link
            key={group.slug}
            href={`/gallery/${group.slug}`}
            className={`group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:border-${group.color}/50 hover:shadow-md transition-all text-center`}
          >
            <div className="text-4xl mb-2">{group.emoji}</div>
            <h3 className="font-tondo font-semibold text-text-primary">
              {t(`ageGroups.${group.key}.title`)}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {t(`ageGroups.${group.key}.ages`)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {t(`ageGroups.${group.key}.description`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

const DIFFICULTY_CARDS: {
  difficulty: Difficulty;
  icon: IconDefinition;
  color: string;
  bgColor: string;
  key: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}[] = [
  {
    difficulty: Difficulty.BEGINNER,
    icon: faStar,
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
    key: 'beginner',
  },
  {
    difficulty: Difficulty.INTERMEDIATE,
    icon: faStars,
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
    key: 'intermediate',
  },
  {
    difficulty: Difficulty.ADVANCED,
    icon: faMedal,
    color: 'text-crayon-blue',
    bgColor: 'bg-crayon-blue/10',
    key: 'advanced',
  },
  {
    difficulty: Difficulty.EXPERT,
    icon: faCrown,
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
    key: 'expert',
  },
];

const DifficultyCards = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: 'gallery' });
  const counts = await getDifficultyCounts();

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-green))',
    '--fa-secondary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <FontAwesomeIcon
          icon={faGaugeSimple}
          className="text-2xl"
          style={iconStyle}
        />
        <h2 className="font-tondo font-bold text-2xl text-text-primary">
          {t('browseByDifficulty')}
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DIFFICULTY_CARDS.map((card) => (
          <Link
            key={card.difficulty}
            href={`/gallery/difficulty/${card.difficulty.toLowerCase()}`}
            className="group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:shadow-md transition-all text-center"
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3',
                card.bgColor,
              )}
            >
              <FontAwesomeIcon
                icon={card.icon}
                className={cn('text-xl', card.color)}
              />
            </div>
            <h3 className="font-tondo font-semibold text-text-primary">
              {t(`difficulty.${card.key}.title`)}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {counts[card.difficulty] || 0} {t('stats.pagesSuffix')}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {t(`difficulty.${card.key}.description`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

const CategoryCards = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: 'gallery' });
  const counts = await getCategoryCounts();

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-color': 'hsl(var(--crayon-green))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <FontAwesomeIcon
          icon={faImages}
          className="text-2xl"
          style={iconStyle}
        />
        <h2 className="font-tondo font-bold text-2xl text-text-primary">
          {t('browseByCategory')}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {GALLERY_CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/gallery/${category.slug}`}
            className="group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:border-crayon-orange/50 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{category.emoji}</div>
            <h3 className="font-tondo font-semibold text-text-primary group-hover:text-crayon-orange transition-colors">
              {t(`categories.${category.id}`)}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {counts[category.slug] || 0} {t('stats.pagesSuffix')}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

const GalleryStats = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: 'gallery' });
  const stats = await getGalleryStats();

  return (
    <div className="flex flex-wrap justify-center gap-8 mb-12 text-center">
      <div>
        <div className="font-tondo font-bold text-3xl text-crayon-orange">
          {stats.totalImages.toLocaleString()}
        </div>
        <div className="text-sm text-text-secondary">{t('stats.totalPages')}</div>
      </div>
      <div>
        <div className="font-tondo font-bold text-3xl text-crayon-purple">
          {stats.communityImages.toLocaleString()}
        </div>
        <div className="text-sm text-text-secondary">{t('stats.communityPages')}</div>
      </div>
      <div>
        <div className="font-tondo font-bold text-3xl text-crayon-blue">
          {stats.dailyImages.toLocaleString()}
        </div>
        <div className="text-sm text-text-secondary">{t('stats.dailyPages')}</div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-12">
    <div className="h-64 bg-paper-cream rounded-3xl" />
    <div>
      <div className="h-8 bg-paper-cream rounded w-48 mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
        ))}
      </div>
    </div>
    <div>
      <div className="h-8 bg-paper-cream rounded w-48 mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-24 bg-paper-cream rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

// Async component that handles data fetching and translations
const GalleryContent = async ({ locale }: { locale: string }) => {
  const [t, tBreadcrumbs] = await Promise.all([
    getTranslations({ locale, namespace: 'gallery' }),
    getTranslations({ locale, namespace: 'breadcrumbs' }),
  ]);

  return (
    <>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: tBreadcrumbs('home'), href: '/' },
          { label: tBreadcrumbs('gallery') },
        ]}
        className="mb-6"
      />

      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="font-tondo font-bold text-4xl md:text-5xl text-text-primary mb-4">
          {t('heroTitle')}
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          {t('heroSubtitle')}
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <GalleryStats locale={locale} />
        <DailyImageSection locale={locale} />
        <CommunityHighlights locale={locale} />
        <AgeGroupCards locale={locale} />
        <DifficultyCards locale={locale} />
        <CategoryCards locale={locale} />
      </Suspense>

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          {t('seo.aboutTitle')}
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>{t('seo.aboutParagraph1')}</p>
          <p>{t('seo.aboutParagraph2')}</p>
          <p>{t('seo.aboutParagraph3')}</p>
        </div>
      </section>
    </>
  );
};

const GalleryPage = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;

  return (
    <PageWrap>
      <Suspense fallback={<LoadingSkeleton />}>
        <GalleryContent locale={locale} />
      </Suspense>
    </PageWrap>
  );
};

export default GalleryPage;
