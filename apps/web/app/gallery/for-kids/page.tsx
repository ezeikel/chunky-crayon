import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChild,
  faArrowRight,
  faSparkles,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import { GALLERY_CATEGORIES } from '@/constants';
import { getFeaturedImages, getCategoryCounts } from '@/app/data/gallery';

export const metadata: Metadata = {
  title: 'Coloring Pages for Kids - Free Printable Pages | Chunky Crayon',
  description:
    'Free coloring pages perfect for kids ages 4-12. Animals, dinosaurs, superheroes, unicorns, and more! Easy to color online or print at home.',
  keywords: [
    'coloring pages for kids',
    'kids coloring pages',
    'children coloring pages',
    'free coloring pages for children',
    'printable coloring pages kids',
    'easy coloring pages',
  ],
  openGraph: {
    title: 'Coloring Pages for Kids - Chunky Crayon',
    description:
      'Free coloring pages perfect for kids ages 4-12. Animals, dinosaurs, superheroes, and more!',
    type: 'website',
  },
};

// Categories most suitable for kids (ages 4-12)
const KIDS_CATEGORIES = [
  'animals',
  'dinosaurs',
  'unicorns',
  'superheroes',
  'space',
  'vehicles',
  'pirates',
  'underwater',
  'robots',
  'food',
];

const AgeGroupSchema = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://chunkycrayon.com/gallery/for-kids',
    name: 'Coloring Pages for Kids',
    description: 'Free coloring pages perfect for kids ages 4-12',
    url: 'https://chunkycrayon.com/gallery/for-kids',
    isPartOf: {
      '@id': 'https://chunkycrayon.com/#website',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Children',
      suggestedMinAge: 4,
      suggestedMaxAge: 12,
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
        Popular Kids Coloring Pages
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {validImages.slice(0, 8).map((image) => (
          <Link
            key={image.id}
            href={`/coloring-image/${image.id}`}
            className="relative aspect-square rounded-xl overflow-hidden bg-white border-2 border-paper-cream-dark hover:border-crayon-orange/50 transition-all group shadow-sm hover:shadow-md"
          >
            <Image
              src={image.svgUrl as string}
              alt={image.title || 'Kids coloring page'}
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
  const kidsCategories = GALLERY_CATEGORIES.filter((cat) =>
    KIDS_CATEGORIES.includes(cat.slug),
  );

  return (
    <section className="mb-12">
      <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
        Browse Kids Categories
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {kidsCategories.map((category) => (
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

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-12">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="aspect-square bg-paper-cream rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="h-24 bg-paper-cream rounded-2xl" />
      ))}
    </div>
  </div>
);

const ForKidsPage = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
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
          { label: 'For Kids' },
        ]}
        className="mb-6"
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-crayon-yellow/20 to-crayon-orange/20 rounded-3xl p-8 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faChild}
            className="text-4xl"
            style={iconStyle}
          />
          <h1 className="font-tondo font-bold text-3xl md:text-4xl text-text-primary">
            Coloring Pages for Kids
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl mb-6">
          Fun and engaging coloring pages perfect for children ages 4-12!
          Dinosaurs, unicorns, superheroes, and more. Easy to color online or
          print at home for endless creative fun.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-crayon-orange text-white font-semibold rounded-full hover:bg-crayon-orange-dark transition-colors"
        >
          <FontAwesomeIcon icon={faSparkles} />
          Create Your Own
        </Link>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <FeaturedImages />
        <CategoryCards />
      </Suspense>

      {/* Why Kids Love It */}
      <section className="bg-paper-cream rounded-3xl p-8 mb-12">
        <h2 className="font-tondo font-bold text-2xl text-text-primary mb-6">
          Why Kids Love Chunky Crayon
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🎨</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Create Anything
            </h3>
            <p className="text-text-secondary text-sm">
              Kids can describe their wildest ideas and see them become coloring
              pages!
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🖨️</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Print & Color
            </h3>
            <p className="text-text-secondary text-sm">
              Download high-quality PDFs ready to print on regular A4 paper.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="font-tondo font-semibold text-lg mb-2">
              Color Online
            </h3>
            <p className="text-text-secondary text-sm">
              Use our digital coloring tools right in the browser!
            </p>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="mt-16 pt-12 border-t border-paper-cream-dark">
        <h2 className="font-tondo font-bold text-2xl md:text-3xl text-text-primary mb-6">
          Free Coloring Pages for Kids
        </h2>
        <div className="space-y-4 text-text-secondary leading-relaxed max-w-4xl">
          <p>
            Looking for the perfect coloring pages for your children? Chunky
            Crayon offers a huge collection of free, printable coloring pages
            designed specifically for kids ages 4-12. From cute animals to
            action-packed superheroes, there&apos;s something for every young
            artist.
          </p>
          <p>
            Our coloring pages feature clean, bold lines that are easy for
            little hands to color. Whether your child prefers crayons, colored
            pencils, or markers, these pages are designed to deliver great
            results. You can also use our online coloring tools for screen-based
            creativity.
          </p>
          <p>
            Best of all, kids can create their own unique coloring pages by
            describing what they want to color. A dragon playing football? A
            unicorn in space? Whatever they imagine can become a real coloring
            page in seconds!
          </p>
        </div>

        <h3 className="font-tondo font-semibold text-xl text-text-primary mt-8 mb-3">
          Popular Categories for Kids
        </h3>
        <p className="text-text-secondary leading-relaxed max-w-4xl">
          Our most popular kids categories include: dinosaur coloring pages,
          unicorn coloring pages, superhero coloring pages, animal coloring
          pages, space and rocket coloring pages, and vehicle coloring pages.
          Each category is filled with age-appropriate designs perfect for
          children.
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

export default ForKidsPage;
