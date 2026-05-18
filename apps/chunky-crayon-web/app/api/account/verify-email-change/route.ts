import { NextResponse } from 'next/server';
import { confirmEmailChange } from '@/app/actions/settings';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://chunkycrayon.com';

// Thin HTTP wrapper around confirmEmailChange (business logic lives in the
// action). Consumes the one-time token from the email link, then redirects
// the browser back to settings with a status the UI can toast on.
export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const uid = url.searchParams.get('uid') ?? '';

  const result = await confirmEmailChange(token, uid);

  const status = result.success ? 'email-changed' : 'email-change-failed';
  return NextResponse.redirect(
    `${baseUrl}/en/account/settings?status=${status}`,
  );
};
