import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { cacheLife, cacheTag } from 'next/cache';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment } from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
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

const ComicsIndexPage = async () => {
  const strips = await getStrips();

  return (
    <PageWrap className="max-w-6xl mx-auto">
      <header className="text-center mb-10">
        <FontAwesomeIcon
          icon={faComment}
          className="text-5xl mb-4"
          style={
            {
              '--fa-primary-color': 'hsl(var(--crayon-orange))',
              '--fa-secondary-color': 'hsl(var(--crayon-teal))',
              '--fa-secondary-opacity': '0.8',
            } as React.CSSProperties
          }
        />
        <h1 className="font-tondo text-4xl md:text-5xl font-bold mb-3 text-text-primary">
          Weekly Comic Strips
        </h1>
        <p className="font-rooney-sans text-lg text-text-secondary max-w-2xl mx-auto">
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
    </PageWrap>
  );
};

export default ComicsIndexPage;
