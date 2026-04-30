import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Cache invalidation hook for the worker. The streaming pipeline writes
 * the final svgUrl/url/etc. directly to Postgres from the worker — Vercel
 * never sees the write, so its `'use cache'` snapshot for this id stays
 * frozen at the GENERATING-time row (svgUrl=null, etc).
 *
 * After persist, the worker POSTs here to revalidate the
 * `coloring-image-{id}` tag plus the gallery list. Next request to the
 * page reads the fresh row.
 *
 * Auth: Bearer WORKER_SECRET. Worker is the only caller; no user context.
 */
export const POST = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = _req.headers.get('authorization');
  const expected = process.env.WORKER_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  revalidateTag(`coloring-image-${id}`, { expire: 0 });
  revalidateTag('all-coloring-images', { expire: 0 });
  revalidateTag('coloring-images-paginated', { expire: 0 });
  revalidateTag('coloring-images-by-ids', { expire: 0 });

  return NextResponse.json({ revalidated: true, id });
};
