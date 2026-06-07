'use client';

/**
 * Horizontal-scroll picker that lets a user feature one of their READY
 * characters in the next coloring page they generate.
 *
 * v1 caps at one character per scene (gpt-image-2 multi-subject fidelity
 * issues confirmed by the bundles work). The picker enforces it by being
 * single-select.
 *
 * Three render states:
 *   - Loading: skeleton row.
 *   - 0 characters: a single "Make a friend" card that deep-links to
 *     /characters?from=create. Don't dead-end the user.
 *   - 1+ characters: "No friend" tile first + READY tiles (each showing the
 *     character's COLOUR portrait — line art is only the generation reference,
 *     a colour friend is far more inviting to a 3-8yo) + a "New friend" tile
 *     that always deep-links to /characters, so the add affordance is never
 *     hidden behind the empty state.
 *
 * Server-side ownership/READY checks are the source of truth (see
 * createPendingColoringImage). This picker only filters by status for
 * UX — never trust its output for authorisation.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { faBan, faUserPlus, faCheck } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from '@/utils/cn';
import useCharacters from '@/hooks/useCharacters';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

// Soft per-disc colour washes (Duolingo-ABC kids pattern) — each friend
// disc cycles through these so the row reads as a colourful set, not grey.
const DISC_TINTS = [
  'bg-crayon-orange/15',
  'bg-crayon-blue/15',
  'bg-crayon-green/15',
  'bg-crayon-purple/15',
  'bg-crayon-yellow/20',
  'bg-crayon-pink/15',
] as const;

type Props = {
  /** Currently selected characterId, or null for "None". */
  value: string | null;
  /** Called on selection change. Null = the user cleared the picker. */
  onChange: (id: string | null) => void;
};

const SKELETON_ITEMS = Array.from({ length: 3 });

