'use client';

/**
 * Client hook that returns the current profile's characters.
 *
 * Powers the CharacterPicker in CreateColoringPageForm. Mirrors the
 * useUser fetch-on-mount + setIsLoading pattern so the picker has a
 * predictable skeleton state.
 *
 * Refetches:
 *   - On mount.
 *   - On `refresh()` call (after a character is created via the modal
 *     or in case the parent wants to invalidate).
 *
 * Returns only fields the picker needs (id, name, status, line-art URL,
 * species). The full character record lives behind getCharacter / the
 * profile page.
 */

import { useCallback, useEffect, useState } from 'react';
import { listCharactersForActiveProfile } from '@/app/actions/characters';

export type PickerCharacter = {
  id: string;
  name: string;
  species: string;
  portraitLineArtUrl: string | null;
  portraitUrl: string | null;
  status: 'GENERATING' | 'READY' | 'FAILED';
};

type UseCharactersResult = {
  characters: PickerCharacter[];
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const useCharacters = (): UseCharactersResult => {
  const [characters, setCharacters] = useState<PickerCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCharacters = useCallback(async () => {
    try {
      const list = await listCharactersForActiveProfile();
      // Strip undefined / extra fields down to picker shape, preserving order.
      setCharacters(
        list.map((c) => ({
          id: c.id,
          name: c.name,
          species: c.species,
          portraitLineArtUrl: c.portraitLineArtUrl,
          portraitUrl: c.portraitUrl,
          status: c.status as PickerCharacter['status'],
        })),
      );
    } catch (err) {
      console.error('[useCharacters] failed to load:', err);
      setCharacters([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  return {
    characters,
    isLoading,
    refresh: fetchCharacters,
  };
};

export default useCharacters;
