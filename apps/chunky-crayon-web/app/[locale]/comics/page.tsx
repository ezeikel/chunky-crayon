import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { cacheLife, cacheTag } from 'next/cache';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarStar,
  faUsers,
  faChildReaching,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import Breadcrumbs from '@/components/Breadcrumbs';
import CrayonScribble from '@/components/Intro/CrayonScribble';
import { db } from '@one-colored-pixel/db';

type ComicStripCard = {
  id: string;
  slug: string;
  title: string;
  theme: string;
  caption: string | null;
  assembledUrl: string | null;
  postedAt: Date | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { generateAlternates } = await import('@/lib/seo');

  return {
    title: 'Weekly Comic Strips - Chunky Crayon',
    description:
      'Read the weekly Chunky Crayon comic strip — a 4-panel kids comic for ages 3 to 8 starring Colo and friends.',
    openGraph: {
      title: 'Chunky Crayon Comics',
      description:
        'A weekly 4-panel kids comic strip for ages 3 to 8. Meet Colo the orange crayon and his friends Pip, Smudge, and Sticky.',
      type: 'website',
      url: `https://chunkycrayon.com/${locale}/comics`,
    },
    alternates: generateAlternates(locale, '/comics'),
  };
}

async function getStrips(): Promise<ComicStripCard[]> {
  'use cache';
  cacheLife('comics-list');
  cacheTag('comics-list');
  const strips = await db.comicStrip.findMany({
    where: {
      brand: 'CHUNKY_CRAYON',
      // Only POSTED — READY strips might still get re-rolled by admin and we
      // don't want to leave a stale /comics/[slug] URL behind. Once a strip
      // is POSTED its slug is committed forever (Pinterest/IG link to it).
      status: 'POSTED',
      assembledUrl: { not: null },
    },
    orderBy: { postedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      theme: true,
      caption: true,
      assembledUrl: true,
      postedAt: true,
    },
  });
  return strips;
}

const formatTheme = (theme: string): string =>
  theme
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

// Features strip content
const COMIC_FEATURES = [
  {
    icon: faCalendarStar,
    title: 'New Episode Every Sunday',
    description: 'Fresh adventures to look forward to each week',
  },
  {
    icon: faUsers,
    title: 'Meet Colo & Friends',
    description: 'Follow the adventures of our crayon crew',
  },
  {
    icon: faChildReaching,
    title: 'Made for Ages 3-8',
    description: 'Simple stories with positive messages',
  },
];

const ComicsIndexPage = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  const strips = await getStrips();

  return (
    <PageWrap className="max-w-6xl mx-auto bg-bg-cream">
      <Breadcrumbs
        items={[{ href: `/${locale}`, label: 'Home' }, { label: 'Comics' }]}
      />

      {/* Hero Header */}
      <header className="text-center py-8 lg:py-12">
        <h1 className="font-tondo text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary relative inline-block">
          Weekly Comics
          <CrayonScribble
            seed={77}
            className="absolute -bottom-2 left-0 w-full h-3 text-crayon-teal/60"
          />
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg text-text-secondary font-rooney-sans">
          A new 4-panel comic every Sunday, starring Colo, Pip, Smudge, and
          Sticky. Made for ages 3 to 8.
        </p>
      </header>

      {strips.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-secondary font-rooney-sans">
            The first comic strip lands soon — check back Sunday!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {strips.map((s) => (
            <Link
              key={s.id}
              href={`/comics/${s.slug}`}
              className="group block rounded-2xl overflow-hidden border-2 border-paper-cream-dark bg-white hover:scale-[1.02] active:scale-[0.99] transition-transform shadow-sm hover:shadow-md"
            >
              {s.assembledUrl ? (
                <div className="aspect-square bg-paper-cream relative overflow-hidden">
                  <Image
                    src={s.assembledUrl}
                    alt={s.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="p-4">
                <h2 className="font-tondo font-bold text-lg text-text-primary group-hover:text-crayon-orange transition-colors line-clamp-2">
                  {s.title}
                </h2>
                <p className="text-xs font-mono text-text-secondary mt-1 uppercase tracking-wide">
                  {formatTheme(s.theme)}
                </p>
                {s.postedAt ? (
                  <p className="text-xs text-text-secondary mt-2 font-rooney-sans">
                    {new Date(s.postedAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Features Strip */}
      <section className="mt-16 lg:mt-24 py-10 lg:py-14 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 bg-paper-cream rounded-3xl border-2 border-border-light">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
            {COMIC_FEATURES.map((feature, idx) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center p-4"
              >
                {/* Icon with chunky border */}
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-bg-white border-3 border-text-primary/10 flex items-center justify-center mb-4 shadow-card">
                  <FontAwesomeIcon
                    icon={feature.icon}
                    className={`text-2xl lg:text-3xl ${
                      idx === 0
                        ? 'text-crayon-orange'
                        : idx === 1
                          ? 'text-crayon-teal'
                          : 'text-crayon-pink'
                    }`}
                  />
                </div>
                <h3 className="font-tondo text-lg lg:text-xl font-bold text-text-primary mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary font-rooney-sans leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageWrap>
  );
};

export default ComicsIndexPage;
