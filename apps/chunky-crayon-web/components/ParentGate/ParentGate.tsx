'use client';

/**
 * Reusable parent-gate component.
 *
 * Shows a simple two-digit subtraction question. On a correct answer it
 * calls `issueParentGateToken(scope)` and hands the resulting token to the
 * parent component via `onPass`. On three wrong answers it locks the
 * component for 60s (timestamp in localStorage, scoped per gate scope).
 *
 * Lockout is intentionally client-side: the real server-side guard is the
 * HMAC verification inside the gated action (verifyParentGateToken). The
 * gate's job is friction, not auth — making it impossible to brute-force
 * is the HMAC's job.
 *
 * Audience-aware copy:
 *   - "Grown-up check" (not "Parent check") — matches the playful CC tone
 *     and stays inclusive of carers, grandparents, etc.
 *   - Numeric keypad on mobile via inputMode="numeric".
 *   - Chunky pill submit, ≥ 44pt tap target.
 *
 * Tracking: emits CHARACTER_PARENT_GATE_SHOWN on first render and
 * CHARACTER_PARENT_GATE_PASSED / _FAILED based on outcome.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';
import {
  issueParentGateToken,
  type ParentGateScope,
} from '@/app/actions/parent-gate';

type Props = {
  scope: ParentGateScope;
  /** Called with the freshly minted token on pass. */
  onPass: (token: string) => void;
  /** Optional: close the gate without passing (e.g. modal cancel). */
  onCancel?: () => void;
};

const LOCKOUT_MS = 60 * 1000;
const MAX_WRONG = 3;

const lockoutKey = (scope: ParentGateScope) => `parent-gate:lockout:${scope}`;

const isLocked = (scope: ParentGateScope): number => {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(lockoutKey(scope));
  if (!raw) return 0;
  const until = Number(raw);
  if (!Number.isFinite(until)) return 0;
  const remaining = until - Date.now();
  return remaining > 0 ? remaining : 0;
};

const setLocked = (scope: ParentGateScope) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    lockoutKey(scope),
    String(Date.now() + LOCKOUT_MS),
  );
};

const clearLock = (scope: ParentGateScope) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(lockoutKey(scope));
};

// Pick two single-digit operands such that a-b is a clean positive value
// matched to 7-9 year old subtraction skill (kid won't be tempted to
// solve). 13-9, 17-8, 22-6 etc. Avoid trivials like 5-2.
const buildQuestion = (): { a: number; b: number; answer: number } => {
  // a ∈ [13, 25], b ∈ [4, 9], answer always positive 4-21.
  const a = 13 + Math.floor(Math.random() * 13);
  const b = 4 + Math.floor(Math.random() * 6);
  return { a, b, answer: a - b };
};

const ParentGate = ({ scope, onPass, onCancel }: Props) => {
  const [question, setQuestion] = useState(buildQuestion);
  const [input, setInput] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lockMsLeft, setLockMsLeft] = useState(() => isLocked(scope));
  const [pending, startTransition] = useTransition();
  const trackedShownRef = useRef(false);

  // PostHog: fire SHOWN once when the gate first mounts (not on lockout
  // changes). Property only carries scope — never the user's name etc.
  useEffect(() => {
    if (trackedShownRef.current) return;
    trackedShownRef.current = true;
    trackEvent(TRACKING_EVENTS.CHARACTER_PARENT_GATE_SHOWN, { scope });
  }, [scope]);

  // Tick down the lockout timer (re-render every 500ms so the seconds-left
  // copy stays fresh without burning CPU).
  useEffect(() => {
    if (lockMsLeft <= 0) return;
    const id = window.setInterval(() => {
      const remaining = isLocked(scope);
      setLockMsLeft(remaining);
      if (remaining <= 0) {
        clearLock(scope);
        setWrongCount(0);
        setError(null);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [lockMsLeft, scope]);

  const locked = lockMsLeft > 0;
  const secondsLeft = useMemo(() => Math.ceil(lockMsLeft / 1000), [lockMsLeft]);

  const handleSubmit = useCallback(() => {
    if (locked || pending) return;

    const submitted = Number(input.trim());
    if (!Number.isFinite(submitted)) {
      setError('Please enter a number.');
      return;
    }

    if (submitted !== question.answer) {
      const nextWrong = wrongCount + 1;
      setWrongCount(nextWrong);
      setError("That's not quite right. Try again.");
      setInput('');

      if (nextWrong >= MAX_WRONG) {
        setLocked(scope);
        setLockMsLeft(LOCKOUT_MS);
        trackEvent(TRACKING_EVENTS.CHARACTER_PARENT_GATE_FAILED, {
          scope,
          attempts: nextWrong,
        });
      }
      // Refresh question so they can't keep typing the same wrong number
      setQuestion(buildQuestion());
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await issueParentGateToken(scope);
      if (result.ok) {
        clearLock(scope);
        trackEvent(TRACKING_EVENTS.CHARACTER_PARENT_GATE_PASSED, { scope });
        onPass(result.token);
      } else {
        setError("We couldn't verify you right now. Please try again.");
      }
    });
  }, [input, locked, onPass, pending, question.answer, scope, wrongCount]);

  return (
    <div className="rounded-3xl border-2 border-paper-cream-dark bg-white shadow-card p-6 max-w-md w-full">
      <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
        Grown-up check
      </p>
      <h2 className="text-2xl font-bold mb-4">
        What is {question.a} minus {question.b}?
      </h2>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoFocus
        disabled={locked || pending}
        value={input}
        onChange={(e) => {
          // Strip everything but digits — kid-finger-friendly + keeps the
          // submitted number sensible without an extra validation pass.
          setInput(e.target.value.replace(/\D+/g, '').slice(0, 3));
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
        className="w-full rounded-2xl border-2 border-paper-cream-dark px-4 py-3 text-xl font-bold text-center mb-4 disabled:opacity-50"
        placeholder="Type the answer"
        aria-label="Your answer"
      />

      {error ? (
        <p className="text-xs text-red-700 mb-3" role="alert">
          {error}
        </p>
      ) : null}

      {locked ? (
        <p className="text-xs text-neutral-600 mb-3">
          Take a breath and try again in {secondsLeft}s.
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={locked || pending || input.length === 0}
          className="flex-1 rounded-2xl bg-black text-white px-5 py-3 text-base font-bold min-h-[44px] disabled:opacity-50"
        >
          {pending ? 'Checking…' : 'Submit'}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border-2 border-paper-cream-dark px-5 py-3 text-base min-h-[44px]"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ParentGate;
