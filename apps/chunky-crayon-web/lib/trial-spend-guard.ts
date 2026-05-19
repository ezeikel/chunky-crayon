// Server-side enforcement of the unpaid-trial spend cap. Pure policy lives
// in ./trial-policy (unit-tested); this module is the DB-touching glue that
// every credit-debit site calls.
//
// Race safety: the spend count + the debit must be atomic. Two concurrent
// generations that both read "9 spent" would each pass a non-transactional
// check and both debit (10 -> 12). So callers MUST invoke
// `assertTrialSpendAllowed(tx, userId)` with the SAME Prisma transaction
// client (`tx`) that performs the decrement. The count and the debit then
// run in one serialized transaction; the loser of a race re-counts and is
// rejected, rolling back its decrement.

import type { Prisma } from '@one-colored-pixel/db';
import { isUnpaidTrial, isTrialSpendExhausted } from './trial-policy';

// Thrown when an unpaid trial has hit the cap. Callers catch this and turn
// it into their existing user-facing error shape (Sonner toast etc.).
export class TrialSpendCapError extends Error {
  constructor() {
    super('TRIAL_SPEND_CAP_REACHED');
    this.name = 'TrialSpendCapError';
  }
}

type TxClient = Prisma.TransactionClient;

// Call INSIDE the same $transaction as the credit decrement, BEFORE the
// decrement. Throws TrialSpendCapError if the user is on an unpaid trial
// and has reached the cap. No-op for paying/ACTIVE users, one-off credit
// buyers, and users with no subscription.
export const assertTrialSpendAllowed = async (
  tx: TxClient,
  userId: string,
): Promise<void> => {
  // Serialize all credit-affecting transactions for this user. Postgres
  // default isolation (read committed) would otherwise let two concurrent
  // generations both COUNT the same spend total before either commits its
  // negative row, slipping past the cap. Every debit site calls this guard
  // first inside its $transaction, so taking a row lock on the user here
  // makes those transactions queue per-user. It also closes the
  // pre-existing credit-balance overspend race for the trial path. The
  // lock is held until the surrounding $transaction commits/rolls back.
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;

  // Most recent subscription for the user. We only care whether the
  // current one is an unpaid trial; ACTIVE/CANCELLED/none => not capped.
  const sub = await tx.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { status: true, currentPeriodStart: true },
  });

  if (!isUnpaidTrial(sub)) return;

  // Count credit-spend rows since this trial period started. Spends are
  // recorded as negative-amount CreditTransaction rows (see the debit
  // sites). currentPeriodStart is when the trial began.
  const since = sub?.currentPeriodStart ?? new Date(0);
  const spendCount = await tx.creditTransaction.count({
    where: {
      userId,
      amount: { lt: 0 },
      createdAt: { gte: since },
    },
  });

  if (isTrialSpendExhausted(spendCount)) {
    throw new TrialSpendCapError();
  }
};
