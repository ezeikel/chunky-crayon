import { NextRequest, NextResponse } from "next/server";
import { generateColoredReference } from "@/app/actions/generate-colored-reference";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";

/**
 * TEST ONLY: Generate a colored reference image for a coloring page.
 * GET /api/test-colored-reference?id=<coloringImageId>
 *
 * Returns an HTML page with the original + AI-colored reference side by side.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  const image = await db.coloringImage.findFirst({
    where: { id, brand: BRAND },
    select: { id: true, title: true, description: true, url: true },
  });

  if (!image?.url) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  console.log(
    `[TestColoredRef] Generating colored reference for: ${image.title}`,
  );

  const result = await generateColoredReference(id, image.url, {
    title: image.title ?? undefined,
    description: image.description ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Return a simple HTML page with side-by-side comparison
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Auto-Color Reference Test: ${image.title || id}</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { font-size: 18px; color: #333; }
    .comparison { display: flex; gap: 20px; margin-top: 20px; }
    .panel { flex: 1; background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .panel h2 { font-size: 14px; color: #666; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em; }
    .panel img { width: 100%; height: auto; border-radius: 8px; }
    .meta { margin-top: 12px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <h1>${image.title || "Coloring Page"}</h1>
  <p style="color: #666; font-size: 14px;">${image.description || ""}</p>
  <div class="comparison">
    <div class="panel">
      <h2>Original Line Art</h2>
      <img src="${image.url}" alt="Original" />
    </div>
    <div class="panel">
      <h2>AI-Colored Reference</h2>
      <img src="${result.url}" alt="AI Colored" />
    </div>
  </div>
  <div class="meta">Image ID: ${id} — Reference saved to DB and R2 ✅</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
