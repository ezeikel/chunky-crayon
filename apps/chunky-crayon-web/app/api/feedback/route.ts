import { NextResponse } from 'next/server';
import { sendFeedbackEmail, type FeedbackPayload } from '@/app/actions/email';

const VALID_TYPES = new Set(['bug', 'idea', 'help', 'other']);

export const POST = async (req: Request) => {
  try {
    const body = (await req.json()) as Partial<FeedbackPayload>;

    if (
      !body.feedbackType ||
      !VALID_TYPES.has(body.feedbackType) ||
      !body.message?.trim()
    ) {
      return NextResponse.json(
        { error: 'feedbackType and message are required' },
        { status: 400 },
      );
    }

    await sendFeedbackEmail({
      feedbackType: body.feedbackType as FeedbackPayload['feedbackType'],
      message: body.message.trim(),
      email: body.email?.trim() || undefined,
      userName: body.userName?.trim() || undefined,
      pageUrl: body.pageUrl?.trim() || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 },
    );
  }
};
