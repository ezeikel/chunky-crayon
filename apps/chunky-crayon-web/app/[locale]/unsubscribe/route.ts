import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyEmailSignature } from '@/lib/unsubscribe';

const resend = new Resend(process.env.RESEND_API_KEY);
const audienceId = process.env.RESEND_DAILY_EMAIL_SEGMENT_ID!;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const encodedEmail = url.searchParams.get('email');
  const sig = url.searchParams.get('sig');

  if (!encodedEmail || !sig) {
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  let email: string;
  try {
    email = Buffer.from(encodedEmail, 'base64url').toString();
  } catch {
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  if (!verifyEmailSignature(email, sig)) {
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  // Mark contact as unsubscribed in Resend
  const { error } = await resend.contacts.update({
    audienceId,
    email,
    unsubscribed: true,
  });

  if (error) {
    console.error('Failed to unsubscribe contact:', error);
    return NextResponse.redirect(`${baseUrl}/?unsub=invalid`, 302);
  }

  return NextResponse.redirect(`${baseUrl}/?unsub=success`, 302);
}
