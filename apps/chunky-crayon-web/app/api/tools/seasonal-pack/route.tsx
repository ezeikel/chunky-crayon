import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import SeasonalPackPdfDocument, {
  type SeasonalPack,
  type SeasonalPackPdfDocumentProps,
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

  const props: SeasonalPackPdfDocumentProps = {
    pack,
    childName:
      typeof body.childName === 'string' && body.childName.trim()
        ? body.childName.slice(0, 40)
        : undefined,
  };

  const start = Date.now();
  try {
    const stream = await ReactPDF.renderToStream(
      <SeasonalPackPdfDocument {...props} />,
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
      hasName: !!props.childName,
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
