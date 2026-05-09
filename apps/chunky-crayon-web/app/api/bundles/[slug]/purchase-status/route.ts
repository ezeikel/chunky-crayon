import { NextResponse } from 'next/server';
import { db } from '@one-colored-pixel/db';

/**
 * Tiny readiness probe used by the thank-you page's client-side poller
 * while it waits for the webhook to insert the BundlePurchase row.
 *
 * Stripe redirects buyers to the success_url within ~1s of payment but
 * checkout.session.completed lands on our webhook async, typically also
 * within ~1s. The thank-you page can render its full success state as
 * soon as the row exists. This endpoint just asks "is it there yet?"
 * so the poller can decide when to call router.refresh().
 *
 * Returns just { ready: boolean }. The session_id IS itself a piece of
 * mildly sensitive data (a guesser could probe whether a session id
 * was successfully paid), but Stripe ids are 64+ random chars so
 * brute-force is moot. No auth required.
 */
export const GET = async (
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ ready: false }, { status: 400 });
  }

  const purchase = await db.bundlePurchase.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    select: { bundle: { select: { slug: true } } },
  });

  // Only flag ready if the row exists AND it's actually for this slug
  // — defends against a buyer of bundle A landing on bundle B's
  // thank-you URL via a copy-paste mistake or an old bookmark.
  const ready = !!purchase && purchase.bundle.slug === slug;

  return NextResponse.json(
    { ready },
    {
      status: 200,
      // Don't let any CDN cache this — the row appears mid-flight.
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
};
