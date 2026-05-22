'use client';

/**
 * Kid-driven Create Character flow — five tap-driven steps, brought up
 * to Scene Builder quality:
 *
 *   1. Species  — illustration tiles in a carousel (TileCarousel).
 *   2. Colour   — 6 chunky brand-palette swatches.
 *   3. Traits   — illustration tiles, multi-select up to 3.
 *   4. Name     — a "HELLO my name is" sticker name-tag; shuffle to
 *                 re-roll, parent-only pencil for a custom name.
 *   5. Voice    — illustration tiles (optional).
 *
 * The picker steps reuse `SceneTile` / `TileCarousel` from coloring-ui
 * so the Character Builder reads as the same family as the Scene
 * Builder — illustration tiles, calm select state, carousel. The
 * catalogue (`lib/characters/picker-catalog.ts`) carries a
 * `thumbnailKey` per option; SceneTile resolves it to a URL and falls
 * back to the FA `icon` while a key is null.
 *
 * Framer Motion: steps slide/fade between, the name-tag springs in on
 * generate, a confetti beat fires on a successful create. All gated by
 * `useReducedMotion`.
 *
 * No textarea anywhere. No free-text required to finish. On submit we
 * send structured picks to `createCharacter`; the server builds the
 * shortPrompt deterministically.
 *
 * Why no parent gate: creation is functionally the same as making a
 * coloring page — the signed-in cookie IS the trust line. Parent gates
 * stay on custom voice (1 credit) + delete.
 *
 * No em dashes. No "AI" word. US/UK-neutral. Tap targets >= 44pt.
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShuffle,
  faPen,
  faArrowRight,
  faArrowLeft,
  faXmark,
} from '@fortawesome/pro-duotone-svg-icons';
import { TileCarousel, type SceneLayer } from '@one-colored-pixel/coloring-ui';
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
  VOICE_TILES,
  type ColorKey,
  type SpeciesKey,
  type TraitKey,
} from '@/lib/characters/picker-catalog';
import { generateCharacterName } from '@/lib/characters/name-generator';
import { VOICE_PERSONAS } from '@/lib/characters/voice-personas';
import type { VoicePersonaKey } from '@/lib/characters/voice-persona-types';
import { resolveThumbnailUrl } from '@/lib/scene/thumbnail-url';
import Confetti from '@/components/Confetti/Confetti';
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
 * Map a catalogue option ({ key, label, icon, duotone, thumbnailKey })
 * to the SceneTile contract ({ ..., thumbnailUrl }). The catalogue
 * stores env-agnostic R2 keys; resolveThumbnailUrl builds the public
 * URL at render time. SceneTile falls back to the FA icon when the
 * resolved URL is null.
 */
const toTile = (o: {
  key: string;
  label: string;
  icon: SceneLayer['options'][number]['icon'];
  duotone: SceneLayer['options'][number]['duotone'];
  thumbnailKey: string | null;
}) => ({
  key: o.key,
  label: o.label,
  icon: o.icon,
  duotone: o.duotone,
  thumbnailUrl: resolveThumbnailUrl(o.thumbnailKey),
});

