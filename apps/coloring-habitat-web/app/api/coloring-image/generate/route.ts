import { NextRequest, NextResponse, connection } from "next/server";
import { GenerationType } from "@one-colored-pixel/db";
import { generateColoringImageOnly } from "@/app/actions/coloring-image";

export const maxDuration = 120;

const isValidGenerationType = (type: string): type is GenerationType =>
  Object.values(GenerationType).includes(type as GenerationType);

const handleRequest = async (request: NextRequest) => {
  await connection();

  try {
    let generationType: GenerationType = GenerationType.DAILY;

    if (request.method === "GET") {
      const url = new URL(request.url);
      const typeParam = url.searchParams.get("type");
      if (typeParam && isValidGenerationType(typeParam)) {
        generationType = typeParam;
      }
    } else if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.type && isValidGenerationType(body.type)) {
          generationType = body.type as GenerationType;
        }
      } catch {
        // body parsing failed, use default
      }
    }

    const coloringImage = await generateColoringImageOnly(generationType);

    return NextResponse.json({
      success: true,
      coloringImage,
      generationType,
      message: `Successfully generated ${generationType.toLowerCase()} coloring image`,
    });
  } catch (error) {
    console.error("[Habitat] Error generating coloring image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate coloring image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
