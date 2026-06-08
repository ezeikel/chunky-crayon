import { getCategoryCovers } from '@/app/data/gallery';
import { NextResponse } from 'next/server';

// One sample page (svgUrl) per gallery category, for the mobile library's
// image-tile category cards. Thin wrapper over getCategoryCovers (the query +
// caching live in the data layer).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export const GET = async () => {
  return Response.json(
    { covers: await getCategoryCovers() },
    { headers: corsHeaders },
  );
};
