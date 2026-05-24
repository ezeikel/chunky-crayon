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
  faBaby,
  faChildReaching,
  faGamepad,
  faPalette,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { auth } from '@/auth';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import CrayonScribble from '@/components/Intro/CrayonScribble';
import ViewContentTracker from '@/components/ViewContentTracker/ViewContentTracker';
import {
  getTodaysDailyImage,
  getFeaturedImages,
  getCommunityImages,
  getSystemImagesPage,
  getCategoryCounts,
  getGalleryStats,
  getDifficultyCounts,
  getAgeGroupCounts,
} from '@/app/data/gallery';
import Pagination from '@/components/Pagination/Pagination';
import GalleryStatsComponent from '@/components/GalleryStats';
import { GALLERY_CATEGORIES } from '@/constants';
import { Difficulty } from '@one-colored-pixel/db';
import { getLandingPageBySlug } from '@/lib/seo/landing-pages';
import { getLandingIcon } from '@/lib/seo/landing-icons';
import cn from '@/lib/utils';
import { getColoringImageUrl } from '@/lib/seo/coloring-image-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { generateAlternates } = await import('@/lib/seo');

  return {
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
      url: `https://chunkycrayon.com/${locale}/gallery`,
    },
    alternates: generateAlternates(locale, '/gallery'),
  };
}

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
            href={getColoringImageUrl(dailyImage, locale)}
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
              href={getColoringImageUrl(dailyImage, locale)}
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

// Main system-image feed: the 936-row landing backfill + daily image cron
// output + any other system-generated row. The big surface that lets a
// visitor actually browse our content rather than just navigate via
// category cards. Distinct from Community (UGC), Daily (single image),
// and Featured (just the top-6 hero strip).
//
// Why paginated (not infinite scroll):
//   - Our system content is finite-ish (~1000 rows, grows ~1/day)
//   - Numbered pages give Google one indexable URL per page
//   - Parent-to-parent sharing works ("look at page 3, the Halloween ones")
// Community section stays infinite-scroll on /gallery/community —
// that's the explore-driven surface.
//
// Both filters compose into the URL:
//   /gallery?page=2&difficulty=beginner
type DifficultyFilter = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | null;

const parseDifficultyParam = (raw: string | undefined): DifficultyFilter => {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (
    upper === 'BEGINNER' ||
    upper === 'INTERMEDIATE' ||
    upper === 'ADVANCED'
  ) {
    return upper;
  }
  return null;
};

