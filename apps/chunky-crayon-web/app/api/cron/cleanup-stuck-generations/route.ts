import { NextRequest, NextResponse, connection } from 'next/server';
import { db, CreditTransactionType } from '@one-colored-pixel/db';

export const maxDuration = 60;

/**
 * Cleanup cron — sweeps up coloring_images rows stuck in GENERATING.
 *
 * Why this exists:
 *   - The Hetzner worker runs OpenAI streams in detached promises. If the
 *     worker process crashes mid-stream, the row stays GENERATING forever
 *     because nothing tells Postgres "that job died". User sees their
 *     credits drained but no image, and the row sits in their gallery
 *     filtered out by status (until we mark it FAILED here).
 *   - Generation typically takes 60-180s. 15 minutes is a wide enough
 *     window that no honest stream gets reaped, but tight enough that a
 *     stuck row gets recovered before the user gives up checking.
 *
 * Refunds credits and marks FAILED. Idempotent: subsequent runs find no
 * rows to clean. Schedule: every 5 min in vercel.json.
 *
 * Auth: CRON_SECRET bearer (matches existing cron pattern).
 */
const STALE_THRESHOLD_MIN = 15;

export async function GET(request: NextRequest) {
  await connection();

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MIN * 60 * 1000);

  // Find candidates first so we can iterate + refund per-row in a tx.
  // updateMany would atomically flip them but we need each row's userId
  // to refund. The candidate set is tiny (single-digit at peak) so the
  // double round-trip cost is negligible.
  const stuck = await db.coloringImage.findMany({
    where: {
      status: 'GENERATING',
      createdAt: { lt: cutoff },
    },
    select: { id: true, userId: true, createdAt: true },
  });

  if (stuck.length === 0) {
    return NextResponse.json({ ok: true, swept: 0 });
  }

  // Per-mode cost reverse-lookup. The action stamps `purposeKey='voice'`
  // for voice rows; everything else is text or photo at 5 credits. We
  // can't recover the original cost from the row alone if a future mode
  // diverges, but for today this is correct.
  const COST_BY_PURPOSE: Record<string, number> = {
    voice: 10,
  };
  const DEFAULT_COST = 5;

  let refunded = 0;
  for (const row of stuck) {
    try {
      // Atomic FAILED flip — the same `status: { not: 'FAILED' }` guard
      // we use in the worker, so a worker that came back to life and
      // also tried to mark FAILED concurrently doesn't cause a double
      // refund.
      const result = await db.coloringImage.updateMany({
        where: { id: row.id, status: 'GENERATING' },
        data: {
          status: 'FAILED',
          failureReason: `swept by cleanup-stuck-generations after ${STALE_THRESHOLD_MIN}min`,
        },
      });
      if (result.count === 0) continue; // raced — worker won

      if (row.userId) {
        // Look up purposeKey for the cost (we don't fetch it in the
        // candidate select to keep that query thin).
        const meta = await db.coloringImage.findUnique({
          where: { id: row.id },
          select: { purposeKey: true },
        });
        const cost = COST_BY_PURPOSE[meta?.purposeKey ?? ''] ?? DEFAULT_COST;
        await db.user.update({
          where: { id: row.userId },
          data: { credits: { increment: cost } },
        });
        await db.creditTransaction.create({
          data: {
            userId: row.userId,
            amount: cost,
            type: CreditTransactionType.GENERATION,
          },
        });
        refunded += 1;
      }
    } catch (err) {
      console.error(`[cleanup-stuck-generations] ${row.id} failed:`, err);
    }
  }

  console.log(
    `[cleanup-stuck-generations] swept ${stuck.length} rows, refunded ${refunded}`,
  );

  return NextResponse.json({
    ok: true,
    swept: stuck.length,
    refunded,
  });
}
