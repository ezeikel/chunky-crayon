import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faPalette } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';

/**
 * Presentation-only piece of MyRecentCreations.
 *
 * Lives in its own file so Storybook can import it without pulling in
 * the server component's `@/auth` dependency chain (NextAuth's CJS
 * exports break Vite/Rollup when transitively included). Same pattern
 * as GalleryStats (route owns i18n + data, view stays pure).
 *
 * `items` is empty → friendly start-creating prompt.
 * `items` is populated → horizontal-scroll strip on mobile, 5-col grid
 * on desktop, "See all my pictures" door to /account/my-stuff (the
 * saved-artwork archive — different surface).
 *
 * Items carry `href` directly (computed server-side from
 * `getColoringImageUrl`) so this view stays URL-agnostic.
 */

export type MyRecentCreationsItem = {
  id: string;
  imageUrl: string;
  href: string;
  title: string;
};

export type MyRecentCreationsLabels = {
  title: string;
  empty: string;
  seeAll: string;
};

export type MyRecentCreationsViewProps = {
  items: MyRecentCreationsItem[];
  labels: MyRecentCreationsLabels;
  className?: string;
};

const MyRecentCreationsView = ({
  items,
  labels,
  className,
}: MyRecentCreationsViewProps) => {
  // Empty state — signed-in user with nothing generated yet. The hint
  // points at the create form above this slot on the homepage.
  if (items.length === 0) {
    return (
      <section
        className={cn(
          'mx-auto w-full max-w-5xl rounded-3xl border-2 border-paper-cream-dark bg-white p-8 text-center shadow-card',
          className,
        )}
      >
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-crayon-orange/10">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-2xl"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
        </div>
        <p className="font-tondo text-lg font-bold text-text-primary">
          {labels.empty}
        </p>
      </section>
    );
  }

  return (
    <section className={cn('w-full', className)}>
      <div className="mx-auto max-w-5xl">
        {/* Header stacks on mobile so the full kid-friendly "See all
            my pictures" CTA never wraps next to the title (iPhone Plus
            / Pro Max width — ~430px — can't fit both at sm-text+pill).
            Side-by-side at sm+ when there's room. */}
        <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <h2 className="font-tondo text-2xl font-bold text-text-primary md:text-3xl">
            {labels.title}
          </h2>
          <Link
            href="/account/my-stuff"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-crayon-orange px-4 py-2 font-tondo text-sm font-bold text-white shadow-btn-primary transition-transform hover:scale-105 active:scale-95 md:text-base"
          >
            {labels.seeAll}
            <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
          </Link>
        </div>

        {/* Horizontal-scroll strip on mobile (kid can swipe), grid on
            larger screens. -mx-4 px-4 lets the scroll edge bleed past
            the page padding so the first card hugs the left edge and
            the last card has breathing room before the page edge.
            py-1.5 gives hover/active scale room without the strip's
            implicit overflow-y:hidden clipping the card corners. */}
        <ul
          className={cn(
            'flex snap-x snap-mandatory gap-3 overflow-x-auto py-1.5 pb-2 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:py-0 md:pb-0',
            '-mx-4 px-4 md:mx-0 md:px-0',
          )}
        >
          {items.map((item) => (
            <li
              key={item.id}
              className="shrink-0 basis-40 snap-start md:basis-auto"
            >
              <Link
                href={item.href}
                aria-label={item.title}
                // Border-colour swap on hover/active is the affordance;
                // dropped hover:scale-105 because the strip's
                // overflow-x-auto implicitly clips the y-axis, hard-
                // squaring the top corners on the first hovered card.
                // active:scale-95 stays because the tap-back feedback
                // fits inside the new py-1.5 strip padding.
                className="group block aspect-square overflow-hidden rounded-3xl border-2 border-paper-cream-dark bg-white shadow-card transition-colors hover:border-crayon-orange active:scale-95"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  width={240}
                  height={240}
                  className="size-full object-contain p-3"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default MyRecentCreationsView;
