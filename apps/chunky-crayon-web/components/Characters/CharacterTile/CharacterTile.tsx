import Link from 'next/link';
import type { CharacterStatus } from '@one-colored-pixel/db';

type Props = {
  id: string;
  name: string;
  species: string;
  portraitLineArtUrl: string | null;
  portraitUrl: string | null;
  status: CharacterStatus;
  failureReason: string | null;
};

/**
 * One character in the Bluey-style grid. Linkable into the per-character
 * profile page at /characters/[id] (Phase 4 fleshes out the destination).
 *
 * Three visual states:
 *   - READY: line-art portrait + chunky name pill. Tile is a Link.
 *   - GENERATING: shimmer + Colo holds-up-a-crayon placeholder. Not a link
 *     (clicking the tile mid-generation is the most common "is it stuck"
 *     trap; the parent has nothing to do here yet).
 *   - FAILED: faded portrait outline + "Try again" affordance pointing at
 *     the regenerate flow (Phase 4 will wire the actual button — for now
 *     the tile just links to the profile page where retry lives).
 *
 * Audience: kid-fingers + parent reviewing the gallery. Card sized for
 * chunky taps (full 1:1 aspect with the portrait taking the top 2/3).
 * No em dashes, no "AI" word.
 */
const CharacterTile = ({
  id,
  name,
  species,
  portraitLineArtUrl,
  portraitUrl,
  status,
  failureReason,
}: Props) => {
  const portrait = portraitLineArtUrl ?? portraitUrl;
  const isReady = status === 'READY';
  const isGenerating = status === 'GENERATING';
  const isFailed = status === 'FAILED';

  const cardClasses =
    'group relative flex flex-col rounded-3xl border-2 border-paper-cream-dark bg-white shadow-card overflow-hidden';

  const inner = (
    <>
      <div
        className={`aspect-square w-full flex items-center justify-center bg-paper-cream ${
          isGenerating ? 'animate-pulse' : ''
        }`}
      >
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portrait}
            alt={`${name}, a ${species}`}
            className={`w-full h-full object-contain p-4 ${
              isFailed ? 'opacity-40 grayscale' : ''
            }`}
          />
        ) : (
          // No portrait yet — render a soft "drawing your friend" placeholder.
          <span className="text-xs text-neutral-500 px-3 text-center">
            {isGenerating
              ? "We're drawing your new friend"
              : isFailed
                ? 'Something went wrong'
                : 'Getting ready'}
          </span>
        )}
      </div>

      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-display text-lg leading-none truncate">
          {name}
        </span>
        {isReady ? null : (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] uppercase tracking-wide ${
              isGenerating
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {isGenerating ? 'Drawing' : 'Retry'}
          </span>
        )}
      </div>

      {isFailed && failureReason ? (
        // Keep failureReason hidden by default and surface as a small
        // hover/tap-revealed footnote. Parents who care can read it; kids
        // who don't shouldn't see a wall of error text.
        <p className="px-4 pb-3 text-[10px] text-red-700 line-clamp-2">
          {failureReason}
        </p>
      ) : null}
    </>
  );

  // Don't let kids click through to a GENERATING tile (no useful state
  // there yet; profile page assumes READY).
  if (!isReady && !isFailed) {
    return <div className={cardClasses}>{inner}</div>;
  }

  return (
    <Link
      href={`/characters/${id}`}
      className={`${cardClasses} hover:shadow-lg transition-shadow`}
    >
      {inner}
    </Link>
  );
};

export default CharacterTile;
