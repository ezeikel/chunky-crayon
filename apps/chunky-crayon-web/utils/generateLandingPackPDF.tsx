import ReactPDF from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { Readable } from 'stream';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import { getLandingPageBySlug } from '@/lib/seo/landing-pages';
import LandingPackPdfDocument, {
  type LandingPackPage,
} from '@/components/pdfs/LandingPackPdfDocument/LandingPackPdfDocument';
import streamToBuffer from '@/utils/streamToBuffer';

/**
 * Render a free 12-page PDF pack for a given /coloring-pages/{slug}
 * landing page. The pack is built on the fly from currently-public
 * coloring images that match the landing's configured tags — so as new
 * daily images get the right tags, the pack auto-refreshes.
 *
 * Doesn't cache to R2. A 12-page render is ~2s server time which is fine
 * for Vercel's function timeouts. Revisit caching if a single slug ever
 * gets >100 downloads/day.
 *
 * Throws if:
 *   - slug doesn't match a known landing config (handled as 404 by caller)
 *   - 0 matching images exist for the landing's tags (handled as 503 by caller —
 *     the front-end should hide the button when this happens, so the throw
 *     is the belt to the front-end's braces)
 *   - any SVG fetch fails (better to surface than ship a broken PDF)
 */
export const PACK_SIZE = 12;

export type GenerateLandingPackResult = {
  buffer: Buffer;
  pageCount: number;
  title: string;
  slug: string;
};

export const generateLandingPackPDF = async (
  slug: string,
): Promise<GenerateLandingPackResult> => {
  const config = getLandingPageBySlug(slug);
  if (!config) {
    throw new Error(`Unknown landing page slug: ${slug}`);
  }

  const tags = config.tags.filter(Boolean);
  if (tags.length === 0) {
    throw new Error(`Landing config for ${slug} has no tags configured`);
  }

  const rows = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      userId: null,
      status: 'READY',
      showInCommunity: true,
      tags: { hasSome: tags },
      svgUrl: { not: null },
    },
    select: { id: true, title: true, svgUrl: true },
    orderBy: { createdAt: 'desc' },
    take: PACK_SIZE,
  });

  if (rows.length === 0) {
    throw new Error(`No coloring pages match landing ${slug} yet`);
  }

  const landingUrl = `https://chunkycrayon.com/en/coloring-pages/${slug}`;
  const qrCodeUrl = `${landingUrl}?utm_source=pack-pdf&utm_medium=qr&utm_campaign=coloring-pack`;

  const [pages, qrCodeSvg] = await Promise.all([
    Promise.all(
      rows.map(async (row): Promise<LandingPackPage> => {
        const res = await fetch(row.svgUrl as string);
        if (!res.ok) {
          throw new Error(`Failed to fetch SVG for ${row.id}: ${res.status}`);
        }
        return {
          title: row.title ?? 'Coloring page',
          svgContent: await res.text(),
        };
      }),
    ),
    QRCode.toString(qrCodeUrl, { type: 'svg' }),
  ]);

  const stream = await ReactPDF.renderToStream(
    <LandingPackPdfDocument
      title={config.title}
      tagline={config.tagline}
      pages={pages}
      qrCodeSvg={qrCodeSvg}
      landingUrl={landingUrl}
    />,
  );

  const buffer = await streamToBuffer(stream as Readable);

  return {
    buffer,
    pageCount: pages.length,
    title: config.title,
    slug,
  };
};
