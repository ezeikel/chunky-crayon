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
 *   - 1+ characters: "None" pill first + READY pills, each with the
 *     character's line-art portrait + chunky name pill.
 *
 * Server-side ownership/READY checks are the source of truth (see
 * createPendingColoringImage). This picker only filters by status for
 * UX — never trust its output for authorisation.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { faPlus } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from '@/utils/cn';
import useCharacters from '@/hooks/useCharacters';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

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
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          Add a friend{' '}
          <span className="text-neutral-400 normal-case">(optional)</span>
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SKELETON_ITEMS.map((_, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="w-24 h-28 rounded-2xl bg-paper-cream-dark/30 animate-pulse shrink-0"
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
      <Link
        href="/characters?from=create"
        className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-paper-cream-dark bg-paper-cream/40 px-4 py-3 text-sm hover:bg-paper-cream transition-colors"
      >
        <FontAwesomeIcon icon={faPlus} className="text-lg text-crayon-orange" />
        <span>
          <span className="font-bold">Make a friend</span>{' '}
          <span className="text-neutral-600">who shows up in every page.</span>
        </span>
      </Link>
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
      <span className="text-xs uppercase tracking-wider text-neutral-500">
        Add a friend{' '}
        <span className="text-neutral-400 normal-case">(optional)</span>
      </span>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {/* "None" pill — first so it's the default and easy to bounce
            back to. Visually distinct from character tiles. */}
        <button
          type="button"
          onClick={() => handleSelect(null)}
          aria-pressed={value === null}
          className={cn(
            'shrink-0 w-24 h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-colors',
            value === null
              ? 'border-crayon-orange bg-crayon-orange/10 text-crayon-orange'
              : 'border-paper-cream-dark bg-white text-neutral-600 hover:border-crayon-orange',
          )}
        >
          <span className="text-2xl">∅</span>
          <span className="text-xs font-bold">No friend</span>
        </button>

        {ready.map((c) => {
          const selected = value === c.id;
          const portrait = c.portraitLineArtUrl ?? c.portraitUrl;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => handleSelect(c.id)}
              aria-pressed={selected}
              aria-label={`Include ${c.name}, a ${c.species}, in this page`}
              className={cn(
                'shrink-0 w-24 h-28 rounded-2xl border-2 flex flex-col items-center justify-between p-1 transition-all',
                selected
                  ? 'border-crayon-orange bg-crayon-orange/10 scale-105'
                  : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
              )}
            >
              <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
                {portrait ? (
                  // Portraits are R2-hosted webp/svg, ~96px rendered.
                  // next/image lazy-loads off-screen pills and serves a
                  // size-appropriate variant rather than the full upload.
                  <Image
                    src={portrait}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-contain"
                  />
                ) : (
                  <span className="text-xs text-neutral-400">…</span>
                )}
              </div>
              <span
                className={cn(
                  'w-full text-center text-xs font-bold truncate px-1 leading-tight',
                  selected ? 'text-crayon-orange' : 'text-neutral-700',
                )}
              >
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CharacterPicker;
