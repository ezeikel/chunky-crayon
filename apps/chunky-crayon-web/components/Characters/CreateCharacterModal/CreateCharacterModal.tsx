'use client';

/**
 * Kid-driven Create Character flow — five tap-driven steps, brought up
 * to Scene Builder quality:
 *
 *   1. Species  — illustration tiles in a carousel (TileCarousel).
 *   2. Colour   — 6 chunky brand-palette swatches.
 *   3. Traits   — illustration tiles, multi-select up to 3.
 *   4. Name     — the chosen species illustration as the hero, with the
 *                 name as one always-editable field below it + a Redo
 *                 button. See <NameStep/>.
 *   5. Voice    — illustration tiles (optional).
 *
 * The picker steps reuse `SceneTile` / `TileCarousel` from coloring-ui
 * so the Character Builder reads as the same family as the Scene
 * Builder — illustration tiles, calm select state, carousel. The
 * catalogue (`lib/characters/picker-catalog.ts`) carries a
 * `thumbnailKey` per option; SceneTile resolves it to a URL and falls
 * back to the FA `icon` while a key is null.
 *
 * Framer Motion: steps crossfade between (no `mode="wait"` — see the
 * stepMotion comment), the name-step illustration springs in, a
 * confetti beat fires on a successful create. All gated by
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
import Image from 'next/image';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateRight,
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
  // True once the parent has manually edited the name field, so the
  // step-enter seed effect won't clobber their custom name.
  const [nameTouched, setNameTouched] = useState(false);
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

  // When we enter the name step (or species/traits change), seed a
  // generated name — unless the parent has already typed a custom one.
  useEffect(() => {
    if (step !== 'name' || !species || nameTouched) return;
    setName(generateCharacterName({ species, traits }));
    // nameTouched intentionally out of deps — flipping it shouldn't
    // re-seed. species/traits are the intentional triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, species, traits]);

  const reset = () => {
    setStep('species');
    setSpecies(null);
    setColor(null);
    setTraits([]);
    setName('');
    setNameTouched(false);
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
    // A shuffle is a fresh generated name — no longer "custom".
    setNameTouched(false);
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

  // The chosen species' illustration — the hero of the name step.
  const speciesIllustrationUrl = useMemo(() => {
    if (!species) return null;
    const opt = SPECIES_OPTIONS.find((s) => s.key === species);
    return opt ? resolveThumbnailUrl(opt.thumbnailKey) : null;
  }, [species]);

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

  // Step-transition motion — a quick crossfade. We deliberately do NOT
  // use AnimatePresence `mode="wait"`: that queues the exit before the
  // enter, and a fast double-tap through steps (kids will) can deadlock
  // the presence machine, leaving the body stuck a step behind the
  // title. A plain simultaneous crossfade can't deadlock and feels
  // snappier. Pure opacity (no x-slide) since two steps fading at once
  // would overlap messily if they also translated.
  const stepMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: 'easeOut' as const },
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

        {/* Animated step body. Crossfade (no `mode="wait"`): during the
            ~0.15s swap BOTH step nodes are in the DOM, so they're
            grid-stacked into the same cell (`grid` here +
            `col-start-1 row-start-1` on each child) — they overlap and
            crossfade instead of stacking vertically and jolting the
            dialog height. */}
        <div className="grid">
          <AnimatePresence>
            {/* `min-w-0` is the actual overflow fix: the dialog is a CSS
                grid and a grid child defaults to `min-width:auto`, so
                the wide TileCarousel track would refuse to shrink and
                blow the dialog past max-w-lg. `min-w-0` overrides that,
                and TileCarousel's own `overflow-x-auto` then scrolls
                the track internally. NO `overflow-hidden` here — the
                colour and name steps have selected tiles that scale +
                grow a border slightly past their cell, and clipping the
                wrapper would shave those edges off. */}
            <motion.div
              key={step}
              {...stepMotion}
              className="col-start-1 row-start-1 w-full min-w-0"
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

              {/* ─── Name ──────────────────────────────────────────────
                The chosen species illustration is the hero, in a soft
                card. The name sits directly below as ONE always-editable
                field — tap it and type, no pencil, no hidden edit mode.
                Shuffle is a peer pill. Pattern from Finch / KakaoTalk
                (Mobbin) — character + its name read as one unit. */}
              {step === 'name' ? (
                <NameStep
                  illustrationUrl={speciesIllustrationUrl}
                  name={name}
                  onNameChange={(v) => {
                    setName(v);
                    setNameTouched(true);
                  }}
                  onShuffle={handleShuffleName}
                  reduceMotion={Boolean(reduceMotion)}
                />
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
        </div>

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
 * Name step — the chosen species illustration as the hero, with the
 * name as one always-editable field directly below it.
 *
 * Replaces the earlier "HELLO my name is" sticker badge (a gimmick that
 * didn't earn its place) and the hidden pencil → text-input mode-switch.
 * Pattern lifted from Finch / KakaoTalk (Mobbin): the character and its
 * name read as a single unit, the name field is ALWAYS editable (tap
 * and type — no mode to discover), shuffle is a peer pill.
 *
 * The illustration card springs in when the species' image changes;
 * shuffle re-keys the field so the name's pop animation replays.
 */
const NameStep = ({
  illustrationUrl,
  name,
  onNameChange,
  onShuffle,
  reduceMotion,
}: {
  illustrationUrl: string | null;
  name: string;
  onNameChange: (next: string) => void;
  onShuffle: () => void;
  reduceMotion: boolean;
}) => {
  const cardSpring = reduceMotion
    ? {}
    : {
        initial: { scale: 0.85, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring' as const, stiffness: 300, damping: 18 },
      };
  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Character illustration — the hero. Soft cream card so the
          white-bg illustration has a frame. FA fallback would be odd
          here, so if the URL is missing we just show the cream card. */}
      <motion.div
        {...cardSpring}
        className="grid size-40 place-items-center rounded-3xl bg-paper-cream md:size-48"
      >
        {illustrationUrl ? (
          <Image
            src={illustrationUrl}
            alt=""
            width={176}
            height={176}
            className="size-32 object-contain md:size-40"
          />
        ) : null}
      </motion.div>

      {/* Always-editable name field. Looks like a friendly name label;
          tapping it just lets you type. No pencil, no hidden mode. */}
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value.slice(0, 24))}
        placeholder="Type a name"
        aria-label="Character name"
        className="w-full max-w-xs rounded-2xl border-2 border-paper-cream-dark bg-white px-4 py-3 text-center font-display text-3xl text-neutral-800 transition-colors focus:border-crayon-orange focus:outline-none md:text-4xl"
      />

      {/* "Redo" — a peer of the field, not a buried escape hatch. The
          circular-arrow icon carries the meaning ("do it again") for
          3-8yos who can't read the label yet; it's sized up so the
          icon, not the word, is what registers. */}
      <button
        type="button"
        onClick={onShuffle}
        aria-label="Redo the name"
        className="inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-crayon-orange px-6 py-3 text-lg font-bold text-white shadow-card transition-transform hover:scale-105 active:scale-95"
      >
        <FontAwesomeIcon icon={faArrowRotateRight} className="text-2xl" />
        Redo
      </button>
    </div>
  );
};

export default CreateCharacterModal;
