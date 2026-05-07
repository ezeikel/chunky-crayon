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
 * Cache: shares the comics-list tag, so revalidating after a new post
 * also refreshes this card. cacheLife('comics-list') = 6h revalidate.
 */
const LatestComicStripCard = async () => {
  const strip = await getLatestPostedStrip();
  if (!strip) return null;

  return (
    <Link
      href={`/comics/${strip.slug}`}
      className="group flex flex-col sm:flex-row items-stretch gap-0 sm:gap-6 rounded-3xl overflow-hidden border-2 border-paper-cream-dark bg-white hover:border-crayon-orange transition-all hover:scale-[1.005] active:scale-[0.99] shadow-sm hover:shadow-md max-w-3xl mx-auto"
    >
      <div className="w-full sm:w-48 aspect-square flex-shrink-0 bg-paper-cream relative">
        <Image
          src={strip.assembledUrl}
          alt={strip.title}
          fill
          sizes="(max-width: 640px) 100vw, 192px"
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <FontAwesomeIcon
            icon={faComment}
            className="text-base"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                '--fa-secondary-opacity': '0.8',
              } as React.CSSProperties
            }
          />
          <span className="text-xs font-mono uppercase tracking-wide text-text-secondary">
            New comic · {formatTheme(strip.theme)}
          </span>
        </div>
        <h2 className="font-tondo font-bold text-xl sm:text-2xl text-text-primary group-hover:text-crayon-orange transition-colors mb-2">
          {strip.title}
        </h2>
        <p className="font-rooney-sans text-sm text-text-secondary">
          A new 4-panel comic from Colo and friends — read it{' '}
          <span className="inline-flex items-center gap-1 text-crayon-orange-dark font-bold">
            here
            <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
          </span>
        </p>
      </div>
    </Link>
  );
};

export default LatestComicStripCard;