const parsePageParam = (raw: string | undefined): number => {
  if (!raw) return 1;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

/**
 * Build `/gallery?page=N&difficulty=X#our-latest` for the given filter.
 * The hash anchors page navigation to the top of the Our Latest section
 * so paginating doesn't dump the user at the top of the page (past the
 * hero + browse cards) or leave them stuck at the bottom looking at
 * the previous page's last row.
 */
const buildOurLatestHref = (
  page: number,
  difficulty: DifficultyFilter,
): string => {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (difficulty) params.set('difficulty', difficulty.toLowerCase());
  const qs = params.toString();
  const base = qs ? `/gallery?${qs}` : '/gallery';
  return `${base}#our-latest`;
};

const OurLatestImages = async ({
  locale,
  difficulty,
  page,
}: {
  locale: string;
  difficulty: DifficultyFilter;
  page: number;
}) => {
  const [t, tAlt] = await Promise.all([
    getTranslations({ locale, namespace: 'gallery' }),
    getTranslations({ locale, namespace: 'altText' }),
  ]);

  const {
    images,
    page: safePage,
    totalPages,
    totalCount,
  } = await getSystemImagesPage(page, 24, difficulty ?? undefined);

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  // Difficulty chip targets always reset to page 1 — selecting a new
  // filter on page 3 of the previous filter is rarely what you want.
  const chips: Array<{
    key: string;
    href: string;
    label: string;
    active: boolean;
  }> = [
    {
      key: 'all',
      href: buildOurLatestHref(1, null),
      label: t('difficultyFilter.all'),
      active: difficulty === null,
    },
    {
      key: 'beginner',
      href: buildOurLatestHref(1, 'BEGINNER'),
      label: t('difficultyFilter.beginner'),
      active: difficulty === 'BEGINNER',
    },
    {
      key: 'intermediate',
      href: buildOurLatestHref(1, 'INTERMEDIATE'),
      label: t('difficultyFilter.intermediate'),
      active: difficulty === 'INTERMEDIATE',
    },
    {
      key: 'advanced',
      href: buildOurLatestHref(1, 'ADVANCED'),
      label: t('difficultyFilter.advanced'),
      active: difficulty === 'ADVANCED',
    },
  ];

  return (
    // scroll-mt offsets the anchor target so it lands BELOW the sticky
    // header on browsers that respect scroll-margin. Number is conservative
    // (heading + a touch of breathing room).
    <section id="our-latest" className="mb-12 scroll-mt-24">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-2xl"
            style={iconStyle}
          />
          <h2 className="font-tondo font-bold text-2xl text-text-primary">
            {t('ourLatestTitle')}
          </h2>
        </div>
        {totalCount > 0 ? (
          <p className="text-sm text-text-tertiary font-tondo">
            {t('ourLatestCount', { count: totalCount })}
          </p>
        ) : null}
      </div>
      <p className="text-text-secondary mb-5 max-w-3xl">
        {t('ourLatestSubtitle')}
      </p>

      {/* Filter chips. Anchor tags so each filter has a real URL —
          shareable + crawlable, plus Cmd-click for new tabs works. */}
      <div className="flex flex-wrap gap-2 mb-6">
        {chips.map((chip) => (
          <Link
            key={chip.key}
            href={chip.href}
            scroll={false}
            className={cn(
              'inline-flex items-center px-4 py-1.5 rounded-full text-sm font-tondo font-semibold transition-colors border-2',
              chip.active
                ? 'bg-crayon-orange text-white border-crayon-orange'
                : 'bg-white text-text-secondary border-paper-cream-dark hover:border-crayon-orange/50 hover:text-crayon-orange',
            )}
            aria-current={chip.active ? 'page' : undefined}
          >
            {chip.label}
          </Link>
        ))}
      </div>

      {images.length === 0 ? (
        <div className="text-center text-text-secondary py-12 bg-paper-cream/40 rounded-2xl">
          <p>{t('difficultyFilter.empty')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map((image) => (
              <Link
                key={image.id}
                href={getColoringImageUrl(image, locale)}
                className="relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-paper-cream-dark hover:border-crayon-orange/50 transition-all group shadow-sm hover:shadow-md"
              >
                {image.svgUrl ? (
                  <Image
                    src={image.svgUrl}
                    alt={image.title || tAlt('coloringPage')}
                    fill
                    className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : null}
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            buildHref={(p) => buildOurLatestHref(p, difficulty)}
            ariaLabel={t('ourLatestTitle')}
          />
        </>
      )}
    </section>
  );
};

const CommunityHighlights = async ({ locale }: { locale: string }) => {
  // CC content policy: the community-creations surface is shown to
  // LOGGED-OUT visitors only. Logged-in kids (3-8yo) never see UGC on
  // CC — we can't policy what other users created, so the safety
  // posture is "community is for logged-out marketing context only".
  // See feedback_cc_no_community_for_logged_in. Logged-out: still
  // shown (it's the social-proof surface for the public gallery).
  const session = await auth();
  if (session?.user) return null;

  const t = await getTranslations({ locale, namespace: 'gallery' });
  const tAlt = await getTranslations({ locale, namespace: 'altText' });
  // Guest-only creations (userId NULL + generationType USER), as
  // re-scoped in app/data/gallery.ts. Signed-in users' saved art is
  // never community-eligible on CC (3-8yo; no public-share opt-in).
  // Pull 7 so we can detect overflow: if we get 7+, /gallery/community
  // has more than the section shows → the "view all" link is honest.
  // 6 or fewer → the section IS the whole community pool right now,
  // so don't tease a deeper page that doesn't exist. The display still
  // caps at 6.
  const { images: allImages } = await getCommunityImages(undefined, 7);
  const hasMoreThanPreview = allImages.length > 6;
  const images = allImages.filter((img) => img.svgUrl).slice(0, 6);

  // No UGC yet on this brand? Hide the section rather than show an
  // empty grid or fall back to system content (that's the new
  // "Our Latest" feed below).
  if (images.length === 0) return null;

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
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
        {hasMoreThanPreview && (
          <Link
            href="/gallery/community"
            className="text-sm text-crayon-purple hover:text-crayon-purple-dark transition-colors flex items-center gap-1"
          >
            {t('viewAllCommunity')}
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
        )}
      </div>
      <p className="text-text-secondary mb-5 max-w-3xl">
        {t('communitySubtitle')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {images.map((image) => (
          <Link
            key={image.id}
            href={getColoringImageUrl(image, locale)}
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

      {/* Prominent CTA at the bottom of the preview strip. The
          /gallery/community page is the explore-driven infinite-scroll
          destination; we want browsers to actually land there rather
          than skip past the section. Hidden when the preview already
          shows everything we have — no point sending visitors to a
          deeper page that's the same content. */}
      {hasMoreThanPreview && (
        <div className="mt-6 flex justify-center">
          <Link
            href="/gallery/community"
            className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-purple text-white font-tondo font-semibold rounded-full hover:bg-crayon-purple-dark transition-colors"
          >
            {t('browseAllCommunity')}
            <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
          </Link>
        </div>
      )}
    </section>
  );
};

const AGE_GROUP_CARDS: {
  slug: string;
  icon: IconDefinition;
  key: 'toddlers' | 'kids' | 'teens' | 'adults';
  color: string;
  bgColor: string;
}[] = [
  {
    slug: 'for-toddlers',
    icon: faBaby,
    key: 'toddlers',
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
  },
  {
    slug: 'for-kids',
    icon: faChildReaching,
    key: 'kids',
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
  },
  {
    slug: 'for-teens',
    icon: faGamepad,
    key: 'teens',
    color: 'text-crayon-blue',
    bgColor: 'bg-crayon-blue/10',
  },
  {
    slug: 'for-adults',
    icon: faPalette,
    key: 'adults',
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
  },
];

const AgeGroupCards = async ({ locale }: { locale: string }) => {
  const [t, statsT, counts] = await Promise.all([
    getTranslations({ locale, namespace: 'gallery' }),
    getTranslations({ locale, namespace: 'gallery.stats' }),
    getAgeGroupCounts(),
  ]);

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        {t('browseByAge')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {AGE_GROUP_CARDS.map((group) => (
          <Link
            key={group.slug}
            href={`/gallery/${group.slug}`}
            className="group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:shadow-md transition-all text-center"
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3',
                group.bgColor,
              )}
            >
              <FontAwesomeIcon
                icon={group.icon}
                className={cn('text-xl', group.color)}
              />
            </div>
            <h3 className="font-tondo font-semibold text-text-primary">
              {t(`ageGroups.${group.key}.title`)}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {t(`ageGroups.${group.key}.ages`)}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {t(`ageGroups.${group.key}.description`)}
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              {counts[group.key] || 0} {statsT('pagesSuffix')}
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

// Curated set of /coloring-pages/ landings surfaced on the gallery. Mix
// of theme bestsellers and problem-solver hooks so browsing visitors get
// a narrowing tool without losing the gallery's main purpose. The full
// 73-landing directory lives at /coloring-pages.
const BROWSE_BY_TOPIC_SLUGS = [
  // Theme bestsellers
  'bold-and-easy-animal-coloring-pages',
  'cute-dinosaur-coloring-pages-for-kids',
  'unicorn-coloring-pages-for-kids',
  'easy-space-coloring-pages-for-kids',
  // Problem-solver hooks
  'calming-coloring-pages-for-kids-with-adhd',
  'rainy-day-coloring-activities-for-kids',
  'coloring-pages-for-autistic-children',
  'screen-free-activities-for-6-year-olds',
] as const;

const BrowseByTopicCards = ({ locale: _locale }: { locale: string }) => {
  const landings = BROWSE_BY_TOPIC_SLUGS.map((slug) =>
    getLandingPageBySlug(slug),
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (landings.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={faSparkles}
            className="text-2xl"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
          <h2 className="font-tondo font-bold text-2xl text-text-primary">
            Browse by Topic
          </h2>
        </div>
        <Link
          href="/coloring-pages"
          className="text-sm text-crayon-orange hover:underline underline-offset-4 font-tondo whitespace-nowrap"
        >
          See all collections →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {landings.map((landing) => {
          const { icon, color } = getLandingIcon(landing.slug);
          return (
            <Link
              key={landing.slug}
              href={`/coloring-pages/${landing.slug}`}
              className="group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:shadow-md transition-all text-center"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-paper-cream/60 group-hover:bg-paper-cream transition-colors"
                style={{ color }}
              >
                <FontAwesomeIcon icon={icon} className="text-xl" />
              </div>
              <h3 className="font-tondo font-semibold text-sm text-text-primary line-clamp-2">
                {landing.title}
              </h3>
            </Link>
          );
        })}
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
            className="group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:shadow-md transition-all text-center"
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3',
                category.bgColor,
              )}
            >
              <FontAwesomeIcon
                icon={category.icon}
                className={cn('text-xl', category.color)}
              />
            </div>
            <h3 className="font-tondo font-semibold text-text-primary">
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

// Thin data-loading wrapper around the GalleryStats presentation
// component (components/GalleryStats). Keeps the data fetch + i18n
// here so the visual surface stays a pure, storyable component that
// takes its strings as props.
const GalleryStats = async ({ locale }: { locale: string }) => {
  const t = await getTranslations({ locale, namespace: 'gallery' });
  const stats = await getGalleryStats();
  return (
    <GalleryStatsComponent
      stats={stats}
      labels={{
        totalPages: t('stats.totalPages'),
        ourPages: t('stats.ourPages'),
        communityPages: t('stats.communityPages'),
        dailyPages: t('stats.dailyPages'),
      }}
    />
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

// Async component that handles data fetching and translations.
//
// searchParams arrives as a Promise so the static shell stays cached —
// awaiting it inside this Suspense child opts the dynamic island in,
// not the whole page. See memory feedback_async_page_handlers_block_static_shell.
const GalleryContent = async ({
  locale,
  searchParamsPromise,
}: {
  locale: string;
  searchParamsPromise: Promise<{ difficulty?: string; page?: string }>;
}) => {
  const [t, tBreadcrumbs, searchParams] = await Promise.all([
    getTranslations({ locale, namespace: 'gallery' }),
    getTranslations({ locale, namespace: 'breadcrumbs' }),
    searchParamsPromise,
  ]);
  const difficulty = parseDifficultyParam(searchParams.difficulty);
  const page = parsePageParam(searchParams.page);

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

      {/* Hero Section — H1 mirrors the /account/my-stuff and /freebies
          treatment for visual consistency across the renamed hubs:
          chunky font-tondo with a hand-drawn CrayonScribble underline. */}
      <div className="text-center mb-12">
        <h1 className="font-tondo text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary relative inline-block">
          {t('heroTitle')}
          <CrayonScribble
            seed={73}
            className="absolute -bottom-2 left-0 w-full h-3 text-crayon-orange/60"
          />
        </h1>
        <p className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto">
          {t('heroSubtitle')}
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <GalleryStats locale={locale} />
        <DailyImageSection locale={locale} />
        {/* Browse-by-X surfaces sit ABOVE the main feed so visitors who
            know what they want can narrow without scrolling past 936
            thumbnails first. The feed itself sits below them. */}
        <BrowseByTopicCards locale={locale} />
        <AgeGroupCards locale={locale} />
        <DifficultyCards locale={locale} />
        <CategoryCards locale={locale} />
        <OurLatestImages locale={locale} difficulty={difficulty} page={page} />
        <CommunityHighlights locale={locale} />
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

const GalleryPage = ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ difficulty?: string; page?: string }>;
}) => (
  <PageWrap>
    <Suspense fallback={<LoadingSkeleton />}>
      <GalleryShell params={params} searchParams={searchParams} />
    </Suspense>
  </PageWrap>
);

// SlugRouter-style wrapper so params + searchParams are awaited inside
// the Suspense boundary — keeps the static shell prerendered.
const GalleryShell = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ difficulty?: string; page?: string }>;
}) => {
  const { locale } = await params;
  return (
    <>
      <ViewContentTracker contentType="gallery" />
      <GalleryContent locale={locale} searchParamsPromise={searchParams} />
    </>
  );
};

export default GalleryPage;
