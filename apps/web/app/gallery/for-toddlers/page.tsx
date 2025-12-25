import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBaby,
  faArrowRight,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { GALLERY_CATEGORIES } from '@/constants';
import { getFeaturedImages, getCategoryCounts } from '@/app/data/gallery';

export const metadata: Metadata = {
  title: 'Coloring Pages for Toddlers - Simple Easy Pages | Chunky Crayon',
  description:
    'Simple coloring pages perfect for toddlers ages 2-4. Large shapes, bold lines, and easy-to-color designs. Free printable pages for little ones!',
  keywords: [
    'coloring pages for toddlers',
    'toddler coloring pages',
    'easy coloring pages',
    'simple coloring pages',
    'coloring pages for 2 year olds',
    'coloring pages for 3 year olds',
    'preschool coloring pages',
  ],
  openGraph: {
    title: 'Coloring Pages for Toddlers - Chunky Crayon',
    description:
      'Simple coloring pages perfect for toddlers ages 2-4. Large shapes and bold lines!',
    type: 'website',
  },
};

// Categories most suitable for toddlers (ages 2-4) - simple, recognizable shapes
const TODDLER_CATEGORIES = ['animals', 'food', 'vehicles', 'nature'];

const AgeGroupSchema = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://chunkycrayon.com/gallery/for-toddlers',
    name: 'Coloring Pages for Toddlers',
    description: 'Simple coloring pages perfect for toddlers ages 2-4',
    url: 'https://chunkycrayon.com/gallery/for-toddlers',
    isPartOf: {
      '@id': 'https://chunkycrayon.com/#website',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Toddlers',
      suggestedMinAge: 2,
      suggestedMaxAge: 4,
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
        Simple Toddler Coloring Pages
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {validImages.slice(0, 8).map((image) => (
          <Link
            key={image.id}
            href={`/coloring-image/${image.id}`}
            className="relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-paper-cream-dark hover:border-crayon-purple/50 transition-all group shadow-sm hover:shadow-md"
          >
            <Image
              src={image.svgUrl as string}
              alt={image.title || 'Toddler coloring page'}
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
  const toddlerCategories = GALLERY_CATEGORIES.filter((cat) =>
    TODDLER_CATEGORIES.includes(cat.slug),
  );

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        Toddler-Friendly Categories
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {toddlerCategories.map((category) => (
          <Link
            key={category.id}
            href={`/gallery/${category.slug}`}
            className="group p-4 rounded-2xl bg-white border-2 border-paper-cream-dark hover:border-crayon-purple/50 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">{category.emoji}</div>
            <h3 className="font-tondo font-semibold text-text-primary group-hover:text-crayon-purple transition-colors">
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
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-paper-cream rounded-2xl" />
      ))}
    </div>
  </div>
);

const ForToddlersPage = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-purple))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink))',
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
          { label: 'For Toddlers' },
        ]}
        className="mb-6"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-crayon-purple/20 to-crayon-pink/20 rounded-3xl p-8 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faBaby}
            className="text-4xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            Coloring Pages for Toddlers
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl mb-6">
          Simple, easy-to-color pages designed for little hands! Large shapes,
          bold outlines, and familiar objects make these perfect for children
          ages 2-4. Great for developing fine motor skills.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-purple text-white font-semibold rounded-full hover:bg-crayon-purple-dark transition-colors"
        >
          <FontAwesomeIcon icon={faSparkles} />
          Create Simple Pages
        </Link>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <FeaturedImages />
        <CategoryCards />
      </Suspense>

      {/* Why Toddlers Love It */}
      <section className="bg-paper-cream rounded-3xl p-8 mb-12">
        <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
          Perfect for Little Artists
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-3">✏️</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Big Bold Lines
            </h3>
            <p className="text-text-secondary text-sm">
              Thick outlines make it easy for tiny hands to stay inside the
              lines!
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Simple Shapes
            </h3>
            <p className="text-text-secondary text-sm">
              Basic shapes and familiar objects that toddlers recognize and
              love.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🌈</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Learn Colors
            </h3>
            <p className="text-text-secondary text-sm">
              Great for learning colors and developing creativity!
            </p>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Free Coloring Pages for Toddlers
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Introducing your toddler to coloring? Our collection of simple
            coloring pages is perfect for children ages 2-4. Each design
            features large, easy-to-color areas with bold outlines that help
            little ones develop their fine motor skills.
          </p>
          <p>
            Our toddler coloring pages focus on familiar objects that young
            children love - cute animals, yummy food, colorful vehicles, and
            beautiful nature scenes. The simple designs reduce frustration and
            encourage creativity.
          </p>
          <p>
            All pages can be printed on standard A4 paper or colored online with
            our easy-to-use digital tools. Perfect for quiet time, rainy days,
            or learning activities at home or in preschool.
          </p>
        </div>

        <h3 className="font-tondo font-semibold text-xl text-text-primary mt-8 mb-3">
          Benefits of Coloring for Toddlers
        </h3>
        <p className="text-text-secondary leading-relaxed max-w-4xl">
          Coloring helps toddlers develop important skills including: hand-eye
          coordination, color recognition, grip strength, focus and
          concentration, and creative expression. Start with our simplest
          designs and watch your little one grow!
        </p>
      </section>

      {/* Related Age Groups */}
      <section className="mt-12 pt-8 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-semibold text-lg text-text-primary mb-4">
          More Age Groups
        </h2>
        <div className="flex flex-wrap gap-3">
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

export default ForToddlersPage;
