import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import { db, GenerationType } from '@one-colored-pixel/db';
import { BRAND } from '@/lib/db';
import SeasonalPackPdfDocument, {
  PACKS,
  type PackPage,
  type SeasonalPack,
} from '@/components/pdfs/SeasonalPackPdfDocument/SeasonalPackPdfDocument';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants';

const VALID_PACKS: SeasonalPack[] = [
  'halloween',
  'christmas',
  'valentine',
  'easter',
  'thanksgiving',
  'back-to-school',
];

type Body = {
  pack?: string;
  childName?: string;
};

/**
 * Fetch coloring images for a seasonal pack, preferring the curated
 * `seasonal-pack:{pack}` tag (if populated by the seed script) and
 * falling back to the broader pack-topic tags so the tool works
 * immediately off whatever is already in the gallery.
 */
const fetchPackImages = async (pack: SeasonalPack, limit: number) => {
  const config = PACKS[pack];

  // 1. Preferred: curated seasonal-pack tag
  const curated = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      userId: null,
      tags: { has: `seasonal-pack:${pack}` },
      svgUrl: { not: null },
    },
    select: { id: true, title: true, svgUrl: true, tags: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  if (curated.length >= limit) return curated;

  // 2. Fallback: pull from general pack topic tags to fill up
  const needed = limit - curated.length;
  const existingIds = new Set(curated.map((i) => i.id));
  const fallback = await db.coloringImage.findMany({
    where: {
      brand: BRAND,
      userId: null,
      id: { notIn: Array.from(existingIds) },
      tags: { hasSome: config.tags },
      svgUrl: { not: null },
      // Prefer daily images — those are the curated daily scenes.
      generationType: GenerationType.DAILY,
    },
    select: { id: true, title: true, svgUrl: true, tags: true },
    orderBy: { createdAt: 'desc' },
    take: needed,
  });

  return [...curated, ...fallback];
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const pack = VALID_PACKS.includes(body.pack as SeasonalPack)
    ? (body.pack as SeasonalPack)
    : null;
  if (!pack) {
    return NextResponse.json(
      { error: `pack must be one of: ${VALID_PACKS.join(', ')}` },
      { status: 400 },
    );
  }

  const config = PACKS[pack];
  const images = await fetchPackImages(pack, config.targetPageCount);

  if (images.length === 0) {
    return NextResponse.json(
      {
        error: `No coloring pages available for the ${pack} pack yet. Run scripts/seed-seasonal-packs.ts to generate them.`,
      },
      { status: 503 },
    );
  }

  // Fetch SVG content for each image in parallel. SVGs are small (~20-80KB)
  // and served from R2; sequential fetches would add 3-5s per pack.
  const pages: PackPage[] = await Promise.all(
    images
      .filter((i): i is typeof i & { svgUrl: string; title: string } =>
        Boolean(i.svgUrl && i.title),
      )
      .map(async (img) => {
        const res = await fetch(img.svgUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch SVG for ${img.id}: ${res.status}`);
        }
        return { title: img.title, svgContent: await res.text() };
      }),
  );

  const childName =
    typeof body.childName === 'string' && body.childName.trim()
      ? body.childName.slice(0, 40)
      : undefined;

  const start = Date.now();
  try {
    const stream = await ReactPDF.renderToStream(
      <SeasonalPackPdfDocument
        pack={pack}
        pages={pages}
        childName={childName}
      />,
    );

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    await track(TRACKING_EVENTS.TOOL_COMPLETED, {
      tool: 'seasonal-pack',
      durationMs: Date.now() - start,
      pack,
      pageCount: pages.length,
      hasName: !!childName,
      bytes: pdfBuffer.length,
    });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pack}-coloring-pack.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('[seasonal-pack] render failed:', err);
    await track(TRACKING_EVENTS.TOOL_FAILED, {
      tool: 'seasonal-pack',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to render PDF' },
      { status: 500 },
    );
  }
}
