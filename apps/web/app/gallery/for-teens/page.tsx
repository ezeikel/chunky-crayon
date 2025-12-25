import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGamepadModern,
  faArrowRight,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { GALLERY_CATEGORIES } from '@/constants';
import { getFeaturedImages, getCategoryCounts } from '@/app/data/gallery';

export const metadata: Metadata = {
  title: 'Coloring Pages for Teens - Cool Detailed Designs | Chunky Crayon',
  description:
    'Cool coloring pages for teenagers. Detailed designs featuring anime, gaming, fantasy, and more. Free printable pages for teens who love to create!',
  keywords: [
    'coloring pages for teens',
    'teenage coloring pages',
    'cool coloring pages',
    'anime coloring pages',
    'gaming coloring pages',
    'detailed coloring pages',
    'coloring pages for teenagers',
  ],
  openGraph: {
    title: 'Coloring Pages for Teens - Chunky Crayon',
    description:
      'Cool coloring pages for teenagers. Anime, gaming, fantasy, and more!',
    type: 'website',
  },
};

// Categories most suitable for teens (ages 13-17)
const TEEN_CATEGORIES = [
  'anime',
  'fantasy',
  'superheroes',
  'space',
  'robots',
  'horror',
  'sports',
];

const AgeGroupSchema = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://chunkycrayon.com/gallery/for-teens',
    name: 'Coloring Pages for Teens',
    description: 'Cool coloring pages perfect for teenagers ages 13-17',
    url: 'https://chunkycrayon.com/gallery/for-teens',
    isPartOf: {
      '@id': 'https://chunkycrayon.com/#website',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Teenagers',
      suggestedMinAge: 13,
      suggestedMaxAge: 17,
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
        Popular Teen Coloring Pages
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {validImages.slice(0, 8).map((image) => (
          <Link
            key={image.id}
            href={`/coloring-image/${image.id}`}
            className="relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-paper-cream-dark hover:border-crayon-blue/50 transition-all group shadow-sm hover:shadow-md"
          >
            <Image
              src={image.svgUrl as string}
              alt={image.title || 'Teen coloring page'}
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
  const teenCategories = GALLERY_CATEGORIES.filter((cat) =>
    TEEN_CATEGORIES.includes(cat.slug),
  );

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        Teen Categories
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {teenCategories.map((category) => (
          <Link
            key={category.id}
            href={`/gallery/${category.slug}`}
            className="group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:border-crayon-blue/50 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{category.emoji}</div>
            <h3 className="font-tondo font-semibold text-text-primary group-hover:text-crayon-blue transition-colors">
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

const ForTeensPage = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-blue))',
    '--fa-secondary-color': 'hsl(var(--crayon-purple))',
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
          { label: 'For Teens' },
        ]}
        className="mb-6"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-crayon-blue/20 to-crayon-purple/20 rounded-3xl p-8 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faGamepadModern}
            className="text-4xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            Coloring Pages for Teens
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl mb-6">
          Cool, detailed coloring pages designed for teenagers! From anime and
          gaming to fantasy and sci-fi, express your creativity with designs
          that match your style. Perfect for stress relief and creative
          expression.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-blue text-white font-semibold rounded-full hover:bg-crayon-blue-dark transition-colors"
        >
          <FontAwesomeIcon icon={faSparkles} />
          Create Your Design
        </Link>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <FeaturedImages />
        <CategoryCards />
      </Suspense>

      {/* Why Teens Love It */}
      <section className="bg-paper-cream rounded-3xl p-8 mb-12">
        <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
          Made for Creative Teens
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Cool Themes
            </h3>
            <p className="text-text-secondary text-sm">
              Anime, gaming, fantasy, and sci-fi designs that match your
              interests!
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🔥</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Detailed Art
            </h3>
            <p className="text-text-secondary text-sm">
              Intricate designs that challenge your skills and look amazing when
              done.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">😌</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Stress Relief
            </h3>
            <p className="text-text-secondary text-sm">
              Take a break from screens and unwind with creative coloring.
            </p>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Free Coloring Pages for Teenagers
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Looking for coloring pages that aren&apos;t &quot;too kiddy&quot;?
            Our teen collection features cool, detailed designs perfect for ages
            13-17. From anime characters and gaming scenes to fantasy worlds and
            abstract patterns, there&apos;s something for every style.
          </p>
          <p>
            These aren&apos;t your little sibling&apos;s coloring pages. Our
            teenage designs feature intricate details, dynamic compositions, and
            themes that resonate with teen interests. Perfect for creative
            expression, stress relief during study breaks, or just chilling.
          </p>
          <p>
            Create your own custom coloring pages by describing exactly what you
            want. Want a dragon fighting a robot in space? An anime-style
            portrait? A detailed mandala with your favorite symbols? Just
            describe it and our AI brings it to life!
          </p>
        </div>

        <h3 className="font-tondo font-semibold text-xl text-text-primary mt-8 mb-3">
          Popular Teen Themes
        </h3>
        <p className="text-text-secondary leading-relaxed max-w-4xl">
          Our most popular categories for teens include: anime and manga
          coloring pages, fantasy creature coloring pages, superhero action
          scenes, gaming-inspired art, space and sci-fi designs, and intricate
          pattern pages. Each category offers detailed, engaging designs.
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
            href="/gallery/for-adults"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper-cream hover:bg-crayon-green/10 border border-paper-cream-dark hover:border-crayon-green/30 transition-colors"
          >
            <span>🎨</span>
            <span>For Adults</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
        </div>
      </section>
    </PageWrap>
  );
};

export default ForTeensPage;
