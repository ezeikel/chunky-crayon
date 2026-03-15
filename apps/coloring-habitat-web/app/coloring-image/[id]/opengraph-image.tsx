import { ImageResponse } from "next/og";
import { db } from "@one-colored-pixel/db";
import { BRAND } from "@/lib/db";

export const runtime = "nodejs";
export const alt = "Coloring page on Coloring Habitat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const image = await db.coloringImage.findUnique({
    where: { id, brand: BRAND },
    select: { title: true, description: true, difficulty: true },
  });

  const title = image?.title || "Coloring Page";
  const difficulty = image?.difficulty || "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #F7F7F7 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#E63956",
            }}
          />
          <span style={{ fontSize: "24px", fontWeight: 700, color: "#717171" }}>
            Coloring Habitat
          </span>
        </div>

        <h1
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "#222222",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>

        {difficulty && (
          <span
            style={{
              marginTop: "24px",
              fontSize: "18px",
              fontWeight: 600,
              color: "#008489",
              background: "rgba(0, 132, 137, 0.1)",
              padding: "8px 20px",
              borderRadius: "100px",
            }}
          >
            {difficulty}
          </span>
        )}

        <p
          style={{
            fontSize: "18px",
            color: "#008489",
            marginTop: "32px",
            fontWeight: 600,
          }}
        >
          coloringhabitat.com
        </p>
      </div>
    ),
    { ...size },
  );
}
