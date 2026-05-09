import { NextResponse } from 'next/server';
import { db } from '@one-colored-pixel/db';
import { put, exists } from '@one-colored-pixel/storage';
import { getCurrentUser } from '@/app/actions/user';
import { verifyBundleDownloadToken } from '@/lib/bundle-download-token';
import { generateBundlePDF } from '@/utils/generateBundlePDF';

/**
 * Download a bundle PDF.
 *
 * Auth (one of):
 *   - Logged-in session cookie → look up the user's BundlePurchase row
 *     for this bundle. Standard "I logged in to chunkycrayon.com and
 *     came back to my purchases" path.
 *   - `?token=<jwt>` → guest checkout flow. Token is signed by the
 *     webhook on fulfilment, lives in the purchase confirmation email.
 *     See lib/bundle-download-token.ts.
 *
 * Caching:
 *   PDFs are cached on R2 at bundles/{slug}/purchases/{purchaseId}.pdf.
 *   The webhook fulfilment path renders + uploads ahead of the email,
 *   so the first download is usually a cache hit. If R2 is empty (e.g.
 *   webhook still in-flight, or this is a re-download from a refunded
 *   purchase that was wiped), we render-on-demand and upload back so
 *   subsequent hits are fast.
 *
 * Returns:
 *   The PDF inline with Content-Disposition: attachment so browsers
 *   download instead of trying to render. application/pdf, no caching
 *   on the response (R2 already caches the bytes; we don't want a CDN
 *   in front of a per-purchase URL).
 */
export const GET = async (
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  // Resolve the BundlePurchase the caller is allowed to download.
  let purchase: {
    id: string;
    bundleId: string;
    refundedAt: Date | null;
    bundle: { slug: string };
  } | null = null;

  if (token) {
    const purchaseId = await verifyBundleDownloadToken(token);
    if (purchaseId) {
      purchase = await db.bundlePurchase.findUnique({
        where: { id: purchaseId },
        select: {
          id: true,
          bundleId: true,
          refundedAt: true,
          bundle: { select: { slug: true } },
        },
      });
    }
  } else {
    const user = await getCurrentUser();
    if (user) {
      const bundle = await db.bundle.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (bundle) {
        purchase = await db.bundlePurchase.findUnique({
          where: {
            userId_bundleId: { userId: user.id, bundleId: bundle.id },
          },
          select: {
            id: true,
            bundleId: true,
            refundedAt: true,
            bundle: { select: { slug: true } },
          },
        });
      }
    }
  }

  if (!purchase) {
    return NextResponse.json(
      { error: 'No purchase found for this bundle.' },
      { status: 404 },
    );
  }
  if (purchase.bundle.slug !== slug) {
    // Token's purchase is for a different bundle — refuse rather than
    // silently serving the wrong file.
    return NextResponse.json(
      { error: 'Token does not match this bundle.' },
      { status: 403 },
    );
  }
  if (purchase.refundedAt) {
    return NextResponse.json(
      { error: 'This purchase has been refunded.' },
      { status: 410 },
    );
  }

  const r2Path = `bundles/${slug}/purchases/${purchase.id}.pdf`;
  const filename = `${slug}.pdf`;

  // Try the cache first. R2's `exists` is a HEAD request — cheap.
  const cached = await exists(r2Path);
  if (cached) {
    const r2Public = process.env.R2_PUBLIC_URL;
    if (!r2Public) {
      return NextResponse.json(
        { error: 'R2_PUBLIC_URL not configured.' },
        { status: 500 },
      );
    }
    const cdnRes = await fetch(`${r2Public}/${r2Path}`);
    if (cdnRes.ok) {
      const buffer = Buffer.from(await cdnRes.arrayBuffer());
      return pdfResponse(buffer, filename);
    }
    // Fall through to render-on-demand if the CDN read failed.
    console.warn(
      `[bundle-download] R2 said exists but fetch failed: ${cdnRes.status}`,
    );
  }

  // Render-on-demand fallback. The webhook should have populated this
  // already; getting here usually means the user clicked the link
  // before fulfilment finished, or someone hit an old refunded slug.
  console.log(
    `[bundle-download] rendering on-demand for purchase ${purchase.id}`,
  );
  const { buffer } = await generateBundlePDF(slug);

  // Cache it for next time. Don't await — the user gets their PDF
  // even if the cache write is slow.
  put(r2Path, buffer, {
    access: 'public',
    contentType: 'application/pdf',
    allowOverwrite: true,
  }).catch((err) => {
    console.error('[bundle-download] R2 cache write failed:', err);
  });

  return pdfResponse(buffer, filename);
};

const pdfResponse = (buffer: Buffer, filename: string) =>
  new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'private, no-store',
    },
  });
