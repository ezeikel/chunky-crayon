'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandWave } from '@fortawesome/pro-duotone-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import cn from '@/utils/cn';

/**
 * ParentalGate — the "quick check" modal.
 *
 * Replaces the previous 7×8 multiplication challenge (Year-4 maths), which
 * adults failed ~95% of the time under any kind of pressure. New design is
 * a single primary-school sum (`a + b = ?`) with three big tap-able number
 * buttons. Adults pass in <2 seconds; a 3-8yo who can't yet add reliably
 * fails. Apple guideline 1.3 only requires a meaningful adult action — it
 * does NOT require Year-4 multiplication, and per-research the simpler
 * gate matches what Sago Mini / Toca Boca / PBS Kids actually ship.
 *
 * Aesthetic match: chunky circular brand-orange answer buttons (same
 * vocabulary as the wizard's Dice / Next / Create buttons), big friendly
 * title, no scary lock icon — a waving hand instead. The point is to
 * read as "oh hi grown-up", not "you are blocked".
 *
 * Wrong-answer behaviour: shake + reshuffle the three number positions
 * (defeats "always tap the middle one"). Same problem stays. Three
 * wrongs in a row → silent close (no scary "you failed" message; kid
 * gives up, parent re-triggers).
 *
 * Persistence is owned by the CALLER via onSuccess (see ParentalGateContext).
 * The gate itself only verifies the parent is in the room; it doesn't know
 * what action the success unlocks.
 */

type Problem = {
  a: number;
  b: number;
  answer: number;
};

// Primary-school sums kept deliberately easy. Mix of orderings so it
// doesn't feel rote.
const PROBLEMS: Problem[] = [
  { a: 2, b: 1, answer: 3 },
  { a: 1, b: 3, answer: 4 },
  { a: 3, b: 2, answer: 5 },
  { a: 4, b: 2, answer: 6 },
  { a: 2, b: 5, answer: 7 },
  { a: 3, b: 4, answer: 7 },
  { a: 5, b: 1, answer: 6 },
  { a: 1, b: 4, answer: 5 },
];

const pickRandomProblem = (): Problem =>
  PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)];

/**
 * Build a 3-button answer set: the correct answer plus two distractors
 * that are close enough to feel plausible (correct ± 1, never negative,
 * never the same as correct).
 *
 * Caller decides whether to shuffle. Initial-state callers (useState
 * defaults that may run during SSR / prerender) MUST pass `false` —
 * Math.random in a client component during prerender is a hard error
 * in Next 16's Cache Components. Client effects can safely shuffle
 * after mount.
 */
const buildAnswerChoices = (
  correct: number,
  shouldShuffle: boolean,
): number[] => {
  const candidates = new Set<number>([correct]);
  let bump = 1;
  while (candidates.size < 3) {
    if (correct - bump > 0) candidates.add(correct - bump);
    if (candidates.size < 3) candidates.add(correct + bump);
    bump += 1;
  }
  const arr = [...candidates];
  return shouldShuffle ? shuffle(arr) : arr;
};

const shuffle = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const MAX_WRONG_ATTEMPTS = 3;

type ParentalGateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Where to navigate on success. Empty string when `onSuccess` is set
   * (callback mode — see `openGate({ onSuccess })` overload). Both forms
   * never coexist: one or the other is the success action.
   */
  targetPath: string;
  /** Callback to fire on success instead of navigating. */
  onSuccess?: () => void;
};

// Default problem used during SSR so render is deterministic; the real
// problem is rolled client-side when `open` flips true.
const DEFAULT_PROBLEM = PROBLEMS[0];

