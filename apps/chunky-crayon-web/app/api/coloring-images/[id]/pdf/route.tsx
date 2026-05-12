import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import type { Readable } from 'stream';
import { db } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import ColoringPageDocument from '@/components/pdfs/ColoringPageDocument/ColoringPageDocument';
import streamToBuffer from '@/utils/streamToBuffer';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants';

/**
 * GET /api/coloring-images/[id]/pdf
 *
 * Single-page printable PDF for one public coloring image. Linked from
 * the always-visible download icon on gallery cards so visitors can grab
 * a specific page without going through the detail view.
 *
 * Public images only — the filter (`userId IS NULL AND status = READY
 * AND showInCommunity = true`) means private/in-flight/hidden rows
 * return 404, even if you know their id. No auth/session needed.
 *
 * Filename uses the slugged form when available so the saved file is
 * keyword-rich and self-describing if shared.
 */
export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const start = Date.now();

  const image = await db.coloringImage.findFirst({
    where: {
      brand: BRAND,
      id,
      userId: null,
      status: 'READY',
      showInCommunity: true,
      svgUrl: { not: null },
      qrCodeUrl: { not: null },
    },
    select: {
      id: true,
      title: true,
      svgUrl: true,
      qrCodeUrl: true,
      slugBase: true,
    },
  });

  if (!image || !image.svgUrl || !image.qrCodeUrl) {
    return NextResponse.json(
      { error: 'Coloring page not found' },
      { status: 404 },
    );
  }

  try {
    const [imageSvg, qrCodeSvg] = await Promise.all([
      fetch(image.svgUrl).then((r) => {
        if (!r.ok) throw new Error(`SVG fetch ${r.status}`);
        return r.text();
      }),
      fetch(image.qrCodeUrl).then((r) => {
        if (!r.ok) throw new Error(`QR fetch ${r.status}`);
        return r.text();
      }),
    ]);

    const stream = await ReactPDF.renderToStream(
      <ColoringPageDocument
        imageSvg={imageSvg}
        qrCodeSvg={qrCodeSvg}
        coloringImageId={image.id}
      />,
    );
    const buffer = await streamToBuffer(stream as Readable);
    const durationMs = Date.now() - start;

    await track(TRACKING_EVENTS.COLORING_IMAGE_PDF_DOWNLOADED, {
      coloringImageId: image.id,
      bytes: buffer.length,
      durationMs,
    });

    // slugBase-based filename when public + slugged; otherwise fall back
    // to a generic name. Mirrors how getColoringImageUrl picks URLs.
    const filename = image.slugBase
      ? `${image.slugBase}-${image.id.slice(-5)}.pdf`
      : `coloring-page-${image.id}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=86400, must-revalidate',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[coloring-image-pdf] render failed for ${id}:`, message);
    await track(TRACKING_EVENTS.TOOL_FAILED, {
      tool: 'single-image-pdf',
      error: message,
    });
    return NextResponse.json(
      { error: 'Failed to render PDF' },
      { status: 503 },
    );
  }
};
