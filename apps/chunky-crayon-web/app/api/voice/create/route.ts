/**
 * POST /api/voice/create
 *
 * Mobile-facing wrapper for the voice-conversation create path. Thin HTTP
 * shell over the `createColoringImageFromVoiceConversation` server action so
 * React Native (which can't call server actions over the wire) gets the SAME
 * behaviour as web's voice submit:
 *   - charges VOICE_CREDIT_COST (10) credits, not the text/image 5
 *   - blocks anon users (the action returns `voice_mode_requires_signin`)
 *   - tags the row `purposeKey: 'voice'` for analytics split
 *
 * Web calls the action directly; mobile hits this endpoint. Single source of
 * truth, per the "routes wrap actions" rule. Auth is resolved inside the
 * action via `getUserId` (cookie on web, bearer token on mobile).
 *
 * Request:  { firstAnswer: string, secondAnswer?: string, locale?: string }
 * Response: { coloringImage: CreateColoringImageResult }
 */
import { NextResponse } from 'next/server';
import { createColoringImageFromVoiceConversation } from '@/app/actions/coloring-image';

export const maxDuration = 150;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

type RequestBody = {
  firstAnswer?: string;
  secondAnswer?: string;
  locale?: string;
};

export const POST = async (request: Request) => {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: 'invalid_json' },
      { status: 400, headers: corsHeaders },
    );
  }

  const firstAnswer = body.firstAnswer?.trim();
  if (!firstAnswer) {
    return NextResponse.json(
      { error: 'firstAnswer_required' },
      { status: 400, headers: corsHeaders },
    );
  }

  const coloringImage = await createColoringImageFromVoiceConversation({
    firstAnswer,
    secondAnswer: body.secondAnswer?.trim() ?? '',
    locale: body.locale,
  });

  return NextResponse.json({ coloringImage }, { headers: corsHeaders });
};
