'use client';

/**
 * Icon-first character create flow. Five tap-driven steps:
 *
 *   1. Species   — 4x2 icon grid (dragon, puppy, kitten, unicorn, robot,
 *                  kid, fairy, monster).
 *   2. Colour    — 6 chunky brand-palette swatches.
 *   3. Traits    — 8 icon chips, multi-select up to 3.
 *   4. Name      — auto-generated from species+traits; chunky shuffle button;
 *                  parent-only "change" link reveals a text input.
 *   5. Voice     — persona picker (icon tiles, optional).
 *
 * No textarea anywhere. No free-text required to finish — every step is
 * tappable, including the name step (shuffle to keep, type only if you
 * want a custom name).
 *
 * On submit we send structured picks to `createCharacter`; the server
 * constructs the shortPrompt deterministically. See
 * lib/characters/build-prompt-from-picks.ts for the prompt assembly.
 *
 * Why no parent gate:
 *   Creation is functionally the same as making a coloring page (kid
 *   describes thing → we draw it). The signed-in cookie IS the trust
 *   line. Parent gates stay on custom voice (1 credit) + delete.
 *
 * No em dashes. No "AI" word. US/UK-neutral. Tap targets ≥ 44pt.
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShuffle, faPen } from '@fortawesome/pro-duotone-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createCharacter } from '@/app/actions/characters';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import {
  COLOR_OPTIONS,
  MAX_TRAITS,
  SPECIES_OPTIONS,
  TRAIT_OPTIONS,
  type ColorKey,
  type SpeciesKey,
  type TraitKey,
} from '@/lib/characters/picker-catalog';
import { generateCharacterName } from '@/lib/characters/name-generator';
import { VOICE_PERSONAS } from '@/lib/characters/voice-personas';
import type { VoicePersonaKey } from '@/lib/characters/voice-persona-types';
import cn from '@/utils/cn';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Step = 'species' | 'color' | 'traits' | 'name' | 'voice';

const STEPS: readonly Step[] = ['species', 'color', 'traits', 'name', 'voice'];

const STEP_TITLES: Record<Step, string> = {
  species: 'Pick your friend',
  color: 'Pick a colour',
  traits: 'What are they like?',
  name: 'Give them a name',
  voice: 'Pick a voice',
};

/**
 * Voice persona keys + emoji faces. Decoupled from voice-personas.ts so
 * that file stays server-safe (env-var reads). The keys MUST stay
 * aligned with VoicePersonaKey.
 */
const VOICE_TILES: { key: VoicePersonaKey; face: string; label: string }[] = [
  { key: 'warm-girl-7yo', face: '😊', label: 'Warm' },
  { key: 'warm-boy-7yo', face: '🙂', label: 'Cosy' },
  { key: 'playful-girl-5yo', face: '😄', label: 'Bouncy' },
  { key: 'playful-boy-5yo', face: '🤪', label: 'Playful' },
  { key: 'sleepy-neutral', face: '😴', label: 'Sleepy' },
  { key: 'brave-neutral', face: '😤', label: 'Brave' },
  { key: 'silly-neutral', face: '🤣', label: 'Silly' },
  { key: 'gentle-neutral', face: '🤗', label: 'Gentle' },
];

