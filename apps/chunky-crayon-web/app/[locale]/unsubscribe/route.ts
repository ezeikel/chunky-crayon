import { NextRequest, NextResponse } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { verifyEmailSignature } from '@/lib/unsubscribe';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

/**
 * Daily-email unsubscribe link target. The signed `sig` query param is
 * generated alongside the encoded email by lib/unsubscribe.ts; same
 * shape as before the May 2026 Resend-Audience → DB migration. Auth
 * model unchanged — only the destination moved.
 *
 * Soft-unsubscribe (set `unsubscribedAt` rather than delete) so the
 * signup action can refuse to re-add them and honour their previous
 * opt-out, matching the legacy Resend behaviour.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const encodedEmail = url.searchParams.get('email');
  const sig = url.searchParams.get('sig');

  if (!encodedEmail || !sig) {
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  let email: string;
  try {
    email = Buffer.from(encodedEmail, 'base64url').toString();
  } catch {
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  if (!verifyEmailSignature(email, sig)) {
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  try {
    // Idempotent — `updateMany` so a missing row doesn't 500, and a
    // double-click on the same link is a no-op. We only update rows
    // that haven't already been unsubscribed, so the timestamp marks
    // the original opt-out moment.
    await db.emailSubscriber.updateMany({
      where: { brand: BRAND, email, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
  } catch (err) {
    console.error('Failed to unsubscribe contact:', err);
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  return NextResponse.redirect(`${baseUrl}/?unsub=success`, 302);
}
