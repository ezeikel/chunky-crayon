import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { reconcileSubscriptionStatuses } from '@/app/actions/stripe';

export const maxDuration = 120;

/**
 * Daily subscription reconcile cron.
 *
 * Stripe is the source of truth for subscription state; our
 * `subscriptions` table is a read-cache kept in sync by the
 * `customer.subscription.*` webhooks. A missed or out-of-order webhook
 * leaves a row stale (the bug that left a trial customer's row on
 * TRIALING while Stripe had moved them to past_due). This cron re-pulls
 * the live Stripe status for every non-terminal row and rewrites any
 * that disagree, so drift self-heals within a day instead of lingering.
 *
 * Thin wrapper per the house pattern: auth + call the action. All logic
 * lives in `reconcileSubscriptionStatuses`.
 *
 * Schedule: daily (see vercel.json). Daily is well clear of Neon's
 * suspend timeout, so it does not pin compute awake.
 */
export const GET = async (request: NextRequest) => {
  await connection();

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reconcileSubscriptionStatuses();

    console.log(
      `[reconcile] checked ${result.checked}, updated ${result.updated.length}, errors ${result.errors.length}`,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[reconcile] cron failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
};
