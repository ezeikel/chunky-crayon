'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side companion to the server-rendered "Processing your order"
 * state. Polls the purchase-status endpoint every 2s and triggers a
 * server re-render once the BundlePurchase row exists. The server
 * component then resolves the purchase normally and swaps in the
 * success state — no full page reload, no flicker.
 *
 * 60s timeout cap. After that we stop polling — Stripe webhooks
 * usually land in 1-3s, so anything past 60s means something's stuck
 * upstream and the buyer should refresh manually rather than have us
 * spin forever.
 */
type Props = {
  slug: string;
  sessionId: string;
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 60_000;

export default function ThankYouProcessingPoller({ slug, sessionId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const start = Date.now();
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - start > MAX_POLL_DURATION_MS) return;

      try {
        const res = await fetch(
          `/api/bundles/${encodeURIComponent(slug)}/purchase-status?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return; // try again next tick
        const json = (await res.json()) as { ready?: boolean };
        if (json.ready && !cancelled) {
          router.refresh();
        }
      } catch {
        // Network blip — try again next tick.
      }
    };

    // Fire once immediately so we don't waste a 2s window on the first
    // check. Useful when Stripe is fast and the row already exists.
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router, slug, sessionId]);

  return null;
}