const CreateCharacterModal = ({ open, onClose }: Props) => {
  const router = useRouter();
  const [step, setStep] = useState<Step>('species');
  const [species, setSpecies] = useState<SpeciesKey | null>(null);
  const [color, setColor] = useState<ColorKey | null>(null);
  const [traits, setTraits] = useState<TraitKey[]>([]);
  const [name, setName] = useState<string>('');
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [voicePersona, setVoicePersona] = useState<VoicePersonaKey | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [pending, startTransition] = useTransition();

  // Track CREATE_STARTED once per modal open.
  useEffect(() => {
    if (open && !hasTrackedStart) {
      trackEvent(TRACKING_EVENTS.CHARACTER_CREATE_STARTED, {});
      setHasTrackedStart(true);
    }
  }, [open, hasTrackedStart]);

  // When we enter the name step (or any prereq changes), seed the name.
  // Don't clobber a name the parent has manually typed.
  useEffect(() => {
    if (step !== 'name' || !species) return;
    if (!name || !showNameEdit) {
      setName(generateCharacterName({ species, traits }));
    }
    // showNameEdit is intentionally NOT in the dep array — toggling it
    // shouldn't re-roll the name. species/traits are intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, species, traits]);

  const reset = () => {
    setStep('species');
    setSpecies(null);
    setColor(null);
    setTraits([]);
    setName('');
    setShowNameEdit(false);
    setVoicePersona(null);
    setError(null);
    setHasTrackedStart(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTimeout(reset, 200);
      onClose();
    }
  };

  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    setError(null);
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    setError(null);
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const canAdvance = useMemo(() => {
    switch (step) {
      case 'species':
        return species !== null;
      case 'color':
        return color !== null;
      case 'traits':
        return true; // Traits are optional
      case 'name':
        return name.trim().length > 0 && name.trim().length <= 24;
      case 'voice':
        return true;
      default:
        return false;
    }
  }, [step, species, color, name]);

  const handleShuffleName = () => {
    if (!species) return;
    setName(generateCharacterName({ species, traits }));
  };

  const toggleTrait = (t: TraitKey) => {
    setTraits((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= MAX_TRAITS) return prev;
      return [...prev, t];
    });
  };

  const handleSubmit = () => {
    if (!species || !color) {
      setError('Please finish all the steps.');
      return;
    }
    if (!name.trim()) {
      setError('Give your friend a name.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createCharacter({
        name: name.trim(),
        species,
        color,
        traits,
        voicePersona: voicePersona ?? undefined,
      });
      if (result.ok) {
        trackEvent(TRACKING_EVENTS.CHARACTER_CREATE_SUBMITTED, {
          characterId: result.characterId,
          species,
          voicePersona: voicePersona ?? undefined,
        });
        handleOpenChange(false);
        router.refresh();
      } else {
        const friendly: Record<string, string> = {
          unauthorized: 'Please sign in first.',
          no_active_profile: 'Pick a profile before making a character.',
          invalid_input: 'Something went wrong. Try again.',
          moderation_blocked: "We can't use that name. Try a different one.",
          limit_reached: "You've got a full house. Try removing one first.",
          worker_unavailable: 'Something went wrong drawing your friend.',
          unknown: 'Something went wrong. Please try again.',
        };
        setError(
          friendly[result.error] ?? 'Something went wrong. Please try again.',
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            {STEP_TITLES[step]}
          </DialogTitle>
          {/* Screen-reader description only — visually hidden via the
              Dialog primitive's default styling for DialogDescription. */}
          <DialogDescription className="sr-only">
            Step {stepIndex + 1} of {STEPS.length} in making your character.
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 my-3" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors',
                i === stepIndex
                  ? 'bg-crayon-orange'
                  : i < stepIndex
                    ? 'bg-crayon-orange/50'
                    : 'bg-paper-cream-dark',
              )}
            />
          ))}
        </div>

        {/* ─── Species ─────────────────────────────────────────────── */}
        {step === 'species' ? (
          <div className="grid grid-cols-4 gap-3">
            {SPECIES_OPTIONS.map((s) => {
              const selected = species === s.key;
              return (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => setSpecies(s.key)}
                  aria-pressed={selected}
                  aria-label={s.label}
                  className={cn(
                    'aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all min-h-[88px]',
                    selected
                      ? 'border-crayon-orange bg-crayon-orange/10 scale-105'
                      : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                  )}
                >
                  <FontAwesomeIcon
                    icon={s.icon}
                    className={cn(
                      'text-3xl',
                      selected ? 'text-crayon-orange' : 'text-neutral-700',
                    )}
                  />
                  <span className="text-[10px] font-bold text-neutral-600">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* ─── Colour ──────────────────────────────────────────────── */}
        {step === 'color' ? (
          <div className="grid grid-cols-3 gap-3">
            {COLOR_OPTIONS.map((c) => {
              const selected = color === c.key;
              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  aria-pressed={selected}
                  aria-label={c.label}
                  className={cn(
                    'aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all min-h-[88px]',
                    selected
                      ? 'border-crayon-orange scale-105'
                      : 'border-paper-cream-dark hover:border-crayon-orange',
                  )}
                >
                  <span
                    className={cn(
                      'w-12 h-12 rounded-full shadow-inner',
                      c.swatchClass,
                    )}
                  />
                  <span className="text-[10px] font-bold text-neutral-600">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* ─── Traits ──────────────────────────────────────────────── */}
        {step === 'traits' ? (
          <div className="space-y-3">
            <p className="text-center text-xs text-neutral-500">
              Pick up to {MAX_TRAITS}. Or none — totally fine.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {TRAIT_OPTIONS.map((t) => {
                const selected = traits.includes(t.key);
                const atCap = !selected && traits.length >= MAX_TRAITS;
                return (
                  <button
                    type="button"
                    key={t.key}
                    onClick={() => toggleTrait(t.key)}
                    aria-pressed={selected}
                    aria-label={t.label}
                    disabled={atCap}
                    className={cn(
                      'aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all min-h-[88px]',
                      selected
                        ? 'border-crayon-orange bg-crayon-orange/10 scale-105'
                        : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                      atCap && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <FontAwesomeIcon
                      icon={t.icon}
                      className={cn(
                        'text-2xl',
                        selected ? 'text-crayon-orange' : 'text-neutral-700',
                      )}
                    />
                    <span className="text-[10px] font-bold text-neutral-600">
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ─── Name ────────────────────────────────────────────────── */}
        {step === 'name' ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-center text-3xl font-display">{name}</p>
            <button
              type="button"
              onClick={handleShuffleName}
              className="inline-flex items-center gap-2 rounded-full bg-crayon-orange text-white px-5 py-3 text-base font-bold min-h-[44px] hover:scale-105 active:scale-95 transition-transform"
            >
              <FontAwesomeIcon icon={faShuffle} />
              Try another
            </button>
            {!showNameEdit ? (
              <button
                type="button"
                onClick={() => setShowNameEdit(true)}
                className="text-xs text-neutral-500 underline inline-flex items-center gap-1"
              >
                <FontAwesomeIcon icon={faPen} />
                Type a custom name
              </button>
            ) : (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                autoFocus
                className="w-full rounded-2xl border-2 border-paper-cream-dark px-4 py-3 text-lg text-center"
                placeholder="Type a name"
                aria-label="Custom character name"
              />
            )}
          </div>
        ) : null}

        {/* ─── Voice ───────────────────────────────────────────────── */}
        {step === 'voice' ? (
          <div className="grid grid-cols-4 gap-3">
            {VOICE_TILES.map((v) => {
              const selected = voicePersona === v.key;
              return (
                <button
                  type="button"
                  key={v.key}
                  onClick={() =>
                    setVoicePersona((prev) => (prev === v.key ? null : v.key))
                  }
                  aria-pressed={selected}
                  aria-label={`${v.label} voice`}
                  title={VOICE_PERSONAS[v.key]?.description}
                  className={cn(
                    'aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all min-h-[88px]',
                    selected
                      ? 'border-crayon-orange bg-crayon-orange/10 scale-105'
                      : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                  )}
                >
                  <span className="text-3xl">{v.face}</span>
                  <span className="text-[10px] font-bold text-neutral-600">
                    {v.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* ─── Footer (nav + submit) ─────────────────────────────── */}
        {error ? (
          <p className="text-xs text-red-700 text-center mt-2" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-between gap-3 pt-4">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={pending}
              className="rounded-full px-5 py-3 text-sm border-2 border-paper-cream-dark min-h-[44px] disabled:opacity-50"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="rounded-full px-5 py-3 text-sm border-2 border-paper-cream-dark min-h-[44px]"
            >
              Cancel
            </button>
          )}

          {step === 'voice' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !canAdvance}
              className="rounded-full px-6 py-3 text-sm font-bold bg-black text-white min-h-[44px] disabled:opacity-50"
            >
              {pending ? 'Drawing…' : 'Make my friend'}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className="rounded-full px-6 py-3 text-sm font-bold bg-black text-white min-h-[44px] disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCharacterModal;