const CharacterPicker = ({ value, onChange }: Props) => {
  const { characters, isLoading } = useCharacters();
  const [trackedSelections, setTrackedSelections] = useState<Set<string>>(
    new Set(),
  );

  const ready = characters.filter((c) => c.status === 'READY');

  // If the active selection becomes invalid (character was deleted /
  // hasn't finished generating yet), drop it. Don't leave the form
  // pointing at a stale id the server will reject.
  useEffect(() => {
    if (!value) return;
    const isStillReady = ready.some((c) => c.id === value);
    if (!isStillReady) {
      onChange(null);
    }
  }, [value, ready, onChange]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <span className="font-tondo text-sm font-bold text-text-primary">
          Add a friend{' '}
          <span className="font-normal text-neutral-400">(optional)</span>
        </span>
        <div className="flex gap-4 overflow-x-auto pb-2 pt-1">
          {SKELETON_ITEMS.map((_, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="size-20 shrink-0 animate-pulse rounded-full border-4 border-white bg-paper-cream-dark/40 shadow-[0_4px_10px_rgba(0,0,0,0.08)]"
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty-roster case: route the user to /characters where they can make
  // their first friend. Don't leave the picker silent.
  if (ready.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <span className="font-tondo text-sm font-bold text-text-primary">
          Add a friend{' '}
          <span className="font-normal text-neutral-400">(optional)</span>
        </span>
        <Link
          href="/characters?from=create"
          className="group flex items-center gap-3 rounded-3xl border-2 border-dashed border-crayon-orange/40 bg-crayon-orange/5 px-4 py-4 transition-colors hover:border-crayon-orange hover:bg-crayon-orange/10"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-crayon-orange shadow-[0_3px_0_0_hsl(var(--crayon-orange-dark))]">
            <FontAwesomeIcon
              icon={faUserPlus}
              className="text-xl text-white [--fa-secondary-color:#fff] [--fa-secondary-opacity:0.55]"
            />
          </span>
          <span className="font-tondo">
            <span className="font-bold text-text-primary">Make a friend</span>{' '}
            <span className="text-neutral-600">
              who shows up in your pages!
            </span>
          </span>
        </Link>
      </div>
    );
  }

  const handleSelect = (id: string | null) => {
    onChange(id);
    if (id && !trackedSelections.has(id)) {
      trackEvent(TRACKING_EVENTS.CHARACTER_PICKED_FOR_PAGE, {
        characterId: id,
        location: 'create_form',
      });
      setTrackedSelections((prev) => new Set(prev).add(id));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="font-tondo text-sm font-bold text-text-primary">
        Add a friend{' '}
        <span className="font-normal text-neutral-400">(optional)</span>
      </span>

      {/* Circular character discs — the kids-app pattern (Spotify Kids,
          Duolingo ABC): each friend is a round disc on a soft colour
          background with a chunky white "sticker" ring; the selected one
          pops with a bold orange ring + scale + a check badge. */}
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 pt-1">
        {/* "No friend" disc — first so it's the default and easy to bounce
            back to. A duotone "ban" icon reads friendlier than a bare ∅. */}
        <button
          type="button"
          onClick={() => handleSelect(null)}
          aria-pressed={value === null}
          className="group flex shrink-0 flex-col items-center gap-1.5"
        >
          <span
            className={cn(
              'relative grid size-20 place-items-center rounded-full border-4 border-white transition-all',
              'shadow-[0_4px_10px_rgba(0,0,0,0.08)]',
              value === null
                ? 'scale-105 bg-crayon-orange/15 ring-3 ring-crayon-orange'
                : 'bg-paper-cream group-hover:scale-105 group-hover:bg-paper-cream-dark',
            )}
          >
            <FontAwesomeIcon
              icon={faBan}
              className={cn(
                'text-2xl',
                value === null ? 'text-crayon-orange' : 'text-neutral-400',
              )}
            />
          </span>
          <span
            className={cn(
              'font-tondo text-xs font-bold',
              value === null ? 'text-crayon-orange' : 'text-neutral-600',
            )}
          >
            No friend
          </span>
        </button>

        {ready.map((c, i) => {
          const selected = value === c.id;
          // Show the COLOUR portrait — line art is only the generation
          // reference; a colour friend is far more inviting in the picker.
          const portrait = c.portraitUrl ?? c.portraitLineArtUrl;
          // Rotate each disc through a soft colour wash (Duolingo-ABC style)
          // so the row of friends reads as a colourful set, not grey cards.
          const disc = DISC_TINTS[i % DISC_TINTS.length];
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => handleSelect(c.id)}
              aria-pressed={selected}
              aria-label={`Include ${c.name}, a ${c.species}, in this page`}
              className="group flex shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'relative grid size-20 place-items-center overflow-hidden rounded-full border-4 border-white transition-all',
                  'shadow-[0_4px_10px_rgba(0,0,0,0.08)]',
                  disc,
                  selected
                    ? 'scale-105 ring-3 ring-crayon-orange'
                    : 'group-hover:scale-105',
                )}
              >
                {portrait ? (
                  // Portraits are R2-hosted webp/svg, ~80px rendered.
                  // next/image lazy-loads off-screen discs and serves a
                  // size-appropriate variant rather than the full upload.
                  <Image
                    src={portrait}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                ) : (
                  <span className="text-xs text-neutral-400">…</span>
                )}
                {/* Check badge on the selected disc (Mobbin kids pattern). */}
                {selected && (
                  <span className="absolute -right-0.5 -top-0.5 grid size-6 place-items-center rounded-full border-2 border-white bg-crayon-orange">
                    <FontAwesomeIcon
                      icon={faCheck}
                      className="text-[10px] text-white"
                    />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'max-w-20 truncate font-tondo text-xs font-bold leading-tight',
                  selected ? 'text-crayon-orange' : 'text-text-primary',
                )}
              >
                {c.name}
              </span>
            </button>
          );
        })}

        {/* "New friend" disc — always present so the add affordance never
            hides behind the empty state. Deep-links to /characters. */}
        <Link
          href="/characters?from=create"
          aria-label="Make a new friend"
          className="group flex shrink-0 flex-col items-center gap-1.5"
        >
          <span className="grid size-20 place-items-center rounded-full border-4 border-dashed border-crayon-orange/40 bg-crayon-orange/5 transition-all group-hover:scale-105 group-hover:border-crayon-orange group-hover:bg-crayon-orange/10">
            <FontAwesomeIcon
              icon={faUserPlus}
              className="text-2xl text-crayon-orange [--fa-secondary-color:hsl(var(--crayon-orange))] [--fa-secondary-opacity:0.4]"
            />
          </span>
          <span className="font-tondo text-xs font-bold text-crayon-orange">
            New friend
          </span>
        </Link>
      </div>
    </div>
  );
};

export default CharacterPicker;
