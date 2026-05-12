'use client';

/**
 * Dev-only quick-create form. Mirrors the production picker contract but
 * exposes raw key inputs (dropdowns + checkboxes) so admins can hit
 * specific permutations fast for QA without going through the touchscreen
 * picker UI.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCharacter } from '@/app/actions/characters';
import {
  COLOR_OPTIONS,
  MAX_TRAITS,
  SPECIES_OPTIONS,
  TRAIT_OPTIONS,
  type ColorKey,
  type SpeciesKey,
  type TraitKey,
} from '@/lib/characters/picker-catalog';

const NewCharacterDevForm = () => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('Rex');
  const [species, setSpecies] = useState<SpeciesKey>('dragon');
  const [color, setColor] = useState<ColorKey>('purple');
  const [traits, setTraits] = useState<TraitKey[]>(['brave']);
  const [error, setError] = useState<string | null>(null);

  const toggleTrait = (t: TraitKey) => {
    setTraits((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= MAX_TRAITS) return prev;
      return [...prev, t];
    });
  };

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createCharacter({
        name,
        species,
        color,
        traits,
      });
      if (result.ok) {
        router.push(`/en/dev/characters/${result.characterId}`);
      } else {
        setError(
          `${result.error}${result.message ? ': ' + result.message : ''}`,
        );
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="block text-xs uppercase text-neutral-500 mb-1">
          Name (1-24 chars)
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          className="w-full rounded-xl border-2 border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-xs uppercase text-neutral-500 mb-1">
          Species
        </span>
        <select
          value={species}
          onChange={(e) => setSpecies(e.target.value as SpeciesKey)}
          className="w-full rounded-xl border-2 border-neutral-300 px-3 py-2 text-sm"
        >
          {SPECIES_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-xs uppercase text-neutral-500 mb-1">
          Colour
        </span>
        <select
          value={color}
          onChange={(e) => setColor(e.target.value as ColorKey)}
          className="w-full rounded-xl border-2 border-neutral-300 px-3 py-2 text-sm"
        >
          {COLOR_OPTIONS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="block text-xs uppercase text-neutral-500 mb-1">
          Traits (max {MAX_TRAITS})
        </legend>
        <div className="grid grid-cols-2 gap-1 text-sm">
          {TRAIT_OPTIONS.map((t) => (
            <label
              key={t.key}
              className="inline-flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={traits.includes(t.key)}
                onChange={() => toggleTrait(t.key)}
                disabled={
                  !traits.includes(t.key) && traits.length >= MAX_TRAITS
                }
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-black text-white px-5 py-3 text-sm disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create character'}
      </button>
    </form>
  );
};

export default NewCharacterDevForm;
