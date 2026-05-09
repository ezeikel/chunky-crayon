import ReactPDF from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { Readable } from 'stream';
import { db } from '@one-colored-pixel/db';
import BundlePdfDocument, {
  type BundlePage,
} from '@/components/pdfs/BundlePdfDocument/BundlePdfDocument';
import streamToBuffer from '@/utils/streamToBuffer';

/**
 * Render a bundle's full coloring book PDF to a Buffer.
 *
 * Used by:
 * - the Stripe webhook fulfilment path (caches the PDF on R2)
 * - the download endpoint (render-on-demand fallback if R2 cache missed)
 * - dev/admin scripts (e.g. scripts/generate-bundle-pdf-test.ts)
 *
 * Doesn't touch R2 or Stripe — pure data → bytes. Caller is responsible
 * for what to do with the resulting buffer.
 *
 * Throws if:
 * - the bundle doesn't exist or has no listingHeroUrl
 * - the bundle has zero pages with svgUrl set
 * - any SVG / cover image fetch fails (4xx/5xx) — better to surface than
 *   ship a broken PDF
 */
export const generateBundlePDF = async (
  slug: string,
): Promise<{
  bundleId: string;
  bundleName: string;
  pageCount: number;
  buffer: Buffer;
}> => {
  const bundle = await db.bundle.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      tagline: true,
      listingHeroUrl: true,
    },
  });

  if (!bundle) {
    throw new Error(`Bundle not found: ${slug}`);
  }
  if (!bundle.listingHeroUrl) {
    throw new Error(
      `Bundle ${slug} has no listingHeroUrl — cover image required.`,
    );
  }

  const rows = await db.coloringImage.findMany({
    where: { bundleId: bundle.id, svgUrl: { not: null } },
    select: { id: true, title: true, svgUrl: true, bundleOrder: true },
    orderBy: { bundleOrder: 'asc' },
  });

  if (rows.length === 0) {
    throw new Error(`Bundle ${slug} has no pages with svgUrl set.`);
  }

  // QR code that links anyone with the printable back to the bundle's
  // product page. Same pattern + UTM convention as ColoringPageDocument.
  const qrCodeUrl = `https://chunkycrayon.com/products/digital/${slug}?utm_source=bundle-pdf&utm_medium=qr&utm_campaign=${slug}`;

  // Fetch cover JPG + every page SVG + QR render in parallel.
  const [coverImageDataUrl, pages, qrCodeSvg] = await Promise.all([
    fetchAsDataUrl(bundle.listingHeroUrl),
    Promise.all(
      rows.map(async (row): Promise<BundlePage> => {
        const res = await fetch(row.svgUrl as string);
        if (!res.ok) {
          throw new Error(
            `Failed to fetch SVG for page ${row.bundleOrder} (${row.id}): ${res.status}`,
          );
        }
        return {
          title: row.title ?? `Page ${row.bundleOrder}`,
          svgContent: await res.text(),
        };
      }),
    ),
    QRCode.toString(qrCodeUrl, { type: 'svg' }),
  ]);

  const stream = await ReactPDF.renderToStream(
    <BundlePdfDocument
      bundleName={bundle.name}
      bundleTagline={bundle.tagline}
      coverImageDataUrl={coverImageDataUrl}
      qrCodeSvg={qrCodeSvg}
      pages={pages}
    />,
  );

  const buffer = await streamToBuffer(stream as Readable);

  return {
    bundleId: bundle.id,
    bundleName: bundle.name,
    pageCount: pages.length,
    buffer,
  };
};

/**
 * Fetch an image from a URL and return a `data:` URL. We pre-encode here
 * rather than passing the URL straight to <Image> because react-pdf's
 * remote-fetch path has been flaky in our experience (timeouts, no retry).
 */
const fetchAsDataUrl = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch cover image (${url}): ${res.status}`);
  }
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:${contentType};base64,${base64}`;
};
