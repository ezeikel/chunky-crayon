import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = 'chunky-crayon-webhook-verify';

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Chunky Crayon webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }
  console.warn('❌ Chunky Crayon webhook verification failed');
  return new NextResponse('Verification failed', { status: 403 });
};

export const POST = async (req: NextRequest) => {
  try {
    const body = await req.json();
    console.log(
      '📩 Chunky Crayon webhook event received:',
      JSON.stringify(body, null, 2),
    );

    // Handle different types of webhook events here
    // For coloring page posts, you might want to handle:
    // - comments on posts (to engage with users)
    // - reactions/likes
    // - shares
    // - messages (if you enable messaging)

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('❌ Error processing Chunky Crayon webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
};
