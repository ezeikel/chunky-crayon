import { NextRequest, NextResponse, connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';

export const maxDuration = 60;

/**
 * Recovery cron — sweeps content rows abandoned by the worker mid-pipeline.
 *
 * Why this exists:
 *   The Hetzner worker is killed by `systemctl stop` whenever a deploy
 *   lands (no graceful drain). Any in-flight comic-strip or demo-reel
 *   pipeline dies with it: the row stays in `GENERATING` for the comic
 *   strip, or `READY` with `demoReelUrl=null` for the demo-reel image.
 *   We've already shipped two Sunday content gaps to this exact race
 *   (2026-05-10 was the latest). Schedule generation overlaps with a
 *   parallel-session push window on `main`.
 *
 * What it does:
 *   1. Sweeps stuck comic-strip rows (>30min in GENERATING) → deletes
 *      them, re-fires the comic-strip cron once.
 *   2. Sweeps stuck demo-reel image rows (purposeKey='demo-reel', no
 *      demoReelUrl, >30min old) → deletes them, re-fires the demo-reel
 *      produce-v2 cron once.
 *
 * Idempotency:
 *   The schedule = hourly. If a re-fired pipeline is ALSO killed by a
 *   second deploy, the next sweep finds it stuck and re-fires again.
 *   Worst case: a couple of hours of catch-up after a noisy push window,
 *   but the day's content lands eventually.
 *
 * 30 min threshold:
 *   Comic strip pipeline = ~12-14 min end-to-end (script jury + 4 panels
 *   with 3-judge vision + whole-strip jury). Demo reel = ~5-10 min. 30 min
 *   gives both wide headroom; anything past that is dead.
 *
 * Auth: CRON_SECRET bearer.
 *
 * Schedule: every hour (vercel.json) — generation slots are 05:00 UTC, so
 * a 06:00, 07:00, 08:00 sweep covers the entire morning push window.
 */
const STALE_THRESHOLD_MIN = 30;

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

async function refireCron(
  path: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET not set');
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secret}` },
    redirect: 'follow',
    signal: AbortSignal.timeout(45_000),
  });
  const body = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
}

export async function GET(request: NextRequest) {
  await connection();

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MIN * 60 * 1000);

  // 1. Comic strips stuck in GENERATING
  const stuckStrips = await db.comicStrip.findMany({
    where: { brand: BRAND, status: 'GENERATING', createdAt: { lt: cutoff } },
    select: { id: true, slug: true, createdAt: true },
  });

  let stripsRefired = false;
  if (stuckStrips.length > 0) {
    const result = await db.comicStrip.deleteMany({
      where: { id: { in: stuckStrips.map((s) => s.id) } },
    });
    console.log(
      `[recover-stuck-content] deleted ${result.count} stuck comic strips: ${stuckStrips.map((s) => s.slug).join(', ')}`,
    );
    try {
      const r = await refireCron('/api/cron/comic-strip');
      console.log(
        `[recover-stuck-content] re-fired comic-strip cron: ${r.status} ${r.body}`,
      );
      stripsRefired = r.ok;
    } catch (err) {
      console.error(
        '[recover-stuck-content] failed to re-fire comic-strip cron:',
        err,
      );
    }
  }

  // 2. Demo-reel images abandoned mid-render (no demoReelUrl after threshold)
  const stuckReels = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      generationType: 'SYSTEM',
      purposeKey: 'demo-reel',
      demoReelUrl: null,
      createdAt: { lt: cutoff },
    },
    select: { id: true, title: true, createdAt: true },
  });

  let reelsRefired = false;
  if (stuckReels.length > 0) {
    const result = await db.coloringImage.deleteMany({
      where: { id: { in: stuckReels.map((r) => r.id) } },
    });
    console.log(
      `[recover-stuck-content] deleted ${result.count} stuck demo-reel images: ${stuckReels.map((r) => r.title).join(', ')}`,
    );
    try {
      const r = await refireCron('/api/social/demo-reel/produce-v2');
      console.log(
        `[recover-stuck-content] re-fired demo-reel produce-v2: ${r.status} ${r.body}`,
      );
      reelsRefired = r.ok;
    } catch (err) {
      console.error(
        '[recover-stuck-content] failed to re-fire demo-reel cron:',
        err,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    stuckComicStrips: stuckStrips.length,
    comicStripRefired: stripsRefired,
    stuckDemoReelImages: stuckReels.length,
    demoReelRefired: reelsRefired,
  });
}
