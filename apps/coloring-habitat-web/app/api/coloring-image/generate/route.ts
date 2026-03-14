import { NextResponse } from "next/server";

// TODO: Adapt coloring image generation for Habitat
// This will use the same AI pipeline as Chunky Crayon but with
// adult-focused prompts (no kid safety, intricate designs, meditation themes)

export async function POST() {
  return NextResponse.json(
    { error: "Generation not yet configured for Coloring Habitat" },
    { status: 501 },
  );
}
