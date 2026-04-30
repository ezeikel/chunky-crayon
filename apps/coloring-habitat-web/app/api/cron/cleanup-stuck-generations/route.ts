import { NextRequest, NextResponse, connection } from "next/server";
import { db, CreditTransactionType } from "@one-colored-pixel/db";

export const maxDuration = 60;

const STALE_THRESHOLD_MIN = 15;

/**
 * Stale-row sweeper — see CC version for full design rationale at
 * `apps/chunky-crayon-web/app/api/cron/cleanup-stuck-generations/route.ts`.
 */
export async function GET(request: NextRequest) {
  await connection();

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MIN * 60 * 1000);

  const stuck = await db.coloringImage.findMany({
    where: {
      status: "GENERATING",
      createdAt: { lt: cutoff },
    },
    select: { id: true, userId: true },
  });

  if (stuck.length === 0) {
    return NextResponse.json({ ok: true, swept: 0 });
  }

  const COST_BY_PURPOSE: Record<string, number> = {
    voice: 10,
  };
  const DEFAULT_COST = 5;

  let refunded = 0;
  for (const row of stuck) {
    try {
      const result = await db.coloringImage.updateMany({
        where: { id: row.id, status: "GENERATING" },
        data: {
          status: "FAILED",
          failureReason: `swept by cleanup-stuck-generations after ${STALE_THRESHOLD_MIN}min`,
        },
      });
      if (result.count === 0) continue;

      if (row.userId) {
        const meta = await db.coloringImage.findUnique({
          where: { id: row.id },
          select: { purposeKey: true },
        });
        const cost = COST_BY_PURPOSE[meta?.purposeKey ?? ""] ?? DEFAULT_COST;
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
