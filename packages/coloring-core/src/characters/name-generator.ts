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
 * Pure (Math.random only) — shared by web's create action and mobile's
 * CharacterBuilder so both suggest names from the same pool.
 */

import type { SpeciesKey, TraitKey } from "./picker-catalog";

/**
 * Per-species name pools. Keep entries short (≤ 6 chars), kid-pronounceable,
 * no real names of public figures. Mix genders.
 */
const NAME_POOLS: Record<SpeciesKey, readonly string[]> = {
  dragon: ["Rex", "Ember", "Smoky", "Blaze", "Spike", "Toothy", "Coal", "Ruby"],
  puppy: [
    "Biscuit",
    "Buddy",
    "Patch",
    "Pip",
    "Cookie",
    "Sandy",
    "Buster",
    "Hazel",
  ],
  kitten: [
    "Mittens",
    "Pickles",
    "Whiskers",
    "Pebble",
    "Mocha",
    "Boots",
    "Ziggy",
    "Olive",
  ],
  unicorn: [
    "Sparkle",
    "Star",
    "Glimmer",
    "Twinkle",
    "Sundae",
    "Wisp",
    "Pearl",
    "Honey",
  ],
  robot: ["Bolt", "Cog", "Beep", "Boop", "Rusty", "Pixel", "Zap", "Tin"],
  kid: ["Mei", "Sam", "Nori", "Jax", "Pip", "Lou", "Robin", "Wren"],
  fairy: [
    "Pip",
    "Dew",
    "Petal",
    "Buttercup",
    "Fern",
    "Daisy",
    "Posy",
    "Willow",
  ],
  monster: [
    "Grumble",
    "Wobble",
    "Bumble",
    "Snuggle",
    "Doodle",
    "Fuzz",
    "Lump",
    "Boom",
  ],
};

/**
 * First trait → optional suffix that personalises the name. Subtle —
 * "Rex the Brave" is more memorable than just "Rex" but we don't want
 * every character to be `Name the Adjective` (gets old fast).
 */
const TRAIT_SUFFIX: Partial<Record<TraitKey, string>> = {
  brave: " the Brave",
  sleepy: " the Sleepy",
  silly: " the Silly",
  bouncy: " the Bouncy",
  sparkly: " the Sparkly",
  // shy / loves-snacks / curious omitted — they don't read as natural
  // noun-phrase suffixes ("Rex the Shy" reads off).
};

const pickOne = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/**
 * Generate a fresh fun name from the species + (optional) trait list.
 * Pass the first trait for subtle personalisation. Always returns a
 * non-empty string ≤ 24 chars (Character.name DB cap).
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

  if (suffix && Math.random() < 0.5) {
    const combined = `${base}${suffix}`;
    if (combined.length <= 24) return combined;
  }
  return base;
};
