'use server';

import { db } from '@one-colored-pixel/db';
import { put, exists } from '@one-colored-pixel/storage';
import { generateBundlePDF } from '@/utils/generateBundlePDF';
import { signBundleDownloadToken } from '@/lib/bundle-download-token';
import { sendBundlePurchaseEmail } from '@/app/actions/email';

/**
 * Fulfil a bundle purchase: render the PDF, cache it on R2, generate the
 * download link, send the confirmation email.
 *
 * Called fire-and-forget by the Stripe webhook after the BundlePurchase
 * row is inserted. Webhook returns 200 immediately so Stripe doesn't
 * time out (PDF render takes 1-5s, well under 30s, but no reason to make
 * the buyer's redirect wait on us).
 *
 * Idempotent — safe to re-run on the same purchaseId. R2 path is
 * deterministic, the email function dedupes via the purchaseId in
 * the Resend metadata.
 *
 * The download link uses a 14-day signed JWT (see lib/bundle-download-
 * token.ts). Guests have no session so this token IS the auth — anyone
 * with the link can download for 14 days. Refunding the BundlePurchase
 * row invalidates the token (the endpoint re-checks refundedAt).
 */
export async function fulfilBundlePurchase(
  purchaseId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const purchase = await db.bundlePurchase.findUnique({
    where: { id: purchaseId },
    include: {
      bundle: {
        select: {
          slug: true,
          name: true,
          tagline: true,
          pageCount: true,
          listingHeroUrl: true,
          currency: true,
        },
      },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!purchase) {
    return { ok: false, error: `BundlePurchase ${purchaseId} not found.` };
  }
  if (!purchase.user.email) {
    return {
      ok: false,
      error: `BundlePurchase ${purchaseId} user has no email — can't email link.`,
    };
  }

  const slug = purchase.bundle.slug;
  const r2Path = `bundles/${slug}/purchases/${purchase.id}.pdf`;

  // Skip render if R2 already has it (re-runs from retried webhooks etc).
  // The download endpoint also handles render-on-demand, so this is just
  // an optimisation, not a correctness requirement.
  const cached = await exists(r2Path);
  if (!cached) {
    console.log(`[bundle-fulfil] rendering PDF for ${purchase.id}...`);
    const start = Date.now();
    const { buffer } = await generateBundlePDF(slug);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `[bundle-fulfil]   rendered ${(buffer.length / 1024).toFixed(0)}KB in ${elapsed}s`,
    );

    await put(r2Path, buffer, {
      access: 'public',
      contentType: 'application/pdf',
      allowOverwrite: true,
    });
    console.log(`[bundle-fulfil]   uploaded to R2: ${r2Path}`);
  } else {
    console.log(
      `[bundle-fulfil] R2 cache hit for ${purchase.id}, skipping render`,
    );
  }

  const token = await signBundleDownloadToken(purchase.id);
  // Use the public URL on the host the buyer would actually visit. In
  // dev, NEXT_PUBLIC_BASE_URL points at localhost; in prod, chunkycrayon.com.
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';
  const downloadUrl = `${baseUrl}/api/bundles/${slug}/download?token=${encodeURIComponent(token)}`;

  const buyerFirstName = purchase.user.name?.split(/\s+/)[0];
  const symbol =
    purchase.bundle.currency.toLowerCase() === 'gbp'
      ? '£'
      : purchase.bundle.currency.toLowerCase() === 'usd'
        ? '$'
        : purchase.bundle.currency.toLowerCase() === 'eur'
          ? '€'
          : '';
  const priceDisplay = `${symbol}${(purchase.pricePence / 100).toFixed(2)}`;

  const emailResult = await sendBundlePurchaseEmail({
    to: purchase.user.email,
    buyerName: buyerFirstName,
    bundleName: purchase.bundle.name,
    bundleSlug: slug,
    bundleTagline: purchase.bundle.tagline,
    pageCount: purchase.bundle.pageCount,
    priceDisplay,
    coverImageUrl: purchase.bundle.listingHeroUrl ?? `${baseUrl}/og-image.png`,
    downloadUrl,
  });

  if (!emailResult.success) {
    console.error(
      `[bundle-fulfil] email send failed for ${purchase.id}: ${emailResult.error}`,
    );
    return {
      ok: false,
      error: `email failed: ${emailResult.error ?? 'unknown'}`,
    };
  }

  console.log(
    `[bundle-fulfil] email sent to ${purchase.user.email} (id: ${emailResult.messageId ?? 'n/a'})`,
  );

  return { ok: true };
}