const CreateCharacterModal = ({ open, onClose }: Props) => {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
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
  const [celebrating, setCelebrating] = useState(false);
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
    setCelebrating(false);
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

  // ── Step layers (SceneLayer-shaped, for TileCarousel) ───────────────
  const speciesLayer: SceneLayer = useMemo(
    () => ({
      id: 'species',
      title: STEP_TITLES.species,
      kind: 'single',
      options: SPECIES_OPTIONS.map(toTile),
    }),
    [],
  );
  const traitsLayer: SceneLayer = useMemo(
    () => ({
      id: 'traits',
      title: STEP_TITLES.traits,
      kind: 'multi',
      maxSelections: MAX_TRAITS,
      options: TRAIT_OPTIONS.map(toTile),
    }),
    [],
  );
  const voiceLayer: SceneLayer = useMemo(
    () => ({
      id: 'voice',
      title: STEP_TITLES.voice,
      kind: 'single',
      options: VOICE_TILES.map(toTile),
    }),
    [],
  );

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
        // A short celebratory beat before we close + refresh — the
        // payoff moment of the whole flow. Confetti self-completes;
        // its onComplete closes the modal. Skipped under reduce-motion.
        if (reduceMotion) {
          handleOpenChange(false);
          router.refresh();
        } else {
          setCelebrating(true);
        }
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

  // Step-transition motion. A gentle horizontal slide + fade so the
  // wizard has momentum; suppressed under reduce-motion.
  const stepMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
        transition: { duration: 0.22, ease: 'easeOut' as const },
      };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        // Hide the default × — we render our own chunky red-circle close.
        // The Dialog primitive is a CSS grid (`grid w-[calc(100%-2rem)]
        // max-w-lg`). A grid item defaults to `min-width:auto`, so the
        // wide TileCarousel track would refuse to shrink and blow the
        // dialog past max-w-lg. The fix is `min-w-0` on the carousel's
        // wrapper (below); `overflow-hidden` here is a belt-and-braces
        // clip so nothing can still spill horizontally.
        className="space-y-5 overflow-hidden p-6 md:p-8 [&>[type='button'].absolute]:hidden"
      >
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
          <DialogDescription className="sr-only">
            Step {stepIndex + 1} of {STEPS.length} in making your character.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar — fills left-to-right as steps complete. */}
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
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Animated step body. AnimatePresence swaps the active step
            with a slide+fade; `mode="wait"` so the outgoing step
            finishes before the incoming one starts. */}
        <AnimatePresence mode="wait">
          {/* `min-w-0` lets this shrink below the carousel's intrinsic
              content width (a flex/grid child defaults to min-content);
              `overflow-hidden` keeps the carousel's horizontal scroll
              INSIDE the dialog instead of widening it. */}
          <motion.div
            key={step}
            {...stepMotion}
            className="w-full min-w-0 overflow-hidden"
          >
            {/* ─── Species ───────────────────────────────────────── */}
            {step === 'species' ? (
              <TileCarousel
                layer={speciesLayer}
                selected={species ? [species] : []}
                locked={[]}
                disabled={pending}
                onToggle={(k) => setSpecies(k as SpeciesKey)}
              />
            ) : null}

            {/* ─── Colour ────────────────────────────────────────── */}
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

            {/* ─── Traits ────────────────────────────────────────── */}
            {step === 'traits' ? (
              <div className="space-y-3">
                <p className="text-center text-lg font-bold text-neutral-700">
                  Pick up to {MAX_TRAITS}
                </p>
                <TileCarousel
                  layer={traitsLayer}
                  selected={traits}
                  locked={[]}
                  disabled={pending}
                  onToggle={(k) => toggleTrait(k as TraitKey)}
                />
              </div>
            ) : null}

            {/* ─── Name ──────────────────────────────────────────── */}
            {step === 'name' ? (
              <div className="flex flex-col items-center gap-6 py-2">
                <NameTag name={name} reduceMotion={Boolean(reduceMotion)} />

                <button
                  type="button"
                  onClick={handleShuffleName}
                  className="inline-flex items-center gap-2 rounded-full bg-crayon-orange text-white px-6 py-3 text-lg font-bold min-h-[56px] hover:scale-105 active:scale-95 transition-transform shadow-card"
                >
                  <FontAwesomeIcon icon={faShuffle} />
                  Try another
                </button>

                {/* Custom-name escape hatch — parents recognise the
                    pencil; kids ignore it. */}
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

            {/* ─── Voice ─────────────────────────────────────────── */}
            {step === 'voice' ? (
              <div className="space-y-3">
                <TileCarousel
                  layer={voiceLayer}
                  selected={voicePersona ? [voicePersona] : []}
                  locked={[]}
                  disabled={pending}
                  onToggle={(k) =>
                    setVoicePersona((prev) =>
                      prev === k ? null : (k as VoicePersonaKey),
                    )
                  }
                />
                {/* Persona blurb for the selected voice — a small
                    parent-facing nicety now that per-tile tooltips
                    don't survive the shared TileCarousel. */}
                {voicePersona ? (
                  <p className="text-center text-sm text-text-secondary">
                    {VOICE_PERSONAS[voicePersona]?.description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* ─── Footer (nav + submit) ───────────────────────────────
            Errors surface via sonner toasts, not inline. Back appears
            from step 2 on; the final step swaps Next for the
            "Make my friend" CTA. */}
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

        {/* Final celebration — confetti beat on a successful create,
            then close + refresh. */}
        <Confetti
          isActive={celebrating}
          onComplete={() => {
            handleOpenChange(false);
            router.refresh();
          }}
          duration={1600}
        />
      </DialogContent>
    </Dialog>
  );
};

/**
 * The "HELLO my name is" sticker name-tag. The classic red-banner
 * badge: white body, red top strip, the name in big display type.
 * Springs in (scale + slight rotate settle) whenever `name` changes —
 * the re-key on `name` replays the animation on every shuffle.
 */
const NameTag = ({
  name,
  reduceMotion,
}: {
  name: string;
  reduceMotion: boolean;
}) => {
  const spring = reduceMotion
    ? {}
    : {
        initial: { scale: 0.7, rotate: -8, opacity: 0 },
        animate: { scale: 1, rotate: -2, opacity: 1 },
        transition: { type: 'spring' as const, stiffness: 320, damping: 16 },
      };
  return (
    <motion.div
      key={name}
      {...spring}
      className="w-full max-w-xs overflow-hidden rounded-2xl border-2 border-neutral-300 bg-white shadow-card"
    >
      {/* "Hello my name is" banner. The classic name-tag is red; the CC
          palette has no red token, so we use crayon-pink — the warmest
          brand colour, reads as the classic badge without a magic
          literal and stays distinct from the orange shuffle button. */}
      <div className="bg-crayon-pink py-2 text-center">
        <p className="font-display text-sm uppercase tracking-[0.2em] text-white">
          Hello my name is
        </p>
      </div>
      {/* Name body */}
      <div className="px-6 py-8">
        <p className="break-words text-center font-display text-4xl leading-none text-neutral-800 md:text-5xl">
          {name}
        </p>
      </div>
    </motion.div>
  );
};

export default CreateCharacterModal;