const ParentalGateModal = ({
  open,
  onOpenChange,
  targetPath,
  onSuccess,
}: ParentalGateModalProps) => {
  const t = useTranslations('parentalGate');
  const router = useRouter();
  const [problem, setProblem] = useState<Problem>(DEFAULT_PROBLEM);
  // Initial choices MUST be deterministic — Math.random during SSR/
  // prerender is a hard error in Next 16 Cache Components. We shuffle
  // (and roll a fresh problem) in the open-effect below, post-mount.
  const [choices, setChoices] = useState<number[]>(() =>
    buildAnswerChoices(DEFAULT_PROBLEM.answer, false),
  );
  const [wrongCount, setWrongCount] = useState(0);
  const [shake, setShake] = useState(false);

  // Roll a fresh problem each time the modal opens (client-only — keeps
  // SSR deterministic and avoids hydration mismatch).
  useEffect(() => {
    if (!open) return;
    const next = pickRandomProblem();
    setProblem(next);
    setChoices(buildAnswerChoices(next.answer, true));
    setWrongCount(0);
    setShake(false);
  }, [open]);

  const handleCorrect = useCallback(() => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    } else if (
      targetPath.startsWith('mailto:') ||
      targetPath.startsWith('http://') ||
      targetPath.startsWith('https://')
    ) {
      window.open(targetPath, '_blank', 'noopener,noreferrer');
    } else if (targetPath) {
      router.push(targetPath);
    }
  }, [onOpenChange, onSuccess, router, targetPath]);

  const handleWrong = useCallback(() => {
    const next = wrongCount + 1;
    setWrongCount(next);
    setShake(true);
    // Reshuffle positions so "always tap the middle one" doesn't work.
    setChoices((prev) => shuffle(prev));
    window.setTimeout(() => setShake(false), 400);

    if (next >= MAX_WRONG_ATTEMPTS) {
      // Silent close. No "you failed" copy — a kid just gives up and the
      // parent re-triggers if they actually meant to pass.
      window.setTimeout(() => onOpenChange(false), 500);
    }
  }, [onOpenChange, wrongCount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('gap-6 rounded-3xl p-6 sm:p-8', shake && 'animate-shake')}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center gap-3 text-center">
          {/* Friendly waving hand — replaces the lock-in-a-circle. The
              previous header read as "you are blocked"; this reads as
              "oh hi grown-up". FA duotone (not emoji — per the
              codebase's no-emojis-in-UI rule) animated via the global
              `wave` keyframe with origin-bottom-right so it pivots from
              the wrist like a real wave. */}
          <FontAwesomeIcon
            icon={faHandWave}
            aria-hidden="true"
            className="text-5xl animate-wave [transform-origin:bottom_right]"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
          <DialogTitle className="font-tondo text-2xl font-bold md:text-3xl">
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-base text-text-secondary">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        {/* The sum. Soft cream pill matches the wizard's tile styling. */}
        <div
          className="flex items-center justify-center rounded-2xl bg-paper-cream px-6 py-5"
          aria-live="polite"
        >
          <span className="font-tondo text-4xl font-bold text-text-primary sm:text-5xl">
            {problem.a} + {problem.b} = ?
          </span>
        </div>

        {/* Three chunky circular answer buttons. Same vocabulary as the
            wizard's Dice / Next / Create — brand-orange fill, no border,
            no halo, soft shadow on press. */}
        <div
          className="flex items-center justify-center gap-4 sm:gap-6"
          role="group"
          aria-label={t('subtitle')}
        >
          {choices.map((n) => (
            <button
              // Position is part of the key so reshuffling triggers a
              // remount + the zoom-in animation reads as fresh options.
              key={`${n}-${choices.indexOf(n)}`}
              type="button"
              onClick={() =>
                n === problem.answer ? handleCorrect() : handleWrong()
              }
              className={cn(
                'grid size-16 place-items-center rounded-full sm:size-20',
                'bg-coloring-accent text-white',
                'font-tondo text-2xl font-bold sm:text-3xl',
                'transition-transform duration-coloring-base',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-coloring-accent',
                'hover:brightness-105 active:scale-95',
              )}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Helper text — sets the expectation that this unlock is a
            one-way switch with an obvious override. Big enough to read
            (was text-xs, looked like a legal disclaimer); warm enough
            to feel like reassurance, not a footnote.
            No bottom Cancel button — Dialog renders an X top-right
            already; two dismiss affordances was clutter. */}
        <p className="text-center text-sm font-medium text-text-secondary">
          {t('settingsHint')}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ParentalGateModal;
