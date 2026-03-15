import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Coloring Habitat — Mindful Coloring for Adults";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#E63956",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
          <span
            style={{
              fontSize: "48px",
              fontWeight: 800,
              color: "#222222",
              letterSpacing: "-0.02em",
            }}
          >
            Coloring Habitat
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "28px",
            color: "#717171",
            maxWidth: "600px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Create intricate coloring pages for relaxation and mindfulness
        </p>

        {/* URL */}
        <p
          style={{
            fontSize: "18px",
            color: "#008489",
            marginTop: "24px",
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
