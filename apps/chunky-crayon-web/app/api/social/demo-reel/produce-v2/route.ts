/**
 * Demo-reel produce V2 — generates the source coloring image via internal
 * server actions instead of driving prod.chunkycrayon.com via Playwright,
 * then hands the resulting `coloringImageId` to the worker for rendering.
 *
 * Replaces the legacy `/api/social/demo-reel/produce` route. Kept side-by-side
 * for the cutover window (Phase 6 in `~/.claude/plans/demo-reels-v2.md`).
 *
 * Flow:
 *   1. Cron auth check (Bearer CRON_SECRET).
 *   2. Pick variant from `?variant=text|image|voice`. Voice is stubbed —
 *      logs a warning and returns 200 ok:false until Phase 7.
 *   3. text  → call `generateDemoReelImageFromAIDescription` (same source
 *               as daily images, tagged SYSTEM + purposeKey 'demo-reel').
 *      image → pick a kid-safe row from `photo_library_entries`, call
 *               `generateDemoReelImageFromPhotoUrl`, bump `lastUsed`.
 *   4. POST to worker `/publish/v2` with `{ coloringImageId, variant }`.
 *      Worker reads the row, renders via Remotion, writes `demoReelUrl`
 *      back. We don't await the full render (it can run 5-10min); a 45s
 *      ack window is enough to confirm the worker accepted the job.
 *
 * Why image generation runs here, not on the worker:
 *   The user-facing create flow, the daily cron, and the admin flow all
 *   use the same `generateColoringImageWithMetadata` / `generatePhoto*`
 *   pipeline. Keeping the demo-reel cron on that pipeline means one
 *   codepath for AI keys, observability, R2 uploads, content safety,
 *   prompt cache. Worker has no AI keys / R2 creds — we'd be duplicating
 *   them just to centralise "all reel concerns." Worker stays the rendering
 *   service; web stays the generation service.
 *
 * Env:
 *   CHUNKY_CRAYON_WORKER_URL   e.g. http://157.90.168.197:3030
 *   WORKER_SECRET              shared bearer with worker
 *   CRON_SECRET                Vercel cron auth
 */
import { NextResponse, connection } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { generateDemoReelImageFromAIDescription } from '@/app/actions/coloring-image';
import { generateDemoReelImageFromPhotoUrl } from '@/app/actions/photo-to-coloring';

// Image generation is the long pole here (~30-90s end-to-end for the AI
// pipeline). 300s gives us slack and matches the daily-image generate route.
export const maxDuration = 300;

type Variant = 'text' | 'image' | 'voice';

const isVariant = (v: string): v is Variant =>
  v === 'text' || v === 'image' || v === 'voice';

const handleRequest = async (request: Request) => {
  await connection();

  const auth = request.headers.get('authorization');
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    return NextResponse.json(
      { error: 'CHUNKY_CRAYON_WORKER_URL not configured' },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const variantParam = url.searchParams.get('variant') ?? 'text';
  const variant: Variant = isVariant(variantParam) ? variantParam : 'text';

  console.log(`[demo-reel/produce-v2] variant=${variant}`);

  if (variant === 'voice') {
    // Voice mode redesign + reel comp tracked as Phase 7. Until then, the
    // rotation slot is a no-op. Returning 200 keeps the cron green.
    console.warn(
      '[demo-reel/produce-v2] voice variant not yet implemented — skipping',
    );
    return NextResponse.json({
      ok: false,
      variant,
      reason: 'voice variant not yet implemented (Phase 7)',
    });
  }

  let coloringImageId: string;
  let libraryEntryId: string | null = null;

  if (variant === 'text') {
    const result = await generateDemoReelImageFromAIDescription();
    if (!result?.id) {
      console.error('[demo-reel/produce-v2] text generation returned no id');
      return NextResponse.json(
        { error: 'text generation failed' },
        { status: 500 },
      );
    }
    coloringImageId = result.id;
  } else {
    // image variant — pick an unused-or-least-recent photo from the library.
    // Same query the worker used in V1 (apps/chunky-crayon-worker/src/index.ts:924).
    const rows = await db.$queryRaw<
      Array<{ id: string; url: string }>
    >`SELECT id, url
      FROM photo_library_entries
      WHERE brand = 'CHUNKY_CRAYON' AND safe = true
      ORDER BY "lastUsed" ASC NULLS FIRST, random()
      LIMIT 1`;

    if (rows.length === 0) {
      console.error(
        '[demo-reel/produce-v2] photo_library_entries empty — run scripts/seed-photo-library.ts',
      );
      return NextResponse.json(
        { error: 'photo_library_empty' },
        { status: 500 },
      );
    }

    libraryEntryId = rows[0].id;
    const photoUrl = rows[0].url;
    console.log(
      `[demo-reel/produce-v2] picked library entry ${libraryEntryId}: ${photoUrl}`,
    );

    const result = await generateDemoReelImageFromPhotoUrl(photoUrl);
    if (!result?.id) {
      console.error('[demo-reel/produce-v2] photo generation returned no id');
      return NextResponse.json(
        { error: 'photo generation failed' },
        { status: 500 },
      );
    }
    coloringImageId = result.id;

    // Bump lastUsed so this entry rotates to the back of the queue. V1 worker
    // did this at the very end of its render — moving it to the produce step
    // keeps rotation correct even if the worker render fails partway through.
    await db.$executeRaw`UPDATE photo_library_entries
      SET "lastUsed" = NOW()
      WHERE id = ${libraryEntryId}`;
  }

  console.log(
    `[demo-reel/produce-v2] generated coloringImageId=${coloringImageId}, kicking worker`,
  );

  // Fire-and-forget POST to worker. We give it ~45s to acknowledge the job
  // (worker queue + DB read should be near-instant) but don't wait for the
  // full render. Worker writes demoReelUrl back to the row; per-platform
  // post crons later in the day pick it up.
  try {
    await fetch(`${workerUrl}/publish/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      body: JSON.stringify({ coloringImageId, variant }),
      signal: AbortSignal.timeout(45_000),
    }).catch((err) => {
      console.log(
        '[demo-reel/produce-v2] worker fetch returned / timed out (expected for long renders):',
        err instanceof Error ? err.message : err,
      );
    });
  } catch (err) {
    console.error('[demo-reel/produce-v2] unexpected worker error:', err);
  }

  return NextResponse.json({
    ok: true,
    variant,
    coloringImageId,
    libraryEntryId,
    message: 'Worker triggered. It will write demoReelUrl when done.',
  });
};

export const GET = handleRequest;
export const POST = handleRequest;
