import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/lib/utils';

/**
 * Generic URL-driven pagination control. Pages are 1-indexed.
 *
 * URL strategy: caller passes a `buildHref(page)` function so the control
 * doesn't have to know about query-string composition. Lets the same
 * component serve `/gallery?page=N`, `/blog?page=N`, etc, including
 * pages that compound additional filters (`?page=N&difficulty=beginner`).
 *
 * Visible page range: always shows the first page, the last page, the
 * current page, and one page on either side of current. Ellipses fill
 * the gaps. So for currentPage=5 / totalPages=10:
 *   « 1 … 4 [5] 6 … 10 »
 */
type PaginationProps = {
  currentPage: number;
  totalPages: number;
  /** Returns the href for a given page number. */
  buildHref: (page: number) => string;
  /** Accessible label for the nav wrapper. */
  ariaLabel?: string;
};

const Pagination = ({
  currentPage,
  totalPages,
  buildHref,
  ariaLabel = 'Pagination',
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);
  const visible = new Set<number>();
  visible.add(1);
  visible.add(totalPages);
  for (let p = safeCurrent - 1; p <= safeCurrent + 1; p += 1) {
    if (p >= 1 && p <= totalPages) visible.add(p);
  }
  const pages = Array.from(visible).sort((a, b) => a - b);

  const hasPrev = safeCurrent > 1;
  const hasNext = safeCurrent < totalPages;

  // Build display list: insert ellipses where pages are non-contiguous.
  type Item =
    | { type: 'page'; page: number }
    | { type: 'ellipsis'; key: string };
  const items: Item[] = [];
  for (let i = 0; i < pages.length; i += 1) {
    items.push({ type: 'page', page: pages[i] });
    if (i < pages.length - 1 && pages[i + 1] - pages[i] > 1) {
      items.push({ type: 'ellipsis', key: `gap-${pages[i]}` });
    }
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="mt-8 flex items-center justify-center gap-1 flex-wrap"
    >
      {/* Prev */}
      {hasPrev ? (
        <Link
          href={buildHref(safeCurrent - 1)}
          rel="prev"
          aria-label="Previous page"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full font-tondo font-semibold text-text-secondary border-2 border-paper-cream-dark hover:border-crayon-orange/50 hover:text-crayon-orange transition-colors"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full font-tondo font-semibold text-text-tertiary border-2 border-paper-cream-dark/50 opacity-50 cursor-not-allowed"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </span>
      )}

      {/* Page numbers + ellipses */}
      {items.map((item) => {
        if (item.type === 'ellipsis') {
          return (
            <span
              key={item.key}
              aria-hidden="true"
              className="inline-flex items-center justify-center w-10 h-10 text-text-tertiary font-tondo"
            >
              …
            </span>
          );
        }
        const isActive = item.page === safeCurrent;
        return (
          <Link
            key={item.page}
            href={buildHref(item.page)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={
              isActive ? `Page ${item.page}, current` : `Page ${item.page}`
            }
            className={cn(
              'inline-flex items-center justify-center w-10 h-10 rounded-full font-tondo font-semibold transition-colors border-2',
              isActive
                ? 'bg-crayon-orange text-white border-crayon-orange cursor-default'
                : 'bg-white text-text-secondary border-paper-cream-dark hover:border-crayon-orange/50 hover:text-crayon-orange',
            )}
          >
            {item.page}
          </Link>
        );
      })}

      {/* Next */}
      {hasNext ? (
        <Link
          href={buildHref(safeCurrent + 1)}
          rel="next"
          aria-label="Next page"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full font-tondo font-semibold text-text-secondary border-2 border-paper-cream-dark hover:border-crayon-orange/50 hover:text-crayon-orange transition-colors"
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full font-tondo font-semibold text-text-tertiary border-2 border-paper-cream-dark/50 opacity-50 cursor-not-allowed"
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
        </span>
      )}
    </nav>
  );
};

export default Pagination;
