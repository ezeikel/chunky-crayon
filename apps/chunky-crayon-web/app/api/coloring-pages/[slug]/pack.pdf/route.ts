import { NextResponse } from 'next/server';
import { generateLandingPackPDF } from '@/utils/generateLandingPackPDF';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants';

/**
 * GET /api/coloring-pages/[slug]/pack.pdf
 *
 * Free 12-page printable PDF for an SEO landing page. Built on the fly
 * from tag-matched coloring images. Served as `application/pdf` with
 * `Content-Disposition: attachment` so browsers save instead of trying
 * to render in-tab.
 *
 * GET (not POST) so the URL works as a plain anchor link, no JS
 * required. Search-engine-friendly too — the URL itself is
 * descriptive enough that an unconfigured Googlebot following it would
 * just see a PDF response and move on.
 *
 * Front-end is expected to hide the button when there are 0 matching
 * images for this landing (see PackDownloadButton). This 503 path is
 * the belt to the front-end's braces — should never fire in practice.
 */
export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const { slug } = await params;
  const start = Date.now();

  try {
    const { buffer, pageCount, title } = await generateLandingPackPDF(slug);
    const durationMs = Date.now() - start;

    await track(TRACKING_EVENTS.LANDING_PACK_DOWNLOAD_COMPLETED, {
      slug,
      pageCount,
      bytes: buffer.length,
      durationMs,
    });

    // Strip non-ASCII from the optional debug header — `title` can
    // contain en-dashes, smart quotes, etc. and HTTP headers must be
    // pure ASCII or the response coercion throws. The body bytes
    // themselves don't care; this is purely cosmetic logging.
    const titleAscii = title.replace(/[^\x20-\x7E]/g, '-');

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slug}.pdf"`,
        'Content-Length': buffer.length.toString(),
        // Per-slug PDFs are cheap to regenerate (the gallery refreshes
        // as new dailies land), so let browsers keep their copy for a
        // day but skip CDN/edge caching.
        'Cache-Control': 'private, max-age=86400, must-revalidate',
        // SEO breadcrumb — useful if anyone scrapes the filename.
        'X-Coloring-Pack-Title': titleAscii,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pack.pdf] render failed for ${slug}:`, message);
    await track(TRACKING_EVENTS.TOOL_FAILED, {
      tool: `landing-pack:${slug}`,
      error: message,
    });

    // 503 keeps the URL marked "transient failure" for retry semantics.
    // Use 404 specifically when the landing slug doesn't exist so
    // crawlers know not to come back.
    const isUnknownSlug = message.startsWith('Unknown landing page slug');
    return NextResponse.json(
      {
        error: isUnknownSlug
          ? 'Landing page not found'
          : 'Failed to render PDF',
      },
      { status: isUnknownSlug ? 404 : 503 },
    );
  }
};
