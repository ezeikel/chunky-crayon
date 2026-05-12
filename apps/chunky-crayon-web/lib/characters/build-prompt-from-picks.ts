/**
 * Build a clean `shortPrompt` string from the kid's structured picks.
 *
 * The icon-first create flow gives us structured input (species + color +
 * traits). That means we don't need LLM trait extraction for the picker
 * path — we can construct a guaranteed well-formed shortPrompt server-
 * side, and skip the extra Claude call.
 *
 * The trait-extraction path still exists for any future surface that
 * accepts free text. It's just bypassed for icon-picker submissions.
 *
 * Output shape (deterministic):
 *   `${color} ${species} who is ${trait1} and ${trait2}`
 *
 * Examples:
 *   purple dragon who is brave and silly
 *   pink kitten who is shy and gentle
 *   orange robot
 *
 * The string lands in Character.shortPrompt for audit / debug. The
 * portrait prompt itself is built downstream by buildCharacterPortraitPrompt
 * which inlines this + the structured trait list verbatim.
 */

import {
  COLOR_OPTIONS,
  SPECIES_OPTIONS,
  TRAIT_OPTIONS,
  type ColorKey,
  type SpeciesKey,
  type TraitKey,
} from './picker-catalog';

const speciesNoun = (key: SpeciesKey): string =>
  SPECIES_OPTIONS.find((s) => s.key === key)?.noun ?? key;

const colorWord = (key: ColorKey): string =>
  COLOR_OPTIONS.find((c) => c.key === key)?.promptWord ?? key;

const traitPhrase = (key: TraitKey): string =>
  TRAIT_OPTIONS.find((t) => t.key === key)?.promptPhrase ?? key;

export const buildShortPromptFromPicks = ({
  species,
  color,
  traits,
}: {
  species: SpeciesKey;
  color: ColorKey;
  traits: readonly TraitKey[];
}): string => {
  const base = `${colorWord(color)} ${speciesNoun(species)}`;
  if (traits.length === 0) return base;
  const phrases = traits.map(traitPhrase);
  // Two traits: "a and b". Three traits: "a, b, and c". Single trait: "a".
  const joined =
    phrases.length === 1
      ? phrases[0]
      : phrases.length === 2
        ? `${phrases[0]} and ${phrases[1]}`
        : `${phrases.slice(0, -1).join(', ')}, and ${phrases[phrases.length - 1]}`;
  return `${base} who is ${joined}`;
};

/**
 * Server-side shorthand for building the full Character payload from the
 * picker submission. Used by createCharacter when args.picks is set.
 *
 * `signatureDetails` comes from {colour + species + each trait + 'no
 * other major features'} — these are the visually-checkable elements
 * we want the portrait gen + QA pass to verify.
 */
export const buildExtractedFromPicks = ({
  species,
  color,
  traits,
}: {
  species: SpeciesKey;
  color: ColorKey;
  traits: readonly TraitKey[];
}) => {
  const traitsText = traits.map(traitPhrase);
  const signatureDetails: string[] = [
    `${colorWord(color)} body colour`,
    `cartoon ${speciesNoun(species)}`,
    ...traitsText.map((phrase) => `expression conveys ${phrase}`),
  ];

  const referenceSheetPrompt = `A friendly cartoon ${colorWord(color)} ${speciesNoun(
    species,
  )}${
    traitsText.length > 0 ? `, who is ${traitsText.join(' and ')}` : ''
  }. Drawn as a children's coloring book line-art portrait, single character, plain white background, no scenery.`;

  // The first trait drives the suggested voice persona. Falls back to
  // a sensible gender-neutral default if no traits picked.
  const firstTrait = traits[0];
  const firstTraitOpt = firstTrait
    ? TRAIT_OPTIONS.find((t) => t.key === firstTrait)
    : undefined;
  const suggestedVoicePersona =
    firstTraitOpt?.suggestedPersona ?? 'warm-girl-7yo';

  return {
    species: speciesNoun(species),
    traits: traitsText,
    signatureDetails,
    referenceSheetPrompt,
    suggestedVoicePersona,
  };
};
