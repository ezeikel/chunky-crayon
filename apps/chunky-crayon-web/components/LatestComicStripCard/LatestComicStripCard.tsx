import Link from 'next/link';
import Image from 'next/image';
import { cacheLife, cacheTag } from 'next/cache';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faComment } from '@fortawesome/pro-duotone-svg-icons';
import { db } from '@one-colored-pixel/db';

type LatestStrip = {
  slug: string;
  title: string;
  theme: string;
  assembledUrl: string;
  postedAt: Date | null;
};

async function getLatestPostedStrip(): Promise<LatestStrip | null> {
  'use cache';
  cacheLife('comics-list');
  cacheTag('comics-list');
  const row = await db.comicStrip.findFirst({
    where: {
      brand: 'CHUNKY_CRAYON',
      status: 'POSTED',
      assembledUrl: { not: null },
    },
    orderBy: { postedAt: 'desc' },
    select: {
      slug: true,
      title: true,
      theme: true,
      assembledUrl: true,
      postedAt: true,
    },
  });
  return row?.assembledUrl ? { ...row, assembledUrl: row.assembledUrl } : null;
}

const formatTheme = (theme: string): string =>
  theme
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

/**
 * Server-rendered section surfacing the most recent posted comic strip on
 * the home page. Mirrors the FeaturedBundles section structure so both
 * read as peer content lanes.
 *
 * Cache: shares the comics-list tag, so revalidating after a new post
 * also refreshes this card. cacheLife('comics-list') = 6h revalidate.
 */
const LatestComicStripCard = async () => {
  const strip = await getLatestPostedStrip();
  if (!strip) return null;

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="text-center mb-8 lg:mb-10">
        <h2 className="font-tondo text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary">
          This Week's Comic Strip
        </h2>
        <p className="mt-4 text-text-secondary font-rooney-sans max-w-lg mx-auto">
          Four panels of crayon-cast adventures, fresh every Sunday. Read,
          laugh, then color the cast in.
        </p>
      </div>

      {/* Hero Card */}
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/comics/${strip.slug}`}
          className="group block rounded-2xl overflow-hidden border-2 border-paper-cream-dark bg-white hover:border-crayon-teal/50 hover:shadow-card-hover hover:-translate-y-1 transition-all"
        >
          {/* Image */}
          <div className="aspect-square bg-paper-cream relative overflow-hidden">
            <Image
              src={strip.assembledUrl}
              alt={strip.title}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          </div>

          {/* Content */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon
                icon={faComment}
                size="sm"
                style={
                  {
                    '--fa-primary-color': 'hsl(var(--crayon-teal))',
                    '--fa-secondary-color': 'hsl(var(--crayon-orange))',
                    '--fa-secondary-opacity': '0.8',
                  } as React.CSSProperties
                }
              />
              <span className="text-xs font-rooney-sans uppercase tracking-wide text-text-tertiary">
                {formatTheme(strip.theme)}
              </span>
            </div>
            <h3 className="font-tondo font-bold text-xl text-text-primary group-hover:text-crayon-teal transition-colors line-clamp-1">
              {strip.title}
            </h3>
          </div>
        </Link>
      </div>

      {/* View All Link */}
      <div className="text-center mt-8">
        <Link
          href="/comics"
          className="inline-flex items-center gap-2 font-tondo font-bold text-crayon-teal hover:text-crayon-teal-dark transition-colors group"
        >
          See All Comics
          <FontAwesomeIcon
            icon={faArrowRight}
            size="sm"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  );
};

export default LatestComicStripCard;
