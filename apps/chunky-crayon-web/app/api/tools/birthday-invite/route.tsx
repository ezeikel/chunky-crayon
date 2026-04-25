import ReactPDF from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import BirthdayInvitePdfDocument, {
  type BirthdayInvitePdfDocumentProps,
  type BirthdayInviteTheme,
} from '@/components/pdfs/BirthdayInvitePdfDocument/BirthdayInvitePdfDocument';
import { track } from '@/utils/analytics-server';
import { TRACKING_EVENTS } from '@/constants';

const VALID_THEMES: BirthdayInviteTheme[] = [
  'rainbow',
  'unicorn',
  'dinosaur',
  'space',
];

type Body = {
  childName?: string;
  age?: unknown;
  date?: string;
  time?: string;
  location?: string;
  rsvp?: string;
  theme?: string;
  fourUp?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const childName = typeof body.childName === 'string' ? body.childName : '';
  if (!childName.trim()) {
    return NextResponse.json(
      { error: "Child's name is required" },
      { status: 400 },
    );
  }

  const theme: BirthdayInviteTheme = VALID_THEMES.includes(
    body.theme as BirthdayInviteTheme,
  )
    ? (body.theme as BirthdayInviteTheme)
    : 'rainbow';

  const parsedAge = typeof body.age === 'number' ? body.age : NaN;
  const age =
    Number.isInteger(parsedAge) && parsedAge >= 1 && parsedAge <= 18
      ? parsedAge
      : null;

  const props: BirthdayInvitePdfDocumentProps = {
    childName: childName.slice(0, 30),
    age,
    date: typeof body.date === 'string' ? body.date.slice(0, 60) : '',
    time: typeof body.time === 'string' ? body.time.slice(0, 40) : '',
    location:
      typeof body.location === 'string' ? body.location.slice(0, 80) : '',
    rsvp: typeof body.rsvp === 'string' ? body.rsvp.slice(0, 80) : undefined,
    theme,
    fourUp: body.fourUp === true,
  };

  const start = Date.now();
  try {
    const stream = await ReactPDF.renderToStream(
      <BirthdayInvitePdfDocument {...props} />,
    );

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    await track(TRACKING_EVENTS.TOOL_COMPLETED, {
      tool: 'birthday-invite',
      durationMs: Date.now() - start,
      theme,
      fourUp: props.fourUp,
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
        'Content-Disposition': `attachment; filename="${filenameSafe || 'birthday'}-invite.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('[birthday-invite] render failed:', err);
    await track(TRACKING_EVENTS.TOOL_FAILED, {
      tool: 'birthday-invite',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to render PDF' },
      { status: 500 },
    );
  }
}
