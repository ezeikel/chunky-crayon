import type { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PageWrap from '@/components/PageWrap/PageWrap';
import { getThemeLandings, getProblemLandings } from '@/lib/seo/landing-pages';
import { getLandingIcon } from '@/lib/seo/landing-icons';
import { generateAlternates } from '@/lib/seo';

// Topic-hub index of every /coloring-pages/{slug} landing. Two purposes:
//   1. Internal-linking surface so Google can discover and prioritise the
//      landings (sitemap-only orphans get crawled less and rank worse).
//   2. A real human-browsable directory for the rare visitor who lands on
//      the footer "All Categories" link.
//
// The page is fully static (all data from the typed config) so it
// prerenders at build time and adds zero runtime cost.

type PageParams = { locale: string };

export const generateMetadata = async ({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const pagePath = '/coloring-pages';
  const title =
    'Free Coloring Page Collections — Animals, Holidays, Calming Activities & More | Chunky Crayon';
  const description =
    'Browse every coloring page collection on Chunky Crayon. Bold-and-easy animals, seasonal pages, calming activities for kids with ADHD, sensory-friendly designs, and more. All free and print-ready.';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://chunkycrayon.com/${locale}${pagePath}`,
    },
    alternates: generateAlternates(locale, pagePath),
  };
};

type CategoryCardProps = {
  slug: string;
  title: string;
  description: string;
};

const CategoryCard = ({ slug, title, description }: CategoryCardProps) => {
  const { icon, color } = getLandingIcon(slug);
  return (
    <Link
      href={`/coloring-pages/${slug}`}
      className="group flex items-start gap-4 bg-paper-cream/40 hover:bg-paper-cream/70 border-2 border-crayon-orange/15 hover:border-crayon-orange/40 rounded-2xl p-5 transition-colors"
    >
      <div
        className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/60 group-hover:bg-white transition-colors"
        style={{ color }}
      >
        <FontAwesomeIcon icon={icon} className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <h3 className="font-tondo font-bold text-base text-foreground mb-1 group-hover:text-crayon-orange transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
    </Link>
  );
};

const ColoringPagesIndex = async ({
  params,
}: {
  params: Promise<PageParams>;
}) => {
  await params;
  const themeLandings = getThemeLandings();
  const problemLandings = getProblemLandings();

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Coloring Page Collections',
    description:
      'Directory of every coloring page collection on Chunky Crayon.',
    url: 'https://chunkycrayon.com/coloring-pages',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <PageWrap>
        <header className="text-center mb-12 max-w-3xl mx-auto">
          <h1 className="font-tondo text-3xl md:text-5xl font-extrabold mb-3 text-primary">
            Free Coloring Page Collections
          </h1>
          <p className="font-tondo text-lg text-crayon-orange mb-4">
            Every collection we make, in one place.
          </p>
          <p className="text-muted-foreground">
            Browse animals, holidays, age-specific picks, plus calming
            collections for kids with ADHD, autistic kids, sick days, school
            holidays and more. Every page is free and print-ready.
          </p>
        </header>

        {/* Theme collections — visual style based */}
        <section className="mb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-tondo text-2xl md:text-3xl font-extrabold mb-2 text-primary">
              By Theme
            </h2>
            <p className="text-muted-foreground mb-6">
              Animals, holidays, characters, and age-specific collections.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {themeLandings.map((p) => (
                <CategoryCard
                  key={p.slug}
                  slug={p.slug}
                  title={p.title}
                  description={p.tagline}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Problem-solver collections — use case based */}
        <section className="mb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-tondo text-2xl md:text-3xl font-extrabold mb-2 text-primary">
              For Specific Situations
            </h2>
            <p className="text-muted-foreground mb-6">
              Calming activities, sensory-friendly designs, school-holiday
              fillers, sick-day quiet time, screen-time alternatives.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {problemLandings.map((p) => (
                <CategoryCard
                  key={p.slug}
                  slug={p.slug}
                  title={p.title}
                  description={p.tagline}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Soft CTA back to generator */}
        <section className="text-center mt-12 mb-8">
          <p className="font-tondo text-muted-foreground mb-3">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <Link
            href="/"
            className="font-tondo text-crayon-orange underline-offset-4 hover:underline text-lg"
          >
            Make a custom coloring page on any subject →
          </Link>
        </section>
      </PageWrap>
    </>
  );
};

export default ColoringPagesIndex;
