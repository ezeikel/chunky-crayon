import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faRotateRight,
} from '@fortawesome/pro-duotone-svg-icons';
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
 * profile page at /characters/[id].
 *
 * Three visual states:
 *   - READY: colored portrait + chunky name pill. Tile is a Link.
 *   - GENERATING: animated wand-sparkles icon inside a cream surface, with
 *     a chunky 'Drawing…' pill. Not a link (clicking through to a not-yet-
 *     READY character is the most common 'is it stuck' trap).
 *   - FAILED: soft cream surface with a refresh icon + 'Try again' chunky
 *     pill. Raw failureReason is NEVER shown to kids — it can leak the
 *     OpenAI error text. Admins see it in the /dev/characters viewer.
 *
 * Visual treatment matches the create modal: rounded-3xl, chunky border,
 * shadow-card, warm cream fills. Status pills use the brand crayon
 * palette so the grid reads as a single family with the modal.
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
  // failureReason intentionally not surfaced — kids shouldn't see raw
  // error strings. Admins inspect via /dev/characters/[id].
  failureReason: _failureReason,
}: Props) => {
  // Show the colored illustration — the kid's actual character. Line-art
  // is a fallback only (a pre-two-asset character not yet backfilled);
  // line-art is the coloring-page reference, not a display asset.
  const portrait = portraitUrl ?? portraitLineArtUrl;
  const isReady = status === 'READY';
  const isGenerating = status === 'GENERATING';
  const isFailed = status === 'FAILED';

  const cardClasses =
    'group relative flex flex-col rounded-3xl border-2 border-paper-cream-dark bg-white shadow-card overflow-hidden';

  // Duotone palette for status icons — picks up the modal's warm crayon
  // tones so the page reads as one family.
  const drawingIconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '0.8',
  } as React.CSSProperties;

  const retryIconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-pink))',
    '--fa-secondary-opacity': '0.8',
  } as React.CSSProperties;

  const inner = (
    <>
      {/* Pure white background — line-art reads as a coloring-page
          preview only when the outlines have real contrast. Cream
          muddied the black ink. */}
      <div className="relative aspect-square w-full flex flex-col items-center justify-center gap-3 bg-white">
        {isReady && portrait ? (
          // R2-hosted portrait; next/image lazy-loads off-screen tiles +
          // serves a size-appropriate variant. `relative` parent above so
          // `fill` positions correctly. p-4 padding becomes the parent's
          // box, not the image's.
          <Image
            src={portrait}
            alt={`${name}, a ${species}`}
            fill
            sizes="(max-width: 768px) 50vw, 280px"
            className="object-contain p-4"
          />
        ) : isGenerating ? (
          <>
            <FontAwesomeIcon
              icon={faWandMagicSparkles}
              className="text-5xl animate-pulse"
              style={drawingIconStyle}
            />
            <span className="text-sm font-bold text-neutral-700">
              Drawing {name}…
            </span>
          </>
        ) : isFailed ? (
          <>
            <FontAwesomeIcon
              icon={faRotateRight}
              className="text-5xl"
              style={retryIconStyle}
            />
            <span className="text-sm font-bold text-neutral-700">
              Tap to try again
            </span>
          </>
        ) : (
          // READY but no portrait yet (shouldn't happen — the worker sets
          // both URLs before flipping status — but defensive fallback).
          <span className="text-sm text-neutral-500">Getting ready</span>
        )}
      </div>

      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-display text-lg leading-none truncate">
          {name}
        </span>
        {isGenerating ? (
          <span className="shrink-0 rounded-full bg-crayon-yellow text-neutral-800 px-3 py-1 text-xs font-bold uppercase tracking-wide animate-pulse">
            Drawing
          </span>
        ) : isFailed ? (
          <span className="shrink-0 rounded-full bg-crayon-orange text-white px-3 py-1 text-xs font-bold uppercase tracking-wide">
            Retry
          </span>
        ) : null}
      </div>
    </>
  );

  // Don't let kids click through to a GENERATING tile (no useful state
  // there yet; profile page assumes READY).
  if (isGenerating) {
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
