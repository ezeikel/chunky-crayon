import Image from 'next/image';
import { listCharactersForActiveProfile } from '@/app/actions/characters';
import { CHARACTER_LIMITS } from '@/constants';
import CharacterTile from '@/components/Characters/CharacterTile/CharacterTile';
import AddCharacterButton from '@/components/Characters/AddCharacterButton/AddCharacterButton';

/**
 * Server component. Pulls the user's roster for their active profile and
 * renders the Bluey-style grid. Wraps in Suspense at the page level (this
 * component is the dynamic island) so the page shell can prerender.
 *
 * Three flows:
 *   - 0 characters: oversized Colo + chunky CTA empty state.
 *   - 1-N (<cap): grid + Add tile.
 *   - At cap: grid without Add tile, footer message.
 */
const CharacterGrid = async () => {
  const characters = await listCharactersForActiveProfile();
  const atCap = characters.length >= CHARACTER_LIMITS.MAX_PER_PROFILE;

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-4">
        <Image
          src="/images/colo.svg"
          alt="Colo holds up a crayon"
          width={180}
          height={180}
          className="mb-4"
          priority
        />
        <h2 className="font-display text-2xl md:text-3xl mb-2">
          Let's make your first friend!
        </h2>
        <p className="text-neutral-600 max-w-md mb-6 text-sm md:text-base">
          Pick a name, describe what they look like, and we'll draw them for
          you. They'll show up in your coloring pages.
        </p>
        <AddCharacterButton variant="pill" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {characters.map((c) => (
          <CharacterTile
            key={c.id}
            id={c.id}
            name={c.name}
            species={c.species}
            portraitLineArtUrl={c.portraitLineArtUrl}
            portraitUrl={c.portraitUrl}
            status={c.status}
            failureReason={c.failureReason}
          />
        ))}
        {!atCap ? <AddCharacterButton variant="tile" /> : null}
      </div>
      {atCap ? (
        <p className="text-xs text-neutral-500 text-center">
          You've got a full house ({CHARACTER_LIMITS.MAX_PER_PROFILE} friends).
          Remove one to make room for someone new.
        </p>
      ) : null}
    </div>
  );
};

export default CharacterGrid;
