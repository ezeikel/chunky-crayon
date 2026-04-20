import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import AbcTracingPdfDocument, {
  type AbcTracingPdfDocumentProps,
} from '@/components/pdfs/AbcTracingPdfDocument/AbcTracingPdfDocument';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants';

type Body = {
  childName?: string;
  case?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const caseMode: AbcTracingPdfDocumentProps['case'] =
    body.case === 'lower' || body.case === 'both' ? body.case : 'upper';

  const props: AbcTracingPdfDocumentProps = {
    childName:
      typeof body.childName === 'string' && body.childName.trim()
        ? body.childName.slice(0, 40)
        : undefined,
    case: caseMode,
  };

  const start = Date.now();
  try {
    const stream = await ReactPDF.renderToStream(
      <AbcTracingPdfDocument {...props} />,
    );

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    await track(TRACKING_EVENTS.TOOL_COMPLETED, {
      tool: 'abc-tracing',
      durationMs: Date.now() - start,
      case: caseMode,
      hasName: !!props.childName,
      bytes: pdfBuffer.length,
    });

    const filenameBase = props.childName
      ? props.childName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 30)
      : '';

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase ? filenameBase + '-' : ''}abc-tracing.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('[abc-tracing] render failed:', err);
    await track(TRACKING_EVENTS.TOOL_FAILED, {
      tool: 'abc-tracing',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to render PDF' },
      { status: 500 },
    );
  }
}
