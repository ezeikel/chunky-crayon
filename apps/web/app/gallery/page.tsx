import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

const DailyImageSection = async () => {
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
            Today&apos;s Daily Coloring Page
          </h2>
        </div>
        <Link
          href="/gallery/daily"
          className="text-sm text-crayon-orange hover:text-crayon-orange-dark transition-colors flex items-center gap-1"
        >
          View all daily pages
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
              alt={dailyImage.title || 'Daily coloring page'}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-tondo font-bold text-xl md:text-2xl text-text-primary mb-2">
              {dailyImage.title || 'Daily Coloring Page'}
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
              Start Coloring
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const CommunityHighlights = async () => {
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
            Community Creations
          </h2>
        </div>
        <Link
          href="/gallery/community"
          className="text-sm text-crayon-purple hover:text-crayon-purple-dark transition-colors flex items-center gap-1"
        >
          View all community pages
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
              alt={image.title || 'Coloring page'}
              fill
              className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            />
          </Link>
        ))}
      </div>
    </section>
  );
};

const AgeGroupCards = () => {
  const ageGroups = [
    {
      slug: 'for-toddlers',
      emoji: '👶',
      name: 'For Toddlers',
      ageRange: 'Ages 2-4',
      description: 'Simple shapes, big lines',
      color: 'crayon-purple',
    },
    {
      slug: 'for-kids',
      emoji: '👦',
      name: 'For Kids',
      ageRange: 'Ages 4-12',
      description: 'Fun and engaging',
      color: 'crayon-orange',
    },
    {
      slug: 'for-teens',
      emoji: '🎮',
      name: 'For Teens',
      ageRange: 'Ages 13-17',
      description: 'Cool, detailed designs',
      color: 'crayon-blue',
    },
    {
      slug: 'for-adults',
      emoji: '🎨',
      name: 'For Adults',
      ageRange: '18+',
      description: 'Relaxing & intricate',
      color: 'crayon-green',
    },
  ];

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        Browse by Age Group
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
              {group.name}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">{group.ageRange}</p>
            <p className="text-xs text-text-secondary mt-1">
              {group.description}
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
  description: string;
}[] = [
  {
    difficulty: Difficulty.BEGINNER,
    icon: faStar,
    color: 'text-crayon-green',
    bgColor: 'bg-crayon-green/10',
    description: 'Simple shapes, big lines',
  },
  {
    difficulty: Difficulty.INTERMEDIATE,
    icon: faStars,
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
    description: 'Moderate detail',
  },
  {
    difficulty: Difficulty.ADVANCED,
    icon: faMedal,
    color: 'text-crayon-blue',
    bgColor: 'bg-crayon-blue/10',
    description: 'Detailed designs',
  },
  {
    difficulty: Difficulty.EXPERT,
    icon: faCrown,
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
    description: 'Intricate patterns',
  },
];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'Beginner',
  [Difficulty.INTERMEDIATE]: 'Intermediate',
  [Difficulty.ADVANCED]: 'Advanced',
  [Difficulty.EXPERT]: 'Expert',
};

const DifficultyCards = async () => {
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
          Browse by Difficulty
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
              {DIFFICULTY_LABELS[card.difficulty]}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {counts[card.difficulty] || 0} pages
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

const CategoryCards = async () => {
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
          Browse by Category
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
              {category.name}
            </h3>
            <p className="text-xs text-text-tertiary mt-1">
              {counts[category.slug] || 0} pages
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
};

const GalleryStats = async () => {
  const stats = await getGalleryStats();

  return (
    <div className="flex flex-wrap justify-center gap-8 mb-12 text-center">
      <div>
        <div className="font-tondo font-bold text-3xl text-crayon-orange">
          {stats.totalImages.toLocaleString()}
        </div>
        <div className="text-sm text-text-secondary">Total Pages</div>
      </div>
      <div>
        <div className="font-tondo font-bold text-3xl text-crayon-purple">
          {stats.communityImages.toLocaleString()}
        </div>
        <div className="text-sm text-text-secondary">Community Pages</div>
      </div>
      <div>
        <div className="font-tondo font-bold text-3xl text-crayon-blue">
          {stats.dailyImages.toLocaleString()}
        </div>
        <div className="text-sm text-text-secondary">Daily Pages</div>
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

const GalleryPage = () => {
  return (
    <PageWrap>
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Gallery' }]}
        className="mb-6"
      />

      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="font-tondo font-bold text-4xl md:text-5xl text-text-primary mb-4">
          Free Coloring Pages
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto">
          Discover thousands of free printable coloring pages. From cute animals
          to magical dragons, find the perfect page to color online or print at
          home.
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <GalleryStats />
        <DailyImageSection />
        <CommunityHighlights />
        <AgeGroupCards />
        <DifficultyCards />
        <CategoryCards />
      </Suspense>

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          About Our Free Coloring Pages
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Welcome to Chunky Crayon&apos;s free coloring page gallery! We offer
            a growing collection of printable coloring pages perfect for kids
            and adults alike. Our AI-powered tools help create unique, engaging
            coloring pages across a wide range of categories.
          </p>
          <p>
            Every day, we add a new daily coloring page that you can color
            online using our digital tools or download and print for traditional
            coloring. Our community members also contribute their creative
            prompts, adding even more variety to our collection.
          </p>
          <p>
            Browse by category to find exactly what you&apos;re looking for,
            whether it&apos;s cute animal coloring pages, fantasy creatures like
            dragons and unicorns, or seasonal holiday themes. Each page is
            designed with clean lines that are perfect for coloring.
          </p>
        </div>
      </section>
    </PageWrap>
  );
};

export default GalleryPage;
