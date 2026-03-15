import { NextResponse, connection } from "next/server";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";

export const maxDuration = 60;

export async function GET() {
  await connection();

  // TODO: Wire up Resend broadcast to Habitat audience
  // For now, just find the latest image and return it

  try {
    const latestImage = await db.coloringImage.findFirst({
      where: { brand: BRAND },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        difficulty: true,
      },
    });

    if (!latestImage) {
      return NextResponse.json({ message: "No images to send" });
    }

    // TODO: Send email via Resend using DailyColoringEmail template
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ ... });

    return NextResponse.json({
      success: true,
      message: `Would send daily email for: ${latestImage.title}`,
      imageId: latestImage.id,
    });
  } catch (error) {
    console.error("[Habitat] Error sending daily email:", error);
    return NextResponse.json(
      { error: "Failed to send daily email" },
      { status: 500 },
    );
  }
}
