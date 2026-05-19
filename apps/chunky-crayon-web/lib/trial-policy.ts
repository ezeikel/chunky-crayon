// Pure trial-abuse policy. Extracted so the security/revenue-critical
// predicates are unit-testable in isolation (CLAUDE.md: revenue-critical
// pure logic ships with its test in the same commit).
//
// The loophole this closes: a 7-day trial grants the full plan credit
// allotment (up to 1000) up front. Without a cap, a trialing account can
// spend a year of credits on real gpt-image-2 API cost in 7 days, cancel,
// and pay nothing — repeatable per email. We keep the generous up-front
// grant but gate *spend* while the trial is unpaid, and reclaim the unspent
// remainder when a trial cancels/lapses without ever paying.

import { FREE_CREDITS } from '@/constants';

// Max credit-spending actions an UNPAID trial may perform before first
// successful payment. Counts ALL credit-debiting actions (AI image, voice,
// the 5-credit path) — see callers. Deliberately tight: cold paid-ad
// traffic to a kids product, every generation is real API spend.
export const TRIAL_GENERATION_CAP = 10;

type TrialStatusLike = {
  // DB SubscriptionStatus string. Only TRIALING is an unpaid trial; ACTIVE
  // means a payment succeeded and the cap no longer applies.
  status: string;
};

// True only while the subscription is an unpaid trial. ACTIVE (paid),
// CANCELLED, EXPIRED, no-subscription, etc. are NOT capped — one-off credit
// buyers and paying subscribers spend freely.
export const isUnpaidTrial = (
  sub: TrialStatusLike | null | undefined,
): boolean => sub?.status === 'TRIALING';

// Has an unpaid trial used up its spend allowance? `spendCount` is the
// number of credit-debiting actions since the trial period started.
export const isTrialSpendExhausted = (
  spendCount: number,
  cap: number = TRIAL_GENERATION_CAP,
): boolean => spendCount >= cap;

// What to SET user.credits to when a trial cancels or lapses without ever
// paying. Never raises a balance, never goes below 0, never below the free
// baseline a normal free user would have. If they already have <= the free
// baseline (e.g. spent most of it) we leave them untouched.
export const reclaimTarget = (
  currentCredits: number,
  freeBaseline: number = FREE_CREDITS,
): number => Math.max(0, Math.min(currentCredits, freeBaseline));

// Should the cancel/lapse webhook bother writing a clawback at all?
// (Skip the DB work + audit row when there's nothing to reclaim — also
// makes the handler idempotent on webhook re-delivery.)
export const shouldReclaim = (
  currentCredits: number,
  freeBaseline: number = FREE_CREDITS,
): boolean => currentCredits > freeBaseline;
