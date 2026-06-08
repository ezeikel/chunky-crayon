import { NextRequest, NextResponse } from 'next/server';
import {
  checkRegionStoreReady,
  requestRegionStoreRegeneration,
} from '@/app/actions/generate-regions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET  /api/mobile/coloring-images/[id]/region-store  → { ready: boolean }
 * POST /api/mobile/coloring-images/[id]/region-store  → { ok, error? }
 *
 * Thin wrappers over the region-store server actions so the mobile app can
 * mirror web's ColoringArea waiting→timeout→retry magic-tools machine:
 *   - GET polls whether the region store has been written (fresh DB read).
 *   - POST re-kicks the Hetzner worker to (re)generate it (the retry button).
 * No user auth — these are content-pipeline ops (same as the dev regenerate
 * route); the action itself scopes by brand.
 */
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  return NextResponse.json(await checkRegionStoreReady(id), {
    headers: corsHeaders,
  });
};

export const POST = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  return NextResponse.json(await requestRegionStoreRegeneration(id), {
    headers: corsHeaders,
  });
};
