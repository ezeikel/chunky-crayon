import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cacheLife, cacheTag } from 'next/cache';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronRight,
} from '@fortawesome/pro-duotone-svg-icons';
import PageWrap from '@/components/PageWrap/PageWrap';
import { db } from '@one-colored-pixel/db';

type PageParams = {
  locale: string;
  slug: string;
};

type ComicStripDetail = {
  id: string;
  slug: string;
  title: string;
  theme: string;
  caption: string | null;
  scriptJson: unknown;
  assembledUrl: string | null;
  panel1Url: string | null;
  panel2Url: string | null;
  panel3Url: string | null;
  panel4Url: string | null;
  postedAt: Date | null;
};

type RelatedStrip = {
  slug: string;
  title: string;
  assembledUrl: string | null;
};

async function getStrip(slug: string): Promise<ComicStripDetail | null> {
  'use cache';
  cacheLife('comic-strip');
  cacheTag('comics-list', `comic-strip-${slug}`);
  return db.comicStrip.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      theme: true,
      caption: true,
      scriptJson: true,
      assembledUrl: true,
      panel1Url: true,
      panel2Url: true,
      panel3Url: true,
      panel4Url: true,
      postedAt: true,
    },
  });
}

async function getRelatedStrips(currentSlug: string): Promise<RelatedStrip[]> {
  'use cache';
  cacheLife('comics-list');
  cacheTag('comics-list');
  return db.comicStrip.findMany({
    where: {
      brand: 'CHUNKY_CRAYON',
      status: 'POSTED',
      assembledUrl: { not: null },
      slug: { not: currentSlug },
    },
    orderBy: { postedAt: 'desc' },
    take: 3,
    select: { slug: true, title: true, assembledUrl: true },
  });
}

export async function generateStaticParams() {
  const strips = await db.comicStrip.findMany({
    where: { brand: 'CHUNKY_CRAYON', status: 'POSTED' },
    select: { slug: true },
  });
  return strips.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const strip = await getStrip(slug);

  if (!strip) {
    return { title: 'Comic Not Found - Chunky Crayon' };
  }

  const description =
    strip.caption?.split('\n')[0] ??
    `${strip.title} — a 4-panel kids comic strip for ages 3 to 8 from Chunky Crayon.`;
  const title = `${strip.title} - Chunky Crayon Comics`;
  const imageUrl = strip.assembledUrl ?? undefined;

  const { generateAlternates } = await import('@/lib/seo');

  return {
    title,
    description,
    openGraph: {
      title: strip.title,
      description,
      type: 'article',
      publishedTime: strip.postedAt?.toISOString(),
      url: `https://chunkycrayon.com/${locale}/comics/${slug}`,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 2048,
              height: 2048,
              alt: strip.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: strip.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    alternates: generateAlternates(locale, `/comics/${slug}`),
  };
}

const formatTheme = (theme: string): string =>
  theme
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

type PanelScript = {
  panel: number;
  cast: string[];
  setting?: string;
  action?: string;
  dialogue?: { speaker: string; text: string }[] | null;
};

const ComicStripDetailPage = async ({
  params,
}: {
  params: Promise<PageParams>;
}) => {
  const { slug, locale } = await params;
  const [strip, related] = await Promise.all([
    getStrip(slug),
    getRelatedStrips(slug),
  ]);

  if (!strip || !strip.assembledUrl) {
    notFound();
  }

  const panels = [
    strip.panel1Url,
    strip.panel2Url,
    strip.panel3Url,
    strip.panel4Url,
  ];

  const script = strip.scriptJson as
    | { panels?: PanelScript[]; logline?: string }
    | null
    | undefined;

  const description =
    strip.caption?.split('\n')[0] ??
    `${strip.title} — a 4-panel kids comic strip from Chunky Crayon.`;

  // JSON-LD structured data — schema.org/ComicStory
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ComicStory',
    name: strip.title,
    description,
    image: strip.assembledUrl,
    url: `https://chunkycrayon.com/${locale}/comics/${strip.slug}`,
    datePublished: strip.postedAt?.toISOString(),
    publisher: {
      '@type': 'Organization',
      name: 'Chunky Crayon',
      url: 'https://chunkycrayon.com',
    },
    audience: {
      '@type': 'PeopleAudience',
      suggestedMinAge: 3,
      suggestedMaxAge: 8,
    },
    inLanguage: 'en',
  };

  return (
    <PageWrap className="max-w-4xl mx-auto">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/comics"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-crayon-orange-dark font-rooney-sans mb-6"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
        All comics
      </Link>

      <header className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-wide mb-2">
          {formatTheme(strip.theme)}
          {strip.postedAt
            ? ` · ${new Date(strip.postedAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}`
            : ''}
        </p>
        <h1 className="font-tondo text-4xl md:text-5xl font-bold text-text-primary">
          {strip.title}
        </h1>
        {script?.logline ? (
          <p className="font-rooney-sans text-lg text-text-secondary mt-3">
            {script.logline}
          </p>
        ) : null}
      </header>

      {/* Hero — assembled 2x2 strip */}
      <div className="rounded-2xl overflow-hidden border-2 border-paper-cream-dark bg-white shadow-md mb-10">
        <Image
          src={strip.assembledUrl}
          alt={strip.title}
          width={2048}
          height={2048}
          className="w-full h-auto"
          unoptimized
          priority
        />
      </div>

      {/* Panel-by-panel — vertical, easier reading on mobile */}
      <section className="mb-12">
        <h2 className="font-tondo text-2xl font-bold mb-4 text-text-primary">
          Panel by panel
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {panels.map((url, i) =>
            url ? (
              <figure
                key={url}
                className="rounded-xl overflow-hidden border-2 border-paper-cream-dark bg-white"
              >
                <Image
                  src={url}
                  alt={`${strip.title} — panel ${i + 1}`}
                  width={1024}
                  height={1024}
                  className="w-full h-auto"
                  unoptimized
                />
                <figcaption className="px-3 py-2 text-xs font-mono text-text-secondary border-t border-paper-cream-dark">
                  Panel {i + 1}
                </figcaption>
              </figure>
            ) : null,
          )}
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-paper-cream-dark pt-10">
          <h2 className="font-tondo text-2xl font-bold mb-4 text-text-primary">
            More comics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/comics/${r.slug}`}
                className="group flex items-center gap-3 p-3 rounded-xl border-2 border-paper-cream-dark bg-white hover:border-crayon-orange transition-colors"
              >
                {r.assembledUrl ? (
                  <Image
                    src={r.assembledUrl}
                    alt={r.title}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    unoptimized
                  />
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="font-tondo font-bold text-sm line-clamp-2 group-hover:text-crayon-orange transition-colors">
                    {r.title}
                  </p>
                </div>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="text-xs text-text-secondary group-hover:text-crayon-orange transition-colors"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </PageWrap>
  );
};

export default ComicStripDetailPage;
