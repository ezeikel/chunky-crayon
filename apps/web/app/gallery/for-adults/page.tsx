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
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { GALLERY_CATEGORIES } from '@/constants';
import { getFeaturedImages, getCategoryCounts } from '@/app/data/gallery';

export const metadata: Metadata = {
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
  },
};

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

const FeaturedImages = async () => {
  const images = await getFeaturedImages(8);
  const validImages = images.filter((img) => img.svgUrl);

  if (validImages.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        Popular Adult Coloring Pages
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

const CategoryCards = async () => {
  const counts = await getCategoryCounts();
  const adultCategories = GALLERY_CATEGORIES.filter((cat) =>
    ADULT_CATEGORIES.includes(cat.slug),
  );

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        Adult Categories
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

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-12">
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

const ForAdultsPage = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-green))',
    '--fa-secondary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <PageWrap>
      <AgeGroupSchema />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Gallery', href: '/gallery' },
          { label: 'For Adults' },
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
            Coloring Pages for Adults
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl mb-6">
          Discover the therapeutic benefits of adult coloring! Our collection
          features intricate mandalas, beautiful nature scenes, and detailed
          patterns designed for relaxation and mindfulness. Perfect for stress
          relief after a long day.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-green text-white font-semibold rounded-full hover:bg-crayon-green-dark transition-colors"
        >
          <FontAwesomeIcon icon={faSparkles} />
          Create Your Design
        </Link>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <FeaturedImages />
        <CategoryCards />
      </Suspense>

      {/* Benefits Section */}
      <section className="bg-paper-cream rounded-3xl p-8 mb-12">
        <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
          Benefits of Adult Coloring
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🧘</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Stress Relief
            </h3>
            <p className="text-text-secondary text-sm">
              Coloring activates the relaxation response, reducing anxiety and
              promoting calm.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Mindfulness
            </h3>
            <p className="text-text-secondary text-sm">
              Focus on the present moment and enjoy a meditative, screen-free
              activity.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Creativity
            </h3>
            <p className="text-text-secondary text-sm">
              Express yourself through color choices and create beautiful
              artwork.
            </p>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Free Coloring Pages for Adults
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Adult coloring has become a popular wellness activity, and for good
            reason. Studies show that coloring can reduce anxiety, improve
            focus, and provide a calming break from our screen-filled lives. Our
            collection offers beautiful, intricate designs perfect for
            grown-ups.
          </p>
          <p>
            From detailed mandalas that promote mindfulness to peaceful nature
            scenes and elegant patterns, each page is designed to provide hours
            of relaxing creativity. Print on quality paper and use your favorite
            coloring tools - colored pencils, markers, or gel pens all work
            beautifully.
          </p>
          <p>
            Want something unique? Create your own custom coloring pages!
            Describe your perfect relaxation scene - a zen garden, an Art
            Nouveau pattern, or a detailed botanical illustration - and our AI
            will bring your vision to life.
          </p>
        </div>

        <h3 className="font-tondo font-semibold text-xl text-text-primary mt-8 mb-3">
          Popular Adult Coloring Themes
        </h3>
        <p className="text-text-secondary leading-relaxed max-w-4xl">
          Explore our most popular adult categories: mandala coloring pages for
          meditation, intricate nature and botanical designs, geometric
          patterns, Art Deco and Art Nouveau styles, zentangle-inspired pages,
          and peaceful landscape scenes. Each offers a unique path to
          relaxation.
        </p>
      </section>

      {/* Related Age Groups */}
      <section className="mt-12 pt-8 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-semibold text-lg text-text-primary mb-4">
          More Age Groups
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/gallery/for-toddlers"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper-cream hover:bg-crayon-purple/10 border border-paper-cream-dark hover:border-crayon-purple/30 transition-colors"
          >
            <span>👶</span>
            <span>For Toddlers</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
          <Link
            href="/gallery/for-kids"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper-cream hover:bg-crayon-orange/10 border border-paper-cream-dark hover:border-crayon-orange/30 transition-colors"
          >
            <span>👦</span>
            <span>For Kids</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
          <Link
            href="/gallery/for-teens"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper-cream hover:bg-crayon-blue/10 border border-paper-cream-dark hover:border-crayon-blue/30 transition-colors"
          >
            <span>🎮</span>
            <span>For Teens</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
        </div>
      </section>
    </PageWrap>
  );
};

export default ForAdultsPage;
