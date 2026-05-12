/**
 * Fun-name generator for the kid-first character create flow.
 *
 * Goal: every character has a name without the kid having to type. The
 * generator picks from a curated pool keyed roughly by species (so a
 * dragon doesn't get a name from the puppy pool) and biases toward the
 * first trait when one is set. Re-rolling is one shuffle button click.
 *
 * Names lean playful, short, easy to say aloud for a 3-8yo. No real
 * people, no licensed characters.
 *
 * This is a pure deterministic-ish picker — we use Math.random because
 * the only consumer is a button labelled "try another". If two kids
 * happen to land on the same Rex it's fine; the LLM that draws the
 * portrait personalises them anyway via the structured picks.
 */

import type { SpeciesKey, TraitKey } from './picker-catalog';

/**
 * Per-species name pools. Keep entries short (≤ 6 chars), kid-pronounceable,
 * no real names of public figures. Mix genders. Add more freely.
 */
const NAME_POOLS: Record<SpeciesKey, readonly string[]> = {
  dragon: ['Rex', 'Ember', 'Smoky', 'Blaze', 'Spike', 'Toothy', 'Coal', 'Ruby'],
  puppy: [
    'Biscuit',
    'Buddy',
    'Patch',
    'Pip',
    'Cookie',
    'Sandy',
    'Buster',
    'Hazel',
  ],
  kitten: [
    'Mittens',
    'Pickles',
    'Whiskers',
    'Pebble',
    'Mocha',
    'Boots',
    'Ziggy',
    'Olive',
  ],
  unicorn: [
    'Sparkle',
    'Star',
    'Glimmer',
    'Twinkle',
    'Sundae',
    'Wisp',
    'Pearl',
    'Honey',
  ],
  robot: ['Bolt', 'Cog', 'Beep', 'Boop', 'Rusty', 'Pixel', 'Zap', 'Tin'],
  kid: ['Mei', 'Sam', 'Nori', 'Jax', 'Pip', 'Lou', 'Robin', 'Wren'],
  fairy: [
    'Pip',
    'Dew',
    'Petal',
    'Buttercup',
    'Fern',
    'Daisy',
    'Posy',
    'Willow',
  ],
  monster: [
    'Grumble',
    'Wobble',
    'Bumble',
    'Snuggle',
    'Doodle',
    'Fuzz',
    'Lump',
    'Boom',
  ],
};

/**
 * First trait → optional suffix that personalises the name. Subtle —
 * "Rex the Brave" is more memorable than just "Rex" but we don't want
 * every character to be `Name the Adjective` (gets old fast).
 *
 * 50% chance of applying when a trait is picked. Pure for testing-ish
 * predictability isn't necessary — the user can shuffle.
 */
const TRAIT_SUFFIX: Partial<Record<TraitKey, string>> = {
  brave: ' the Brave',
  sleepy: ' the Sleepy',
  silly: ' the Silly',
  bouncy: ' the Bouncy',
  sparkly: ' the Sparkly',
  // shy / loves-snacks / curious omitted on purpose — they don't read
  // as natural noun-phrase suffixes ("Rex the Shy" reads off).
};

const pickOne = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/**
 * Generate a fresh fun name from the species + (optional) trait list.
 * Pass the first trait if you want subtle personalisation. Always
 * returns a non-empty string ≤ 24 chars (Character.name DB cap).
 */
export const generateCharacterName = ({
  species,
  traits,
}: {
  species: SpeciesKey;
  traits?: readonly TraitKey[];
}): string => {
  const base = pickOne(NAME_POOLS[species]);
  const firstTrait = traits?.[0];
  const suffix = firstTrait ? TRAIT_SUFFIX[firstTrait] : undefined;

  // 50% chance of appending the suffix when one is available. Keeps the
  // pool interesting without making every name read formulaic.
  if (suffix && Math.random() < 0.5) {
    const combined = `${base}${suffix}`;
    if (combined.length <= 24) return combined;
  }
  return base;
};
