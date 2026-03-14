import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { Resend } from 'resend';
import { getMobileAuthFromHeaders } from '@/lib/mobile-auth';
import { getResendFromAddress } from '@/lib/email-config';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const resend = new Resend(process.env.RESEND_API_KEY);

const MAGIC_LINK_SECRET = new TextEncoder().encode(
  process.env.MAGIC_LINK_SECRET ||
    process.env.NEXT_AUTH_SECRET ||
    'magic-link-secret',
);

// Magic link expires in 15 minutes
const MAGIC_LINK_EXPIRATION = '15m';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Create an encrypted magic link token
 */
async function createMagicLinkToken(
  email: string,
  deviceId: string,
): Promise<string> {
  return new SignJWT({ email, deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(MAGIC_LINK_EXPIRATION)
    .sign(MAGIC_LINK_SECRET);
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLinkToken(
  token: string,
): Promise<{ email: string; deviceId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, MAGIC_LINK_SECRET);
    return {
      email: payload.email as string,
      deviceId: payload.deviceId as string,
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/mobile/auth/magic-link
 * Send a magic link email for passwordless sign-in
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await getMobileAuthFromHeaders(request.headers);
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        {
          error: 'Device not registered. Call /api/mobile/auth/register first.',
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // Create magic link token
    const token = await createMagicLinkToken(email, deviceId);

    // Build the magic link URL
    // This redirects to a page that handles the mobile app deep link
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://chunkycrayon.com';
    const magicLinkUrl = `${baseUrl}/auth/mobile/magic-link-redirect?token=${encodeURIComponent(token)}`;

    // Send the email
    await resend.emails.send({
      from: getResendFromAddress('no-reply', 'Chunky Crayon'),
      to: email,
      subject: 'Sign in to Chunky Crayon',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #FF6B6B; margin: 0;">🖍️ Chunky Crayon</h1>
            </div>
            <p style="font-size: 16px; color: #333;">Hi there!</p>
            <p style="font-size: 16px; color: #333;">Click the button below to sign in to Chunky Crayon:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkUrl}"
                 style="background-color: #FF6B6B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Sign In
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">This link will expire in 15 minutes.</p>
            <p style="font-size: 14px; color: #666;">If you didn't request this email, you can safely ignore it.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              © Chunky Crayon - Coloring pages for kids
            </p>
          </body>
        </html>
      `,
    });

    return NextResponse.json(
      { success: true, message: 'Magic link sent' },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('Error sending magic link:', error);
    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500, headers: corsHeaders },
    );
  }
}
