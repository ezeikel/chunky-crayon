import MakeYoursCta from './MakeYoursCta';

/**
 * Home-page "Meet your characters" section.
 *
 * Three pre-curated character tiles (dragon / puppy / kid) with chunky
 * CTA. Static — uses hand-curated portraits under
 * `public/marketing/characters/`. No DB query, no user data — pure
 * marketing surface that prerenders fully.
 *
 * Gated by the `characters-marketing` PostHog flag at the page level.
 * When the flag is off the parent renders null in this slot, so this
 * component doesn't need its own runtime check.
 *
 * Copy rules:
 *   - No em dashes.
 *   - No "AI" word (parents are AI-skeptical per memory).
 *   - US/UK-neutral.
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

const MeetYourCharactersSection = () => {
  return (
    <section
      className="w-full max-w-5xl mx-auto px-4 md:px-0"
      aria-labelledby="meet-your-characters-heading"
    >
      <div className="text-center mb-6 md:mb-10">
        <h2
          id="meet-your-characters-heading"
          className="font-display text-3xl md:text-5xl mb-3"
        >
          Meet your friends
        </h2>
        <p className="text-neutral-600 text-base md:text-lg max-w-xl mx-auto">
          Make a friend who shows up in every coloring page.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        {TILES.map((tile) => (
          <div
            key={tile.key}
            className="rounded-3xl border-2 border-paper-cream-dark bg-white shadow-card p-4 flex flex-col items-center"
          >
            <div className="w-full aspect-square flex items-center justify-center bg-paper-cream rounded-2xl mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.imagePath}
                alt={`${tile.name}, a ${tile.species}`}
                className="w-3/4 h-3/4 object-contain"
              />
            </div>
            <span className="font-display text-xl">{tile.name}</span>
            <span className="text-xs text-neutral-500 capitalize">
              {tile.species}
            </span>
          </div>
        ))}
      </div>

      <div className="text-center">
        <MakeYoursCta location="homepage" cta="characters_home_section" />
      </div>
    </section>
  );
};

export default MeetYourCharactersSection;
