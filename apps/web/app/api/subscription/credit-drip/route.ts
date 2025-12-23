import { NextRequest, NextResponse } from 'next/server';
import { connection } from 'next/server';
import { db } from '@chunky-crayon/db';
import {
  SubscriptionStatus,
  BillingPeriod,
  CreditTransactionType,
} from '@chunky-crayon/db';
import { PLAN_CREDITS_MONTHLY, PLAN_ROLLOVER_CAPS } from '@/constants';

export const maxDuration = 120;

/**
 * Monthly credit drip for annual subscribers
 *
 * This cron job runs on the 1st of each month and adds monthly credits
 * to all active annual subscribers. Rollover caps are enforced based on plan tier.
 *
 * Schedule: "0 0 1 * *" (midnight on the 1st of each month)
 */
export const GET = async (request: NextRequest) => {
  await connection();

  try {
    // Basic auth check using CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all active annual subscriptions
    const activeAnnualSubscriptions = await db.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        billingPeriod: BillingPeriod.ANNUAL,
      },
      include: {
        user: true,
      },
    });

    console.log(
      `Processing ${activeAnnualSubscriptions.length} active annual subscriptions`,
    );

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        userId: string;
        planName: string;
        creditsAdded: number;
        newBalance: number;
        cappedAt?: number;
      }>,
    };

    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const subscription of activeAnnualSubscriptions) {
      try {
        const { user, planName } = subscription;

        // Get monthly credit amount for this plan
        const monthlyCredits = PLAN_CREDITS_MONTHLY[planName];
        const rolloverCap = PLAN_ROLLOVER_CAPS[planName];

        // Check if we've already processed this subscription this month (idempotency)
        const existingTransaction = await db.creditTransaction.findFirst({
          where: {
            userId: user.id,
            type: CreditTransactionType.PURCHASE,
            reference: `annual-drip:${subscription.stripeSubscriptionId}:${monthYear}`,
          },
        });

        if (existingTransaction) {
          console.log(
            `Skipping ${user.email} - already processed for ${monthYear}`,
          );
          results.skipped++;
          continue;
        }

        // Calculate new balance with rollover cap
        // For plans with rollover, cap the carryover credits before adding new ones
        let effectiveCurrentCredits = user.credits;
        let wasCapped = false;

        if (rolloverCap > 0) {
          // Cap carryover credits at the rollover limit
          effectiveCurrentCredits = Math.min(user.credits, rolloverCap);
          wasCapped = user.credits > rolloverCap;
        } else {
          // Crayon plan: no rollover - reset to 0 before adding new credits
          effectiveCurrentCredits = 0;
          wasCapped = user.credits > 0;
        }

        const newBalance = effectiveCurrentCredits + monthlyCredits;

        // Update user credits and create transaction
        await db.$transaction([
          db.creditTransaction.create({
            data: {
              userId: user.id,
              amount: monthlyCredits,
              type: CreditTransactionType.PURCHASE,
              reference: `annual-drip:${subscription.stripeSubscriptionId}:${monthYear}`,
            },
          }),
          db.user.update({
            where: { id: user.id },
            data: { credits: newBalance },
          }),
        ]);

        console.log(
          `Added ${monthlyCredits} credits to ${user.email} (${planName}). ` +
            `Previous: ${user.credits}, New: ${newBalance}${wasCapped ? ` (capped from ${user.credits})` : ''}`,
        );

        results.processed++;
        results.details.push({
          userId: user.id,
          planName,
          creditsAdded: monthlyCredits,
          newBalance,
          ...(wasCapped ? { cappedAt: rolloverCap || 0 } : {}),
        });
      } catch (error) {
        console.error(
          `Error processing subscription ${subscription.id}:`,
          error,
        );
        results.errors++;
      }
    }

    return NextResponse.json({
      status: 'success',
      service: 'chunky-crayon-credit-drip',
      month: monthYear,
      summary: {
        totalAnnualSubscriptions: activeAnnualSubscriptions.length,
        processed: results.processed,
        skipped: results.skipped,
        errors: results.errors,
      },
      details: results.details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in credit drip job:', error);
    return NextResponse.json(
      {
        status: 'error',
        service: 'chunky-crayon-credit-drip',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};
