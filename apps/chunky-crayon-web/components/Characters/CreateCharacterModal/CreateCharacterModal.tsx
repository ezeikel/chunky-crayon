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
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShuffle,
  faPen,
  faArrowRight,
  faArrowLeft,
  faXmark,
  faFaceSmileBeam,
  faFaceGrinStars,
  faFaceSmile,
  faFaceLaughBeam,
  faFaceSleeping,
  faFaceAwesome,
  faFaceGrinTongue,
  faFaceSmileRelaxed,
} from '@fortawesome/pro-duotone-svg-icons';
import type { DuotoneStyle } from '@/lib/characters/picker-catalog';
import {
  Dialog,
  DialogClose,
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
 * Map a DuotoneStyle to the inline CSS vars that FontAwesome's
 * pro-duotone icons read. Same pattern as ParentalGateModal.
 * Secondary opacity defaults to 0.4 (FA default); raising slightly
 * to 0.8 makes both layers read on the kid-sized grid.
 */
const duotoneVars = (style: DuotoneStyle): React.CSSProperties =>
  ({
    '--fa-primary-color': style.primary,
    '--fa-secondary-color': style.secondary,
    '--fa-secondary-opacity': '0.8',
  }) as React.CSSProperties;

/**
 * Voice persona tiles. FA duotone face icons (no emojis — memory rule
 * `feedback_fontawesome_over_emojis.md`: emojis read as cheap, FA
 * duotone matches the brand).
 *
 * Visual treatment: yellow primary for every face. The earlier picker
 * steps (species, traits) carry the full rainbow; the voice step is
 * sequenced last and the kid is already invested. Keeping the row
 * tonally calm (yellow base + varied secondary tints) reads as a row
 * of happy little voices and avoids competing with the rainbows above.
 *
 * Decoupled from voice-personas.ts so that file stays server-safe
 * (env-var reads). The keys MUST stay aligned with VoicePersonaKey.
 */
const VOICE_TILES: {
  key: VoicePersonaKey;
  icon: typeof faFaceSmileBeam;
  label: string;
  duotone: DuotoneStyle;
}[] = [
  {
    key: 'warm-girl-7yo',
    icon: faFaceSmileBeam,
    label: 'Warm',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-orange))',
    },
  },
  {
    key: 'warm-boy-7yo',
    icon: faFaceSmile,
    label: 'Cosy',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
  {
    key: 'playful-girl-5yo',
    icon: faFaceGrinStars,
    label: 'Bouncy',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-pink))',
    },
  },
  {
    key: 'playful-boy-5yo',
    icon: faFaceGrinTongue,
    label: 'Playful',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-green))',
    },
  },
  {
    key: 'sleepy-neutral',
    icon: faFaceSleeping,
    label: 'Sleepy',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-purple))',
    },
  },
  {
    key: 'brave-neutral',
    icon: faFaceAwesome,
    label: 'Brave',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-orange))',
    },
  },
  {
    key: 'silly-neutral',
    icon: faFaceLaughBeam,
    label: 'Silly',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-green))',
    },
  },
  {
    key: 'gentle-neutral',
    icon: faFaceSmileRelaxed,
    label: 'Gentle',
    duotone: {
      primary: 'hsl(var(--crayon-yellow))',
      secondary: 'hsl(var(--crayon-teal))',
    },
  },
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
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
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
      toast.error('Please finish all the steps.');
      return;
    }
    if (!name.trim()) {
      toast.error('Give your friend a name.');
      return;
    }
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
        toast.error(
          friendly[result.error] ?? 'Something went wrong. Please try again.',
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        // Hide the default × close button rendered by the shared Dialog
        // primitive — we render our own chunky red-circle close below so
        // it's much harder to miss on a kid touchscreen. The default is
        // an `absolute right-4 top-4` button that lives as a direct child
        // of DialogContent, so we target it by position via the arbitrary
        // variant. Keeps the shared primitive untouched for other dialogs
        // (parent gate / share artwork / create profile / etc.) where
        // the small × is appropriate.
        className="max-w-lg space-y-5 p-6 md:p-8 [&>[type='button'].absolute]:hidden"
      >
        {/* Chunky kid-friendly close. Sits in the same top-right slot as
            the default × but with a red filled circle so it pops against
            the white dialog. DialogClose passes through Radix's dismiss
            behaviour. */}
        <DialogClose
          aria-label="Close"
          className="absolute right-3 top-3 z-10 w-10 h-10 rounded-full bg-crayon-orange text-white shadow-card flex items-center justify-center hover:scale-110 active:scale-95 transition-transform border-2 border-white"
        >
          <FontAwesomeIcon icon={faXmark} className="text-lg" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl text-center font-bold">
            {STEP_TITLES[step]}
          </DialogTitle>
          {/* Screen-reader description only — visually hidden via the
              Dialog primitive's default styling for DialogDescription. */}
          <DialogDescription className="sr-only">
            Step {stepIndex + 1} of {STEPS.length} in making your character.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar — fills left-to-right as the kid completes steps.
            Reads as 'how far along you are' rather than 'tappable dots'.
            stepIndex + 1 over STEPS.length means "you're on step N, so
            N/total is filled". */}
        <div
          className="h-2 rounded-full bg-paper-cream-dark/60 overflow-hidden"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
          aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}
        >
          <div
            className="h-full bg-crayon-orange transition-all duration-300 rounded-full"
            style={{
              width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
            }}
          />
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
                      ? 'border-crayon-orange border-4 bg-white scale-105 shadow-card'
                      : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                  )}
                >
                  <FontAwesomeIcon
                    icon={s.icon}
                    className="text-3xl"
                    style={duotoneVars(s.duotone)}
                  />
                  <span className="text-sm font-bold text-neutral-800">
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
                      ? 'border-crayon-orange border-4 scale-105 shadow-card'
                      : 'border-paper-cream-dark hover:border-crayon-orange',
                  )}
                >
                  <span
                    className={cn(
                      'w-12 h-12 rounded-full shadow-inner',
                      c.swatchClass,
                    )}
                  />
                  <span className="text-sm font-bold text-neutral-800">
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
            <p className="text-center text-lg font-bold text-neutral-700">
              Pick up to {MAX_TRAITS}
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
                      className="text-2xl"
                      style={duotoneVars(t.duotone)}
                    />
                    <span className="text-sm font-bold text-neutral-800">
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
          <div className="flex flex-col items-center gap-6 py-4">
            {/* The generated name is the hero — chunky display type so a
                kid can read it from across the table, with a soft pill
                background so it reads as a finished "this is your name". */}
            <div className="w-full rounded-3xl bg-paper-cream/60 border-2 border-paper-cream-dark px-6 py-8">
              <p className="text-center text-4xl md:text-5xl font-display leading-none break-words">
                {name}
              </p>
            </div>

            <button
              type="button"
              onClick={handleShuffleName}
              className="inline-flex items-center gap-2 rounded-full bg-crayon-orange text-white px-6 py-3 text-lg font-bold min-h-[56px] hover:scale-105 active:scale-95 transition-transform shadow-card"
            >
              <FontAwesomeIcon icon={faShuffle} />
              Try another
            </button>

            {/* Custom-name escape hatch — visual only icon button. Kids
                ignore it; parents who care recognise the pencil. No text
                because "type a custom name" was reading as a settings
                link and breaking the kid-driven flow. */}
            {!showNameEdit ? (
              <button
                type="button"
                onClick={() => setShowNameEdit(true)}
                aria-label="Type a custom name"
                title="Type a custom name"
                className="w-10 h-10 rounded-full border-2 border-paper-cream-dark text-neutral-500 hover:text-crayon-orange hover:border-crayon-orange flex items-center justify-center transition-colors"
              >
                <FontAwesomeIcon icon={faPen} className="text-sm" />
              </button>
            ) : (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                autoFocus
                className="w-full rounded-2xl border-2 border-paper-cream-dark px-4 py-3 text-2xl font-display text-center"
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
                      ? 'border-crayon-orange border-4 bg-white scale-105 shadow-card'
                      : 'border-paper-cream-dark bg-white hover:border-crayon-orange',
                  )}
                >
                  <FontAwesomeIcon
                    icon={v.icon}
                    className="text-3xl"
                    style={duotoneVars(v.duotone)}
                  />
                  <span className="text-sm font-bold text-neutral-800">
                    {v.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* ─── Footer (nav + submit) ─────────────────────────────── */}
        {/* Errors are surfaced via sonner toasts (app-wide pattern), not
            inline within the modal — toasts overlay above the dialog,
            auto-dismiss, and don't disturb the picker rhythm. */}

        {/* Footer: arrow nav. The Dialog's own × handles dismiss, so no
            Cancel button. Back is only present from step 2 onward; on
            step 1 we leave the slot empty so Next stays right-aligned.
            The final step replaces Next-arrow with the "Make my friend"
            CTA — a chunky pill, kid reads the words but the arrow icon
            tells the rest. */}
        <div className="flex justify-between items-center gap-3 pt-4 min-h-[56px]">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={pending}
              aria-label="Back"
              className="rounded-full w-14 h-14 flex items-center justify-center border-2 border-paper-cream-dark text-neutral-700 hover:border-crayon-orange hover:text-crayon-orange disabled:opacity-50 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
            </button>
          ) : (
            // Empty spacer so Next stays right-aligned on step 1.
            <span aria-hidden className="w-14 h-14" />
          )}

          {step === 'voice' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !canAdvance}
              className="inline-flex items-center gap-2 rounded-full bg-crayon-orange text-white px-6 py-3 text-base font-bold min-h-[56px] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-transform"
            >
              {pending ? 'Drawing…' : 'Make my friend'}
              {!pending ? (
                <FontAwesomeIcon icon={faArrowRight} className="text-lg" />
              ) : null}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              aria-label="Next"
              className="rounded-full w-14 h-14 flex items-center justify-center bg-crayon-orange text-white hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-transform"
            >
              <FontAwesomeIcon icon={faArrowRight} className="text-xl" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCharacterModal;
