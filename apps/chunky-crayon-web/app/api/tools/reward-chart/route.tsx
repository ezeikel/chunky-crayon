import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import RewardChartPdfDocument, {
  type RewardChartPdfDocumentProps,
  type RewardChartTheme,
} from '@/components/pdfs/RewardChartPdfDocument/RewardChartPdfDocument';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants';

// Node is the default runtime; explicit `export const runtime = 'nodejs'`
// is rejected when cacheComponents is on (Next 16) — @react-pdf/renderer
// needs node anyway, which we get by default.

const VALID_THEMES: RewardChartTheme[] = [
  'stars',
  'unicorn',
  'space',
  'ocean',
  'dinosaur',
];

type Body = {
  childName?: string;
  theme?: string;
  behaviors?: unknown;
  days?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const childName = typeof body.childName === 'string' ? body.childName : '';
  const theme = VALID_THEMES.includes(body.theme as RewardChartTheme)
    ? (body.theme as RewardChartTheme)
    : 'stars';
  const behaviors = Array.isArray(body.behaviors)
    ? (body.behaviors as unknown[])
        .filter((b): b is string => typeof b === 'string')
        .filter((b) => b.trim().length > 0)
    : [];
  const days: 5 | 7 = body.days === 5 ? 5 : 7;

  if (behaviors.length === 0) {
    return NextResponse.json(
      { error: 'At least one behavior is required' },
      { status: 400 },
    );
  }
  if (!childName.trim()) {
    return NextResponse.json(
      { error: 'Child name is required' },
      { status: 400 },
    );
  }

  const props: RewardChartPdfDocumentProps = {
    childName,
    theme,
    behaviors,
    days,
  };

  const start = Date.now();
  try {
    const stream = await ReactPDF.renderToStream(
      <RewardChartPdfDocument {...props} />,
    );

    // Buffer the stream into memory so NextResponse can return it cleanly.
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    await track(TRACKING_EVENTS.TOOL_COMPLETED, {
      tool: 'reward-chart',
      durationMs: Date.now() - start,
      theme,
      days,
      behaviorCount: behaviors.length,
      bytes: pdfBuffer.length,
    });

    const filenameSafe = childName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameSafe || 'reward'}-chart.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('[reward-chart] render failed:', err);
    await track(TRACKING_EVENTS.TOOL_FAILED, {
      tool: 'reward-chart',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to render PDF' },
      { status: 500 },
    );
  }
}
