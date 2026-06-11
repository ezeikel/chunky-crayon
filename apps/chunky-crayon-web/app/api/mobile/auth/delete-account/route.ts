import { NextResponse } from 'next/server';
import { deleteAccount } from '@/app/actions/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/mobile/auth/delete-account
 *
 * Thin wrapper over the deleteAccount server action (the source of truth). MUST
 * live under /api/mobile so proxy.ts verifies the device's bearer JWT and
 * injects x-user-id, which the action reads via getUserId. Permanently erases
 * the signed-in user's account + data (R2 blobs + DB cascade). Apple 5.1.1(v) /
 * Play data-safety / GDPR-K.
 */
export async function POST() {
  const result = await deleteAccount();

  if (!result.ok) {
    const status = result.error === 'unauthorized' ? 401 : 500;
    return NextResponse.json(result, { status, headers: corsHeaders });
  }

  return NextResponse.json(result, { headers: corsHeaders });
}
