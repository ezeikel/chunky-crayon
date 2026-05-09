import Link from 'next/link';
import Image from 'next/image';
import { cacheLife, cacheTag } from 'next/cache';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faChevronRight } from '@fortawesome/pro-duotone-svg-icons';
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
 * Server-rendered card surfacing the most recent posted comic strip on
 * the home page. Renders nothing if no strip has been posted yet.
 *
 * Designed as a compact teaser — smaller visual footprint since it appears
 * lower on the page after conversion-focused sections.
 *
 * Cache: shares the comics-list tag, so revalidating after a new post
 * also refreshes this card. cacheLife('comics-list') = 6h revalidate.
 */
const LatestComicStripCard = async () => {
  const strip = await getLatestPostedStrip();
  if (!strip) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Section label */}
      <p className="text-center text-sm font-mono uppercase tracking-wide text-text-tertiary mb-3">
        Latest Comic Strip
      </p>

      <Link
        href={`/comics/${strip.slug}`}
        className="group flex items-center gap-4 rounded-2xl overflow-hidden border border-paper-cream-dark bg-white hover:border-crayon-teal/50 transition-all hover:shadow-sm px-4 py-3"
      >
        {/* Smaller thumbnail */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-paper-cream rounded-xl relative overflow-hidden">
          <Image
            src={strip.assembledUrl}
            alt={strip.title}
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Compact content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
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
            <span className="text-xs text-text-tertiary">
              {formatTheme(strip.theme)}
            </span>
          </div>
          <h3 className="font-tondo font-bold text-base sm:text-lg text-text-primary group-hover:text-crayon-teal transition-colors line-clamp-1">
            {strip.title}
          </h3>
        </div>

        {/* Arrow indicator */}
        <FontAwesomeIcon
          icon={faChevronRight}
          className="text-text-tertiary group-hover:text-crayon-teal group-hover:translate-x-0.5 transition-all flex-shrink-0"
          size="sm"
        />
      </Link>

      {/* View all link */}
      <p className="text-center mt-3">
        <Link
          href="/comics"
          className="text-sm font-rooney-sans text-text-secondary hover:text-crayon-teal transition-colors"
        >
          See all comics
        </Link>
      </p>
    </div>
  );
};

export default LatestComicStripCard;
