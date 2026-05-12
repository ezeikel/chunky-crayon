import MakeYoursCta from '@/components/Home/MeetYourCharactersSection/MakeYoursCta';

/**
 * /start ad-landing variant of the Meet Your Characters section. Tighter,
 * more conversion-oriented copy than the home-page version; the lead
 * line is the hook we want paid traffic to remember.
 *
 * Gated upstream by the `characters-marketing` PostHog flag — the parent
 * page passes null in this slot when the flag is off so this component
 * does not need its own check.
 *
 * Copy rules (see memory): no em dashes, no "AI" word, US/UK-neutral.
 */

const TILES = [
  {
    key: 'dragon',
    name: 'Rex',
    species: 'dragon',
    imagePath: '/marketing/characters/rex.svg',
  },
  {
    key: 'puppy',
    name: 'Bea',
    species: 'puppy',
    imagePath: '/marketing/characters/bea.svg',
  },
  {
    key: 'kid',
    name: 'Mei',
    species: 'kid',
    imagePath: '/marketing/characters/mei.svg',
  },
] as const;

const CharactersHookSection = () => {
  return (
    <section
      className="w-full max-w-5xl mx-auto px-4 md:px-0"
      aria-labelledby="characters-hook-heading"
    >
      <div className="text-center mb-6 md:mb-10">
        <h2
          id="characters-hook-heading"
          className="font-display text-3xl md:text-5xl mb-3"
        >
          Your kid's character in every coloring page
        </h2>
        <p className="text-neutral-600 text-base md:text-lg max-w-xl mx-auto">
          Build a friend they will recognise across every page they color. Same
          face, same favourite scarf, same silly grin.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8">
        {TILES.map((tile) => (
          <div
            key={tile.key}
            className="rounded-3xl border-2 border-paper-cream-dark bg-white shadow-card p-3 md:p-4 flex flex-col items-center"
          >
            <div className="w-full aspect-square flex items-center justify-center bg-paper-cream rounded-2xl mb-2 md:mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.imagePath}
                alt={`${tile.name}, a ${tile.species}`}
                className="w-3/4 h-3/4 object-contain"
              />
            </div>
            <span className="font-display text-lg md:text-xl">{tile.name}</span>
          </div>
        ))}
      </div>

      <div className="text-center">
        <MakeYoursCta location="start" cta="characters_landing_hook" />
      </div>
    </section>
  );
};

export default CharactersHookSection;
