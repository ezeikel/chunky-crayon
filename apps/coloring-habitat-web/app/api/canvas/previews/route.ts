import { NextResponse } from "next/server";

export type ProgressPreview = { coloringImageId: string; previewUrl: string };
export type GetProgressPreviewsResponse = { previews: ProgressPreview[] };
export type PreviewsResponse = GetProgressPreviewsResponse;

export async function POST() {
  return NextResponse.json({
    previews: [],
  } satisfies GetProgressPreviewsResponse);
}

export async function GET() {
  return NextResponse.json({
    previews: [],
  } satisfies GetProgressPreviewsResponse);
}
